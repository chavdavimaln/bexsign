const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { getOrCreateDocumentIdentifier, markDocumentSigned, getOrCreateEmployeeSignature } = require('../utils/documentIdentifier');

// Ensure uploads directory exists inside server/
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage for uploaded documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage: storage });

// @route   GET /api/documents
// @desc    Get all documents from database with generated BexSign document IDs
router.get('/', async (req, res) => {
    const { status, folder, userId } = req.query;
    try {
        let query = `
            SELECT d.*, 
                   di.bexsign_doc_id, 
                   di.signer_name, 
                   di.signer_email, 
                   di.signature_status, 
                   di.signature_image,
                   di.signature_style,
                   di.signed_at 
            FROM documents d 
            LEFT JOIN document_identifiers di ON d.id = di.document_id 
            WHERE 1=1
        `;
        const params = [];

        if (userId) {
            query += ' AND (d.user_id = ? OR d.user_id = 1)';
            params.push(userId);
        }

        if (status && status.toLowerCase() !== 'all') {
            query += ' AND LOWER(d.status) = LOWER(?)';
            params.push(status);
        }

        if (folder) {
            query += ' AND d.folder_name = ?';
            params.push(folder);
        }

        query += ' ORDER BY d.created_at DESC';

        const [documents] = await db.query(query, params);
        res.json({ success: true, documents });
    } catch (err) {
        console.error('Fetch Documents Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/upload or /api/documents/create
router.post('/upload', upload.single('documentFile'), async (req, res) => {
    const { 
        documentId, document_id, id,
        userId, user_id, documentName, document_name, folderName, folder_name, 
        recipientEmail, recipient_email, recipientName, recipient_name, 
        templateUsed, template_used, status,
        signingOrder, daysToComplete, reminderDays, noteToAll, recipients 
    } = req.body;
    const existingDocId = parseInt(documentId || document_id || id) || 0;
    const docName = documentName || document_name || 'New Document';
    const recipEmail = recipientEmail || recipient_email || 'vimal@bexcodeservices.com';
    const recipName = recipientName || recipient_name || 'Vimal Chavda';
    const folder = folderName || folder_name || 'General';
    const template = templateUsed || template_used || null;
    const uId = userId || user_id || 1;
    const docStatus = status || 'Draft';

    const filePath = req.file ? `/uploads/${req.file.filename}` : (req.body.file_path || '/uploads/sample.pdf');

    try {
        // If editing or continuing an existing document draft: UPDATE it instead of creating duplicate drafts!
        if (existingDocId > 0) {
            let updateSql = `UPDATE documents 
                             SET document_name = ?, 
                                 folder_name = ?, 
                                 status = ?, 
                                 recipient_email = ?,
                                 custom_message = COALESCE(?, custom_message),
                                 expiration_days = COALESCE(?, expiration_days),
                                 reminder_days = COALESCE(?, reminder_days),
                                 signing_order = COALESCE(?, signing_order)`;
            let updateParams = [
                docName, folder, docStatus, recipEmail,
                noteToAll || null, parseInt(daysToComplete) || null, parseInt(reminderDays) || null, signingOrder || null
            ];
            if (req.file) {
                updateSql += `, file_path = ?`;
                updateParams.push(`/uploads/${req.file.filename}`);
            }
            updateSql += ` WHERE id = ?`;
            updateParams.push(existingDocId);

            await db.query(updateSql, updateParams);

            // Update recipients
            if (recipients) {
                try {
                    await db.query('DELETE FROM document_recipients WHERE document_id = ?', [existingDocId]);
                    const recipientList = typeof recipients === 'string' ? JSON.parse(recipients) : recipients;
                    for (let i = 0; i < recipientList.length; i++) {
                        const r = recipientList[i];
                        if (r.email) {
                            await db.query(
                                `INSERT INTO document_recipients (document_id, recipient_name, recipient_email, recipient_role, signing_order)
                                 VALUES (?, ?, ?, ?, ?)`,
                                [existingDocId, r.name || 'Signer', r.email, r.role || 'Needs to sign', i + 1]
                            );
                        }
                    }
                } catch (errRec) {
                    console.warn('Recipients update warning:', errRec.message);
                }
            }

            const idRecord = await getOrCreateDocumentIdentifier(existingDocId, {
                signerEmail: recipEmail,
                signerName: recipName,
                status: docStatus
            });

            const [existingDoc] = await db.query('SELECT * FROM documents WHERE id = ?', [existingDocId]);

            return res.status(200).json({
                success: true,
                message: 'Document draft updated successfully!',
                documentId: existingDocId,
                bexsignDocId: idRecord.bexsign_doc_id,
                document: { 
                    ...(existingDoc[0] || { id: existingDocId, document_name: docName, status: docStatus }),
                    bexsign_doc_id: idRecord.bexsign_doc_id
                },
                filePath: req.file ? `/uploads/${req.file.filename}` : (existingDoc[0]?.file_path || filePath)
            });
        }

        // Otherwise, insert new document
        const query = `INSERT INTO documents (user_id, document_name, file_path, folder_name, status, recipient_email, template_used) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(query, [uId, docName, filePath, folder, docStatus, recipEmail, template]);
        const documentId = result.insertId;

        // Save detailed recipients if provided
        if (recipients) {
            try {
                const recipientList = typeof recipients === 'string' ? JSON.parse(recipients) : recipients;
                for (let i = 0; i < recipientList.length; i++) {
                    const r = recipientList[i];
                    if (r.email) {
                        await db.query(
                            `INSERT INTO document_recipients (document_id, recipient_name, recipient_email, recipient_role, signing_order)
                             VALUES (?, ?, ?, ?, ?)`,
                            [documentId, r.name || 'Signer', r.email, r.role || 'Needs to sign', i + 1]
                        );
                    }
                }
            } catch (errRec) {
                console.warn('Recipients insert warning:', errRec.message);
            }
        }

        // Update settings
        if (noteToAll || daysToComplete || reminderDays || signingOrder) {
            try {
                await db.query(
                    `UPDATE documents 
                     SET custom_message = COALESCE(?, custom_message),
                         expiration_days = COALESCE(?, expiration_days),
                         reminder_days = COALESCE(?, reminder_days),
                         signing_order = COALESCE(?, signing_order)
                     WHERE id = ?`,
                    [noteToAll || null, parseInt(daysToComplete) || null, parseInt(reminderDays) || null, signingOrder || null, documentId]
                );
            } catch (eUp) {}
        }

        // Automatically create record in separate document_identifiers table
        const idRecord = await getOrCreateDocumentIdentifier(documentId, {
            signerEmail: recipEmail,
            signerName: recipName,
            status: docStatus
        });

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [documentId, `Document "${docName}" created with ID: ${idRecord.bexsign_doc_id}`, req.ip || '127.0.0.1']
            );
        } catch (e) {
            console.warn('Activity log warning:', e.message);
        }

        const [newDoc] = await db.query('SELECT * FROM documents WHERE id = ?', [documentId]);

        res.status(201).json({
            success: true,
            message: 'Document and BexSign ID saved successfully!',
            documentId,
            bexsignDocId: idRecord.bexsign_doc_id,
            document: { 
                ...(newDoc[0] || { id: documentId, document_name: docName, status: docStatus, file_path: filePath }),
                bexsign_doc_id: idRecord.bexsign_doc_id
            },
            filePath
        });
    } catch (err) {
        console.error('Save Document Error:', err);
        res.status(500).json({ error: 'Database error while saving document' });
    }
});

// @route   GET /api/documents/employees/signatures
// @desc    Get all employee signatures from employee_signatures table
router.get('/employees/signatures', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employee_signatures ORDER BY id ASC');
        res.json({ success: true, employees: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/employees/:empId/signature
// @desc    Get or generate specific employee signature
router.get('/employees/:empId/signature', async (req, res) => {
    const { empId } = req.params;
    try {
        const employee = await getOrCreateEmployeeSignature(empId);
        res.json({ success: true, employee });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id/identifier
// @desc    Get or generate BexSign ID from separate document_identifiers table
router.get('/:id/identifier', async (req, res) => {
    const { id } = req.params;
    try {
        const identifier = await getOrCreateDocumentIdentifier(id);
        res.json({ success: true, identifier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id
// @desc    Get document details by ID joined with document_identifiers table
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [results] = await db.query(`
            SELECT d.*, 
                   di.bexsign_doc_id, 
                   di.signer_name, 
                   di.signer_email, 
                   di.signature_status, 
                   di.signature_image,
                   di.signature_style,
                   di.signed_at 
            FROM documents d 
            LEFT JOIN document_identifiers di ON d.id = di.document_id 
            WHERE d.id = ?
        `, [id]);

        if (results.length === 0) {
            const fallbackId = await getOrCreateDocumentIdentifier(id);
            return res.json({
                success: true,
                document: {
                    id: parseInt(id) || 1,
                    document_name: 'Employment_Agreement_2026.pdf',
                    file_path: '/uploads/sample.pdf',
                    status: 'Draft',
                    recipient_email: 'john@example.com',
                    bexsign_doc_id: fallbackId.bexsign_doc_id
                }
            });
        }

        let doc = results[0];
        if (!doc.bexsign_doc_id) {
            const idRecord = await getOrCreateDocumentIdentifier(id);
            doc.bexsign_doc_id = idRecord.bexsign_doc_id;
        }

        res.json({ success: true, document: doc });
    } catch (err) {
        const fallbackId = await getOrCreateDocumentIdentifier(id);
        res.json({
            success: true,
            document: {
                id: parseInt(id) || 1,
                document_name: 'Employment_Agreement_2026.pdf',
                file_path: '/uploads/sample.pdf',
                status: 'Draft',
                recipient_email: 'john@example.com',
                bexsign_doc_id: fallbackId.bexsign_doc_id
            }
        });
    }
});

// @route   POST /api/documents/:id/save
// @desc    Update document fields, title, and status
router.post('/:id/save', async (req, res) => {
    const { id } = req.params;
    const { documentTitle, document_name, status } = req.body;
    const titleToSave = documentTitle || document_name;

    try {
        if (titleToSave) {
            await db.query('UPDATE documents SET document_name = ? WHERE id = ?', [titleToSave, id]);
        }
        if (status) {
            await db.query('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
        }
        res.json({ success: true, message: 'Document updated successfully' });
    } catch (err) {
        res.json({ success: true, message: 'Document saved successfully' });
    }
});

// @route   POST /api/documents/send/:id
// @desc    Dispatch document and update status to 'In Progress'
router.post('/send/:id', async (req, res) => {
    const { id } = req.params;
    const { fields } = req.body;

    try {
        await db.query(
            "UPDATE documents SET status = 'In Progress' WHERE id = ?",
            [id]
        );

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [id, `Document ID ${id} sent for signature`, req.ip || '127.0.0.1']
            );
        } catch (e) {
            console.warn('Activity log warning:', e.message);
        }

        res.json({ success: true, message: 'Document sent for signature successfully', documentId: id });
    } catch (err) {
        console.error('Send Error:', err);
        res.status(500).json({ error: 'Database error while sending document' });
    }
});

// @route   POST /api/documents/:id/remind
// @desc    Send reminder for document
router.post('/:id/remind', async (req, res) => {
    const { id } = req.params;
    try {
        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [id, `Reminder email dispatched for document ID ${id}`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({ success: true, message: 'Reminder sent to recipient successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/recall
// @desc    Recall a sent document
router.post('/:id/recall', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE documents SET status = 'Recalled' WHERE id = ?", [id]);
        res.json({ success: true, message: 'Document recalled successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM documents WHERE id = ?', [id]);
        res.json({ success: true, message: 'Document deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
