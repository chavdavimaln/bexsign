/**
 * Developer API management (/api/developer): API keys, webhooks with delivery history, request logs and the list of
 * webhook events. Users manage their own keys and webhooks; holders of "settings.developer" see and manage everyone's.
 * API keys are shown in full only once: the database keeps a SHA-256 hash, a prefix and a masked value.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, userCan } = require('../utils/permissions');
const { notify, logActivity } = require('../utils/platformEvents');
const { deliverWebhook } = require('../utils/webhooks');
const {
  API_SCOPES, SCOPE_KEYS, WEBHOOK_EVENTS, EVENT_KEYS, ensureDeliverySchema, getDeveloperSettings,
  maskSecret, parseJsonArray, purgeExpiredLogs, userName
} = require('../utils/developerApi');

router.use(authenticateUser);
router.use(async (req, res, next) => {
  try {
    await ensureDeliverySchema();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'The developer API tables could not be prepared.' });
  }
});

const MAX_ACTIVE_KEYS_PER_USER = 25;
const MAX_WEBHOOKS_PER_USER = 20;
const API_KEY_LINK = '/settings/developer-api?tab=keys';

const canManageAll = (req) => Array.isArray(req.permissions) && req.permissions.includes('settings.developer');
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

function pageParams(query, defaultSize = 25) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? query.page_size, 10) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && Boolean(u.hostname);
  } catch (e) {
    return false;
  }
}

// settings.developer is loaded next to the route's own permission so managers see everyone's items
async function withManagerFlag(req, res, next) {
  try {
    if (!req.permissions?.includes('settings.developer') && await userCan(req.user, 'settings.developer')) {
      req.permissions = [...(req.permissions || []), 'settings.developer'];
    }
    next();
  } catch (err) {
    next(err);
  }
}

const OWNER_SELECT = 'u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email';
const ownerOf = (row) => ({
  id: row.user_id,
  name: userName({ first_name: row.owner_first_name, last_name: row.owner_last_name, email: row.owner_email }) || `User #${row.user_id}`,
  email: row.owner_email || null
});

// ---------------------------------------------------------------- meta

// @route   GET /api/developer/events
router.get('/events', (req, res) => {
  res.json({ success: true, events: WEBHOOK_EVENTS });
});

// @route   GET /api/developer/meta
// @desc    Scopes, events and API status for the Developer API page
router.get('/meta', async (req, res) => {
  try {
    const settings = await getDeveloperSettings();
    res.json({
      success: true,
      scopes: API_SCOPES,
      events: WEBHOOK_EVENTS,
      apiEnabled: Boolean(settings.api_enabled),
      sandboxMode: Boolean(settings.sandbox_mode),
      rateLimitPerMinute: settings.rate_limit_per_minute,
      webhookRetryCount: settings.webhook_retry_count,
      webhookTimeoutSeconds: settings.webhook_timeout_seconds,
      defaultCallbackUrl: settings.default_callback_url || '',
      logRetentionDays: settings.log_retention_days,
      canManageAll: await userCan(req.user, 'settings.developer')
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Developer API details could not be loaded.' });
  }
});

// ---------------------------------------------------------------- API keys

function keyStatus(row) {
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return 'expired';
  return 'active';
}

function serializeKey(row, req) {
  return {
    id: row.id,
    name: row.name,
    maskedKey: row.api_key,
    prefix: row.key_prefix,
    environment: row.environment,
    scopes: parseJsonArray(row.permissions, []),
    status: keyStatus(row),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    requestCount: row.request_count || 0,
    owner: ownerOf(row),
    isOwn: Number(row.user_id) === Number(req.user.id)
  };
}

function validateScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return 'Choose at least one scope.';
  const unknown = scopes.filter((s) => !SCOPE_KEYS.includes(s));
  if (unknown.length) return `Unknown scope: ${unknown[0]}. Supported scopes: ${SCOPE_KEYS.join(', ')}.`;
  return null;
}

function validateName(name, label = 'Name', max = 100) {
  const text = String(name ?? '').trim();
  if (!text) return [null, `${label} is required.`];
  if (text.length > max) return [null, `${label} must be ${max} characters or fewer.`];
  return [text, null];
}

async function findKey(req, id) {
  const [rows] = await db.query(`SELECT k.*, ${OWNER_SELECT} FROM api_keys k LEFT JOIN users u ON u.id = k.user_id WHERE k.id = ?`, [id]);
  const row = rows[0];
  if (!row || (Number(row.user_id) !== Number(req.user.id) && !canManageAll(req))) return null;
  return row;
}

// @route   GET /api/developer/keys
router.get('/keys', requirePermission('api.keys'), withManagerFlag, async (req, res) => {
  try {
    const all = canManageAll(req) && req.query.scope !== 'mine';
    const [rows] = await db.query(
      `SELECT k.*, ${OWNER_SELECT} FROM api_keys k LEFT JOIN users u ON u.id = k.user_id
       ${all ? '' : 'WHERE k.user_id = ?'} ORDER BY k.revoked_at IS NOT NULL, k.created_at DESC, k.id DESC`,
      all ? [] : [req.user.id]
    );
    res.json({ success: true, keys: rows.map((r) => serializeKey(r, req)), canManageAll: canManageAll(req), scopes: API_SCOPES });
  } catch (err) {
    console.error('[API keys] list failed:', err.message);
    res.status(500).json({ success: false, error: 'API keys could not be loaded.' });
  }
});

// @route   POST /api/developer/keys
// @desc    Creates a key; the full key is returned only in this response
router.post('/keys', requirePermission('api.keys'), withManagerFlag, async (req, res) => {
  try {
    const { scopes, environment = 'live' } = req.body || {};
    const [name, nameError] = validateName(req.body?.name);
    if (nameError) return res.status(400).json({ success: false, error: nameError });
    const scopeError = validateScopes(scopes);
    if (scopeError) return res.status(400).json({ success: false, error: scopeError });
    if (!['live', 'sandbox'].includes(environment)) return res.status(400).json({ success: false, error: 'Environment must be "live" or "sandbox".' });
    const expiresRaw = req.body?.expiresInDays ?? req.body?.expires_in_days ?? null;
    const expiresInDays = expiresRaw === null || expiresRaw === '' || Number(expiresRaw) === 0 ? null : Number(expiresRaw);
    if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 730)) {
      return res.status(400).json({ success: false, error: 'Expiry must be a whole number of days from 1 to 730, or empty for a key that never expires.' });
    }
    const settings = await getDeveloperSettings();
    if (environment === 'sandbox' && !settings.sandbox_mode) {
      return res.status(400).json({ success: false, error: 'Sandbox mode is turned off in Developer settings, so sandbox keys cannot be created.' });
    }
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL', [req.user.id]);
    if (n >= MAX_ACTIVE_KEYS_PER_USER) {
      return res.status(409).json({ success: false, error: `You already have ${n} active keys. Revoke keys you no longer use first.` });
    }

    const uniqueScopes = [...new Set(scopes)];
    let created = null;
    for (let tries = 0; tries < 3 && !created; tries += 1) {
      const secret = crypto.randomBytes(32).toString('hex');
      const fullKey = `${environment === 'sandbox' ? 'bxs_test_' : 'bxs_live_'}${secret}`;
      const prefix = fullKey.slice(0, 13);
      const masked = `${prefix}…${fullKey.slice(-4)}`;
      try {
        const [result] = await db.query(
          `INSERT INTO api_keys (user_id, name, api_key, permissions, key_prefix, key_hash, environment, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ${expiresInDays ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : 'NULL'})`,
          [req.user.id, name, masked, JSON.stringify(uniqueScopes), prefix, hashKey(fullKey), environment, ...(expiresInDays ? [expiresInDays] : [])]
        );
        created = { id: result.insertId, fullKey };
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    if (!created) return res.status(500).json({ success: false, error: 'A unique key could not be generated. Try again.' });

    const row = await findKey(req, created.id);
    await logActivity({
      req, category: 'api', action: `Created API key "${name}"`, entityType: 'api_key', entityId: created.id,
      details: { environment, scopes: uniqueScopes, expiresInDays }
    });
    await notify({
      userIds: [req.user.id],
      category: 'api',
      severity: 'info',
      title: 'New API key created',
      message: `"${name}" (${environment}) was created with ${uniqueScopes.join(', ')}. If you did not do this, revoke it now.`,
      link: API_KEY_LINK,
      entityType: 'api_key',
      entityId: created.id
    });
    res.status(201).json({
      success: true,
      message: 'API key created. Copy it now: it will not be shown again.',
      key: serializeKey(row, req),
      apiKey: created.fullKey
    });
  } catch (err) {
    console.error('[API keys] create failed:', err.message);
    res.status(500).json({ success: false, error: 'The API key could not be created.' });
  }
});

// @route   PATCH /api/developer/keys/:id
// @desc    Rename a key or change its scopes
router.patch('/keys/:id', requirePermission('api.keys'), withManagerFlag, async (req, res) => {
  try {
    const row = await findKey(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'API key not found.' });
    if (row.revoked_at) return res.status(409).json({ success: false, error: 'A revoked key cannot be changed.' });
    const updates = {};
    if (req.body?.name !== undefined) {
      const [name, nameError] = validateName(req.body.name);
      if (nameError) return res.status(400).json({ success: false, error: nameError });
      updates.name = name;
    }
    if (req.body?.scopes !== undefined) {
      const scopeError = validateScopes(req.body.scopes);
      if (scopeError) return res.status(400).json({ success: false, error: scopeError });
      updates.permissions = JSON.stringify([...new Set(req.body.scopes)]);
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, error: 'Nothing to update: send a name or scopes.' });
    const keys = Object.keys(updates);
    await db.query(`UPDATE api_keys SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => updates[k]), row.id]);
    await logActivity({
      req, category: 'api', action: `Updated API key "${updates.name || row.name}"`, entityType: 'api_key', entityId: row.id,
      details: {
        ...(updates.name && updates.name !== row.name ? { name: { from: row.name, to: updates.name } } : {}),
        ...(updates.permissions ? { scopes: { from: parseJsonArray(row.permissions, []), to: JSON.parse(updates.permissions) } } : {})
      }
    });
    res.json({ success: true, message: 'API key updated.', key: serializeKey(await findKey(req, row.id), req) });
  } catch (err) {
    console.error('[API keys] update failed:', err.message);
    res.status(500).json({ success: false, error: 'The API key could not be updated.' });
  }
});

// @route   POST /api/developer/keys/:id/revoke
router.post('/keys/:id/revoke', requirePermission('api.keys'), withManagerFlag, async (req, res) => {
  try {
    const row = await findKey(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'API key not found.' });
    if (row.revoked_at) return res.status(409).json({ success: false, error: 'This key is already revoked.' });
    await db.query('UPDATE api_keys SET revoked_at = NOW() WHERE id = ?', [row.id]);
    await logActivity({ req, category: 'api', action: `Revoked API key "${row.name}"`, entityType: 'api_key', entityId: row.id, details: { key: row.api_key } });
    const byOther = Number(row.user_id) !== Number(req.user.id);
    await notify({
      userIds: [row.user_id],
      category: 'api',
      severity: 'warning',
      title: 'API key revoked',
      message: `"${row.name}" (${row.api_key}) was revoked${byOther ? ` by ${userName(req.user) || 'an administrator'}` : ''}. Requests using it are now rejected.`,
      link: API_KEY_LINK,
      entityType: 'api_key',
      entityId: row.id
    });
    res.json({ success: true, message: 'API key revoked.', key: serializeKey(await findKey(req, row.id), req) });
  } catch (err) {
    console.error('[API keys] revoke failed:', err.message);
    res.status(500).json({ success: false, error: 'The API key could not be revoked.' });
  }
});

// @route   DELETE /api/developer/keys/:id
// @desc    Deletes a key (its request logs are kept)
router.delete('/keys/:id', requirePermission('api.keys'), withManagerFlag, async (req, res) => {
  try {
    const row = await findKey(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'API key not found.' });
    await db.query('DELETE FROM api_keys WHERE id = ?', [row.id]);
    await logActivity({ req, category: 'api', action: `Deleted API key "${row.name}"`, entityType: 'api_key', entityId: row.id, details: { key: row.api_key } });
    if (!row.revoked_at && Number(row.user_id) !== Number(req.user.id)) {
      await notify({
        userIds: [row.user_id], category: 'api', severity: 'warning', title: 'API key deleted',
        message: `"${row.name}" was deleted by ${userName(req.user) || 'an administrator'}. Requests using it are now rejected.`,
        link: API_KEY_LINK, entityType: 'api_key', entityId: row.id
      });
    }
    res.json({ success: true, message: 'API key deleted.' });
  } catch (err) {
    console.error('[API keys] delete failed:', err.message);
    res.status(500).json({ success: false, error: 'The API key could not be deleted.' });
  }
});

// ---------------------------------------------------------------- webhooks

function serializeWebhook(row, req) {
  return {
    id: row.id,
    name: row.name || '',
    url: row.url,
    events: parseJsonArray(row.events, []),
    isActive: Boolean(row.is_active),
    hasSecret: Boolean(row.secret_token),
    secretMasked: maskSecret(row.secret_token),
    lastStatus: row.last_status,
    lastDeliveryAt: row.last_delivery_at,
    failureCount: row.failure_count || 0,
    createdAt: row.created_at,
    deliveries7d: Number(row.deliveries_7d || 0),
    failed7d: Number(row.failed_7d || 0),
    owner: ownerOf(row),
    isOwn: Number(row.user_id) === Number(req.user.id)
  };
}

const WEBHOOK_SELECT = `SELECT w.*, ${OWNER_SELECT} FROM webhooks w LEFT JOIN users u ON u.id = w.user_id`;

/** Deliveries of the last 7 days per webhook; a delivery failed when none of its attempts succeeded. */
async function attachDeliveryStats(rows) {
  if (!rows.length) return rows;
  const [stats] = await db.query(
    `SELECT webhook_id, COUNT(*) AS deliveries, SUM(ok = 0) AS failed FROM (
       SELECT webhook_id, COALESCE(delivery_id, CONCAT('row', id)) AS dk, MAX(success) AS ok
       FROM webhook_deliveries WHERE webhook_id IN (?) AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY webhook_id, dk
     ) x GROUP BY webhook_id`,
    [rows.map((r) => r.id)]
  );
  const byId = new Map(stats.map((s) => [s.webhook_id, s]));
  return rows.map((r) => ({ ...r, deliveries_7d: byId.get(r.id)?.deliveries || 0, failed_7d: byId.get(r.id)?.failed || 0 }));
}

