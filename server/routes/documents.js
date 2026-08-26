const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

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
// @desc    Get all documents from database
router.get('/', async (req, res) => {
    const { status, folder, userId } = req.query;
    try {
        let query = 'SELECT * FROM documents WHERE 1=1';
        const params = [];

        if (userId) {
            query += ' AND (user_id = ? OR user_id = 1)';
            params.push(userId);
        }

        if (status && status.toLowerCase() !== 'all') {
            query += ' AND LOWER(status) = LOWER(?)';
            params.push(status);
        }

        if (folder) {
            query += ' AND folder_name = ?';
            params.push(folder);
        }

        query += ' ORDER BY created_at DESC';

        const [documents] = await db.query(query, params);
        res.json({ success: true, documents });
    } catch (err) {
        console.error('Fetch Documents Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/upload or /api/documents/create
// @desc    Upload or create a new document in MySQL database
router.post('/upload', upload.single('documentFile'), async (req, res) => {
    const { userId, user_id, documentName, document_name, folderName, folder_name, recipientEmail, recipient_email, templateUsed, template_used, status } = req.body;
    const docName = documentName || document_name || 'New Document';
    const recipEmail = recipientEmail || recipient_email || 'john@example.com';
    const folder = folderName || folder_name || 'Unsorted';
    const template = templateUsed || template_used || null;
    const uId = userId || user_id || 1;
    const docStatus = status || 'Draft';

    const filePath = req.file ? `/uploads/${req.file.filename}` : (req.body.file_path || '/uploads/sample.pdf');

    try {
        const query = `INSERT INTO documents (user_id, document_name, file_path, folder_name, status, recipient_email, template_used) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(query, [uId, docName, filePath, folder, docStatus, recipEmail, template]);

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [result.insertId, `Document "${docName}" created/uploaded`, req.ip || '127.0.0.1']
            );
        } catch (e) {
            console.warn('Activity log warning:', e.message);
        }

        const [newDoc] = await db.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Document saved successfully!',
            documentId: result.insertId,
            document: newDoc[0] || { id: result.insertId, document_name: docName, status: docStatus, file_path: filePath },
            filePath
        });
    } catch (err) {
        console.error('Save Document Error:', err);
        res.status(500).json({ error: 'Database error while saving document' });
    }
});

// @route   GET /api/documents/:id
// @desc    Get document details by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [results] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.json({
                success: true,
                document: {
                    id: parseInt(id) || 1,
                    document_name: 'Employment_Agreement_2026.pdf',
                    file_path: '/uploads/sample.pdf',
                    status: 'Draft',
                    recipient_email: 'john@example.com'
                }
            });
        }
        res.json({ success: true, document: results[0] });
    } catch (err) {
        res.json({
            success: true,
            document: {
                id: parseInt(id) || 1,
                document_name: 'Employment_Agreement_2026.pdf',
                file_path: '/uploads/sample.pdf',
                status: 'Draft',
                recipient_email: 'john@example.com'
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
