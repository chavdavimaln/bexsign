/**
 * Integrations engine (server/utils/integrationStore.js): stored configuration, encrypted secrets, "Test connection"
 * and delivery of signing events to connected apps.
 *
 * Secrets (API keys, tokens, client secrets) are encrypted with AES-256-GCM. The key comes from
 * INTEGRATION_SECRET_KEY (server/.env), falling back to JWT_SECRET: keep it stable, or saved secrets can no longer
 * be read and have to be entered again.
 */
const crypto = require('crypto');
const db = require('../db');
const catalog = require('./integrationCatalog');
const { postJson, buildEventData, signPayload } = require('./webhooks');
const { getClientBaseUrl } = require('./requestHelpers');

const ENC_KEY = crypto.createHash('sha256')
  .update(String(process.env.INTEGRATION_SECRET_KEY || process.env.JWT_SECRET || 'bexsign-integrations-key'))
  .digest();
const TIMEOUT_MS = 10000;

/* ---------------------------------------------------------------- helpers */

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${data.toString('base64')}`;
}

function decrypt(value) {
  try {
    const [version, iv, tag, data] = String(value || '').split(':');
    if (version !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

const mask = (value) => {
  const s = String(value || '');
  if (!s) return '';
  return `${'•'.repeat(8)}${s.length > 8 ? s.slice(-4) : ''}`;
};

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch (e) {
    return false;
  }
};

/** Public origin of this API (links to signed files in event payloads). */
function apiOrigin() {
  return (process.env.PUBLIC_API_URL || process.env.OAUTH_CALLBACK_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
}

const providerOf = (row) => catalog.findProvider(row.provider_key);
const fieldsOf = (provider) => provider?.fields || [];

/** Stored secrets of a connection, decrypted: { key: value } */
function readSecrets(row) {
  const stored = parseJson(row?.secrets, {});
  return Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, decrypt(v)]).filter(([, v]) => v !== null && v !== ''));
}

/** Config values with the provider's defaults for anything not set yet. */
function readConfig(row, provider) {
  const stored = parseJson(row?.config, {});
  const out = {};
  fieldsOf(provider).filter((f) => !f.secret).forEach((f) => {
    out[f.key] = stored[f.key] !== undefined ? stored[f.key] : (f.default !== undefined ? f.default : (f.type === 'toggle' ? false : ''));
  });
  return out;
}

/* ---------------------------------------------------------------- reading */

async function getConnection(key) {
  const [rows] = await db.query('SELECT * FROM integration_connections WHERE provider_key = ?', [key]);
  return rows[0] || null;
}

/** What the browser sees of a connection: config, which secrets are set (masked), events, status and counters. */
function present(row, provider) {
  const secrets = readSecrets(row);
  return {
    id: row.id,
    key: row.provider_key,
    name: row.name,
    description: row.description || '',
    category: row.category,
    isCustom: Boolean(row.is_custom),
    status: row.status,
    config: readConfig(row, provider),
    secrets: Object.fromEntries(fieldsOf(provider).filter((f) => f.secret).map((f) => [f.key, { set: Boolean(secrets[f.key]), masked: mask(secrets[f.key]) }])),
    events: parseJson(row.events, provider?.defaultEvents || []),
    lastTestedAt: row.last_tested_at,
    lastTestOk: row.last_test_ok === null ? null : Boolean(row.last_test_ok),
    lastTestMessage: row.last_test_message,
    lastEventAt: row.last_event_at,
    eventCount: Number(row.event_count || 0),
    failureCount: Number(row.failure_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** Provider definition as the browser needs it (fields, steps, events, redirect URI). */
function describeProvider(provider, { name, description } = {}) {
  return {
    key: provider.key,
    name: name || provider.name,
    category: provider.category,
    categoryLabel: catalog.CATEGORIES[provider.category] || provider.category,
    color: provider.color,
    tagline: description || provider.tagline,
    description: description || provider.description,
    delivery: provider.delivery,
    fixedEvents: Boolean(provider.fixedEvents),
    defaultEvents: provider.defaultEvents,
    fields: provider.fields,
    steps: provider.steps,
    test: provider.test,
    redirectUri: provider.redirectPath ? `${apiOrigin()}${provider.redirectPath}` : null
  };
}

/** Every built-in provider (with its connection when configured) and every custom integration. */
async function listIntegrations() {
  const [rows] = await db.query('SELECT * FROM integration_connections ORDER BY is_custom ASC, name ASC');
  const byKey = new Map(rows.map((r) => [r.provider_key, r]));
  const builtIn = catalog.PROVIDERS.map((p) => {
    const row = byKey.get(p.key);
    return { provider: describeProvider(p), connection: row ? present(row, p) : null };
  });
  const custom = rows.filter((r) => r.is_custom).map((r) => ({
    provider: { ...describeProvider(catalog.CUSTOM_TEMPLATE, { name: r.name, description: r.description }), key: r.provider_key },
    connection: present(r, catalog.CUSTOM_TEMPLATE)
  }));
  const [recent] = await db.query(
    `SELECT a.*, c.name AS connection_name, c.provider_key FROM integration_activity a
     JOIN integration_connections c ON c.id = a.connection_id ORDER BY a.id DESC LIMIT 8`
  );
  return { integrations: [...builtIn, ...custom], recentActivity: recent };
}

async function getIntegration(key) {
  const provider = catalog.findProvider(key);
  if (!provider) return null;
  const row = await getConnection(key);
  if (provider === catalog.CUSTOM_TEMPLATE && !row) return null;
  const [activity] = row
    ? await db.query('SELECT * FROM integration_activity WHERE connection_id = ? ORDER BY id DESC LIMIT 25', [row.id])
    : [[]];
  return {
    provider: row && row.is_custom
      ? { ...describeProvider(provider, { name: row.name, description: row.description }), key: row.provider_key }
      : describeProvider(provider),
    connection: row ? present(row, provider) : null,
    activity,
    events: catalog.SIGNING_EVENTS
  };
}

/* ---------------------------------------------------------------- saving */

/**
 * Checks the submitted form against the provider's fields and merges secrets with the stored ones (an empty secret
 * keeps what is stored). Returns { config, secrets, events, error }.
 */
function validateInput(provider, input, existingRow) {
  const config = {};
  const secrets = existingRow ? readSecrets(existingRow) : {};
  const submittedConfig = input.config || {};
  const submittedSecrets = input.secrets || {};
  const visible = (field, values) => {
    if (!field.showIf) return true;
    return Object.entries(field.showIf).every(([k, v]) => [].concat(v).includes(values[k]));
  };

  for (const field of fieldsOf(provider).filter((f) => !f.secret)) {
    let value = submittedConfig[field.key];
    // Fields the form did not send keep the provider's default
    if (value === undefined && field.default !== undefined) value = field.default;
    if (field.type === 'toggle') value = Boolean(value);
    else if (field.type === 'select') {
      const allowed = (field.options || []).map((o) => (Array.isArray(o) ? o[0] : o));
      if (!allowed.includes(value)) value = field.default !== undefined ? field.default : allowed[0];
    } else {
      value = String(value ?? '').trim().slice(0, 500);
      if (field.type === 'url' && value) {
        value = value.replace(/\/+$/, '');
        if (!isHttpUrl(value)) return { error: `${field.label} must be a full http(s) URL.` };
      }
    }
    config[field.key] = value;
  }
  for (const field of fieldsOf(provider)) {
    if (!field.required || !visible(field, config)) continue;
    const given = field.secret ? (String(submittedSecrets[field.key] || '').trim() || secrets[field.key]) : config[field.key];
    if (!given && given !== false) return { error: `${field.label} is required.` };
  }
  for (const field of fieldsOf(provider).filter((f) => f.secret)) {
    if (submittedSecrets[field.key] === null) delete secrets[field.key]; // explicit clear
    const value = String(submittedSecrets[field.key] || '').trim();
    if (value) secrets[field.key] = value.slice(0, 2000);
  }
  // Provider specific checks
  if (provider.key === 'google-workspace' && config.client_id && !/\.apps\.googleusercontent\.com$/.test(config.client_id)) {
    return { error: 'A Google OAuth client ID ends with ".apps.googleusercontent.com".' };
  }
  if (provider.key === 'microsoft-365' && config.client_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.client_id)) {
    return { error: 'The Application (client) ID is a GUID like 00000000-0000-0000-0000-000000000000.' };
  }
  if (provider.key === 'stripe-identity') {
    if (config.publishable_key && !/^pk_(live|test)_/.test(config.publishable_key)) return { error: 'The publishable key starts with pk_live_ or pk_test_.' };
    if (secrets.secret_key && !/^(sk|rk)_(live|test)_/.test(secrets.secret_key)) return { error: 'The secret key starts with sk_ or rk_ (live or test).' };
  }
  if (['google-workspace', 'microsoft-365'].includes(provider.key) && config.restrict_domain && !(config.hosted_domain || config.allowed_domain)) {
    return { error: 'Enter the company domain to limit sign-in to it.' };
  }
  if (provider === catalog.CUSTOM_TEMPLATE && !secrets.signing_secret) secrets.signing_secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  let events = [];
  if (provider.delivery) {
    events = provider.fixedEvents
      ? provider.defaultEvents
      : [...new Set((Array.isArray(input.events) ? input.events : provider.defaultEvents).filter((e) => catalog.EVENT_KEYS.includes(e)))];
    if (!events.length) return { error: 'Choose at least one signing event.' };
  }
  return { config, secrets, events };
}

async function saveIntegration(key, input, user) {
  const provider = catalog.findProvider(key);
  if (!provider) return { error: 'Unknown integration.', status: 404 };
  const existing = await getConnection(key);
  if (provider === catalog.CUSTOM_TEMPLATE && !existing) return { error: 'Unknown integration.', status: 404 };
  const checked = validateInput(provider, input, existing);
  if (checked.error) return { error: checked.error, status: 400 };

  const status = input.enabled === false ? 'disabled' : 'connected';
  const encrypted = JSON.stringify(Object.fromEntries(Object.entries(checked.secrets).map(([k, v]) => [k, encrypt(v)])));
  const name = existing?.is_custom ? String(input.name || existing.name).trim().slice(0, 120) || existing.name : provider.name;
  const description = existing?.is_custom ? String(input.description ?? existing.description ?? '').trim().slice(0, 255) : null;
  if (existing) {
    await db.query(
      `UPDATE integration_connections SET name = ?, description = ?, status = ?, config = ?, secrets = ?, events = ?, updated_by = ? WHERE id = ?`,
      [name, description, status, JSON.stringify(checked.config), encrypted, JSON.stringify(checked.events), user?.id || null, existing.id]
    );
  } else {
    await db.query(
      `INSERT INTO integration_connections (provider_key, name, category, is_custom, status, config, secrets, events, created_by, updated_by)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [key, provider.name, provider.category, status, JSON.stringify(checked.config), encrypted, JSON.stringify(checked.events), user?.id || null, user?.id || null]
    );
  }
  const row = await getConnection(key);
  await recordActivity(row.id, { action: existing ? 'updated' : 'connected', message: existing ? 'Configuration saved' : 'Integration connected', userId: user?.id });
  ssoCache.clear();
  return { connection: present(row, provider) };
}

