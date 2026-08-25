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

// Fetch Contacts
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [contacts] = await db.execute(
            'SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC',
            [req.user.id]
        );
        res.json({ contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Contact
router.post('/', authenticateToken, async (req, res) => {
    const { name, email, phone_number, country_code } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required.' });
    }
    try {
        const [result] = await db.execute(
            'INSERT INTO contacts (user_id, name, email, phone_number, country_code) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, name, email, phone_number || null, country_code || '+91']
        );
        res.status(201).json({ message: 'Contact created successfully', contactId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
