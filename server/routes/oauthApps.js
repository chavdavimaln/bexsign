/**
 * OAuth apps for external applications.
 *
 * Management  (/api/developer/oauth-apps, signed in, needs "api.keys"):
 *   GET    /                      your apps (everyone's with "settings.developer")
 *   POST   /                      register an app: returns client_id and client_secret (the secret is shown once)
 *   GET    /:id                   app with its recent access tokens
 *   PUT    /:id                   name, description, homepage, redirect URIs, scopes, token lifetime, on/off
 *   POST   /:id/rotate-secret     new client secret (the old one stops working at once)
 *   POST   /:id/token             issue an access token now (for trying the API)
 *   POST   /:id/tokens/:tokenId/revoke, POST /:id/revoke-all
 *   DELETE /:id                   delete the app and all its tokens
 *
 * Token endpoint (/api/oauth, public, OAuth 2.0 client credentials grant, RFC 6749 §4.4):
 *   POST /token       grant_type=client_credentials, client_id + client_secret (HTTP Basic or body), scope (optional)
 *                     -> { access_token: "bxo_...", token_type: "Bearer", expires_in, scope }
 *   POST /revoke      token=... (RFC 7009, client authentication required)
 *   POST /introspect  token=... (RFC 7662, client authentication required)
 * Access tokens call the public API (/api/v1) exactly like API keys: "Authorization: Bearer bxo_...".
 */
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission, userCan } = require('../utils/permissions');
const { logActivity, notify, logFailedAccess } = require('../utils/platformEvents');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const { API_SCOPES, SCOPE_KEYS, parseJsonArray, userName } = require('../utils/developerApi');
const { getRequestIp } = require('../utils/requestHelpers');

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const newClientId = () => `bxc_${crypto.randomBytes(12).toString('hex')}`;
const newClientSecret = () => `bxcs_${crypto.randomBytes(24).toString('hex')}`;
const newAccessToken = () => `bxo_${crypto.randomBytes(24).toString('hex')}`;
const MAX_APPS_PER_USER = 20;
const APPS_LINK = '/settings/developer/oauth-apps';

const ensureSchema = async (req, res, next) => {
  try {
    await ensurePlatformSchema();
    next();
  } catch (err) {
    next(err);
  }
};

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
}

function presentApp(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    homepage_url: row.homepage_url || '',
    redirect_uris: parseJsonArray(row.redirect_uris, []),
    client_id: row.client_id,
    secret_hint: row.secret_last4 ? `bxcs_••••${row.secret_last4}` : null,
    scopes: parseJsonArray(row.scopes, []),
    token_ttl_minutes: row.token_ttl_minutes,
    is_active: Boolean(row.is_active),
    last_used_at: row.last_used_at,
    token_count: Number(row.token_count || 0),
    active_tokens: Number(row.active_tokens || 0),
    secret_rotated_at: row.secret_rotated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: { id: row.user_id, name: userName(row), email: row.email || null }
  };
}

/** Validated app fields: [values, error] */
function readAppInput(body = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return [null, 'Enter a name for the app.'];
    if (name.length > 120) return [null, 'The name must be 120 characters or fewer.'];
    out.name = name;
  }
  if (body.description !== undefined) out.description = String(body.description || '').trim().slice(0, 255) || null;
  if (body.homepage_url !== undefined) {
    const url = String(body.homepage_url || '').trim();
    if (url && !isHttpUrl(url)) return [null, 'The homepage must be a full http(s) URL.'];
    out.homepage_url = url || null;
  }
  if (body.redirect_uris !== undefined) {
    const list = (Array.isArray(body.redirect_uris) ? body.redirect_uris : String(body.redirect_uris || '').split(/[\s,]+/))
      .map((u) => String(u).trim()).filter(Boolean);
    const bad = list.find((u) => !isHttpUrl(u));
    if (bad) return [null, `"${bad}" is not a valid redirect URI.`];
    if (list.length > 10) return [null, 'Add at most 10 redirect URIs.'];
    out.redirect_uris = JSON.stringify([...new Set(list)]);
  }
  if (!partial || body.scopes !== undefined) {
    const scopes = Array.isArray(body.scopes) ? [...new Set(body.scopes)] : [];
    if (!scopes.length) return [null, 'Choose at least one scope.'];
    const unknown = scopes.find((s) => !SCOPE_KEYS.includes(s));
    if (unknown) return [null, `Unknown scope: ${unknown}.`];
    out.scopes = JSON.stringify(scopes);
  }
  if (!partial || body.token_ttl_minutes !== undefined) {
    const ttl = parseInt(body.token_ttl_minutes ?? 60, 10);
    if (!Number.isInteger(ttl) || ttl < 5 || ttl > 1440) return [null, 'Token lifetime must be between 5 and 1440 minutes (24 hours).'];
    out.token_ttl_minutes = ttl;
  }
  if (body.is_active !== undefined) out.is_active = body.is_active ? 1 : 0;
  return [out, null];
}

