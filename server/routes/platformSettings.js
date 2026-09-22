/**
 * Organization settings (/api/platform-settings): general settings (branding, regional, signing defaults, security,
 * email footer) and developer settings (API access, CORS / IP allowlist, webhook signing secret and delivery, logs).
 * Every authenticated user can read the general settings (other screens use them for defaults).
 */
const express = require('express');
const net = require('net');
const router = express.Router();
const db = require('../db');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const { getDeveloperSettings, generateSecret, maskSecret, parseList, purgeExpiredLogs, userName } = require('../utils/developerApi');

router.use(authenticateUser);
router.use(async (req, res, next) => {
  try {
    await ensurePlatformSchema();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Settings are not available: the database tables could not be prepared.' });
  }
});

const DATE_FORMATS = ['MMM dd, yyyy', 'dd MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd.MM.yyyy'];
const TIME_FORMATS = ['12h', '24h'];
const LANGUAGES = [
  ['en', 'English'], ['hi', 'Hindi'], ['gu', 'Gujarati'], ['es', 'Spanish'], ['fr', 'French'],
  ['de', 'German'], ['pt', 'Portuguese'], ['ar', 'Arabic'], ['ja', 'Japanese'], ['zh', 'Chinese']
];
// The signing flows a new request can start with (server/utils/signingFlow.js keeps the full catalog)
const SIGNING_ORDERS = require('../utils/signingFlow').SIGNING_FLOW_MODES.map((m) => m.key);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && Boolean(u.hostname);
  } catch (e) {
    return false;
  }
}

function isTimezone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (e) {
    return false;
  }
}

// Field rules: type, limits and label used in validation messages
const GENERAL_FIELDS = {
  organization_name: { type: 'string', label: 'Organization name', max: 150, required: true },
  organization_email: { type: 'email', label: 'Organization email', max: 255 },
  logo_url: { type: 'logo', label: 'Logo URL', max: 500 },
  brand_color: { type: 'color', label: 'Brand color' },
  timezone: { type: 'timezone', label: 'Time zone' },
  date_format: { type: 'enum', label: 'Date format', values: DATE_FORMATS },
  time_format: { type: 'enum', label: 'Time format', values: TIME_FORMATS },
  language: { type: 'enum', label: 'Language', values: LANGUAGES.map(([v]) => v) },
  default_expiry_days: { type: 'int', label: 'Default expiry', min: 1, max: 365 },
  reminder_frequency_days: { type: 'int', label: 'Reminder frequency', min: 1, max: 30 },
  auto_reminders: { type: 'bool' },
  default_signing_order: { type: 'enum', label: 'Default signing order', values: SIGNING_ORDERS },
  allow_decline: { type: 'bool' },
  allow_reassign: { type: 'bool' },
  allow_print_sign: { type: 'bool' },
  require_signer_otp: { type: 'bool' },
  session_timeout_minutes: { type: 'int', label: 'Session timeout', min: 5, max: 1440 },
  email_footer: { type: 'text', label: 'Email footer', max: 2000 }
};

const DEVELOPER_FIELDS = {
  api_enabled: { type: 'bool' },
  sandbox_mode: { type: 'bool' },
  rate_limit_per_minute: { type: 'int', label: 'Rate limit', min: 1, max: 10000 },
  allowed_origins: { type: 'origins', label: 'Allowed origins', maxItems: 50 },
  ip_allowlist: { type: 'ips', label: 'IP allowlist', maxItems: 100 },
  webhook_retry_count: { type: 'int', label: 'Retry count', min: 0, max: 10 },
  webhook_timeout_seconds: { type: 'int', label: 'Timeout', min: 1, max: 60 },
  default_callback_url: { type: 'url', label: 'Default callback URL', max: 500 },
  log_retention_days: { type: 'int', label: 'Log retention', min: 1, max: 365 }
};

const camel = (key) => key.replace(/_([a-z])/g, (m, c) => c.toUpperCase());

function isValidOrigin(value) {
  if (value === '*') return true;
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && u.origin === value.replace(/\/$/, '');
  } catch (e) {
    return false;
  }
}

function isValidIpEntry(value) {
  const [ip, bits, extra] = String(value).split('/');
  if (extra !== undefined) return false;
  const version = net.isIP(ip);
  if (!version) return false;
  if (bits === undefined) return true;
  const n = Number(bits);
  return /^\d+$/.test(bits) && n >= 0 && n <= (version === 4 ? 32 : 128);
}