async function createCustomIntegration(input, user) {
  const name = String(input.name || '').trim().slice(0, 120);
  if (!name) return { error: 'Enter a name for the integration.', status: 400 };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'integration';
  const key = `custom-${slug}-${crypto.randomBytes(3).toString('hex')}`;
  const provider = catalog.CUSTOM_TEMPLATE;
  const checked = validateInput(provider, input, null);
  if (checked.error) return { error: checked.error, status: 400 };
  const encrypted = JSON.stringify(Object.fromEntries(Object.entries(checked.secrets).map(([k, v]) => [k, encrypt(v)])));
  await db.query(
    `INSERT INTO integration_connections (provider_key, name, description, category, is_custom, status, config, secrets, events, created_by, updated_by)
     VALUES (?, ?, ?, 'custom', 1, 'connected', ?, ?, ?, ?, ?)`,
    [key, name, String(input.description || '').trim().slice(0, 255) || null, JSON.stringify(checked.config), encrypted, JSON.stringify(checked.events), user?.id || null, user?.id || null]
  );
  const row = await getConnection(key);
  await recordActivity(row.id, { action: 'connected', message: 'Custom integration created', userId: user?.id });
  return { connection: present(row, provider), key };
}

async function setEnabled(key, enabled, user) {
  const row = await getConnection(key);
  if (!row) return null;
  await db.query('UPDATE integration_connections SET status = ?, updated_by = ? WHERE id = ?', [enabled ? 'connected' : 'disabled', user?.id || null, row.id]);
  await recordActivity(row.id, { action: enabled ? 'enabled' : 'disabled', message: enabled ? 'Integration turned on' : 'Integration turned off', userId: user?.id });
  ssoCache.clear();
  return present(await getConnection(key), providerOf(row));
}

