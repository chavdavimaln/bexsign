const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const requestHelpers = require('../utils/requestHelpers');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/emailService');
const { notify, logActivity, logFailedAccess } = require('../utils/platformEvents');
const { buildSession } = require('../utils/authSession');

// A new account is announced to the people who manage users
const announceNewUser = (user, how) => notify({
    permission: 'users.view',
    excludeUserId: user.id,
    category: 'user',
    title: `New user: ${`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}`,
    message: `${user.email} ${how}.`,
    link: '/users',
    entityType: 'user',
    entityId: user.id
});

// @route   POST /api/register or /api/auth/register
// @desc    Register a new BexSign user & save to MySQL database
router.post(['/register', '/auth/register'], async (req, res) => {
    const { firstName, lastName, first_name, last_name, email, password, company, job_title } = req.body;
    // The register page only asks for email + password; the name starts as the email's local part (editable in My Profile)
    const userFirstName = firstName || first_name || String(email || '').split('@')[0] || 'User';
    const userLastName = lastName || last_name || '';

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (first_name, last_name, email, password_hash, company, job_title) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(query, [userFirstName, userLastName, email, hashedPassword, company || null, job_title || null]);
        await logActivity({ req, userId: result.insertId, userEmail: email, category: 'auth', action: 'Registered a new account', entityType: 'user', entityId: result.insertId });
        await announceNewUser({ id: result.insertId, first_name: userFirstName, last_name: userLastName, email }, 'registered an account');

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
            await announceNewUser(user, 'signed in for the first time and an account was created');
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
                await logFailedAccess({ req, email, userId: user.id, source: 'login', reason: 'Sign-in to a deactivated account' });
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
                        await logFailedAccess({ req, email, userId: user.id, source: 'login', reason: 'Wrong password' });
                        return res.status(400).json({ error: 'Invalid password. Please check your credentials.' });
                    }
                } catch (bErr) {
                    if (storedHash !== password) {
                        await logFailedAccess({ req, email, userId: user.id, source: 'login', reason: 'Wrong password' });
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
        await logActivity({ req, userId: user.id, userEmail: user.email, category: 'auth', action: 'Signed in' });

        res.json({ message: 'Login successful', ...(await buildSession(user)) });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// @route   POST /api/change-password or /api/auth/change-password
// @desc    Self-service password change
router.post(['/change-password', '/auth/change-password'], async (req, res) => {
    const { email, newPassword, sendEmail } = req.body;
    const targetEmail = String(email || '').trim();

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!targetEmail) {
        return res.status(400).json({ error: 'The account email is required to change the password.' });
    }

    try {
        const [users] = await db.query('SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER(?)', [targetEmail]);
        const user = users[0];
        if (!user) {
            // Never fall back to another account: only the account with this email is changed
            return res.status(404).json({ success: false, error: `No BexSign account exists for ${targetEmail}.` });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);

        let emailed = false;
        if (sendEmail) {
            const confirmation = await sendPasswordChangedEmail({
                to: user.email,
                name: displayName(user),
                requestIp: requestHelpers.getRequestIp(req)
            });
            emailed = confirmation.success;
        }
        await logActivity({ req, userId: user.id, userEmail: user.email, category: 'auth', action: 'Changed the account password', entityType: 'user', entityId: user.id });
        await notify({
            userIds: [user.id],
            category: 'user',
            severity: 'warning',
            title: 'Your password was changed',
            message: `The password of ${user.email} was changed from IP ${requestHelpers.getRequestIp(req) || 'unknown'}. If this wasn't you, reset it right away.`,
            link: '/settings/profile'
        });

        res.json({
            success: true,
            emailed,
            message: sendEmail
                ? (emailed
                    ? `Password updated successfully! A confirmation email was sent to ${user.email}.`
                    : `Password updated successfully, but the confirmation email to ${user.email} could not be sent.`)
                : 'Password updated successfully!'
        });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ---- Password reset by email: a one-time link (only its SHA-256 hash is stored) that expires ----
const RESET_LINK_MINUTES = 60;
const hashResetToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