async function findWebhook(req, id) {
  const [rows] = await db.query(`${WEBHOOK_SELECT} WHERE w.id = ?`, [id]);
  const row = rows[0];
  if (!row || (Number(row.user_id) !== Number(req.user.id) && !canManageAll(req))) return null;
  return (await attachDeliveryStats([row]))[0];
}

/** Validates webhook input; `partial` allows leaving fields out (updates). Returns { values, error }. */
function validateWebhook(body, partial = false) {
  const values = {};
  if (body.url !== undefined || !partial) {
    const url = String(body.url ?? '').trim();
    if (!url) return { error: 'Endpoint URL is required.' };
    if (url.length > 500) return { error: 'Endpoint URL must be 500 characters or fewer.' };
    if (!isHttpUrl(url)) return { error: 'Endpoint URL must start with https:// or http://.' };
    values.url = url;
  }
  if (body.name !== undefined) {
    const name = String(body.name ?? '').trim();
    if (name.length > 120) return { error: 'Name must be 120 characters or fewer.' };
    values.name = name || null;
  }
  if (body.events !== undefined || !partial) {
    const events = Array.isArray(body.events) ? [...new Set(body.events.map(String))] : [];
    if (!events.length) return { error: 'Choose at least one event.' };
    const unknown = events.filter((e) => e !== '*' && !EVENT_KEYS.includes(e));
    if (unknown.length) return { error: `Unknown event: ${unknown[0]}.` };
    values.events = JSON.stringify(events.includes('*') ? ['*'] : events);
  }
  if (body.secret !== undefined) {
    const secret = body.secret === null ? '' : String(body.secret).trim();
    if (secret && (secret.length < 16 || secret.length > 255)) return { error: 'A custom signing secret must be 16 to 255 characters.' };
    values.secret_token = secret || null;
  }
  const active = body.isActive ?? body.is_active;
  if (active !== undefined) values.is_active = active ? 1 : 0;
  return { values };
}

