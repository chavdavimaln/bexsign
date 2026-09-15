const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { 
    markDocumentSigned, 
    getEmployeeSignatureByEmail, 
    upsertEmployeeSignature 
} = require('../utils/documentIdentifier');
const { sendDocumentCompletedEmail, sendSignatureRequestEmail, sendRecipientSignedEmail } = require('../utils/emailService');
const { generateServerPdfBuffer } = require('../utils/pdfGenerator');
const requestHelpers = require('../utils/requestHelpers');
const { finalizeCompletedRequest } = require('../utils/requestCompletion');

// @route   GET /api/signatures/token/:token
// @desc    Get public signing session by secure token and auto-fetch saved signature
router.get('/token/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const queryEmail = (req.query.email || req.query.signerEmail || '').trim().toLowerCase();

        // Query recipient by secure token or ID or matching document + email
        let recipientQuery = `SELECT r.*, d.document_name as document_title, d.file_path, d.status as document_status 
                              FROM document_recipients r 
                              JOIN documents d ON r.document_id = d.id 
                              WHERE r.secure_token = ? OR r.id = ?`;
        let recipientParams = [token, parseInt(token) || 0];

        if (queryEmail) {
            recipientQuery += ` OR (r.document_id = ? AND LOWER(r.email) = ?)`;
            recipientParams.push(parseInt(token) || 0, queryEmail);
        }

        const [recipients] = await db.query(recipientQuery, recipientParams);

        if (!recipients || recipients.length === 0) {
            // Check if document ID was passed directly
            const docId = parseInt(token) || 1;
            const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
            const doc = docs[0] || {};
            const email = queryEmail || doc.recipient_email || 'vimal@bexcodeservices.com';
            const isCompleted = (doc.status === 'Completed');
            const existingSig = await getEmployeeSignatureByEmail(email) || await getEmployeeSignatureByEmail('vimal@bexcodeservices.com');

            const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [docId]);
            const fieldsList = fieldRows.map(r => {
                let parsedOpts = {};
                try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}

                // Check assignment
                const fieldAssigneeEmail = (parsedOpts.assigneeEmail || '').toLowerCase();
                const fieldAssigneeName = (parsedOpts.assignee || '').toLowerCase().trim();
                let isAssignedToOther = false;

                if (fieldAssigneeEmail && email && fieldAssigneeEmail !== email.toLowerCase()) {
                    isAssignedToOther = true;
                }

                // Zoho Sign privacy: mask other recipient's values while document is in process
                const shouldMask = !isCompleted && isAssignedToOther;
                let resolvedVal = parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
                if (shouldMask) resolvedVal = '';

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
                    value: resolvedVal,
                    required: Boolean(r.is_required),
                    isAssignedToOther,
                    assignee: parsedOpts.assignee || '',
                    assigneeEmail: parsedOpts.assigneeEmail || '',
                    ...parsedOpts,
                    ...(shouldMask ? { value: '', gridValue: null } : {})
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
                    status: doc.status || 'In Progress',
                    document_title: doc.document_name || 'Document 1.pdf',
                    custom_message: doc.custom_message || 'Please review and sign this agreement.',
                    file_path: doc.file_path || '/uploads/sample.pdf'
                },
                fields: fieldsList,
                fieldsByDoc,
                existingSignature: existingSig
            });
        }

        const recipient = recipients[0];
        const isCompleted = (recipient.document_status === 'Completed');
        const [fieldRows] = await db.query(
            `SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC`,
            [recipient.document_id]
        );

        const fieldsList = (fieldRows || []).map(r => {
            let parsedOpts = {};
            try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}

            // Match assignment against recipient
            const fieldRecipientId = r.recipient_id || parsedOpts.assigneeId;
            const fieldAssigneeEmail = (parsedOpts.assigneeEmail || '').toLowerCase();
            const fieldAssigneeName = (parsedOpts.assignee || '').toLowerCase().trim();
            const curRecEmail = (recipient.email || '').toLowerCase();
            const curRecName = (recipient.name || '').toLowerCase().trim();

            let isAssignedToOther = false;
            if (fieldAssigneeEmail && curRecEmail && fieldAssigneeEmail !== curRecEmail) {
                isAssignedToOther = true;
            } else if (fieldRecipientId && String(fieldRecipientId) !== String(recipient.id)) {
                isAssignedToOther = true;
            } else if (fieldAssigneeName && curRecName && fieldAssigneeName !== curRecName) {
                isAssignedToOther = true;
            }

            // Zoho Sign privacy: mask other recipient's values while document is in process
            const shouldMask = !isCompleted && isAssignedToOther;
            let resolvedVal = parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
            if (shouldMask) resolvedVal = '';

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
                value: resolvedVal,
                required: Boolean(r.is_required),
                isAssignedToOther,
                assignee: parsedOpts.assignee || 'Other Signer',
                assigneeEmail: parsedOpts.assigneeEmail || '',
                ...parsedOpts,
                ...(shouldMask ? { value: '', gridValue: null } : {})
            };
        });

        const fieldsByDoc = {};
        fieldsList.forEach(f => {
            const dIdx = f.docIndex !== undefined ? f.docIndex : 0;
            if (!fieldsByDoc[dIdx]) fieldsByDoc[dIdx] = [];
            fieldsByDoc[dIdx].push(f);
        });

        // Auto-fetch signature from employee_signatures by email
        const existingSig = await getEmployeeSignatureByEmail(recipient.email) || await getEmployeeSignatureByEmail('vimal@bexcodeservices.com');

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