/** Validates the supplied fields only (partial update). Returns { values, errors }. */
function validate(body, fields) {
  const values = {};
  const errors = {};
  for (const [key, rule] of Object.entries(fields)) {
    let raw = body[key] !== undefined ? body[key] : body[camel(key)];
    if (raw === undefined) continue;
    const label = rule.label || key;
    if (rule.type === 'bool') {
      values[key] = raw === true || raw === 1 || raw === '1' || raw === 'true' ? 1 : 0;
      continue;
    }
    if (rule.type === 'int') {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < rule.min || n > rule.max) errors[key] = `${label} must be a whole number from ${rule.min} to ${rule.max}.`;
      else values[key] = n;
      continue;
    }
    if (rule.type === 'origins' || rule.type === 'ips') {
      const list = [...new Set((Array.isArray(raw) ? raw : parseList(raw)).map((v) => String(v).trim().replace(/\/$/, '')).filter(Boolean))];
      const check = rule.type === 'origins' ? isValidOrigin : isValidIpEntry;
      const bad = list.filter((v) => !check(v));
      if (list.length > rule.maxItems) errors[key] = `${label} can have at most ${rule.maxItems} entries.`;
      else if (bad.length) {
        errors[key] = rule.type === 'origins'
          ? `Invalid origin: ${bad[0]}. Use the form https://app.example.com (scheme, host and optional port, no path).`
          : `Invalid IP address or CIDR range: ${bad[0]}.`;
      } else values[key] = list.length ? JSON.stringify(list) : null;
      continue;
    }
    const text = raw === null ? '' : String(raw).trim();
    if (!text) {
      if (rule.required) errors[key] = `${label} is required.`;
      else if (['string', 'email', 'logo', 'url', 'text'].includes(rule.type)) values[key] = null;
      else errors[key] = `${label} is required.`;
      continue;
    }
    if (rule.max && text.length > rule.max) {
      errors[key] = `${label} must be ${rule.max} characters or fewer.`;
      continue;
    }
    if (rule.type === 'email' && !EMAIL_RE.test(text)) errors[key] = `${label} must be a valid email address.`;
    else if (rule.type === 'url' && !isHttpUrl(text)) errors[key] = `${label} must be a full http:// or https:// URL.`;
    else if (rule.type === 'logo' && !isHttpUrl(text) && !/^\/[\w./-]+$/.test(text)) errors[key] = `${label} must be an http(s) URL or a path such as /uploads/logo.png.`;
    else if (rule.type === 'color' && !HEX_RE.test(text)) errors[key] = `${label} must be a hex color such as #007355.`;
    else if (rule.type === 'timezone' && !isTimezone(text)) errors[key] = `${label} "${text}" is not a valid IANA time zone.`;
    else if (rule.type === 'enum' && !rule.values.includes(text)) errors[key] = `${label} must be one of: ${rule.values.join(', ')}.`;
    else values[key] = rule.type === 'color' ? text.toLowerCase() : text;
  }
  return { values, errors };
}

function validationFailed(res, errors) {
  const messages = Object.values(errors);
  return res.status(400).json({ success: false, error: messages.length > 1 ? `${messages[0]} (${messages.length - 1} more field${messages.length > 2 ? 's' : ''} to fix)` : messages[0], fields: errors });
}

async function updaterName(id) {
  if (!id) return null;
  const [rows] = await db.query('SELECT first_name, last_name, email FROM users WHERE id = ?', [id]);
  return userName(rows[0]);
}

async function loadGeneral() {
  const [rows] = await db.query('SELECT * FROM general_settings ORDER BY id ASC LIMIT 1');
  if (!rows[0]) {
    await db.query('INSERT INTO general_settings (id) VALUES (1)');
    return loadGeneral();
  }
  return rows[0];
}

function serializeGeneral(row) {
  const out = {};
  for (const [key, rule] of Object.entries(GENERAL_FIELDS)) out[key] = rule.type === 'bool' ? Boolean(row[key]) : row[key];
  // Rows saved before the three signing flows kept 'parallel' / 'sequential'
  out.default_signing_order = require('../utils/signingFlow').normalizeMode(out.default_signing_order);
  return out;
}

function serializeDeveloper(row) {
  const out = {};
  for (const [key, rule] of Object.entries(DEVELOPER_FIELDS)) {
    if (rule.type === 'bool') out[key] = Boolean(row[key]);
    else if (rule.type === 'origins' || rule.type === 'ips') out[key] = parseList(row[key]);
    else out[key] = row[key];
  }
  out.webhook_signing_secret_masked = maskSecret(row.webhook_signing_secret);
  out.has_signing_secret = Boolean(row.webhook_signing_secret);
  return out;
}

/** Fields whose value changed: [{ field, from, to }] (long text is shortened for the activity log). */
function diff(before, values) {
  const short = (v) => (v === null || v === undefined ? null : String(v).length > 80 ? `${String(v).slice(0, 77)}...` : v);
  return Object.keys(values)
    .filter((key) => String(before[key] ?? '') !== String(values[key] ?? ''))
    .map((key) => ({ field: key, from: short(before[key]), to: short(values[key]) }));
}

