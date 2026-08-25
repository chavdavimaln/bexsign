const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_super_secret_jwt_key_2026';

// Middleware to authenticate JWT requests
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized token.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// 1. Fetch Documents (optionally filtered by status)
router.get('/', authenticateToken, async (req, res) => {
    const { status, folder } = req.query;
    try {
        let query = 'SELECT * FROM documents WHERE user_id = ?';
        const params = [req.user.id];

        if (status && status !== 'All') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (folder) {
            query += ' AND folder_name = ?';
            params.push(folder);
        }

        query += ' ORDER BY created_at DESC';

        const [documents] = await db.execute(query, params);
        res.json({ documents });
    } catch (err) {
        console.error('Fetch Documents Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Upload Document Metadata & Create Envelope
router.post('/upload', authenticateToken, async (req, res) => {
    const { document_name, recipient_email, template_used, file_path, folder_name } = req.body;

    if (!document_name) {
        return res.status(400).json({ error: 'document_name is required.' });
    }

    try {
        const status = 'In Progress';
        const filePathValue = file_path || `/uploads/${Date.now()}_${document_name.replace(/\s+/g, '_')}.pdf`;
        const folderNameValue = folder_name || 'Sent';

        // Insert into documents table (matching db_bex_sign schema)
        const [result] = await db.execute(
            `INSERT INTO documents 
             (user_id, document_name, file_path, folder_name, status, recipient_email, template_used) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                document_name,
                filePathValue,
                folderNameValue,
                status,
                recipient_email || null,
                template_used || null
            ]
        );

        const documentId = result.insertId;

        // Record action in activity_history table
        await db.execute(
            `INSERT INTO activity_history (document_id, activity_description, ip_address)
             VALUES (?, ?, ?)`,
            [documentId, `Document "${document_name}" created and sent to ${recipient_email || 'recipient'}`, req.ip || '127.0.0.1']
        );

        res.status(201).json({
            message: 'Document metadata uploaded and sent successfully.',
            documentId,
            status
        });
    } catch (err) {
        console.error('Upload Document Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Update Document Status (Completed, Declined, Recalled, etc.)
router.put('/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'In Progress', 'Scheduled', 'Completed', 'Declined', 'Expired', 'Recalled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status label.' });
    }

    try {
        const [updateResult] = await db.execute(
            `UPDATE documents SET status = ? WHERE id = ? AND user_id = ?`,
            [status, id, req.user.id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Document not found or unauthorized.' });
        }

        // Record activity in activity_history table
        await db.execute(
            `INSERT INTO activity_history (document_id, activity_description, ip_address)
             VALUES (?, ?, ?)`,
            [id, `Document status updated to ${status}`, req.ip || '127.0.0.1']
        );

        res.json({ message: `Document status updated to ${status}` });
    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Delete Document
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Document not found or unauthorized.' });
        }
        res.json({ message: 'Document deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Fetch Activity Logs for User Documents (from activity_history)
router.get('/activity-logs', authenticateToken, async (req, res) => {
    try {
        const [logs] = await db.execute(
            `SELECT ah.*, d.document_name 
             FROM activity_history ah 
             JOIN documents d ON ah.document_id = d.id 
             WHERE d.user_id = ? 
             ORDER BY ah.time_of_activity DESC LIMIT 20`,
            [req.user.id]
        );
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
