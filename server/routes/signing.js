const express = require('express');
const router = express.Router();
const db = require('../db');
const { 
    markDocumentSigned, 
    getEmployeeSignatureByEmail, 
    upsertEmployeeSignature 
} = require('../utils/documentIdentifier');
const { sendDocumentCompletedEmail } = require('../utils/emailService');

// @route   GET /api/signatures/token/:token
// @desc    Get public signing session by secure token and auto-fetch saved signature
router.get('/token/:token', async (req, res) => {
    const { token } = req.params;
    try {
        // Query recipient by secure token or ID
        const [recipients] = await db.query(
            `SELECT r.*, d.document_name as document_title, d.file_path, d.status as document_status 
             FROM document_recipients r 
             JOIN documents d ON r.document_id = d.id 
             WHERE r.secure_token = ? OR r.id = ?`,
            [token, parseInt(token) || 0]
        );

        if (!recipients || recipients.length === 0) {
            // Check if document ID was passed directly
            const docId = parseInt(token) || 1;
            const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
            const doc = docs[0] || {};
            const email = doc.recipient_email || 'vimal@bexcodeservices.com';
            const existingSig = await getEmployeeSignatureByEmail(email);

            const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [docId]);
            const fieldsList = fieldRows.map(r => {
                let parsedOpts = {};
                try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}
                return {
                    id: r.id,
                    type: r.field_type,
                    label: r.label || r.field_type,
                    x: r.pos_x,
                    y: r.pos_y,
                    width: r.width || 150,
                    height: r.height || 40,
                    page: r.page_number || 1,
                    docIndex: parsedOpts.docIndex !== undefined ? parsedOpts.docIndex : ((r.page_number || 1) - 1),
                    value: parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''),
                    required: Boolean(r.is_required),
                    ...parsedOpts
                };
            });

            const fieldsByDoc = {};
            fieldsList.forEach(f => {
                const dIdx = f.docIndex !== undefined ? f.docIndex : 0;
                if (!fieldsByDoc[dIdx]) fieldsByDoc[dIdx] = [];
                fieldsByDoc[dIdx].push(f);
            });

            return res.json({
                success: true,
                recipient: {
                    id: 1,
                    name: existingSig?.employee_name || 'Vimal Chavda',
                    email: email,
                    role: 'signer',
                    status: 'pending',
                    document_title: doc.document_name || 'Employment Agreement.pdf',
                    custom_message: doc.custom_message || 'Please review and sign this agreement.',
                    file_path: doc.file_path || '/uploads/sample.pdf'
                },
                fields: fieldsList,
                fieldsByDoc,
                existingSignature: existingSig
            });
        }

        const recipient = recipients[0];
        const [fieldRows] = await db.query(
            `SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC`,
            [recipient.document_id]
        );

        const fieldsList = (fieldRows || []).map(r => {
            let parsedOpts = {};
            try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}
            return {
                id: r.id,
                type: r.field_type,
                label: r.label || r.field_type,
                x: r.pos_x,
                y: r.pos_y,
                width: r.width || 150,
                height: r.height || 40,
                page: r.page_number || 1,
                docIndex: parsedOpts.docIndex !== undefined ? parsedOpts.docIndex : ((r.page_number || 1) - 1),
                value: parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''),
                required: Boolean(r.is_required),
                ...parsedOpts
            };
        });

        const fieldsByDoc = {};
        fieldsList.forEach(f => {
            const dIdx = f.docIndex !== undefined ? f.docIndex : 0;
            if (!fieldsByDoc[dIdx]) fieldsByDoc[dIdx] = [];
            fieldsByDoc[dIdx].push(f);
        });

        // Auto-fetch signature from employee_signatures by email
        const existingSig = await getEmployeeSignatureByEmail(recipient.email);

        res.json({
            success: true,
            recipient,
            fields: fieldsList,
            fieldsByDoc,
            existingSignature: existingSig
        });
    } catch (err) {
        console.error('Error fetching signing token session:', err);
        res.status(500).json({ error: 'Database error fetching public signing session' });
    }
});

