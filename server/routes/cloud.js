/**
 * Cloud storage import API (/api/cloud): "Add document > Cloud" on the Send for signatures page.
 *
 *   GET    /providers                 the providers this user can use, and which of them are connected
 *   POST   /:provider/connect         returns the provider's consent URL (the client opens it in a popup)
 *   GET    /:provider/callback        the provider returns here; stores the tokens and closes the popup   (public)
 *   GET    /:provider/files           ?folder=&q=&cursor=  folders and files of the connected account
 *   POST   /:provider/import          { fileId }  downloads one file: its bytes (base64) and the text read from it
 *   DELETE /:provider                 forgets the connected account
 *
 * Providers: google-drive, dropbox-files, onedrive, box (see utils/cloudStorage.js).
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission, userCan } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const { JWT_SECRET } = require('../utils/authSession');
const cloud = require('../utils/cloudStorage');

const fail = (res, err, fallback) => {
    const status = err instanceof cloud.CloudError ? err.status : 500;
    if (status >= 500) console.error('[Cloud]', err);
    res.status(status).json({ success: false, error: err instanceof cloud.CloudError ? err.message : fallback, code: err.code || null });
};

/** Public address of this API: the redirect URI registered with every provider starts with it. */
const callbackUrl = (req, key) => {
    const base = (process.env.OAUTH_CALLBACK_BASE_URL || process.env.PUBLIC_API_URL
        || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`).replace(/\/$/, '');
    return `${base}/api/cloud/${key}/callback`;
};

/** The small page shown in the popup: tells the opener how it went and closes itself. */
function popupPage(res, { provider, label, ok, message }) {
    const payload = JSON.stringify({ source: 'bexsign-cloud', provider, ok, message }).replace(/</g, '\\u003c');
    const safe = String(message || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    res.status(ok ? 200 : 400).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ok ? 'Connected' : 'Not connected'} - BexSign</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 32px;max-width:380px;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,.08)}
  .dot{width:44px;height:44px;border-radius:999px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;background:${ok ? '#00a884' : '#e11d48'}}
  h1{font-size:16px;margin:0 0 6px} p{font-size:13px;line-height:1.5;color:#475569;margin:0}
</style></head>
<body><div class="card"><div class="dot">${ok ? '&#10003;' : '!'}</div>
<h1>${ok ? `${label} is connected` : `${label} was not connected`}</h1>
<p>${ok ? 'You can close this window and go back to BexSign.' : safe}</p></div>
<script>
  try { if (window.opener) window.opener.postMessage(${payload}, '*'); } catch (e) {}
  ${ok ? 'setTimeout(function () { window.close(); }, 700);' : ''}
</script></body></html>`);
}

// @route   GET /api/cloud/:provider/callback   (public: the browser arrives here from the provider)
router.get('/:provider/callback', async (req, res) => {
    const key = req.params.provider;
    const known = cloud.PROVIDERS[key];
    const label = known?.label || 'The storage account';
    let state;
    try {
        state = jwt.verify(String(req.query.state || ''), JWT_SECRET);
        if (state.purpose !== 'cloud_connect' || state.provider !== key) throw new Error('state mismatch');
    } catch (e) {
        return popupPage(res, { provider: key, label, ok: false, message: 'The connection request expired. Close this window and click Connect again.' });
    }
    if (req.query.error) {
        return popupPage(res, {
            provider: key,
            label,
            ok: false,
            message: req.query.error === 'access_denied'
                ? 'You cancelled the connection. Nothing was changed.'
                : `${label} refused the connection: ${req.query.error_description || req.query.error}`
        });
    }
    try {
        const provider = await cloud.resolveProvider(key);
        if (!provider || provider.hidden || !provider.configured) throw new cloud.CloudError(`${label} is not set up on this server.`);
        const account = await cloud.completeConnection(provider, String(req.query.code || ''), callbackUrl(req, key), state.uid);
        await logActivity({ req, userId: state.uid, category: 'integration', action: `Connected ${provider.label}${account.email ? ` (${account.email})` : ''} for adding documents` });
        popupPage(res, { provider: key, label, ok: true, message: account.email || '' });
    } catch (err) {
        if (!(err instanceof cloud.CloudError)) console.error('[Cloud] callback', err);
        popupPage(res, { provider: key, label, ok: false, message: err instanceof cloud.CloudError ? err.message : 'The connection could not be completed. Please try again.' });
    }
});

// Everything else needs a signed-in user
router.use(authenticateUser, requireSignedIn);

// @route   GET /api/cloud/providers
router.get('/providers', async (req, res) => {
    try {
        res.json({
            success: true,
            providers: await cloud.listProviders(req.user.id),
            // Whether this user may open Settings > Integrations to set a provider up
            canConfigure: await userCan(req.user, 'settings.integrations'),
            maxFileSizeMb: Math.round(cloud.MAX_IMPORT_BYTES / (1024 * 1024)),
            fileTypes: cloud.IMPORT_EXTENSIONS
        });
    } catch (err) {
        fail(res, err, 'The cloud storage providers could not be loaded.');
    }
});

const canAdd = requirePermission('documents.create');

// @route   POST /api/cloud/:provider/connect
router.post('/:provider/connect', canAdd, async (req, res) => {
    try {
        const provider = await cloud.resolveProvider(req.params.provider);
        if (!provider || provider.hidden) throw new cloud.CloudError('Unknown storage provider.', 404);
        if (!provider.configured) {
            throw new cloud.CloudError(`${provider.label} is not set up yet. An administrator adds its app credentials in Settings > Integrations, or ${provider.envHint} in server/.env.`, 400, 'not_configured');
        }
        const state = jwt.sign(
            { purpose: 'cloud_connect', provider: provider.key, uid: req.user.id, nonce: crypto.randomBytes(8).toString('hex') },
            JWT_SECRET,
            { expiresIn: '10m' }
        );
        res.json({ success: true, url: cloud.buildAuthorizeUrl(provider, callbackUrl(req, provider.key), state) });
    } catch (err) {
        fail(res, err, 'The connection could not be started.');
    }
});

// @route   GET /api/cloud/:provider/files?folder=&q=&cursor=
router.get('/:provider/files', canAdd, async (req, res) => {
    try {
        const result = await cloud.listFiles(req.user.id, req.params.provider, { folder: req.query.folder, query: req.query.q, cursor: req.query.cursor });
        res.json({ success: true, ...result });
    } catch (err) {
        fail(res, err, 'The files could not be listed.');
    }
});

// @route   POST /api/cloud/:provider/import { fileId }
router.post('/:provider/import', canAdd, async (req, res) => {
    try {
        const file = await cloud.importFile(req.user.id, req.params.provider, req.body?.fileId);
        res.json({
            success: true,
            file: { name: file.name, mimeType: file.mimeType, size: file.size, base64: file.buffer.toString('base64') },
            // The text read from the file becomes the document's text; null = nothing readable (image, scan)
            text: file.text
        });
    } catch (err) {
        fail(res, err, 'The file could not be added.');
    }
});

// @route   DELETE /api/cloud/:provider
router.delete('/:provider', async (req, res) => {
    try {
        const removed = await cloud.disconnect(req.user.id, req.params.provider);
        if (removed) await logActivity({ req, category: 'integration', action: `Disconnected ${cloud.PROVIDERS[req.params.provider]?.label || req.params.provider}` });
        res.json({ success: true, removed });
    } catch (err) {
        fail(res, err, 'The account could not be disconnected.');
    }
});

module.exports = router;
