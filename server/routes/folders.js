/**
 * Folders API (/api/folders). A flat list of folders used to group documents (e.g. "Ola Digital Health",
 * "HomelyMD"). A document may belong to one folder or none; deleting a folder never deletes its documents,
 * it just clears their folder.
 */
const express = require('express');
const router = express.Router();
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const folderStore = require('../utils/folderStore');

// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);
router.use(async (req, res, next) => {
    try {
        await folderStore.ensureFoldersSchema();
        next();
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/folders
// @desc    Every folder with how many (non-trashed) documents are currently in it
router.get('/', async (req, res) => {
    try {
        const folders = await folderStore.listFolders();
        res.json({ success: true, folders });
    } catch (err) {
        console.error('[Folders] list failed:', err);
        res.status(500).json({ success: false, error: 'Folders could not be loaded.' });
    }
});

// @route   POST /api/folders { name, color? }
router.post('/', async (req, res) => {
    try {
        const folder = await folderStore.createFolder(req.body?.name, { color: req.body?.color, createdBy: req.user.id });
        res.status(201).json({ success: true, folder });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'The folder could not be created.' });
    }
});

// @route   PUT /api/folders/:id { name?, color? }
router.put('/:id', async (req, res) => {
    try {
        await folderStore.renameFolder(req.params.id, req.body?.name, req.body?.color);
        const folders = await folderStore.listFolders();
        const folder = folders.find((f) => f.id === (parseInt(req.params.id, 10) || 0));
        res.json({ success: true, folder });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'The folder could not be updated.' });
    }
});

// @route   DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
    try {
        await folderStore.deleteFolder(req.params.id);
        res.json({ success: true, message: 'Folder deleted. Its documents were moved to "No folder".' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'The folder could not be deleted.' });
    }
});

module.exports = router;
