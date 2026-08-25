const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/settings/profile/:userId
// @desc    Get user profile details
router.get('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await db.query(
            'SELECT first_name, last_name, email, company, job_title, date_format, time_zone FROM users WHERE id = ? OR id = 1',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
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
    const { firstName, first_name, lastName, last_name, company, jobTitle, job_title, dateFormat, date_format, timeZone, time_zone } = req.body;
    
    const fName = firstName || first_name;
    const lName = lastName || last_name;
    const jTitle = jobTitle || job_title;
    const dFormat = dateFormat || date_format || 'MM/dd/yyyy';
    const tZone = timeZone || time_zone || 'Asia/Kolkata';

    try {
        const query = `UPDATE users SET first_name = ?, last_name = ?, company = ?, job_title = ?, date_format = ?, time_zone = ? WHERE id = ? OR id = 1`;
        await db.query(query, [fName, lName, company || null, jTitle || null, dFormat, tZone, userId]);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Database error while updating profile' });
    }
});

module.exports = router;