// @route   GET /api/developer/webhooks
router.get('/webhooks', requirePermission('api.webhooks'), withManagerFlag, async (req, res) => {
  try {
    const all = canManageAll(req) && req.query.scope !== 'mine';
    const [rows] = await db.query(`${WEBHOOK_SELECT} ${all ? '' : 'WHERE w.user_id = ?'} ORDER BY w.created_at DESC, w.id DESC`, all ? [] : [req.user.id]);
    const withStats = await attachDeliveryStats(rows);
    res.json({ success: true, webhooks: withStats.map((r) => serializeWebhook(r, req)), events: WEBHOOK_EVENTS, canManageAll: canManageAll(req) });
  } catch (err) {
    console.error('[Webhooks] list failed:', err.message);
    res.status(500).json({ success: false, error: 'Webhooks could not be loaded.' });
  }
});

// @route   POST /api/developer/webhooks
router.post('/webhooks', requirePermission('api.webhooks'), withManagerFlag, async (req, res) => {
  try {
    const { values, error } = validateWebhook(req.body || {});
    if (error) return res.status(400).json({ success: false, error });
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM webhooks WHERE user_id = ?', [req.user.id]);
    if (n >= MAX_WEBHOOKS_PER_USER) return res.status(409).json({ success: false, error: `You can have at most ${MAX_WEBHOOKS_PER_USER} webhooks.` });
    const [result] = await db.query(
      'INSERT INTO webhooks (user_id, url, events, secret_token, name, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, values.url, values.events, values.secret_token ?? null, values.name ?? null, values.is_active ?? 1]
    );
    await logActivity({
      req, category: 'api', action: `Created webhook "${values.name || values.url}"`, entityType: 'webhook', entityId: result.insertId,
      details: { url: values.url, events: JSON.parse(values.events) }
    });
    res.status(201).json({ success: true, message: 'Webhook created.', webhook: serializeWebhook(await findWebhook(req, result.insertId), req) });
  } catch (err) {
    console.error('[Webhooks] create failed:', err.message);
    res.status(500).json({ success: false, error: 'The webhook could not be created.' });
  }
});

