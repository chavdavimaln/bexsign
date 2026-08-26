const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/trash
// @desc    Get all trashed documents
router.get('/', async (req, res) => {
    try {
        const [trashedDocs] = await db.query(
            `SELECT * FROM documents WHERE status = 'trashed' ORDER BY updated_at DESC`
        );
        res.json({ documents: trashedDocs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/trash/restore/:id
// @desc    Restore a document from trash
router.post('/restore/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`UPDATE documents SET status = 'draft' WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Document restored to Drafts' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/trash/delete/:id
// @desc    Permanently delete a document
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM documents WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Document permanently deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