/** Disconnect: removes the stored configuration and secrets (and its activity). */
async function removeIntegration(key) {
  const row = await getConnection(key);
  if (!row) return false;
  await db.query('DELETE FROM integration_activity WHERE connection_id = ?', [row.id]);
  await db.query('DELETE FROM integration_connections WHERE id = ?', [row.id]);
  ssoCache.clear();
  return true;
}

async function recordActivity(connectionId, { action, event = null, success = true, message = null, statusCode = null, durationMs = null, documentId = null, userId = null }) {
  try {
    await db.query(
      `INSERT INTO integration_activity (connection_id, action, event, success, message, status_code, duration_ms, document_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [connectionId, action, event, success ? 1 : 0, message ? String(message).slice(0, 500) : null, statusCode, durationMs, documentId, userId]
    );
    // Keep the latest 500 entries per integration
    await db.query(
      `DELETE FROM integration_activity WHERE connection_id = ? AND id < (
         SELECT id FROM (SELECT id FROM integration_activity WHERE connection_id = ? ORDER BY id DESC LIMIT 1 OFFSET 499) AS keep_from)`,
      [connectionId, connectionId]
    );
  } catch (err) {
    console.warn('[Integrations] activity not recorded:', err.message);
  }
}

/* ---------------------------------------------------------------- outgoing requests */

async function httpJson(url, { method = 'GET', headers = {}, body } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    return { statusCode: res.status, ok: res.ok, body: text.slice(0, 2000), json: parseJson(text, null), durationMs: Date.now() - started };
  } catch (err) {
    return { statusCode: null, ok: false, body: '', error: err.name === 'AbortError' ? `Timed out after ${TIMEOUT_MS / 1000} s` : err.message, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** Where a webhook-style integration posts, and with which headers. */
function webhookTarget(provider, config, secrets) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'BexSign-Integrations/1.0' };
  let url = '';
  if (provider.key === 'bexcode-crm') {
    url = config.events_url || (config.base_url ? `${config.base_url}/api/bexsign/events` : '');
    if (secrets.api_key) headers.Authorization = `Bearer ${secrets.api_key}`;
    if (config.workspace_id) headers['X-Workspace-Id'] = config.workspace_id;
  } else if (provider.key === 'zapier') {
    url = config.hook_url;
  } else {
    url = config.endpoint_url;
    if (config.auth_type === 'bearer' && secrets.auth_value) headers.Authorization = `Bearer ${secrets.auth_value}`;
    if (config.auth_type === 'header' && config.auth_header && secrets.auth_value) headers[config.auth_header] = secrets.auth_value;
    if (config.auth_type === 'basic' && secrets.auth_value) headers.Authorization = `Basic ${Buffer.from(secrets.auth_value).toString('base64')}`;
  }
  return { url, headers };
}

async function postWebhook(provider, config, secrets, event, payload) {
  const { url, headers } = webhookTarget(provider, config, secrets);
  if (!url) return { ok: false, error: 'No endpoint URL is set.' };
  const body = JSON.stringify(payload);
  const deliveryId = `idel_${crypto.randomBytes(10).toString('hex')}`;
  const allHeaders = { ...headers, 'X-BexSign-Event': event, 'X-BexSign-Delivery': deliveryId };
  if (secrets.signing_secret) allHeaders['X-BexSign-Signature'] = signPayload(body, secrets.signing_secret);
  const result = await postJson(url, body, allHeaders, TIMEOUT_MS);
  const ok = result.statusCode >= 200 && result.statusCode < 300;
  return { ok, statusCode: result.statusCode, durationMs: result.durationMs, error: ok ? null : (result.error || `HTTP ${result.statusCode}${result.body ? `: ${String(result.body).slice(0, 160)}` : ''}`) };
}

const EVENT_TEXT = {
  'document.sent': ':outbox_tray: *{name}* was sent for signature',
  'document.viewed': ':eyes: {recipient} opened *{name}*',
  'document.signed': ':writing_hand: {recipient} signed *{name}*',
  'document.completed': ':white_check_mark: *{name}* is completed — everyone signed',
  'document.declined': ':x: {recipient} declined *{name}*',
  'document.recalled': ':leftwards_arrow_with_hook: *{name}* was recalled',
  'template.created': ':page_facing_up: New template *{name}*',
  ping: ':wave: BexSign is connected to this channel'
};

async function postSlack(config, secrets, event, data) {
  if (!config.webhook_url) return { ok: false, error: 'No webhook URL is set.' };
  const doc = data.document || {};
  const name = doc.name || data.template?.title || 'a document';
  const recipient = data.recipient ? (data.recipient.name || data.recipient.email) : 'A recipient';
  let text = (EVENT_TEXT[event] || `BexSign event ${event} for *{name}*`).replace('{name}', name).replace('{recipient}', recipient);
  if (event === 'document.declined' && config.mention_on_decline) text = `<!channel> ${text}`;
  if (data.reason) text += `\n>Reason: ${data.reason}`;
  if (doc.id) text += `\n<${getClientBaseUrl()}/documents/${doc.id}|Open in BexSign>`;
  const result = await postJson(config.webhook_url, JSON.stringify({ text }), { 'Content-Type': 'application/json' }, TIMEOUT_MS);
  const ok = result.statusCode >= 200 && result.statusCode < 300;
  return { ok, statusCode: result.statusCode, durationMs: result.durationMs, error: ok ? null : (result.error || `Slack answered HTTP ${result.statusCode}: ${String(result.body || '').slice(0, 120)}`) };
}

function dropboxPath(config, doc, fileName) {
  const base = `/${String(config.folder_path || '/BexSign').replace(/^\/+|\/+$/g, '')}`;
  const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Document';
  const when = doc.completed_at ? new Date(doc.completed_at) : new Date();
  if (config.folder_layout === 'by_month') return `${base}/${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}/${safe(fileName)}`;
  if (config.folder_layout === 'by_document') return `${base}/${safe(doc.name)} (${doc.id})/${safe(fileName)}`;
  return `${base}/${safe(fileName)}`;
}

async function uploadToDropbox(config, secrets, data) {
  const doc = data.document || {};
  if (!doc.id) return { ok: false, error: 'No document in the event.' };
  const { getCompletedPdfFiles } = require('./requestCompletion');
  const files = await getCompletedPdfFiles(doc.id);
  const uploads = files.documents.map((d) => ({ name: d.name, buffer: d.buffer }));
  if (config.include_certificate && files.certificate) uploads.push({ name: `${String(doc.name || 'Document').replace(/\.pdf$/i, '')} - Certificate of Completion.pdf`, buffer: files.certificate });
  const started = Date.now();
  const done = [];
  for (const file of uploads.filter((u) => u.buffer)) {
    const path = dropboxPath(config, doc, file.name);
    const res = await httpJson('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.access_token}`,
        'Content-Type': 'application/octet-stream',
        // Non-ASCII characters must be escaped in this header
        'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: true }).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
      },
      body: file.buffer
    });
    if (!res.ok) return { ok: false, statusCode: res.statusCode, durationMs: Date.now() - started, error: res.error || `Dropbox refused ${file.name}: ${res.json?.error_summary || `HTTP ${res.statusCode}`}` };
    done.push(res.json?.path_display || path);
  }
  return { ok: true, statusCode: 200, durationMs: Date.now() - started, message: `Uploaded ${done.length} file${done.length === 1 ? '' : 's'}: ${done.join(', ')}` };
}

