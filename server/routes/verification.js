/**
 * Verify & confirm the completed document, mounted at /api/verification.
 *
 * A request whose sender ticked "Verify and confirm the document when everyone has signed" is not finished the
 * moment the last recipient signs: it waits for a person to re-check the issued PDFs against the SHA-256
 * fingerprint registry and to confirm (or reject) them. The document owner may always do this; other users need
 * the `security.document_validity` permission (the same one that guards Settings · Document validity).
 *
 *   GET    /api/verification/:documentId          the record, its audit trail and what the caller may do
 *   POST   /api/verification/:documentId/check    re-run the integrity check only, nothing is confirmed
 *   POST   /api/verification/:documentId/confirm  { note }    verify and confirm
 *   POST   /api/verification/:documentId/reject   { reason }  verify and reject with a reason
 *   PUT    /api/verification/:documentId/setting  { required } the sender's checkbox (draft requests only)
 */
const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, userCan } = require('../utils/permissions');
const verification = require('../utils/documentVerification');

const router = express.Router();
router.use(authenticateUser);

// The tables are created on the first request, exactly like the other self-contained modules
router.use((req, res, next) => {
  verification.ensureVerificationSchema().then(() => next(), () => next());
});

const documentIdOf = (req) => parseInt(req.params.documentId, 10) || 0;

/** Loads the request and refuses early when the id is not a request of this installation. */
async function loadDocument(req, res) {
  const id = documentIdOf(req);
  if (!id) {
    res.status(400).json({ success: false, error: 'A document id is required.' });
    return null;
  }
  const context = await verification.getDocumentContext(id);
  if (!context) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return null;
  }
  return context;
}

/** The owner of the request, or any user holding `security.document_validity`, may confirm or reject. */
async function mayConfirm(req, context) {
  if (!context) return false;
  if (context.userId && req.user?.id && Number(context.userId) === Number(req.user.id)) return true;
  try {
    return await userCan(req.user, 'security.document_validity');
  } catch (err) {
    return false;
  }
}

/** Owner-or-permission guard; non-owners fall through to the standard permission response. */
function requireConfirmRights() {
  const permissionGuard = requirePermission('security.document_validity');
  return async (req, res, next) => {
    try {
      const context = await loadDocument(req, res);
      if (!context) return undefined;
      req.verificationDocument = context;
      if (context.userId && req.user?.id && Number(context.userId) === Number(req.user.id)) return next();
      return permissionGuard(req, res, next);
    } catch (err) {
      return next(err);
    }
  };
}

// @route GET /api/verification/:documentId
// @desc  Verification record, audit trail and whether the caller may confirm it
router.get('/:documentId', async (req, res) => {
  try {
    const context = await loadDocument(req, res);
    if (!context) return undefined;
    const data = await verification.getVerification(context.id);
    const canConfirm = await mayConfirm(req, context);
    return res.json({
      success: true,
      ...data,
      canConfirm,
      isOwner: Boolean(context.userId && req.user?.id && Number(context.userId) === Number(req.user.id)),
      canEditSetting: canConfirm && String(context.status || '').toLowerCase() === 'draft'
    });
  } catch (err) {
    console.error('Verification read error:', err);
    return res.status(500).json({ success: false, error: 'The verification of this document could not be read.' });
  }
});

// @route POST /api/verification/:documentId/check
// @desc  Re-run the fingerprint check of the issued PDFs without confirming anything
router.post('/:documentId/check', requireConfirmRights(), async (req, res) => {
  try {
    const data = await verification.checkOnly(req.verificationDocument.id, { req });
    return res.json({ success: true, ...data, message: data.integrity.message });
  } catch (err) {
    console.error('Verification check error:', err);
    return res.status(400).json({ success: false, error: err.message || 'The documents could not be checked.' });
  }
});

// @route POST /api/verification/:documentId/confirm
// @desc  Verify the issued PDFs and confirm the completed request
router.post('/:documentId/confirm', requireConfirmRights(), async (req, res) => {
  try {
    const data = await verification.confirmVerification(req.verificationDocument.id, { req, note: req.body?.note });
    return res.json({ success: true, ...data, message: 'The document was verified and confirmed.' });
  } catch (err) {
    console.error('Verification confirm error:', err);
    return res.status(400).json({ success: false, error: err.message || 'The document could not be confirmed.' });
  }
});

// @route POST /api/verification/:documentId/reject
// @desc  Reject the completed request with a reason
router.post('/:documentId/reject', requireConfirmRights(), async (req, res) => {
  try {
    const data = await verification.rejectVerification(req.verificationDocument.id, { req, reason: req.body?.reason });
    return res.json({ success: true, ...data, message: 'The document was rejected.' });
  } catch (err) {
    console.error('Verification reject error:', err);
    return res.status(400).json({ success: false, error: err.message || 'The document could not be rejected.' });
  }
});

// @route PUT /api/verification/:documentId/setting
// @desc  The sender's checkbox. A request that was already sent keeps the choice it was sent with.
router.put('/:documentId/setting', async (req, res) => {
  try {
    const context = await loadDocument(req, res);
    if (!context) return undefined;
    const isOwner = Boolean(context.userId && req.user?.id && Number(context.userId) === Number(req.user.id));
    if (!isOwner && !(await userCan(req.user, 'security.document_validity'))) {
      return res.status(403).json({ success: false, error: 'Only the owner of this request can change its confirmation step.' });
    }
    if (String(context.status || '').toLowerCase() !== 'draft') {
      return res.status(400).json({ success: false, error: 'This request was already sent, so its confirmation step can no longer be changed.' });
    }
    if (req.body?.required === undefined) {
      return res.status(400).json({ success: false, error: 'Send required: true or false.' });
    }
    const record = await verification.saveVerificationSetting(context.id, req.body.required, { userId: req.user?.id || null, req });
    return res.json({ success: true, verification: record });
  } catch (err) {
    console.error('Verification setting error:', err);
    return res.status(500).json({ success: false, error: 'The confirmation step could not be saved.' });
  }
});

module.exports = router;