// @route   PUT|PATCH /api/developer/webhooks/:id
async function updateWebhook(req, res) {
  try {
    const row = await findWebhook(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Webhook not found.' });
    const { values, error } = validateWebhook(req.body || {}, true);
    if (error) return res.status(400).json({ success: false, error });
    if (!Object.keys(values).length) return res.status(400).json({ success: false, error: 'Nothing to update.' });
    if (values.is_active === 1 && !row.is_active) values.failure_count = 0; // turning a webhook back on starts a new failure streak
    const keys = Object.keys(values);
    await db.query(`UPDATE webhooks SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => values[k]), row.id]);
    const changed = keys.filter((k) => k !== 'failure_count').map((k) => (k === 'secret_token' ? 'signing secret' : k === 'is_active' ? 'status' : k));
    const label = values.name || row.name || values.url || row.url;
    let action = `Updated webhook "${label}" (${changed.join(', ')})`;
    if (keys.length === 1 && 'is_active' in values) action = `${values.is_active ? 'Enabled' : 'Disabled'} webhook "${label}"`;
    await logActivity({ req, category: 'api', action, entityType: 'webhook', entityId: row.id });
    res.json({ success: true, message: 'Webhook updated.', webhook: serializeWebhook(await findWebhook(req, row.id), req) });
  } catch (err) {
    console.error('[Webhooks] update failed:', err.message);
    res.status(500).json({ success: false, error: 'The webhook could not be updated.' });
  }
}
router.put('/webhooks/:id', requirePermission('api.webhooks'), withManagerFlag, updateWebhook);
router.patch('/webhooks/:id', requirePermission('api.webhooks'), withManagerFlag, updateWebhook);

// @route   DELETE /api/developer/webhooks/:id
router.delete('/webhooks/:id', requirePermission('api.webhooks'), withManagerFlag, async (req, res) => {
  try {
    const row = await findWebhook(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Webhook not found.' });
    await db.query('DELETE FROM webhook_deliveries WHERE webhook_id = ?', [row.id]);
    await db.query('DELETE FROM webhooks WHERE id = ?', [row.id]);
    await logActivity({ req, category: 'api', action: `Deleted webhook "${row.name || row.url}"`, entityType: 'webhook', entityId: row.id, details: { url: row.url } });
    res.json({ success: true, message: 'Webhook deleted.' });
  } catch (err) {
    console.error('[Webhooks] delete failed:', err.message);
    res.status(500).json({ success: false, error: 'The webhook could not be deleted.' });
  }
});

// @route   POST /api/developer/webhooks/:id/test
// @desc    Sends a "ping" event right away (one attempt) and returns the result
router.post('/webhooks/:id/test', requirePermission('api.webhooks'), withManagerFlag, async (req, res) => {
  try {
    const row = await findWebhook(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Webhook not found.' });
    const result = await deliverWebhook(row, 'ping', {
      message: 'Test event from BexSign. Your endpoint is reachable.',
      webhook: { id: row.id, name: row.name || null, url: row.url },
      triggered_by: { id: req.user.id, name: userName(req.user), email: req.user.email }
    }, { retries: 0, trackFailures: false });
    await logActivity({
      req, category: 'api', action: `Sent a test event to webhook "${row.name || row.url}"`, entityType: 'webhook', entityId: row.id,
      details: { statusCode: result.statusCode, success: result.success, durationMs: result.durationMs }
    });
    res.json({
      success: true,
      delivered: result.success,
      result,
      message: result.success ? `Delivered: HTTP ${result.statusCode} in ${result.durationMs} ms.` : `Delivery failed: ${result.error}`,
      webhook: serializeWebhook(await findWebhook(req, row.id), req)
    });
  } catch (err) {
    console.error('[Webhooks] test failed:', err.message);
    res.status(500).json({ success: false, error: 'The test event could not be sent.' });
  }
});

// @route   GET /api/developer/webhooks/:id/deliveries?page=&pageSize=&status=success|failed
router.get('/webhooks/:id/deliveries', requirePermission('api.webhooks'), withManagerFlag, async (req, res) => {
  try {
    const row = await findWebhook(req, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Webhook not found.' });
    const { page, pageSize, offset } = pageParams(req.query, 10);
    const where = ['webhook_id = ?'];
    const params = [row.id];
    if (req.query.status === 'success') where.push('success = 1');
    if (req.query.status === 'failed') where.push('success = 0');
    if (req.query.event && (EVENT_KEYS.includes(req.query.event))) {
      where.push('event = ?');
      params.push(req.query.event);
    }
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM webhook_deliveries WHERE ${where.join(' AND ')}`, params);
    const [rows] = await db.query(
      `SELECT id, event, payload, status_code, response_body, success, duration_ms, delivery_id, attempt, error, created_at
       FROM webhook_deliveries WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      success: true,
      deliveries: rows.map((d) => ({
        id: d.id,
        event: d.event,
        deliveryId: d.delivery_id,
        attempt: d.attempt || 1,
        statusCode: d.status_code,
        success: Boolean(d.success),
        durationMs: d.duration_ms,
        error: d.error,
        responseBody: d.response_body || '',
        payload: d.payload || '',
        createdAt: d.created_at
      })),
      total,
      page,
      pageSize
    });
  } catch (err) {
    console.error('[Webhooks] deliveries failed:', err.message);
    res.status(500).json({ success: false, error: 'Deliveries could not be loaded.' });
  }
});

// ---------------------------------------------------------------- request logs

/** WHERE clause for the logs a user may see (own keys unless they manage all), plus the page filters. */
function logFilters(req, { withFilters = true } = {}) {
  const where = [];
  const params = [];
  if (!canManageAll(req)) {
    where.push('k.user_id = ?');
    params.push(req.user.id);
  }
  if (!withFilters) return { where, params };
  const q = req.query;
  const statusClass = { '2xx': [200, 299], '3xx': [300, 399], '4xx': [400, 499], '5xx': [500, 599] }[q.status];
  if (statusClass) {
    where.push('l.status_code BETWEEN ? AND ?');
    params.push(...statusClass);
  } else if (q.status === 'errors') {
    where.push('l.status_code >= 400');
  }
  if (q.keyId) {
    if (q.keyId === 'none') where.push('l.api_key_id IS NULL');
    else {
      where.push('l.api_key_id = ?');
      params.push(parseInt(q.keyId, 10) || 0);
    }
  }
  if (q.method && /^[A-Z]{3,7}$/.test(String(q.method).toUpperCase())) {
    where.push('l.method = ?');
    params.push(String(q.method).toUpperCase());
  }
  if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) {
    where.push('l.created_at >= ?');
    params.push(`${q.from} 00:00:00`);
  }
  if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
    where.push('l.created_at <= ?');
    params.push(`${q.to} 23:59:59`);
  }
  if (q.search) {
    where.push('l.endpoint LIKE ?');
    params.push(`%${String(q.search).slice(0, 100)}%`);
  }
  return { where, params };
}

const whereSql = (where) => (where.length ? `WHERE ${where.join(' AND ')}` : '');

// @route   GET /api/developer/logs?page=&pageSize=&status=2xx|4xx|5xx|errors&keyId=&method=&from=&to=&search=
router.get('/logs', requirePermission('api.logs'), withManagerFlag, async (req, res) => {
  try {
    purgeExpiredLogs();
    const { page, pageSize, offset } = pageParams(req.query);
    const { where, params } = logFilters(req);
    const from = 'FROM api_logs l LEFT JOIN api_keys k ON k.id = l.api_key_id';
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${from} ${whereSql(where)}`, params);
    const [rows] = await db.query(
      `SELECT l.*, k.name AS key_name, k.key_prefix, k.environment, k.user_id AS key_user_id ${from} ${whereSql(where)}
       ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      success: true,
      logs: rows.map((l) => ({
        id: l.id,
        method: l.method,
        endpoint: l.endpoint,
        statusCode: l.status_code,
        durationMs: l.duration_ms,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at,
        key: l.api_key_id
          ? { id: l.api_key_id, name: l.key_name || `Deleted key #${l.api_key_id}`, prefix: l.key_prefix || null, environment: l.environment || null, deleted: !l.key_name }
          : null
      })),
      total,
      page,
      pageSize
    });
  } catch (err) {
    console.error('[API logs] list failed:', err.message);
    res.status(500).json({ success: false, error: 'API logs could not be loaded.' });
  }
});