/** The JSON body of an event for webhook-style integrations. */
function buildPayload(provider, config, event, data) {
  const payload = { id: `evt_${crypto.randomBytes(10).toString('hex')}`, event, created_at: new Date().toISOString(), source: 'bexsign', data: { ...data } };
  const doc = data.document;
  if (doc?.id && (provider.key !== 'custom' || config.include_document_link !== false)) {
    payload.data.document = { ...doc, url: `${getClientBaseUrl()}/documents/${doc.id}` };
  }
  if (provider === catalog.CUSTOM_TEMPLATE && config.include_recipients === false && payload.data.document) {
    delete payload.data.document.recipients;
  }
  if (event === 'document.completed' && doc?.id && (provider.key !== 'bexcode-crm' || config.attach_signed_pdf)) {
    payload.data.files = {
      certificate: `${apiOrigin()}/uploads/completed/${doc.id}/certificate-of-completion.pdf`,
      download_page: `${getClientBaseUrl()}/documents/${doc.id}`
    };
  }
  if (provider.key === 'bexcode-crm') {
    payload.crm = {
      workspace_id: config.workspace_id || null,
      log_activity: Boolean(config.log_activity),
      deal_stage: event === 'document.completed' && config.deal_stage !== 'Do not change' ? config.deal_stage : null
    };
  }
  if (provider.key === 'zapier' && config.flatten_payload) {
    Object.assign(payload, {
      document_id: doc?.id || null,
      document_name: doc?.name || data.template?.title || null,
      document_status: doc?.status || null,
      sender_email: doc?.owner?.email || null,
      recipient_name: data.recipient?.name || null,
      recipient_email: data.recipient?.email || null,
      recipient_status: data.recipient?.status || null,
      completed_at: doc?.completed_at || null
    });
  }
  return payload;
}