let resetTableReady = null;
function ensurePasswordResetTable() {
    if (!resetTableReady) {
        resetTableReady = db.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                requested_ip VARCHAR(64) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_token_hash (token_hash),
                KEY idx_reset_user (user_id)
            )
        `).catch((err) => {
            resetTableReady = null;
            throw err;
        });
    }
    return resetTableReady;
}

/** The user holding a valid (unused, unexpired) reset token, or null. */
async function findResetTokenUser(token) {
    if (!token) return null;
    await ensurePasswordResetTable();
    const [rows] = await db.query(
        `SELECT t.id AS token_id, u.id, u.email, u.first_name, u.last_name
         FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()`,
        [hashResetToken(token)]
    );
    return rows[0] || null;
}

const displayName = (user) => `${user.first_name || ''} ${user.last_name || ''}`.trim();

// @route   POST /api/send-reset-email or /api/auth/send-reset-email  { email }
// @desc    Email a password reset link ("Forgot password?" and My Profile "Send Password Change Link to Email")
router.post(['/send-reset-email', '/auth/send-reset-email', '/forgot-password'], async (req, res) => {
    const targetEmail = String(req.body.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        return res.status(400).json({ success: false, error: 'Enter the email address of your BexSign account.' });
    }
    const requestIp = requestHelpers.getRequestIp(req);

    try {
        await ensurePasswordResetTable();
        const [users] = await db.query('SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER(?)', [targetEmail]);
        const user = users[0];
        if (!user) {
            // Same answer as for a real account, so the form does not reveal which emails are registered
            console.warn(`[Password reset] No account for ${targetEmail}; no email sent`);
            await logFailedAccess({ req, email: targetEmail, source: 'password_reset', reason: 'Password reset requested for an email without an account' });
            return res.json({
                success: true,
                message: `If a BexSign account exists for ${targetEmail}, a password reset link has been emailed to it.`
            });
        }

        // A new link replaces any earlier link that was not used
        await db.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL', [user.id]);
        const token = crypto.randomBytes(32).toString('hex');
        await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)',
            [user.id, hashResetToken(token), RESET_LINK_MINUTES, requestIp]
        );

        const resetUrl = `${requestHelpers.getClientBaseUrl()}/reset-password?token=${token}`;
        const result = await sendPasswordResetEmail({
            to: user.email,
            name: displayName(user),
            resetUrl,
            expiresInMinutes: RESET_LINK_MINUTES,
            requestIp
        });
        if (!result.success) {
            await db.query('DELETE FROM password_reset_tokens WHERE token_hash = ?', [hashResetToken(token)]);
            return res.status(502).json({
                success: false,
                error: `The password reset email could not be sent to ${user.email}: ${result.error}`
            });
        }

        await logActivity({ req, userId: user.id, userEmail: user.email, category: 'auth', action: 'Requested a password reset link', entityType: 'user', entityId: user.id });
        res.json({
            success: true,
            message: `A password reset link has been emailed to ${user.email}. It is valid for ${RESET_LINK_MINUTES} minutes.`
        });
    } catch (err) {
        console.error('Send Reset Email Error:', err);
        res.status(500).json({ success: false, error: 'The password reset email could not be sent.' });
    }
});

// @route   GET /api/reset-password/verify?token=
// @desc    Checks a reset link before the new password is entered
router.get(['/reset-password/verify', '/auth/reset-password/verify'], async (req, res) => {
    try {
        const user = await findResetTokenUser(req.query.token);
        if (!user) {
            return res.status(400).json({ success: false, error: 'This password reset link is invalid, was already used or has expired. Request a new link.' });
        }
        res.json({ success: true, email: user.email, name: displayName(user) });
    } catch (err) {
        console.error('Verify Reset Token Error:', err);
        res.status(500).json({ success: false, error: 'The reset link could not be checked.' });
    }
});

// @route   POST /api/reset-password { token, newPassword }
// @desc    Sets a new password with a reset link; the link then stops working
router.post(['/reset-password', '/auth/reset-password'], async (req, res) => {
    const { token, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ success: false, error: 'The password must be at least 6 characters long.' });
    }
    try {
        const user = await findResetTokenUser(token);
        if (!user) {
            await logFailedAccess({ req, source: 'password_reset', reason: 'Password change with an invalid or expired reset link' });
            return res.status(400).json({ success: false, error: 'This password reset link is invalid, was already used or has expired. Request a new link.' });
        }
        const hashedPassword = await bcrypt.hash(String(newPassword), await bcrypt.genSalt(10));
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);
        await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [user.token_id]);
        await db.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL', [user.id]);

        const confirmation = await sendPasswordChangedEmail({
            to: user.email,
            name: displayName(user),
            requestIp: requestHelpers.getRequestIp(req)
        });
        await logActivity({ req, userId: user.id, userEmail: user.email, category: 'auth', action: 'Reset the account password with an email link', entityType: 'user', entityId: user.id });
        await notify({
            userIds: [user.id],
            category: 'user',
            severity: 'warning',
            title: 'Your password was reset',
            message: 'Your password was changed with a reset link. If this wasn\'t you, contact your administrator.',
            link: '/settings/profile'
        });
        res.json({
            success: true,
            email: user.email,
            message: `The password of ${user.email} has been changed. You can now sign in with the new password.`,
            confirmationEmailed: confirmation.success
        });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ success: false, error: 'The password could not be changed.' });
    }
});

module.exports = router;
