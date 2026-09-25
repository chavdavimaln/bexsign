/**
 * Public REST API (/api/v1), authenticated with API keys: "Authorization: Bearer bxs_live_..." or "X-API-Key: ...".
 * Keys are looked up by SHA-256 hash and must be active (not revoked or expired); the API must be enabled in
 * Developer settings, sandbox keys need sandbox mode, and the caller must pass the CORS origin list and IP allowlist.
 * Each key has a per-minute rate limit (429 + Retry-After). Every request is written to api_logs.
 * Errors: { success: false, error: 'Human readable message', code: 'machine_code' }.
 */
const express = require('express');
const crypto = require('crypto');
const net = require('net');
const router = express.Router();
const db = require('../db');
const { logFailedAccess } = require('../utils/platformEvents');
const { getRequestIp } = require('../utils/requestHelpers');
const { getDeveloperSettings, ensureDeliverySchema, parseJsonArray, parseList, purgeExpiredLogs, userName } = require('../utils/developerApi');

const fail = (res, status, code, error, extra = {}) => res.status(status).json({ success: false, error, code, ...extra });

// ---------------------------------------------------------------- request log

router.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const endpoint = `${req.baseUrl}${req.path}`.slice(0, 255);
    db.query(
      'INSERT INTO api_logs (api_key_id, oauth_app_id, endpoint, method, status_code, ip_address, duration_ms, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.apiKey?.id || null, req.oauthApp?.id || null, endpoint, String(req.method).slice(0, 10), res.statusCode, getRequestIp(req),
        Date.now() - started, String(req.headers['user-agent'] || '').slice(0, 255) || null
      ]
    ).catch((err) => console.warn('[API] request log failed:', err.message));
  });
  next();
});

// ---------------------------------------------------------------- API key authentication

function readKey(req) {
  const header = String(req.headers.authorization || '').trim();
  if (/^bearer\s+/i.test(header)) return header.replace(/^bearer\s+/i, '').trim();
  return String(req.headers['x-api-key'] || '').trim();
}

function ipToLong(ip) {
  return ip.split('.').reduce((acc, part) => (acc * 256) + Number(part), 0);
}

function ipAllowed(ip, entries) {
  if (!ip) return false;
  return entries.some((entry) => {
    const [base, bits] = entry.split('/');
    if (bits === undefined) return base === ip || (base === '127.0.0.1' && ip === '::1') || (base === '::1' && ip === '127.0.0.1');
    if (net.isIPv4(base) && net.isIPv4(ip)) {
      const size = Number(bits);
      const mask = size === 0 ? 0 : (0xffffffff << (32 - size)) >>> 0;
      return ((ipToLong(ip) & mask) >>> 0) === ((ipToLong(base) & mask) >>> 0);
    }
    return base === ip;
  });
}

// Fixed one-minute window per key (in memory: resets when the server restarts)
const rateWindows = new Map();
function takeRateSlot(keyId, limit) {
  const now = Date.now();
  let win = rateWindows.get(keyId);
  if (!win || now - win.start >= 60000) {
    win = { start: now, count: 0 };
    rateWindows.set(keyId, win);
  }
  win.count += 1;
  const resetIn = Math.max(1, Math.ceil((win.start + 60000 - now) / 1000));
  return { allowed: win.count <= limit, remaining: Math.max(0, limit - win.count), resetIn };
}
setInterval(() => {
  const now = Date.now();
  for (const [id, win] of rateWindows) if (now - win.start >= 60000) rateWindows.delete(id);
}, 5 * 60 * 1000).unref();