/* ---------------------------------------------------------------- test connection */

/**
 * Tests a provider with the given (possibly unsaved) settings merged with the stored secrets.
 * Returns { ok, message, statusCode, durationMs }.
 */
async function testIntegration(key, input = {}, user = null) {
  const provider = catalog.findProvider(key);
  const row = await getConnection(key);
  if (!provider || (provider === catalog.CUSTOM_TEMPLATE && !row)) return { ok: false, message: 'Unknown integration.' };
  const checked = validateInput(provider, {
    config: input.config || readConfig(row, provider),
    secrets: input.secrets || {},
    events: input.events || parseJson(row?.events, provider.defaultEvents)
  }, row);
  if (checked.error) return { ok: false, message: checked.error };
  const { config, secrets } = checked;
  let result;

  const sample = {
    // Sample data only: a test never sends real people's details to the endpoint
    document: { id: 0, name: 'BexSign connection test', status: 'Completed', recipients: [{ name: 'Test Recipient', email: 'recipient@example.com', status: 'signed' }], owner: { name: 'BexSign test sender', email: 'sender@example.com' } },
    recipient: { name: 'Test Recipient', email: 'recipient@example.com', status: 'signed' }
  };

  switch (provider.delivery === 'webhook' ? 'webhook' : provider.key) {
    case 'webhook': {
      const res = await postWebhook(provider, config, secrets, 'ping', { ...buildPayload(provider, config, 'ping', sample), event: 'ping', test: true });
      result = res.ok
        ? { ok: true, message: `The endpoint accepted the test event (HTTP ${res.statusCode}).`, ...res }
        : { ok: false, message: `The test event was not accepted: ${res.error}`, ...res };
      break;
    }
    case 'slack': {
      const res = await postSlack(config, secrets, 'ping', {});
      result = res.ok ? { ok: true, message: 'A test message was posted to the channel.', ...res } : { ok: false, message: res.error, ...res };
      break;
    }
    case 'dropbox': {
      const res = await httpJson('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST', headers: { Authorization: `Bearer ${secrets.access_token}`, 'Content-Type': 'application/json' }, body: 'null'
      });
      result = res.ok
        ? { ok: true, message: `Connected to the Dropbox account of ${res.json?.name?.display_name || 'the token owner'} (${res.json?.email || 'no email'}). Files go to ${config.folder_path || '/BexSign'}.`, ...res }
        : { ok: false, message: res.error || `Dropbox refused the token: ${res.json?.error_summary || `HTTP ${res.statusCode}`}`, ...res };
      break;
    }
    case 'stripe-identity': {
      const res = await httpJson('https://api.stripe.com/v1/identity/verification_sessions?limit=1', { headers: { Authorization: `Bearer ${secrets.secret_key}` } });
      const mode = String(secrets.secret_key || '').includes('_test_') ? 'test' : 'live';
      result = res.ok
        ? { ok: true, message: `Stripe accepted the key (${mode} mode). Identity verification sessions can be created.`, ...res }
        : { ok: false, message: res.error || `Stripe refused the key: ${res.json?.error?.message || `HTTP ${res.statusCode}`}`, ...res };
      break;
    }
    case 'google-workspace': {
      const res = await httpJson('https://accounts.google.com/.well-known/openid-configuration');
      result = res.ok
        ? { ok: true, message: 'The client ID looks right and Google sign-in is reachable. The secret is confirmed on the first "Continue with Google".', ...res }
        : { ok: false, message: `Google sign-in could not be reached: ${res.error || `HTTP ${res.statusCode}`}`, ...res };
      break;
    }
    case 'microsoft-365': {
      const tenant = encodeURIComponent(config.tenant || 'common');
      const res = await httpJson(`https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration`);
      result = res.ok
        ? { ok: true, message: `Tenant "${config.tenant || 'common'}" found. The secret is confirmed on the first "Continue with Microsoft".`, ...res }
        : { ok: false, message: res.statusCode === 400 ? `Microsoft does not know the tenant "${config.tenant}".` : `Microsoft sign-in could not be reached: ${res.error || `HTTP ${res.statusCode}`}`, ...res };
      break;
    }
    default:
      result = { ok: false, message: 'This integration cannot be tested.' };
  }

  if (row) {
    await db.query('UPDATE integration_connections SET last_tested_at = NOW(), last_test_ok = ?, last_test_message = ? WHERE id = ?', [result.ok ? 1 : 0, String(result.message).slice(0, 500), row.id]);
    await recordActivity(row.id, { action: 'test', event: 'ping', success: result.ok, message: result.message, statusCode: result.statusCode || null, durationMs: result.durationMs || null, userId: user?.id });
  }
  return { ok: result.ok, message: result.message, statusCode: result.statusCode || null, durationMs: result.durationMs || null };
}