// @route   POST /api/signatures/save
// @desc    Save signature draft / changes inside document and sync employee_signatures
router.post('/save', async (req, res) => {
    const { documentId, token, signatureData, signerName, signerEmail, signatureStyle, status } = req.body;
    const docId = documentId || parseInt(token) || 1;
    const name = signerName || 'Vimal Chavda';
    const email = signerEmail || 'vimal@bexcodeservices.com';

    try {
        await markDocumentSigned(docId, {
            signerName: name,
            signerEmail: email,
            signatureImage: signatureData || null,
            signatureStyle: signatureStyle || 'font-signature-1',
            status: status || 'In Progress',
            ipAddress: req.ip || '223.181.69.208'
        });

        // Upsert into employee_signatures table
        if (signatureData || signatureStyle) {
            try {
                await upsertEmployeeSignature({
                    name,
                    email,
                    signatureImage: signatureData || null,
                    signatureStyle: signatureStyle || 'font-signature-1'
                });
            } catch (eSig) {
                console.warn('Upsert employee signature warning:', eSig.message);
            }
        }

        if (status) {
            try {
                await db.query('UPDATE documents SET status = ? WHERE id = ?', [status, docId]);
            } catch (e) {}
        }

        res.json({
            success: true,
            message: 'Document and signature changes saved successfully!'
        });
    } catch (err) {
        console.error('Save Signature Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/signatures/submit
// @desc    Submit signed fields for document recipient and update document status to 'Completed'
router.post('/submit', async (req, res) => {
    const { token, recipientId, documentId, signatureData, signerName, signerEmail, signatureStyle } = req.body;
    const docId = documentId || parseInt(token) || 1;
    const name = signerName || 'Vimal Chavda';
    const email = signerEmail || 'vimal@bexcodeservices.com';
    const style = signatureStyle || 'font-signature-1';

    try {
        if (docId) {
            await db.query("UPDATE documents SET status = 'Completed' WHERE id = ?", [docId]);
            await markDocumentSigned(docId, {
                signerName: name,
                signerEmail: email,
                signatureImage: signatureData || null,
                signatureStyle: style,
                status: 'Completed',
                ipAddress: req.ip || '223.181.69.208'
            });

            // Upsert into employee_signatures table for future auto-fetch
            try {
                await upsertEmployeeSignature({
                    name,
                    email,
                    signatureImage: signatureData || null,
                    signatureStyle: style
                });
            } catch (eSig) {}

            // Send completed email
            try {
                const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
                const docTitle = docs[0]?.document_name || 'Document';
                await sendDocumentCompletedEmail({
                    to: email,
                    documentName: docTitle,
                    senderEmail: 'manu.yadav@oladigital.health'
                });
            } catch (eMail) {
                console.warn('Completed email dispatch warning:', eMail.message);
            }
        }

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [docId, `Document ID ${docId} electronically signed by ${name} (${email}) and marked Completed`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        // Persist submitted field values to document_fields and document_field_values
        const submittedFields = req.body.fields || (req.body.fieldsByDoc ? Object.values(req.body.fieldsByDoc).flat() : null);
        if (submittedFields && Array.isArray(submittedFields)) {
            for (const f of submittedFields) {
                if (f.id && f.value !== undefined) {
                    try {
                        const [curr] = await db.query('SELECT options FROM document_fields WHERE id = ?', [f.id]);
                        let curOpts = {};
                        if (curr && curr[0]?.options) {
                            try { curOpts = JSON.parse(curr[0].options); } catch (e) {}
                        }
                        curOpts.value = f.value;
                        await db.query('UPDATE document_fields SET options = ? WHERE id = ?', [JSON.stringify(curOpts), f.id]);
                        let targetRecId = recipientId;
                        if (!targetRecId) {
                            try {
                                const [recRows] = await db.query('SELECT id FROM document_recipients WHERE document_id = ? LIMIT 1', [docId]);
                                targetRecId = recRows && recRows[0] ? recRows[0].id : 1;
                            } catch (e) {
                                targetRecId = 1;
                            }
                        }
                        await db.query(
                            'INSERT INTO document_field_values (field_id, recipient_id, field_value, submitted_at) VALUES (?, ?, ?, NOW())',
                            [f.id, targetRecId, String(f.value)]
                        );
                    } catch (eVal) {
                        console.warn('Field value save warning:', eVal.message);
                    }
                }
            }
        }

        res.json({
            success: true,
            message: 'Document signed successfully!',
            completed: true
        });
    } catch (err) {
        console.error('Submit Signature Error:', err);
        res.status(500).json({ error: 'Failed to submit signature' });
    }
});

module.exports = router;
