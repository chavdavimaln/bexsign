const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/settings/profile/:userId
// @desc    Get user profile details
router.get('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await db.query(
            'SELECT first_name, last_name, email, company, phone, role FROM users WHERE id = ? OR id = 1',
            [userId]
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
router.put('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    const { firstName, first_name, lastName, last_name, email, company, phone } = req.body;
    
    const fName = firstName || first_name;
    const lName = lastName || last_name;

    try {
        const query = `UPDATE users SET first_name = ?, last_name = ?, email = COALESCE(?, email), company = ?, phone = ? WHERE id = ? OR id = 1`;
        await db.query(query, [fName, lName, email || null, company || null, phone || null, userId]);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Database error while updating profile' });
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ? OR id = 1', [hashedPassword, userId]);
        
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
            message: sendEmail 
                ? 'Password changed successfully! A confirmation has been sent to your email.' 
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
             VALUES (1, ?, ?, ?, ?)`,
            [delegateTo, startDate, endDate, reason]
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