/** Stores a new access token for an app and returns the plain token (shown once). */
async function issueToken(app, scopes, { grantType = 'client_credentials', ip = null } = {}) {
  const token = newAccessToken();
  const expiresAt = new Date(Date.now() + app.token_ttl_minutes * 60 * 1000);
  await db.query(
    `INSERT INTO oauth_access_tokens (app_id, user_id, token_hash, token_prefix, scopes, grant_type, expires_at, created_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [app.id, app.user_id, hash(token), token.slice(0, 12), JSON.stringify(scopes), grantType, expiresAt, ip]
  );
  await db.query('UPDATE oauth_apps SET token_count = token_count + 1, last_used_at = NOW() WHERE id = ?', [app.id]);
  // Expired tokens older than a day are no longer useful
  db.query('DELETE FROM oauth_access_tokens WHERE app_id = ? AND expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)', [app.id]).catch(() => {});
  return { token, expiresAt, expiresIn: app.token_ttl_minutes * 60 };
}

/** Requested scopes limited to what the app may use: [scopes, error] */
function grantScopes(app, requested) {
  const allowed = parseJsonArray(app.scopes, []);
  const asked = (Array.isArray(requested) ? requested : String(requested || '').split(/[\s,]+/)).map((s) => s.trim()).filter(Boolean);
  if (!asked.length) return [allowed, null];
  const extra = asked.find((s) => !allowed.includes(s));
  if (extra) return [null, `The app is not allowed the scope "${extra}".`];
  return [[...new Set(asked)], null];
}

/* ================================================================ management */

const manage = express.Router();
manage.use(authenticateUser, requireSignedIn, ensureSchema, requirePermission('api.keys'));

const canSeeAll = (req) => userCan(req.user, 'settings.developer');
const APP_SELECT = `SELECT a.*, u.first_name, u.last_name, u.email,
  (SELECT COUNT(*) FROM oauth_access_tokens t WHERE t.app_id = a.id AND t.revoked_at IS NULL AND t.expires_at > NOW()) AS active_tokens
  FROM oauth_apps a LEFT JOIN users u ON u.id = a.user_id`;

async function findApp(req, id) {
  const [rows] = await db.query(`${APP_SELECT} WHERE a.id = ?`, [parseInt(id, 10) || 0]);
  const app = rows[0];
  if (!app) return null;
  if (Number(app.user_id) !== Number(req.user.id) && !(await canSeeAll(req))) return null;
  return app;
}

manage.get('/', async (req, res) => {
  try {
    const all = await canSeeAll(req);
    const [rows] = await db.query(`${APP_SELECT} ${all ? '' : 'WHERE a.user_id = ?'} ORDER BY a.created_at DESC`, all ? [] : [req.user.id]);
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS issued, SUM(t.revoked_at IS NULL AND t.expires_at > NOW()) AS active,
              SUM(t.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS last_24h
       FROM oauth_access_tokens t JOIN oauth_apps a ON a.id = t.app_id ${all ? '' : 'WHERE a.user_id = ?'}`,
      all ? [] : [req.user.id]
    );
    res.json({
      success: true,
      apps: rows.map(presentApp),
      stats: { apps: rows.length, activeApps: rows.filter((r) => r.is_active).length, tokensIssued: Number(stats.issued || 0), activeTokens: Number(stats.active || 0), tokensLast24h: Number(stats.last_24h || 0) },
      scopes: API_SCOPES,
      canSeeAll: all
    });
  } catch (err) {
    console.error('[OAuth apps] list failed:', err);
    res.status(500).json({ success: false, error: 'OAuth apps could not be loaded.' });
  }
});

