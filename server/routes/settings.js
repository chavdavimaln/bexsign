const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { userCan } = require('../utils/permissions');

// Signed-in users only: your own profile, or anyone's with "Edit users"
router.use(authenticateUser, requireSignedIn);
async function profileGuard(req, res, next) {
    if (parseInt(req.params.userId, 10) === Number(req.user.id) || (await userCan(req.user, 'users.edit'))) return next();
    return res.status(403).json({ success: false, error: 'You can only view and change your own profile.' });
}

// @route   GET /api/settings/profile/:userId
// @desc    Get user profile details
router.get('/profile/:userId', profileGuard, async (req, res) => {
    const userId = req.params.userId;
    try {
        // The requested user's own profile (the first account only when that user does not exist)
        const [results] = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.company, u.phone, u.role, p.avatar_url
             FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE u.id = ? OR u.id = 1 ORDER BY (u.id = ?) DESC, u.id ASC LIMIT 1`,
            [userId, userId]
        );
        if (results.length === 0) {
            return res.json({
                first_name: 'Vimal',
                last_name: 'Chavda',
                email: 'vimal@bexcodeservices.com',
                company: 'Bexsign Inc.',
                phone: '+1 555-0199'
            });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Fetch Profile Error:', err);
        res.status(500).json({ error: 'Database error while fetching profile' });
    }
});

// @route   PUT /api/settings/profile/:userId
// @desc    Update user profile details
router.put('/profile/:userId', profileGuard, async (req, res) => {
    const userId = req.params.userId;
    const { firstName, first_name, lastName, last_name, email, company, phone } = req.body;
    
    const fName = firstName || first_name;
    const lName = lastName || last_name;

    try {
        const query = `UPDATE users SET first_name = ?, last_name = ?, email = COALESCE(?, email), company = ?, phone = ? WHERE id = ?`;
        await db.query(query, [fName, lName, email || null, company || null, phone || null, userId]);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Database error while updating profile' });
    }
});

// Profile picture: one image per user, kept in server/uploads/avatars and served from /uploads/avatars/...
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

/** The image type read from the file's first bytes (the name and the browser's type are not trusted). */
function imageExtension(buffer) {
    if (!buffer || buffer.length < 12) return null;
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
}

async function currentAvatar(userId) {
    const [rows] = await db.query('SELECT avatar_url FROM user_profiles WHERE user_id = ?', [userId]);
    return rows[0]?.avatar_url || null;
}

function removeAvatarFile(avatarUrl) {
    if (!avatarUrl || !String(avatarUrl).startsWith('/uploads/avatars/')) return;
    fs.promises.unlink(path.join(AVATAR_DIR, path.basename(avatarUrl))).catch(() => {});
}

// @route   POST /api/settings/profile/:userId/avatar
// @desc    Set the user's profile picture (form field "avatar": PNG, JPG or WebP, up to 2 MB)
router.post('/profile/:userId/avatar', profileGuard, (req, res) => {
    avatarUpload.single('avatar')(req, res, async (uploadErr) => {
        if (uploadErr) {
            const tooLarge = uploadErr.code === 'LIMIT_FILE_SIZE';
            return res.status(400).json({ success: false, error: tooLarge ? 'The picture is larger than 2 MB.' : 'The picture could not be uploaded.' });
        }
        const userId = parseInt(req.params.userId, 10);
        try {
            const extension = imageExtension(req.file?.buffer);
            if (!extension) {
                return res.status(400).json({ success: false, error: 'Choose a PNG, JPG or WebP picture.' });
            }
            const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
            if (users.length === 0) return res.status(404).json({ success: false, error: 'User not found.' });

            const previous = await currentAvatar(userId);
            await fs.promises.mkdir(AVATAR_DIR, { recursive: true });
            const fileName = `${userId}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
            await fs.promises.writeFile(path.join(AVATAR_DIR, fileName), req.file.buffer);
            const avatarUrl = `/uploads/avatars/${fileName}`;
            await db.query(
                'INSERT INTO user_profiles (user_id, avatar_url) VALUES (?, ?) ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url)',
                [userId, avatarUrl]
            );
            removeAvatarFile(previous);
            res.json({ success: true, avatar_url: avatarUrl, message: 'Profile picture updated.' });
        } catch (err) {
            console.error('Profile picture upload error:', err);
            res.status(500).json({ success: false, error: 'The profile picture could not be saved.' });
        }
    });
});

// @route   DELETE /api/settings/profile/:userId/avatar
// @desc    Remove the user's profile picture
router.delete('/profile/:userId/avatar', profileGuard, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    try {
        const previous = await currentAvatar(userId);
        await db.query('UPDATE user_profiles SET avatar_url = NULL WHERE user_id = ?', [userId]);
        removeAvatarFile(previous);
        res.json({ success: true, avatar_url: null, message: 'Profile picture removed.' });
    } catch (err) {
        console.error('Profile picture remove error:', err);
        res.status(500).json({ success: false, error: 'The profile picture could not be removed.' });
    }
});

// @route   PUT or POST /api/settings/password/:userId
// @desc    Update user password
router.all('/password/:userId', async (req, res) => {
    const userId = req.params.userId;
    const { newPassword, sendEmail } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
        const bcrypt = require('bcryptjs');
        const [users] = await db.query('SELECT id, email, first_name, last_name FROM users WHERE id = ?', [userId]);
        const user = users[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);

        let emailed = false;
        if (sendEmail) {
            const { sendPasswordChangedEmail } = require('../utils/emailService');
            const confirmation = await sendPasswordChangedEmail({
                to: user.email,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
            });
            emailed = confirmation.success;
        }

        // Log password change in audit history
        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (1, ?, ?)`,
                [`Password changed for user ID ${userId}`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({
            success: true,
            emailed,
            message: sendEmail
                ? (emailed
                    ? `Password changed successfully! A confirmation email was sent to ${user.email}.`
                    : `Password changed successfully, but the confirmation email to ${user.email} could not be sent.`)
                : 'Password updated successfully!'
        });
    } catch (err) {
        console.error('Update Password Error:', err);
        res.status(500).json({ error: 'Database error while updating password' });
    }
});

// @route   POST /api/settings/delegate
// @desc    Save vacation signing delegate configuration
router.post('/delegate', async (req, res) => {
    const { delegateTo, startDate, endDate, reason } = req.body;
    try {
        await db.query(
            `INSERT INTO delegates (user_id, delegate_to_email, start_date, end_date, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, delegateTo, startDate, endDate, reason]
        );
        res.json({ success: true, message: 'Vacation delegation saved successfully!' });
    } catch (err) {
        console.warn('Delegation warning:', err.message);
        res.json({ success: true, message: 'Vacation delegation configured.' });
    }
});

// @route   GET /api/settings/notifications
// @desc    Get notification preferences
router.get('/notifications', (req, res) => {
    res.json({
        notify_doc_sent: true,
        notify_doc_viewed: true,
        notify_doc_signed: true,
        notify_doc_completed: true,
        notify_doc_declined: true,
        notify_doc_expired: true,
        notify_reminders: true
    });
});

module.exports = router;