/* ---------------------------------------------------------------- event delivery */

async function deliverEvent(row, provider, event, data) {
  const config = readConfig(row, provider);
  const secrets = readSecrets(row);
  let res;
  if (provider.delivery === 'webhook') res = await postWebhook(provider, config, secrets, event, buildPayload(provider, config, event, data));
  else if (provider.delivery === 'slack') res = await postSlack(config, secrets, event, data);
  else if (provider.delivery === 'dropbox') res = await uploadToDropbox(config, secrets, data);
  else return;
  await recordActivity(row.id, {
    action: provider.delivery === 'dropbox' ? 'upload' : 'event',
    event,
    success: res.ok,
    message: res.ok ? (res.message || `Delivered (HTTP ${res.statusCode})`) : res.error,
    statusCode: res.statusCode || null,
    durationMs: res.durationMs || null,
    documentId: data.document?.id || null
  });
  await db.query(
    `UPDATE integration_connections SET last_event_at = NOW(), event_count = event_count + 1,
       failure_count = ${res.ok ? 0 : 'failure_count + 1'} WHERE id = ?`,
    [row.id]
  );
}

/** Sends a signing event to every connected integration subscribed to it (never throws to the caller). */
async function dispatchIntegrationEvent(event, input) {
  const [rows] = await db.query("SELECT * FROM integration_connections WHERE status = 'connected'");
  const targets = rows.filter((row) => {
    const provider = providerOf(row);
    return provider?.delivery && parseJson(row.events, provider.defaultEvents).includes(event);
  });
  if (!targets.length) return;
  const { data } = await buildEventData(event, input);
  await Promise.all(targets.map((row) => deliverEvent(row, providerOf(row), event, data).catch((err) => {
    console.warn(`[Integrations] ${row.name} ${event} failed:`, err.message);
    return recordActivity(row.id, { action: 'event', event, success: false, message: err.message, documentId: data.document?.id || null });
  })));
}