async function updateRow(table, id, values, userId) {
  const keys = Object.keys(values);
  await db.query(
    `UPDATE ${table} SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...keys.map((k) => values[k]), userId || null, id]
  );
}

// @route   GET /api/platform-settings/general
router.get('/general', async (req, res) => {
  try {
    const row = await loadGeneral();
    res.json({
      success: true,
      settings: serializeGeneral(row),
      updatedAt: row.updated_at,
      updatedBy: await updaterName(row.updated_by),
      options: {
        dateFormats: DATE_FORMATS,
        timeFormats: TIME_FORMATS,
        languages: LANGUAGES.map(([value, label]) => ({ value, label })),
        signingOrders: require('../utils/signingFlow').SIGNING_FLOW_MODES.map(({ key, label, summary }) => ({ value: key, label, hint: summary }))
      }
    });
  } catch (err) {
    console.error('[General settings] load failed:', err.message);
    res.status(500).json({ success: false, error: 'General settings could not be loaded.' });
  }
});

// @route   PUT /api/platform-settings/general
router.put('/general', requirePermission('settings.general'), async (req, res) => {
  try {
    const { values, errors } = validate(req.body || {}, GENERAL_FIELDS);
    if (Object.keys(errors).length) return validationFailed(res, errors);
    const before = await loadGeneral();
    const changes = diff(before, values);
    if (changes.length) {
      const changed = Object.fromEntries(changes.map((c) => [c.field, values[c.field]]));
      await updateRow('general_settings', before.id, changed, req.user.id);
      await logActivity({
        req,
        category: 'settings',
        action: `Updated general settings (${changes.map((c) => c.field).join(', ')})`,
        entityType: 'general_settings',
        entityId: before.id,
        details: { changes }
      });
    }
    const row = await loadGeneral();
    res.json({
      success: true,
      message: changes.length ? 'General settings saved.' : 'No changes to save.',
      changed: changes.map((c) => c.field),
      settings: serializeGeneral(row),
      updatedAt: row.updated_at,
      updatedBy: await updaterName(row.updated_by)
    });
  } catch (err) {
    console.error('[General settings] save failed:', err.message);
    res.status(500).json({ success: false, error: 'General settings could not be saved.' });
  }
});

// @route   GET /api/platform-settings/developer
router.get('/developer', requirePermission('settings.developer'), async (req, res) => {
  try {
    const row = await getDeveloperSettings();
    res.json({ success: true, settings: serializeDeveloper(row), updatedAt: row.updated_at, updatedBy: await updaterName(row.updated_by) });
  } catch (err) {
    console.error('[Developer settings] load failed:', err.message);
    res.status(500).json({ success: false, error: 'Developer settings could not be loaded.' });
  }
});

// @route   PUT /api/platform-settings/developer
router.put('/developer', requirePermission('settings.developer'), async (req, res) => {
  try {
    const { values, errors } = validate(req.body || {}, DEVELOPER_FIELDS);
    if (Object.keys(errors).length) return validationFailed(res, errors);
    const before = await getDeveloperSettings();
    const changes = diff(before, values);
    if (changes.length) {
      const changed = Object.fromEntries(changes.map((c) => [c.field, values[c.field]]));
      await updateRow('developer_settings', before.id, changed, req.user.id);
      await logActivity({
        req,
        category: 'settings',
        action: `Updated developer settings (${changes.map((c) => c.field).join(', ')})`,
        entityType: 'developer_settings',
        entityId: before.id,
        details: { changes }
      });
      if (changes.some((c) => c.field === 'log_retention_days')) purgeExpiredLogs(true);
    }
    const row = await getDeveloperSettings();
    res.json({
      success: true,
      message: changes.length ? 'Developer settings saved.' : 'No changes to save.',
      changed: changes.map((c) => c.field),
      settings: serializeDeveloper(row),
      updatedAt: row.updated_at,
      updatedBy: await updaterName(row.updated_by)
    });
  } catch (err) {
    console.error('[Developer settings] save failed:', err.message);
    res.status(500).json({ success: false, error: 'Developer settings could not be saved.' });
  }
});

// @route   POST /api/platform-settings/developer/rotate-secret
// @desc    New webhook signing secret; returned in full only in this response
router.post('/developer/rotate-secret', requirePermission('settings.developer'), async (req, res) => {
  try {
    const row = await getDeveloperSettings();
    const secret = generateSecret();
    await updateRow('developer_settings', row.id, { webhook_signing_secret: secret }, req.user.id);
    await logActivity({
      req,
      category: 'settings',
      action: 'Rotated the webhook signing secret',
      entityType: 'developer_settings',
      entityId: row.id,
      details: { previous: maskSecret(row.webhook_signing_secret), current: maskSecret(secret) }
    });
    res.json({ success: true, secret, masked: maskSecret(secret), message: 'Signing secret rotated. Update your webhook receivers with the new secret.' });
  } catch (err) {
    console.error('[Developer settings] rotate failed:', err.message);
    res.status(500).json({ success: false, error: 'The signing secret could not be rotated.' });
  }
});

// @route   POST /api/platform-settings/developer/reveal-secret
// @desc    Shows the current signing secret to an administrator (logged in the activity history)
router.post('/developer/reveal-secret', requirePermission('settings.developer'), async (req, res) => {
  try {
    const row = await getDeveloperSettings();
    await logActivity({ req, category: 'settings', action: 'Revealed the webhook signing secret', entityType: 'developer_settings', entityId: row.id });
    res.json({ success: true, secret: row.webhook_signing_secret });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The signing secret could not be loaded.' });
  }
});

module.exports = router;
