const express = require('express');
const router = express.Router();
const db = require('../db');
const { OWNER_JOIN, OWNER_COLUMNS } = require('../utils/requestHelpers');

// @route   GET /api/trash
// @desc    Get all trashed documents
router.get('/', async (req, res) => {
    try {
        const [trashedDocs] = await db.query(
            `SELECT d.*, 
                    di.bexsign_doc_id, 
                    di.signer_name, 
                    di.signer_email, 
                    di.signature_status, 
                    di.signature_image,
                    di.signature_style,
                    di.signed_at,
                    ${OWNER_COLUMNS}
             FROM documents d
             LEFT JOIN document_identifiers di ON d.id = di.document_id
             ${OWNER_JOIN}
             WHERE LOWER(d.status) = 'trashed'
             ORDER BY d.updated_at DESC`
        );
        res.json({ success: true, documents: trashedDocs });
    } catch (err) {
        console.error('Fetch Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/trash/move/:id
// @desc    Move a document to trash
router.post('/move/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`UPDATE documents SET status = 'Trashed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Document moved to trash.' });
    } catch (err) {
        console.error('Move To Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/trash/bulk-move
// @desc    Move multiple documents to trash
router.post('/bulk-move', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
    }
    try {
        await db.query(`UPDATE documents SET status = 'Trashed', updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`, [ids]);
        res.json({ success: true, message: `${ids.length} document(s) moved to trash.` });
    } catch (err) {
        console.error('Bulk Move To Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/trash/restore/:id
// @desc    Restore a document from trash to Draft
router.post('/restore/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`UPDATE documents SET status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Document restored to Drafts.' });
    } catch (err) {
        console.error('Restore From Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/trash/bulk-restore
// @desc    Restore multiple documents from trash
router.post('/bulk-restore', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
    }
    try {
        await db.query(`UPDATE documents SET status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`, [ids]);
        res.json({ success: true, message: `${ids.length} document(s) restored to Drafts.` });
    } catch (err) {
        console.error('Bulk Restore Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/trash/delete/:id or DELETE /api/trash/:id
// @desc    Permanently delete a document
const deletePermanently = async (req, res) => {
    const { id } = req.params;
    try {
        try {
            await db.query('DELETE FROM document_identifiers WHERE document_id = ?', [id]);
        } catch (e) {}
        await db.query('DELETE FROM documents WHERE id = ?', [id]);
        res.json({ success: true, message: 'Document permanently deleted.' });
    } catch (err) {
        console.error('Permanent Delete Error:', err);
        res.status(500).json({ error: err.message });
    }
};

router.delete('/delete/:id', deletePermanently);
router.delete('/:id', deletePermanently);

// @route   POST /api/trash/bulk-delete
// @desc    Permanently delete multiple documents
router.post('/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
    }
    try {
        try {
            await db.query('DELETE FROM document_identifiers WHERE document_id IN (?)', [ids]);
        } catch (e) {}
        await db.query('DELETE FROM documents WHERE id IN (?)', [ids]);
        res.json({ success: true, message: `${ids.length} document(s) permanently deleted.` });
    } catch (err) {
        console.error('Bulk Permanent Delete Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
