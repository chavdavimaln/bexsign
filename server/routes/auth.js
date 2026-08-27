const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_secure_secret_key';

// @route   POST /api/register or /api/auth/register
// @desc    Register a new BexSign user & save to MySQL database
router.post(['/register', '/auth/register'], async (req, res) => {
    const { firstName, lastName, first_name, last_name, email, password, company, job_title } = req.body;
    const userFirstName = firstName || first_name || 'User';
    const userLastName = lastName || last_name || 'Admin';

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (first_name, last_name, email, password_hash, company, job_title) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(query, [userFirstName, userLastName, email, hashedPassword, company || null, job_title || null]);

        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            user: {
                id: result.insertId,
                first_name: userFirstName,
                last_name: userLastName,
                email,
                company: company || null,
                job_title: job_title || null
            }
        });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: err.message || 'Failed to register user' });
    }
});

// @route   POST /api/login or /api/auth/login
// @desc    Authenticate user & get token (Saves user to MySQL if first login)
router.post(['/login', '/auth/login'], async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        let user;
        if (!results || results.length === 0) {
            // Auto-create user into MySQL database on first login
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const defaultFirstName = email.split('@')[0] || 'User';
            const defaultLastName = 'Admin';

            const [insertResult] = await db.query(
                'INSERT INTO users (first_name, last_name, email, password_hash, company, job_title) VALUES (?, ?, ?, ?, ?, ?)',
                [defaultFirstName, defaultLastName, email, hashedPassword, 'BexSign Workspace', 'Administrator']
            );

            const [newUserRows] = await db.query('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
            user = newUserRows[0];
        } else {
            user = results[0];
            const storedHash = user.password_hash || user.password;
            if (storedHash) {
                try {
                    const isMatch = await bcrypt.compare(password, storedHash);
                    if (!isMatch && storedHash !== password) {
                        return res.status(400).json({ error: 'Invalid password. Please check your credentials.' });
                    }
                } catch (bErr) {
                    // Fallback comparison
                    if (storedHash !== password) {
                        return res.status(400).json({ error: 'Invalid password. Please check your credentials.' });
                    }
                }
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

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
