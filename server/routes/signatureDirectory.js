/**
 * Signature directory API (/api/signature-directory)
 *
 * Splits the signature module in two:
 *   /mine        the signed-in user's own signatures, in full, editable
 *   /directory   everyone else's, view only - other people's signatures are confidential and the server
 *                refuses to change them no matter what the client sends
 *
 * Every write is checked against the row's owner, so a crafted request cannot touch another account's stamp.
 */
const express = require('express');
const router = express.Router();
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');
const store = require('../utils/signatureStore');

// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);

/** Turns a store error (which carries .status) into the matching HTTP response. */
function fail(res, err, fallback = 'The signature could not be saved.') {
  const status = err && err.status ? err.status : 500;
  if (status >= 500) console.error('[SignatureDirectory]', err);
  return res.status(status).json({ success: false, error: err?.message || fallback });
}

// @route   GET /api/signature-directory/mine
// @desc    The caller's own signatures (editable)
router.get('/mine', async (req, res) => {
    try {
        const signatures = await store.listOwnSignatures(req.user);
        res.json({
            success: true,
            signatures,
            owner: {
                id: req.user?.id || null,
                email: req.user?.email || '',
                name: [req.user?.first_name, req.user?.last_name].filter(Boolean).join(' ').trim() || null,
                designation: req.user?.designation || null,
                department: req.user?.department || null
            }
        });
    } catch (err) {
        fail(res, err, 'Your signatures could not be loaded.');
    }
});

// @route   GET /api/signature-directory/directory
// @desc    Everyone else's signatures - view only, never editable
router.get('/directory', async (req, res) => {
    try {
        const signatures = await store.listDirectorySignatures(req.user);
        res.json({
            success: true,
            readOnly: true,
            notice: 'These signatures belong to other people. They are confidential and can only be changed by their owner.',
            signatures
        });
    } catch (err) {
        fail(res, err, 'The directory could not be loaded.');
    }
});

// @route   POST /api/signature-directory
// @desc    Create a signature owned by the caller
router.post('/', requirePermission('signatures.manage'), async (req, res) => {
    try {
        const signature = await store.createSignature(req.user, req.body || {});
        res.status(201).json({ success: true, message: 'Signature registered.', signature });
    } catch (err) {
        fail(res, err);
    }
});

// @route   PUT /api/signature-directory/:id
// @desc    Update one of the caller's own signatures (403 for anyone else's)
router.put('/:id', requirePermission('signatures.manage'), async (req, res) => {
    try {
        const signature = await store.updateSignature(req.user, req.params.id, req.body || {});
        res.json({ success: true, message: 'Signature updated.', signature });
    } catch (err) {
        fail(res, err);
    }
});

// @route   DELETE /api/signature-directory/:id
// @desc    Delete one of the caller's own signatures (403 for anyone else's)
router.delete('/:id', requirePermission('signatures.manage'), async (req, res) => {
    try {
        const removed = await store.deleteSignature(req.user, req.params.id);
        res.json({ success: true, message: 'Signature removed.', ...removed });
    } catch (err) {
        fail(res, err, 'The signature could not be removed.');
    }
});

// @route   POST /api/signature-directory/:id/default
// @desc    Use this signature to prefill the caller's signing screens
router.post('/:id/default', requirePermission('signatures.manage'), async (req, res) => {
    try {
        const signature = await store.setDefaultSignature(req.user, req.params.id);
        res.json({ success: true, message: 'Default signature updated.', signature });
    } catch (err) {
        fail(res, err, 'The default signature could not be set.');
    }
});

// @route   GET /api/signature-directory/:id/history
// @desc    Where the caller's own signature has been used (403 for anyone else's)
router.get('/:id/history', async (req, res) => {
    try {
        const signature = await store.requireOwnedSignature(req.user, req.params.id);
        const history = await store.getSignatureHistory(signature.id, { limit: parseInt(req.query.limit, 10) || 100 });
        res.json({
            success: true,
            signatureId: signature.id,
            signature: { id: signature.id, signature_id: signature.signature_id, display_name: signature.display_name },
            summary: store.summarizeHistory(history),
            history
        });
    } catch (err) {
        fail(res, err, 'The signature history could not be loaded.');
    }
});

module.exports = router;