async function authenticateApiKey(req, res, next) {
  try {
    await ensureDeliverySchema();
    purgeExpiredLogs();
    const settings = await getDeveloperSettings();

    // CORS: browsers may only call the API from the allowed origins (when a list is set)
    const origins = parseList(settings.allowed_origins);
    const origin = req.headers.origin;
    if (origin && origins.length && !origins.includes('*') && !origins.includes(origin)) {
      res.removeHeader('Access-Control-Allow-Origin');
      return fail(res, 403, 'origin_not_allowed', `Requests from ${origin} are not allowed. Add it to the allowed origins in Developer settings.`);
    }
    if (origin && origins.length) res.setHeader('Access-Control-Allow-Origin', origins.includes('*') ? '*' : origin);

    if (!settings.api_enabled) {
      return fail(res, 503, 'api_disabled', 'The BexSign API is turned off. An administrator can turn it on in Developer settings.');
    }

    const ip = getRequestIp(req);
    const allowlist = parseList(settings.ip_allowlist);
    if (allowlist.length && !ipAllowed(ip, allowlist)) {
      await logFailedAccess({ req, source: 'api', reason: `API request from an IP address that is not on the allowlist (${ip || 'unknown'})` });
      return fail(res, 403, 'ip_not_allowed', `Your IP address (${ip || 'unknown'}) is not on the API allowlist.`);
    }

    const key = readKey(req);
    if (!key) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="BexSign API"');
      return fail(res, 401, 'missing_api_key', 'Send your API key in the Authorization header ("Bearer bxs_live_...") or in X-API-Key.');
    }
    // OAuth access tokens (client credentials of an OAuth app) work like API keys
    if (key.startsWith('bxo_')) return authenticateOAuthToken(req, res, next, key, settings);

    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const [rows] = await db.query(
      `SELECT k.*, u.first_name, u.last_name, u.email, u.company, p.status AS owner_status
       FROM api_keys k JOIN users u ON u.id = k.user_id LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE k.key_hash = ? LIMIT 1`,
      [hash]
    );
    const row = rows[0];
    const shown = `${key.slice(0, 13)}…`;
    if (!row) {
      await logFailedAccess({ req, source: 'api', reason: `Invalid API key (${shown})` });
      res.setHeader('WWW-Authenticate', 'Bearer realm="BexSign API", error="invalid_token"');
      return fail(res, 401, 'invalid_api_key', 'The API key is not valid.');
    }
    req.apiKey = row;
    const rejectKey = async (status, code, message, reason) => {
      await logFailedAccess({ req, userId: row.user_id, email: row.email, source: 'api', reason: `${reason} (${row.api_key}, "${row.name}")` });
      return fail(res, status, code, message);
    };
    if (row.revoked_at) return rejectKey(401, 'revoked_api_key', 'This API key was revoked.', 'Revoked API key used');
    if (row.expires_at && new Date(row.expires_at) <= new Date()) return rejectKey(401, 'expired_api_key', 'This API key has expired.', 'Expired API key used');
    if (row.owner_status === 'inactive') return rejectKey(403, 'account_inactive', 'The account that owns this API key is deactivated.', 'API key of a deactivated account used');
    if (row.environment === 'sandbox' && !settings.sandbox_mode) {
      return fail(res, 403, 'sandbox_disabled', 'Sandbox keys are turned off. An administrator can turn on sandbox mode in Developer settings.');
    }

    const limit = Math.max(1, parseInt(settings.rate_limit_per_minute, 10) || 60);
    const slot = takeRateSlot(row.id, limit);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(slot.remaining));
    res.setHeader('X-RateLimit-Reset', String(slot.resetIn));
    if (!slot.allowed) {
      res.setHeader('Retry-After', String(slot.resetIn));
      return fail(res, 429, 'rate_limited', `Rate limit of ${limit} requests per minute exceeded. Retry in ${slot.resetIn} s.`, { retry_after: slot.resetIn });
    }

    db.query('UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = ?', [row.id])
      .catch((err) => console.warn('[API] key usage update failed:', err.message));
    req.apiScopes = parseJsonArray(row.permissions, []);
    req.rateLimit = { limit, remaining: slot.remaining, reset: slot.resetIn };
    next();
  } catch (err) {
    console.error('[API] authentication failed:', err.message);
    fail(res, 500, 'server_error', 'The request could not be authenticated. Try again later.');
  }
}