// @route   POST /api/signatures/viewed
// @desc    Record that a recipient opened the signing page (Zoho Sign "Viewed" status)
router.post('/viewed', async (req, res) => {
    const docId = parseInt(req.body.documentId) || 0;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!docId || !email) {
        return res.status(400).json({ success: false, error: 'documentId and email are required' });
    }
    try {
        const recipients = await requestHelpers.getRecipients(docId);
        const recipient = recipients.find((r) => String(r.email).toLowerCase() === email);
        if (!recipient) {
            return res.json({ success: false, error: 'Recipient not found' });
        }
        if (!recipient.viewed_at) {
            await db.query(
                "UPDATE document_recipients SET viewed_at = NOW(), status = IF(status IN ('pending', 'sent'), 'viewed', status) WHERE id = ?",
                [recipient.id]
            );
            await requestHelpers.logRequestEvent(docId, {
                recipientId: recipient.id,
                eventType: 'viewed',
                description: `${recipient.name} (${recipient.email}) viewed the document`,
                req
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Viewed event error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

function decodeClientPdfs(completedPdfs) {
    if (!Array.isArray(completedPdfs)) return [];
    return completedPdfs
        .filter((item) => item && item.base64)
        .map((item, idx) => {
            try {
                const filename = item.filename || `Document_${idx + 1}.pdf`;
                return {
                    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
                    content: Buffer.from(item.base64, 'base64'),
                    contentType: 'application/pdf'
                };
            } catch (e) {
                return null;
            }
        })
        .filter(Boolean);
}

// @route   POST /api/signatures/submit
// @desc    Submit the current recipient's fields and signature. Notifies the next signer group (sequential),
//          or — when every signer/approver has finished — marks the request Completed and emails the signed
//          PDFs plus the certificate of completion to the sender and all recipients.
router.post('/submit', async (req, res) => {
    const { token, recipientId, documentId, signatureData, signerName, signerEmail, signatureStyle, completedPdfs } = req.body;
    const docId = parseInt(documentId || token) || 0;
    const email = String(signerEmail || '').trim();
    const style = signatureStyle || 'font-signature-1';

    if (!docId) {
        return res.status(400).json({ success: false, error: 'Document id is required.' });
    }

    try {
        await requestHelpers.ensureRequestSchema();
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
        const doc = docs[0];
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found.' });
        }
        const docStatus = String(doc.status || '').toLowerCase();
        if (docStatus === 'completed') {
            return res.json({ success: true, completed: true, alreadyCompleted: true, message: 'This document has already been completed.' });
        }
        if (['recalled', 'trashed', 'declined', 'expired'].includes(docStatus)) {
            return res.status(409).json({ success: false, error: `This document is ${doc.status} and can no longer be signed.` });
        }

        let recipients = await requestHelpers.getRecipients(docId);

        // Legacy single-recipient documents (no recipient rows yet): register the signer as the recipient
        if (recipients.length === 0) {
            const legacyEmail = email || doc.recipient_email;
            if (legacyEmail) {
                recipients = await requestHelpers.saveRecipients(docId, [{ email: legacyEmail, name: signerName, role: 'Needs to sign' }]);
            }
        }

        const recipient = email
            ? recipients.find((r) => String(r.email).toLowerCase() === email.toLowerCase())
            : recipients.find((r) => String(r.id) === String(recipientId));
        if (!recipient) {
            return res.status(403).json({ success: false, error: 'This email address is not a recipient of the document.' });
        }
        if (!requestHelpers.isSigningRole(recipient.role)) {
            return res.status(403).json({ success: false, error: 'You receive a copy of this document and do not need to sign it.' });
        }
        if (recipient.status === 'signed') {
            return res.json({ success: true, alreadySigned: true, completed: false, message: 'You have already signed this document.' });
        }

        const isSequential = doc.signing_order === 'sequential';
        const activeGroup = requestHelpers.getActiveSigningGroup(recipients, isSequential);
        if (!activeGroup.some((r) => r.id === recipient.id)) {
            return res.status(409).json({
                success: false,
                error: `It is not your turn to sign yet. Waiting for ${activeGroup.map((r) => r.name || r.email).join(', ')}.`
            });
        }

        const name = String(signerName || recipient.name || recipient.email).trim();
        const signingRecipients = recipients.filter((r) => requestHelpers.isSigningRole(r.role));
        const ip = requestHelpers.getRequestIp(req);
        const signedAt = new Date().toISOString();

        // 1. Persist ONLY this recipient's field values (other recipients' values are never overwritten)
        const submittedFields = req.body.fields || (req.body.fieldsByDoc ? Object.values(req.body.fieldsByDoc).flat() : []);
        const submittedById = new Map(
            (Array.isArray(submittedFields) ? submittedFields : [])
                .filter((f) => f && f.id !== undefined && f.id !== null)
                .map((f) => [String(f.id), f])
        );
        const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ?', [docId]);
        for (const row of fieldRows) {
            const field = requestHelpers.parseFieldRow(row);
            if (!requestHelpers.fieldBelongsToRecipient(field, recipient, signingRecipients)) continue;

            const opts = requestHelpers.parseJsonInput(row.options, {}) || {};
            const incoming = submittedById.get(String(row.id));
            if (incoming) {
                if (incoming.value !== undefined) opts.value = incoming.value;
                if (incoming.gridValue !== undefined) opts.gridValue = incoming.gridValue;
                if (incoming.checked !== undefined) opts.checked = incoming.checked;
            }
            if (field.type === 'Signature' || field.type === 'Initial') {
                if (signatureData) opts.signatureImage = signatureData;
                opts.signatureStyle = style;
            }
            opts.signerName = name;
            opts.signerEmail = recipient.email;
            opts.signedAt = signedAt;
            if (!opts.assigneeEmail) opts.assigneeEmail = recipient.email;

            await db.query('UPDATE document_fields SET options = ?, recipient_id = ? WHERE id = ?', [JSON.stringify(opts), recipient.id, row.id]);

            const storedValue = (field.type === 'Signature' || field.type === 'Initial')
                ? `Signed by ${name}`
                : (field.type === 'Split text' && Array.isArray(opts.gridValue) ? opts.gridValue.join('') : String(opts.value ?? ''));
            try {
                await db.query(
                    'INSERT INTO document_field_values (field_id, recipient_id, field_value, submitted_at) VALUES (?, ?, ?, NOW())',
                    [row.id, recipient.id, storedValue]
                );
            } catch (eVal) {
                console.warn('Field value save warning:', eVal.message);
            }
        }

        // 2. Mark this recipient as signed (with IP, device and signature for the certificate)
        await db.query(
            `UPDATE document_recipients
             SET status = 'signed', signed_at = NOW(), signed_ip = ?, signed_user_agent = ?,
                 signature_image = COALESCE(?, signature_image), viewed_at = COALESCE(viewed_at, NOW())
             WHERE id = ?`,
            [ip, String(req.headers['user-agent'] || '').slice(0, 255) || null, signatureData || null, recipient.id]
        );
        await requestHelpers.logRequestEvent(docId, {
            recipientId: recipient.id,
            eventType: 'signed',
            description: `${name} (${recipient.email}) ${recipient.role === 'approver' ? 'approved' : 'signed'} the document`,
            req
        });

        // Upsert into employee_signatures table for future auto-fetch
        try {
            await upsertEmployeeSignature({ name, email: recipient.email, signatureImage: signatureData || null, signatureStyle: style });
        } catch (eSig) {}

        // 3. Request status
        recipients = await requestHelpers.getRecipients(docId);
        const pendingSigners = recipients.filter((r) => requestHelpers.isSigningRole(r.role) && r.status !== 'signed');
        const allCompleted = pendingSigners.length === 0;
        const finalStatus = allCompleted ? 'Completed' : 'In Progress';

        await db.query('UPDATE documents SET status = ?, completed_at = ? WHERE id = ?', [finalStatus, allCompleted ? new Date() : null, docId]);
        await markDocumentSigned(docId, {
            signerName: name,
            signerEmail: recipient.email,
            signatureImage: signatureData || null,
            signatureStyle: style,
            status: finalStatus,
            ipAddress: ip || '127.0.0.1'
        });

        const sender = await requestHelpers.getRequestSender(doc);
        let completion = null;
        let nextRecipients = [];

        if (allCompleted) {
            await requestHelpers.logRequestEvent(docId, { description: `All recipients completed "${doc.document_name}". Document marked Completed.`, req });
            try {
                completion = await finalizeCompletedRequest(docId, { fallbackAttachments: decodeClientPdfs(completedPdfs) });
            } catch (eComplete) {
                console.error('Completion email error:', eComplete);
                completion = { emailed: [], failed: [{ error: eComplete.message }], files: [], certificatePath: null };
            }
        } else {
            // 4. Sequential order: email the next signing group that has not been emailed yet
            const [freshDocs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
            const nextGroup = requestHelpers.getActiveSigningGroup(recipients, isSequential).filter((r) => !r.sent_at);
            if (nextGroup.length > 0) {
                const results = await requestHelpers.sendSigningInvitations(freshDocs[0], nextGroup, { req });
                nextRecipients = results.filter((r) => r.success).map((r) => ({ name: r.name, email: r.email }));
            }
            if (sender.email && sender.email.toLowerCase() !== String(recipient.email).toLowerCase()) {
                await sendRecipientSignedEmail({
                    to: sender.email,
                    senderName: sender.name,
                    signerName: name,
                    signerEmail: recipient.email,
                    documentName: doc.document_name,
                    remainingCount: pendingSigners.length,
                    nextRecipients
                });
            }
        }

        res.json({
            success: true,
            message: allCompleted
                ? 'Document completed. The signed documents have been emailed to all parties.'
                : 'Document signed successfully!',
            completed: allCompleted,
            remainingSigners: pendingSigners.map((r) => ({ name: r.name, email: r.email })),
            nextRecipients,
            emailed: completion?.emailed || [],
            emailFailures: completion?.failed || [],
            files: completion?.files || [],
            certificatePath: completion?.certificatePath || null
        });
    } catch (err) {
        console.error('Submit Signature Error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit signature' });
    }
});

module.exports = router;
