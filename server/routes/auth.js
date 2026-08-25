const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_secure_secret_key';

// @route   POST /api/register or /api/auth/register
// @desc    Register a new BexSign user
router.post(['/register', '/auth/register'], async (req, res) => {
    const { firstName, lastName, first_name, last_name, email, password, company, job_title } = req.body;
    const userFirstName = firstName || first_name;
    const userLastName = lastName || last_name;

    if (!email || !password || !userFirstName || !userLastName) {
        return res.status(400).json({ error: 'Please provide firstName, lastName, email, and password.' });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (first_name, last_name, email, password, company, job_title) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(query, [userFirstName, userLastName, email, hashedPassword, company || null, job_title || null]);

        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: err.message || 'Failed to register user' });
    }
});

// @route   POST /api/login or /api/auth/login
// @desc    Authenticate user & get token
router.post(['/login', '/auth/login'], async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!results || results.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                company: user.company,
                job_title: user.job_title
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

module.exports = router;