/** Bearer bxo_... tokens from POST /api/oauth/token. Same checks as an API key: active, owner active, rate limit. */
async function authenticateOAuthToken(req, res, next, token, settings) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await db.query(
    `SELECT t.id AS token_id, t.scopes AS token_scopes, t.expires_at, t.revoked_at, t.token_prefix, t.created_at AS token_created_at,
            a.id AS app_id, a.name AS app_name, a.client_id, a.is_active, a.user_id,
            u.first_name, u.last_name, u.email, u.company, p.status AS owner_status
     FROM oauth_access_tokens t JOIN oauth_apps a ON a.id = t.app_id JOIN users u ON u.id = a.user_id
     LEFT JOIN user_profiles p ON p.user_id = u.id WHERE t.token_hash = ? LIMIT 1`,
    [hash]
  );
  const row = rows[0];
  if (!row) {
    await logFailedAccess({ req, source: 'api', reason: `Invalid OAuth access token (${token.slice(0, 12)}…)` });
    res.setHeader('WWW-Authenticate', 'Bearer realm="BexSign API", error="invalid_token"');
    return fail(res, 401, 'invalid_token', 'The access token is not valid.');
  }
  req.oauthApp = { id: row.app_id, name: row.app_name, client_id: row.client_id };
  if (row.revoked_at) return fail(res, 401, 'invalid_token', 'This access token was revoked.');
  if (new Date(row.expires_at) <= new Date()) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="BexSign API", error="invalid_token", error_description="expired"');
    return fail(res, 401, 'token_expired', 'This access token has expired. Request a new one from /api/oauth/token.');
  }
  if (!row.is_active) return fail(res, 401, 'app_disabled', 'The OAuth app of this token is turned off.');
  if (row.owner_status === 'inactive') return fail(res, 403, 'account_inactive', 'The account that owns this OAuth app is deactivated.');

  const limit = Math.max(1, parseInt(settings.rate_limit_per_minute, 10) || 60);
  const slot = takeRateSlot(`oauth:${row.app_id}`, limit);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(slot.remaining));
  res.setHeader('X-RateLimit-Reset', String(slot.resetIn));
  if (!slot.allowed) {
    res.setHeader('Retry-After', String(slot.resetIn));
    return fail(res, 429, 'rate_limited', `Rate limit of ${limit} requests per minute exceeded. Retry in ${slot.resetIn} s.`, { retry_after: slot.resetIn });
  }
  db.query('UPDATE oauth_access_tokens SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = ?', [row.token_id]).catch(() => {});
  db.query('UPDATE oauth_apps SET last_used_at = NOW() WHERE id = ?', [row.app_id]).catch(() => {});
  // Shaped like an API key row so every endpoint works unchanged
  req.apiKey = {
    id: null, name: row.app_name, key_prefix: row.token_prefix, environment: 'live', user_id: row.user_id,
    created_at: row.token_created_at, expires_at: row.expires_at, first_name: row.first_name, last_name: row.last_name,
    email: row.email, company: row.company, auth: 'oauth', client_id: row.client_id
  };
  req.apiScopes = parseJsonArray(row.token_scopes, []);
  req.rateLimit = { limit, remaining: slot.remaining, reset: slot.resetIn };
  return next();
}

const requireScope = (scope) => (req, res, next) => {
  if (req.apiScopes?.includes(scope)) return next();
  return fail(res, 403, 'insufficient_scope', `This API key does not have the "${scope}" scope.`, { required_scope: scope });
};

router.use(authenticateApiKey);

// ---------------------------------------------------------------- helpers

function pagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size ?? query.pageSize ?? query.limit, 10) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
const pageInfo = (page, pageSize, total) => ({ page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) });

const statusKey = (status) => String(status || 'draft').trim().toLowerCase().replace(/\s+/g, '_');
const NOT_TRASHED = "LOWER(COALESCE(d.status, '')) <> 'trashed'";

// ---------------------------------------------------------------- endpoints

