const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_super_secret_jwt_key_2026';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized token.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Fetch Templates
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [templates] = await db.execute(
            `SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name 
             FROM templates t 
             JOIN users u ON t.user_id = u.id 
             ORDER BY t.last_modified DESC`
        );
        res.json({ templates });
    } catch (err) {
        console.error('Fetch Templates Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create Template
router.post('/', authenticateToken, async (req, res) => {
    const { template_name, file_path, active_sign_forms } = req.body;
    if (!template_name) {
        return res.status(400).json({ error: 'template_name is required.' });
    }
    try {
        const filePathValue = file_path || `/templates/${Date.now()}_${template_name.replace(/\s+/g, '_')}.pdf`;
        const [result] = await db.execute(
            `INSERT INTO templates (user_id, template_name, file_path, active_sign_forms) 
             VALUES (?, ?, ?, ?)`,
            [req.user.id, template_name, filePathValue, active_sign_forms || 0]
        );
        res.status(201).json({
            message: 'Template created successfully',
            templateId: result.insertId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Template
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM templates WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Template not found or unauthorized.' });
        }
        res.json({ message: 'Template deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
