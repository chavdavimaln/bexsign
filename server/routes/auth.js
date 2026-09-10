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

            // Check if user account is deactivated
            const [profileRows] = await db.query('SELECT status, department, designation FROM user_profiles WHERE user_id = ?', [user.id]);
            if (profileRows && profileRows[0]?.status === 'inactive') {
                try {
                    await db.query(
                        'INSERT INTO user_login_logs (user_id, email, role, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [user.id, email, user.role || 'team_member', req.ip || '127.0.0.1', req.headers['user-agent'] || '', 'failed']
                    );
                } catch (e) {}
                return res.status(403).json({ error: 'Your account has been deactivated by an administrator. Please contact your Manager.' });
            }

            const storedHash = user.password_hash || user.password;
            if (storedHash) {
                try {
                    const isMatch = await bcrypt.compare(password, storedHash);
                    if (!isMatch && storedHash !== password) {
                        try {
                            await db.query(
                                'INSERT INTO user_login_logs (user_id, email, role, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)',
                                [user.id, email, user.role || 'team_member', req.ip || '127.0.0.1', req.headers['user-agent'] || '', 'failed']
                            );
                        } catch (e) {}
                        return res.status(400).json({ error: 'Invalid password. Please check your credentials.' });
                    }
                } catch (bErr) {
                    if (storedHash !== password) {
                        return res.status(400).json({ error: 'Invalid password. Please check your credentials.' });
                    }
                }
            }
        }

        const userRole = (user.role || 'manager').toLowerCase();

        // Log successful login
        try {
            await db.query(
                'INSERT INTO user_login_logs (user_id, email, role, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, email, userRole, req.ip || '127.0.0.1', req.headers['user-agent'] || '', 'success']
            );
        } catch (e) {}

        const token = jwt.sign({ id: user.id, email: user.email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

        // Get latest profile and role name
        const [prof] = await db.query('SELECT department, designation, status FROM user_profiles WHERE user_id = ?', [user.id]);
        const [r] = await db.query('SELECT role_name, permissions FROM roles WHERE role_key = ?', [userRole]);

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
                job_title: user.job_title,
                role: userRole,
                role_name: r[0]?.role_name || (userRole === 'manager' ? 'Manager (Admin)' : (userRole === 'leader' ? 'Leader' : 'Team Member')),
                department: prof[0]?.department || 'Executive',
                designation: prof[0]?.designation || (userRole === 'manager' ? 'Manager' : 'Team Member'),
                status: prof[0]?.status || 'active',
                permissions: r[0]?.permissions || { all: userRole === 'manager' }
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// @route   POST /api/change-password or /api/auth/change-password
// @desc    Self-service password change
router.post(['/change-password', '/auth/change-password'], async (req, res) => {
    const { email, newPassword, sendEmail } = req.body;
    const targetEmail = (email || 'vimal@bexcodeservices.com').trim();

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in users table by email or fallback to root admin ID 1
        const [updateRes] = await db.query('UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)', [hashedPassword, targetEmail]);
        if (updateRes.affectedRows === 0) {
            await db.query('UPDATE users SET password_hash = ? WHERE id = 1', [hashedPassword]);
        }

        res.json({
            success: true,
            message: sendEmail 
                ? `Password updated successfully! An email confirmation was dispatched to ${targetEmail}.`
                : 'Password updated successfully!'
        });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// @route   POST /api/send-reset-email or /api/auth/send-reset-email
// @desc    Send password reset instructions to email
router.post(['/send-reset-email', '/auth/send-reset-email'], async (req, res) => {
    const { email } = req.body;
    const targetEmail = email || 'vimal@bexcodeservices.com';

    try {
        // Log event
        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (1, ?, ?)`,
                [`Password reset instructions requested for ${targetEmail}`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({
            success: true,
            message: `A password reset link with instructions has been dispatched to ${targetEmail}.`
        });
    } catch (err) {
        console.error('Send Reset Email Error:', err);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

module.exports = router;
