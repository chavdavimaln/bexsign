const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/reports/stats/:userId
// @desc    Get document status statistics for charts and reporting
router.get('/stats/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const query = `SELECT status, COUNT(*) as count FROM documents WHERE user_id = ? OR user_id = 1 GROUP BY status`;
        const [results] = await db.query(query, [userId]);
        res.json(results);
    } catch (err) {
        console.error('Fetch Report Stats Error:', err);
        res.status(500).json({ error: 'Database error while fetching report stats' });
    }
});

// @route   GET /api/reports/timeline/:userId
// @desc    Get document timeline and activity logs
router.get('/timeline/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const query = `
            SELECT d.document_name, d.status, d.recipient_email, a.activity_description, a.time_of_activity 
            FROM documents d 
            LEFT JOIN activity_history a ON d.id = a.document_id 
            WHERE d.user_id = ? OR d.user_id = 1
            ORDER BY a.time_of_activity DESC
        `;
        const [results] = await db.query(query, [userId]);
        res.json(results);
    } catch (err) {
        console.error('Fetch Timeline Error:', err);
        res.status(500).json({ error: 'Database error while fetching timeline' });
    }
});

module.exports = router;