// @route   GET /api/v1/me
router.get('/me', (req, res) => {
  const k = req.apiKey;
  res.json({
    success: true,
    data: {
      key: { id: k.id, name: k.name, prefix: k.key_prefix, environment: k.environment, scopes: req.apiScopes, created_at: k.created_at, expires_at: k.expires_at, auth: k.auth || 'api_key', ...(k.client_id ? { client_id: k.client_id } : {}) },
      owner: { id: k.user_id, name: userName(k), email: k.email, company: k.company || null },
      rate_limit: req.rateLimit
    }
  });
});

// @route   GET /api/v1/documents?status=&search=&page=&page_size=
router.get('/documents', requireScope('documents:read'), async (req, res) => {
  try {
    const { page, pageSize, offset } = pagination(req.query);
    const where = ['d.user_id = ?', NOT_TRASHED];
    const params = [req.apiKey.user_id];
    if (req.query.status && req.query.status !== 'all') {
      where.push("LOWER(REPLACE(d.status, ' ', '_')) = ?");
      params.push(statusKey(req.query.status));
    }
    if (req.query.search) {
      where.push('d.document_name LIKE ?');
      params.push(`%${String(req.query.search).slice(0, 100)}%`);
    }
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM documents d WHERE ${where.join(' AND ')}`, params);
    const [rows] = await db.query(
      `SELECT d.id, d.document_name, d.status, d.signing_order, d.created_at, d.updated_at, d.sent_at, d.completed_at,
              (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = d.id) AS recipients_count,
              (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = d.id AND r.status = 'signed') AS signed_count
       FROM documents d WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      success: true,
      data: rows.map((d) => ({
        id: d.id,
        name: d.document_name,
        status: statusKey(d.status),
        status_label: d.status,
        signing_order: d.signing_order,
        recipients_count: Number(d.recipients_count),
        signed_count: Number(d.signed_count),
        created_at: d.created_at,
        updated_at: d.updated_at,
        sent_at: d.sent_at,
        completed_at: d.completed_at
      })),
      pagination: pageInfo(page, pageSize, total)
    });
  } catch (err) {
    console.error('[API] documents failed:', err.message);
    fail(res, 500, 'server_error', 'Documents could not be loaded.');
  }
});

// @route   GET /api/v1/documents/:id
router.get('/documents/:id', requireScope('documents:read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return fail(res, 400, 'invalid_id', 'The document id must be a number.');
    const [docs] = await db.query(
      `SELECT d.* FROM documents d WHERE d.id = ? AND d.user_id = ? AND ${NOT_TRASHED}`,
      [id, req.apiKey.user_id]
    );
    const d = docs[0];
    if (!d) return fail(res, 404, 'not_found', `Document ${id} was not found.`);
    const [recipients] = await db.query(
      `SELECT id, name, email, role, status, signing_order_index, sent_at, viewed_at, signed_at, declined_at, decline_reason
       FROM document_recipients WHERE document_id = ? ORDER BY signing_order_index ASC, id ASC`,
      [d.id]
    );
    let files = [];
    try {
      const [rows] = await db.query('SELECT id, file_name, file_type, file_size, signed_file_path FROM document_files WHERE document_id = ? ORDER BY sort_order ASC, id ASC', [d.id]);
      files = rows.map((f) => ({ id: f.id, name: f.file_name, type: f.file_type, size_kb: f.file_size, signed: Boolean(f.signed_file_path) }));
    } catch (e) {}
    const signers = recipients.filter((r) => ['signer', 'approver'].includes(r.role));
    res.json({
      success: true,
      data: {
        id: d.id,
        name: d.document_name,
        status: statusKey(d.status),
        status_label: d.status,
        signing_order: d.signing_order,
        message: d.custom_message || null,
        expiration_days: d.expiration_days,
        created_at: d.created_at,
        updated_at: d.updated_at,
        sent_at: d.sent_at,
        completed_at: d.completed_at,
        progress: { signers: signers.length, signed: signers.filter((r) => r.status === 'signed').length },
        recipients: recipients.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          status: r.status,
          signing_order: r.signing_order_index,
          sent_at: r.sent_at,
          viewed_at: r.viewed_at,
          signed_at: r.signed_at,
          declined_at: r.declined_at,
          decline_reason: r.decline_reason || null
        })),
        files
      }
    });
  } catch (err) {
    console.error('[API] document failed:', err.message);
    fail(res, 500, 'server_error', 'The document could not be loaded.');
  }
});