// @route   GET /api/developer/logs/summary?days=14
router.get('/logs/summary', requirePermission('api.logs'), withManagerFlag, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 14));
    const { where, params } = logFilters(req, { withFilters: false });
    const from = 'FROM api_logs l LEFT JOIN api_keys k ON k.id = l.api_key_id';
    const recent = [...where, 'l.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'];
    const [[last24]] = await db.query(
      `SELECT COUNT(*) AS requests, SUM(l.status_code >= 400) AS errors, SUM(l.status_code = 429) AS rate_limited, AVG(l.duration_ms) AS avg_ms
       ${from} ${whereSql(recent)}`,
      params
    );
    const [[overall]] = await db.query(`SELECT COUNT(*) AS requests ${from} ${whereSql(where)}`, params);
    const [series] = await db.query(
      `SELECT DATE_FORMAT(l.created_at, '%Y-%m-%d') AS day, COUNT(*) AS requests, SUM(l.status_code >= 400) AS errors
       ${from} ${whereSql([...where, 'l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'])} GROUP BY day ORDER BY day`,
      [...params, days - 1]
    );
    const [keys] = await db.query(
      `SELECT k.id, k.name, k.key_prefix, k.environment, k.revoked_at FROM api_keys k ${canManageAll(req) ? '' : 'WHERE k.user_id = ?'} ORDER BY k.name`,
      canManageAll(req) ? [] : [req.user.id]
    );
    // One entry per day, oldest first, days without requests included
    const byDay = new Map(series.map((s) => [s.day, s]));
    const [[{ today }]] = await db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
    const perDay = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const s = byDay.get(key);
      perDay.push({ date: key, requests: Number(s?.requests || 0), errors: Number(s?.errors || 0) });
    }
    const requests = Number(last24.requests || 0);
    const errors = Number(last24.errors || 0);
    const settings = await getDeveloperSettings();
    res.json({
      success: true,
      summary: {
        requests24h: requests,
        errors24h: errors,
        rateLimited24h: Number(last24.rate_limited || 0),
        errorRate24h: requests ? Math.round((errors / requests) * 1000) / 10 : 0,
        avgLatencyMs24h: last24.avg_ms === null ? null : Math.round(Number(last24.avg_ms)),
        totalRequests: Number(overall.requests || 0),
        retentionDays: settings.log_retention_days,
        perDay
      },
      keys: keys.map((k) => ({ id: k.id, name: k.name, prefix: k.key_prefix, environment: k.environment, revoked: Boolean(k.revoked_at) })),
      canManageAll: canManageAll(req)
    });
  } catch (err) {
    console.error('[API logs] summary failed:', err.message);
    res.status(500).json({ success: false, error: 'The API usage summary could not be loaded.' });
  }
});

module.exports = router;