manage.post('/', async (req, res) => {
  try {
    const [input, error] = readAppInput(req.body);
    if (error) return res.status(400).json({ success: false, error });
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM oauth_apps WHERE user_id = ?', [req.user.id]);
    if (Number(n) >= MAX_APPS_PER_USER) return res.status(400).json({ success: false, error: `You can register at most ${MAX_APPS_PER_USER} OAuth apps. Delete one you no longer use.` });
    const clientId = newClientId();
    const secret = newClientSecret();
    const cols = { ...input, user_id: req.user.id, client_id: clientId, client_secret_hash: hash(secret), secret_last4: secret.slice(-4) };
    const [result] = await db.query(
      `INSERT INTO oauth_apps (${Object.keys(cols).map((k) => `\`${k}\``).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`,
      Object.values(cols)
    );
    await logActivity({ req, category: 'api', action: `Registered the OAuth app "${input.name}"`, entityType: 'oauth_app', entityId: result.insertId });
    await notify({
      userIds: [req.user.id], category: 'api', severity: 'warning', title: 'OAuth app registered',
      message: `"${input.name}" can get access tokens for the BexSign API as you. Delete it if you did not create it.`, link: APPS_LINK,
      entityType: 'oauth_app', entityId: result.insertId
    });
    const app = await findApp(req, result.insertId);
    res.status(201).json({ success: true, app: presentApp(app), client_secret: secret, message: 'App registered. Copy the client secret now: it is not shown again.' });
  } catch (err) {
    console.error('[OAuth apps] create failed:', err);
    res.status(500).json({ success: false, error: 'The app could not be registered.' });
  }
});

manage.get('/:id', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    const [tokens] = await db.query(
      `SELECT id, token_prefix, scopes, grant_type, expires_at, revoked_at, last_used_at, request_count, created_ip, created_at
       FROM oauth_access_tokens WHERE app_id = ? ORDER BY id DESC LIMIT 50`,
      [app.id]
    );
    const [logs] = await db.query('SELECT endpoint, method, status_code, ip_address, duration_ms, created_at FROM api_logs WHERE oauth_app_id = ? ORDER BY id DESC LIMIT 20', [app.id]);
    res.json({
      success: true,
      app: presentApp(app),
      tokens: tokens.map((t) => ({
        ...t,
        scopes: parseJsonArray(t.scopes, []),
        state: t.revoked_at ? 'revoked' : new Date(t.expires_at) <= new Date() ? 'expired' : 'active'
      })),
      logs,
      scopes: API_SCOPES
    });
  } catch (err) {
    console.error('[OAuth apps] detail failed:', err);
    res.status(500).json({ success: false, error: 'The app could not be loaded.' });
  }
});

manage.put('/:id', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    const [input, error] = readAppInput(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, error });
    const sets = Object.entries(input);
    if (sets.length) await db.query(`UPDATE oauth_apps SET ${sets.map(([k]) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`, [...sets.map(([, v]) => v), app.id]);
    if (input.is_active === 0) await db.query('UPDATE oauth_access_tokens SET revoked_at = NOW() WHERE app_id = ? AND revoked_at IS NULL', [app.id]);
    await logActivity({ req, category: 'api', action: `Updated the OAuth app "${app.name}"`, entityType: 'oauth_app', entityId: app.id });
    res.json({ success: true, app: presentApp(await findApp(req, app.id)), message: input.is_active === 0 ? 'App turned off: its tokens were revoked.' : 'App saved.' });
  } catch (err) {
    console.error('[OAuth apps] update failed:', err);
    res.status(500).json({ success: false, error: 'The app could not be saved.' });
  }
});

manage.post('/:id/rotate-secret', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    const secret = newClientSecret();
    await db.query('UPDATE oauth_apps SET client_secret_hash = ?, secret_last4 = ?, secret_rotated_at = NOW() WHERE id = ?', [hash(secret), secret.slice(-4), app.id]);
    await logActivity({ req, category: 'api', action: `Rotated the client secret of the OAuth app "${app.name}"`, entityType: 'oauth_app', entityId: app.id });
    res.json({ success: true, client_secret: secret, message: 'New client secret created. The old one no longer works. Copy it now.' });
  } catch (err) {
    console.error('[OAuth apps] rotate failed:', err);
    res.status(500).json({ success: false, error: 'The secret could not be rotated.' });
  }
});

manage.post('/:id/token', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    if (!app.is_active) return res.status(400).json({ success: false, error: 'Turn the app on before generating tokens.' });
    const [scopes, error] = grantScopes(app, req.body?.scopes);
    if (error) return res.status(400).json({ success: false, error });
    const issued = await issueToken(app, scopes, { grantType: 'console', ip: getRequestIp(req) });
    await logActivity({ req, category: 'api', action: `Generated an access token for the OAuth app "${app.name}"`, entityType: 'oauth_app', entityId: app.id });
    res.status(201).json({
      success: true,
      access_token: issued.token,
      token_type: 'Bearer',
      expires_in: issued.expiresIn,
      expires_at: issued.expiresAt,
      scope: scopes.join(' '),
      message: `Access token generated. It is valid for ${app.token_ttl_minutes} minutes and is shown only once.`
    });
  } catch (err) {
    console.error('[OAuth apps] token failed:', err);
    res.status(500).json({ success: false, error: 'The access token could not be generated.' });
  }
});

manage.post('/:id/tokens/:tokenId/revoke', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    const [result] = await db.query('UPDATE oauth_access_tokens SET revoked_at = NOW() WHERE id = ? AND app_id = ? AND revoked_at IS NULL', [req.params.tokenId, app.id]);
    res.json({ success: true, message: result.affectedRows ? 'Token revoked.' : 'The token was already revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The token could not be revoked.' });
  }
});

manage.post('/:id/revoke-all', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    const [result] = await db.query('UPDATE oauth_access_tokens SET revoked_at = NOW() WHERE app_id = ? AND revoked_at IS NULL AND expires_at > NOW()', [app.id]);
    await logActivity({ req, category: 'api', action: `Revoked every access token of the OAuth app "${app.name}"`, entityType: 'oauth_app', entityId: app.id });
    res.json({ success: true, message: `${result.affectedRows} active token${result.affectedRows === 1 ? '' : 's'} revoked.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The tokens could not be revoked.' });
  }
});

manage.delete('/:id', async (req, res) => {
  try {
    const app = await findApp(req, req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'That OAuth app was not found.' });
    await db.query('DELETE FROM oauth_access_tokens WHERE app_id = ?', [app.id]);
    await db.query('DELETE FROM oauth_apps WHERE id = ?', [app.id]);
    await logActivity({ req, category: 'api', action: `Deleted the OAuth app "${app.name}"`, entityType: 'oauth_app', entityId: app.id });
    res.json({ success: true, message: `"${app.name}" was deleted. Its credentials and tokens no longer work.` });
  } catch (err) {
    console.error('[OAuth apps] delete failed:', err);
    res.status(500).json({ success: false, error: 'The app could not be deleted.' });
  }
});

/* ================================================================ token endpoint */

const token = express.Router();
token.use(express.urlencoded({ extended: false }));
token.use(ensureSchema);

const oauthError = (res, status, error, description) => {
  res.setHeader('Cache-Control', 'no-store');
  if (status === 401) res.setHeader('WWW-Authenticate', 'Basic realm="BexSign OAuth"');
  return res.status(status).json({ error, error_description: description });
};

/** The calling app from HTTP Basic or client_id / client_secret in the body; null when the credentials are wrong. */
async function authenticateClient(req) {
  let clientId = req.body?.client_id;
  let clientSecret = req.body?.client_secret;
  const header = String(req.headers.authorization || '');
  if (/^basic\s+/i.test(header)) {
    const decoded = Buffer.from(header.replace(/^basic\s+/i, ''), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i > 0) {
      clientId = decodeURIComponent(decoded.slice(0, i));
      clientSecret = decodeURIComponent(decoded.slice(i + 1));
    }
  }
  if (!clientId || !clientSecret) return { app: null, clientId };
  const [rows] = await db.query(
    `SELECT a.*, p.status AS owner_status FROM oauth_apps a LEFT JOIN user_profiles p ON p.user_id = a.user_id WHERE a.client_id = ?`,
    [String(clientId)]
  );
  const app = rows[0];
  const expected = app ? Buffer.from(app.client_secret_hash, 'hex') : Buffer.alloc(32);
  const given = Buffer.from(hash(clientSecret), 'hex');
  const ok = Boolean(app) && crypto.timingSafeEqual(expected, given);
  return { app: ok ? app : null, clientId };
}

token.post('/token', async (req, res) => {
  try {
    if (req.body?.grant_type !== 'client_credentials') {
      return oauthError(res, 400, 'unsupported_grant_type', 'Only grant_type=client_credentials is supported.');
    }
    const { app, clientId } = await authenticateClient(req);
    if (!app) {
      await logFailedAccess({ req, source: 'api', reason: `OAuth token request with invalid client credentials (${String(clientId || 'no client_id').slice(0, 20)})` });
      return oauthError(res, 401, 'invalid_client', 'The client_id or client_secret is not valid.');
    }
    if (!app.is_active) return oauthError(res, 400, 'unauthorized_client', 'This OAuth app is turned off.');
    if (app.owner_status === 'inactive') return oauthError(res, 400, 'unauthorized_client', 'The account that owns this app is deactivated.');
    const [scopes, error] = grantScopes(app, req.body?.scope);
    if (error) return oauthError(res, 400, 'invalid_scope', error);
    const issued = await issueToken(app, scopes, { ip: getRequestIp(req) });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.json({ access_token: issued.token, token_type: 'Bearer', expires_in: issued.expiresIn, scope: scopes.join(' ') });
  } catch (err) {
    console.error('[OAuth] token failed:', err);
    oauthError(res, 500, 'server_error', 'The token could not be issued. Try again later.');
  }
});

token.post('/revoke', async (req, res) => {
  try {
    const { app } = await authenticateClient(req);
    if (!app) return oauthError(res, 401, 'invalid_client', 'The client_id or client_secret is not valid.');
    if (req.body?.token) {
      await db.query('UPDATE oauth_access_tokens SET revoked_at = NOW() WHERE token_hash = ? AND app_id = ? AND revoked_at IS NULL', [hash(req.body.token), app.id]);
    }
    // RFC 7009: the answer is the same whether or not the token existed
    res.status(200).json({ success: true });
  } catch (err) {
    oauthError(res, 500, 'server_error', 'The token could not be revoked.');
  }
});

token.post('/introspect', async (req, res) => {
  try {
    const { app } = await authenticateClient(req);
    if (!app) return oauthError(res, 401, 'invalid_client', 'The client_id or client_secret is not valid.');
    const [rows] = await db.query('SELECT * FROM oauth_access_tokens WHERE token_hash = ? AND app_id = ?', [hash(req.body?.token || ''), app.id]);
    const t = rows[0];
    const active = Boolean(t) && !t.revoked_at && new Date(t.expires_at) > new Date();
    if (!active) return res.json({ active: false });
    res.json({
      active: true,
      scope: parseJsonArray(t.scopes, []).join(' '),
      client_id: app.client_id,
      token_type: 'Bearer',
      exp: Math.floor(new Date(t.expires_at).getTime() / 1000),
      iat: Math.floor(new Date(t.created_at).getTime() / 1000),
      sub: String(t.user_id)
    });
  } catch (err) {
    oauthError(res, 500, 'server_error', 'The token could not be checked.');
  }
});

module.exports = { manageRouter: manage, tokenRouter: token, hashToken: hash };
