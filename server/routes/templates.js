const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure upload storage for templates
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-template-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage: storage });

// @route   GET /api/templates/:userId
// @desc    Get all templates for the user
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await db.query(
            'SELECT * FROM templates WHERE user_id = ? OR user_id = 1 ORDER BY last_modified DESC',
            [userId]
        );
        res.json(results);
    } catch (err) {
        console.error('Fetch Templates Error:', err);
        res.status(500).json({ error: 'Database error while fetching templates' });
    }
});

// @route   GET /api/templates
// @desc    Get all templates
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM templates ORDER BY last_modified DESC');
        res.json({ templates: results });
    } catch (err) {
        console.error('Fetch All Templates Error:', err);
        res.status(500).json({ error: 'Database error while fetching templates' });
    }
});

// @route   POST /api/templates/create
// @desc    Create a new reusable template
router.post('/create', upload.single('templateFile'), async (req, res) => {
    const { userId, templateName, template_name, activeSignForms, active_sign_forms } = req.body;
    const name = templateName || template_name;
    const signForms = activeSignForms || active_sign_forms || 1;
    const uId = userId || 1;
    const filePath = req.file ? `/uploads/${req.file.filename}` : (req.body.file_path || '/uploads/template_sample.pdf');

    if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
    }

    try {
        const query = `INSERT INTO templates (user_id, template_name, file_path, active_sign_forms) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(query, [uId, name, filePath, signForms]);
        
        res.status(201).json({
            message: 'Template created successfully',
            templateId: result.insertId,
            filePath
        });
    } catch (err) {
        console.error('Create Template Error:', err);
        res.status(500).json({ error: 'Database error while saving template' });
    }
});

module.exports = router;