// @route   GET /api/v1/templates?search=&page=&page_size=
router.get('/templates', requireScope('templates:read'), async (req, res) => {
  try {
    const { page, pageSize, offset } = pagination(req.query);
    const where = ['(t.user_id = ? OR t.is_shared = 1)'];
    const params = [req.apiKey.user_id];
    if (req.query.search) {
      where.push('t.title LIKE ?');
      params.push(`%${String(req.query.search).slice(0, 100)}%`);
    }
    if (req.query.category) {
      where.push('t.category = ?');
      params.push(String(req.query.category).slice(0, 60));
    }
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM templates t WHERE ${where.join(' AND ')}`, params);
    const [rows] = await db.query(
      `SELECT t.id, t.title, t.description, t.category, t.is_shared, t.user_id, t.created_at, t.updated_at
       FROM templates t WHERE ${where.join(' AND ')} ORDER BY t.updated_at DESC, t.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      success: true,
      data: rows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || null,
        category: t.category || null,
        is_shared: Boolean(t.is_shared),
        owned: Number(t.user_id) === Number(req.apiKey.user_id),
        created_at: t.created_at,
        updated_at: t.updated_at
      })),
      pagination: pageInfo(page, pageSize, total)
    });
  } catch (err) {
    console.error('[API] templates failed:', err.message);
    fail(res, 500, 'server_error', 'Templates could not be loaded.');
  }
});

// @route   GET /api/v1/reports/summary?days=30
router.get('/reports/summary', requireScope('reports:read'), async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const owner = req.apiKey.user_id;
    const [statusRows] = await db.query(
      `SELECT d.status, COUNT(*) AS n FROM documents d WHERE d.user_id = ? AND ${NOT_TRASHED} GROUP BY d.status`,
      [owner]
    );
    const byStatus = { draft: 0, in_progress: 0, completed: 0, declined: 0, recalled: 0 };
    statusRows.forEach((r) => { byStatus[statusKey(r.status)] = (byStatus[statusKey(r.status)] || 0) + Number(r.n); });
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const [[recipients]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(r.status = 'signed') AS signed, SUM(r.status = 'declined') AS declined,
              SUM(r.status IN ('pending', 'sent', 'viewed')) AS waiting
       FROM document_recipients r JOIN documents d ON d.id = r.document_id WHERE d.user_id = ? AND ${NOT_TRASHED}`,
      [owner]
    );
    const [[period]] = await db.query(
      `SELECT SUM(d.sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS sent, SUM(d.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS completed
       FROM documents d WHERE d.user_id = ? AND ${NOT_TRASHED}`,
      [days, days, owner]
    );
    const sentEver = total - byStatus.draft;
    res.json({
      success: true,
      data: {
        total_documents: total,
        by_status: byStatus,
        completion_rate: sentEver > 0 ? Math.round((byStatus.completed / sentEver) * 1000) / 10 : 0,
        recipients: {
          total: Number(recipients.total || 0),
          signed: Number(recipients.signed || 0),
          declined: Number(recipients.declined || 0),
          waiting: Number(recipients.waiting || 0)
        },
        period: { days, sent: Number(period.sent || 0), completed: Number(period.completed || 0) },
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[API] report failed:', err.message);
    fail(res, 500, 'server_error', 'The report could not be generated.');
  }
});

// Unknown endpoints under /api/v1
router.use((req, res) => fail(res, 404, 'not_found', `${req.method} ${req.baseUrl}${req.path} is not an API endpoint. See the documentation on the Developer API page.`));

// Malformed requests reaching this router
router.use((err, req, res, next) => {
  console.error('[API] error:', err.message);
  fail(res, 500, 'server_error', 'Unexpected server error.');
});

module.exports = router;
