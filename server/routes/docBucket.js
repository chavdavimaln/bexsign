/**
 * Doc bucket endpoints (doc/31-doc-bucket.md).
 *
 *   GET  /api/doc-bucket/status          which provider is in use and whether it is usable
 *   POST /api/doc-bucket/self-test       writes, reads back and deletes one tiny object
 *   GET  /api/doc-bucket/file/<key>      streams one object (mainly for support and debugging)
 *
 * Status and the self test need a signed-in user with the developer settings permission, so the
 * bucket name and region are not public. Documents themselves keep being served at /uploads/...
 * exactly as before - see docBucket.uploadsFallback() in server/index.js.
 */

const express = require('express');
const router = express.Router();
const bucket = require('../utils/docBucket');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');

router.use(authenticateUser, requireSignedIn);

router.get('/status', requirePermission('settings.developer'), (req, res) => {
  res.json({ success: true, bucket: bucket.status() });
});

router.post('/self-test', requirePermission('settings.developer'), async (req, res) => {
  const result = await bucket.selfTest();
  res.status(result.success ? 200 : 502).json({ success: result.success, ...result });
});

// @route   GET /api/doc-bucket/where?path=/uploads/documents/2026/10/1793-contract.pdf
// @desc    Where one document actually is: the store that holds it, its key, its size, and whether this server
//          also keeps a cached copy. The answer to "was that download served from S3?" for a specific file -
//          `path` is the file_path the database stores, exactly as the app shows it.
// @access  Signed in (settings.developer)
router.get('/where', requirePermission('settings.developer'), async (req, res) => {
  const given = String(req.query.path || req.query.key || '').trim();
  if (!given) return res.status(400).json({ success: false, error: 'Pass ?path= the stored file path or key.' });
  const key = bucket.keyFromPath(given);
  try {
    const info = await bucket.stat(key);
    return res.json({
      success: true,
      path: given,
      key,
      provider: bucket.provider(),
      inBucket: Boolean(info),
      size: info ? info.size : null,
      contentType: info ? info.contentType || bucket.contentTypeFor(key) : null,
      // With a remote provider a cached copy makes reads local; the bucket still holds the authoritative file
      cachedOnThisServer: bucket.hasLocalCopy(key),
      servedFrom: info ? (bucket.isRemote() ? bucket.provider() : 'this server') : 'not found'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/file/*', async (req, res) => {
  const key = bucket.normalizeKey(req.params[0] || '');
  if (!key) return res.status(400).json({ success: false, error: 'A file key is required.' });
  try {
    const info = await bucket.stat(key);
    if (!info) return res.status(404).json({ success: false, error: 'That file is not in the doc bucket.' });
    res.setHeader('Content-Type', info.contentType || bucket.contentTypeFor(key));
    if (info.size) res.setHeader('Content-Length', String(info.size));
    const stream = await bucket.getStream(key);
    stream.on('error', (err) => {
      console.warn(`[Doc bucket] ${key} could not be streamed: ${err.message}`);
      if (res.headersSent) res.end();
      else res.status(502).json({ success: false, error: 'The file could not be read from the doc bucket.' });
    });
    return stream.pipe(res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