/* ---------------------------------------------------------------- sign-in providers (routes/oauth.js) */

const ssoCache = new Map();

/**
 * Credentials and rules of a connected sign-in integration ('google-workspace' | 'microsoft-365'):
 * { configured, enabled, clientId, clientSecret, tenant, domain, restrictDomain, allowSignup } or null when the
 * integration is not set up (the .env values apply then).
 */
async function getSsoSettings(key) {
  const cached = ssoCache.get(key);
  if (cached && Date.now() - cached.at < 30 * 1000) return cached.value;
  let value = null;
  try {
    const row = await getConnection(key);
    if (row) {
      const provider = providerOf(row);
      const config = readConfig(row, provider);
      const secrets = readSecrets(row);
      value = {
        configured: Boolean(config.client_id && secrets.client_secret),
        enabled: row.status === 'connected' && config.enable_sso !== false,
        clientId: config.client_id,
        clientSecret: secrets.client_secret,
        tenant: config.tenant || null,
        domain: String(config.hosted_domain || config.allowed_domain || '').trim().toLowerCase().replace(/^@/, ''),
        restrictDomain: Boolean(config.restrict_domain),
        allowSignup: config.allow_signup !== false
      };
    }
  } catch (err) {
    console.warn('[Integrations] sign-in settings not read:', err.message);
  }
  ssoCache.set(key, { at: Date.now(), value });
  return value;
}

/** The signing secret of a custom integration (Configure page "Reveal"); other secrets are never read back. */
async function revealSigningSecret(key) {
  const row = await getConnection(key);
  if (!row || !row.is_custom) return null;
  return readSecrets(row).signing_secret || null;
}

module.exports = {
  revealSigningSecret,
  listIntegrations,
  getIntegration,
  saveIntegration,
  createCustomIntegration,
  setEnabled,
  removeIntegration,
  testIntegration,
  dispatchIntegrationEvent,
  getSsoSettings,
  encrypt,
  decrypt
};
