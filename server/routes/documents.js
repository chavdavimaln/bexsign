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

// @route   POST /api/documents/upload
// @desc    Upload a new document (Desktop, Cloud, or Template)
router.post('/upload', upload.single('documentFile'), async (req, res) => {
    const { userId, user_id, documentName, document_name, folderName, folder_name, recipientEmail, recipient_email, templateUsed, template_used } = req.body;
    const docName = documentName || document_name;
    const recipEmail = recipientEmail || recipient_email;
    const folder = folderName || folder_name || 'Unsorted';
    const template = templateUsed || template_used || null;
    const uId = userId || user_id || 1;

    const filePath = req.file ? `/uploads/${req.file.filename}` : (req.body.file_path || '/uploads/sample.pdf');

    if (!docName) {
        return res.status(400).json({ error: 'Document name is required' });
    }

    try {
        const query = `INSERT INTO documents (user_id, document_name, file_path, folder_name, status, recipient_email, template_used) 
                       VALUES (?, ?, ?, ?, 'Draft', ?, ?)`;

        const [result] = await db.query(query, [uId, docName, filePath, folder, recipEmail || null, template]);

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [result.insertId, `Document "${docName}" uploaded as Draft`, req.ip || '127.0.0.1']
            );
        } catch (e) {
            console.warn('Activity log warning:', e.message);
        }

        res.status(201).json({
            message: 'Document uploaded successfully as Draft',
            documentId: result.insertId,
            filePath
        });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Database error while saving document' });
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
                [id, `Document ID ${id} sent for signature with ${fields ? fields.length : 0} fields`, req.ip || '127.0.0.1']
            );
        } catch (e) {
            console.warn('Activity log warning:', e.message);
        }

        res.json({ message: 'Document sent for signature successfully', documentId: id });
    } catch (err) {
        console.error('Send Error:', err);
        res.status(500).json({ error: 'Database error while sending document' });
    }
});

// @route   GET /api/documents/status/:userId/:status
// @desc    Get documents filtered by specific status (Draft, In Progress, Completed, etc.)
router.get('/status/:userId/:status', async (req, res) => {
    const { userId, status } = req.params;

    try {
        let query = 'SELECT * FROM documents WHERE 1=1';
        let params = [];

        if (userId && userId !== '0') {
            query += ' AND (user_id = ? OR user_id = 1)';
            params.push(userId);
        }

        if (status && status !== 'All') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [results] = await db.query(query, params);
        res.json(results);
    } catch (err) {
        console.error('Status Filter Error:', err);
        res.status(500).json({ error: 'Database error while filtering documents' });
    }
});

// @route   GET /api/documents/activity-logs
// @desc    Get recent activity history logs
router.get('/activity-logs', async (req, res) => {
    try {
        const [logs] = await db.query(
            `SELECT ah.*, d.document_name 
             FROM activity_history ah 
             LEFT JOIN documents d ON ah.document_id = d.id 
             ORDER BY ah.time_of_activity DESC LIMIT 20`
        );
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:userId
// @desc    Get all documents for a user
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await db.query('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json(results);
    } catch (err) {
        console.error('Get Documents Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// @route   GET /api/documents
// @desc    Get all documents (with status filter query)
router.get('/', async (req, res) => {
    const { status, folder, userId } = req.query;
    try {
        let query = 'SELECT * FROM documents WHERE 1=1';
        const params = [];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (status && status !== 'All') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (folder) {
            query += ' AND folder_name = ?';
            params.push(folder);
        }

        query += ' ORDER BY created_at DESC';

        const [documents] = await db.query(query, params);
        res.json({ documents });
    } catch (err) {
        console.error('Fetch Documents Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
