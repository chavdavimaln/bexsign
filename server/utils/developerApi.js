/**
 * Developer API helpers shared by the developer routes, the public API (/api/v1) and webhook delivery:
 * key scopes, webhook events, the developer_settings row, secret masking and log retention.
 */
const crypto = require('crypto');
const db = require('../db');
const { ensurePlatformSchema } = require('./platformSchema');

const API_SCOPES = [
  { key: 'documents:read', label: 'Read documents', description: 'List documents and read their status and recipients' },
  { key: 'documents:write', label: 'Write documents', description: 'Reserved for endpoints that create or change documents' },
  { key: 'templates:read', label: 'Read templates', description: 'List your templates and templates shared with the organization' },
  { key: 'webhooks:manage', label: 'Manage webhooks', description: 'Reserved for endpoints that manage webhooks' },
  { key: 'reports:read', label: 'Read reports', description: 'Document counts by status and completion figures' }
];
const SCOPE_KEYS = API_SCOPES.map((s) => s.key);

const WEBHOOK_EVENTS = [
  { key: 'document.sent', label: 'Document sent', description: 'A request was sent to its recipients (or sent again)' },
  { key: 'document.viewed', label: 'Document viewed', description: 'A recipient opened the signing link' },
  { key: 'document.signed', label: 'Document signed', description: 'A recipient signed or approved' },
  { key: 'document.completed', label: 'Document completed', description: 'Every recipient signed; the signed PDF is ready' },
  { key: 'document.declined', label: 'Document declined', description: 'A recipient declined to sign' },
  { key: 'document.recalled', label: 'Document recalled', description: 'The sender recalled the request' },
  { key: 'template.created', label: 'Template created', description: 'A new template was saved' },
  { key: 'ping', label: 'Ping', description: 'Test event sent with "Send test"' }
];
const EVENT_KEYS = WEBHOOK_EVENTS.map((e) => e.key);

// Extra webhook_deliveries columns: one row per attempt of a delivery
let deliverySchemaPromise = null;
function ensureDeliverySchema() {
  if (!deliverySchemaPromise) {
    deliverySchemaPromise = (async () => {
      await ensurePlatformSchema();
      const columns = [
        ['delivery_id', 'VARCHAR(40) NULL'],
        ['attempt', 'INT NOT NULL DEFAULT 1'],
        ['error', 'VARCHAR(255) NULL']
      ];
      for (const [column, definition] of columns) {
        const [rows] = await db.query(
          "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'webhook_deliveries' AND COLUMN_NAME = ?",
          [column]
        );
        if (!rows.length) await db.query(`ALTER TABLE webhook_deliveries ADD COLUMN \`${column}\` ${definition}`);
      }
      const [idx] = await db.query(
        "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_logs' AND INDEX_NAME = 'idx_api_logs_time'"
      );
      if (!idx.length) await db.query('ALTER TABLE api_logs ADD INDEX idx_api_logs_time (created_at)');
    })().catch((err) => {
      deliverySchemaPromise = null;
      throw err;
    });
  }
  return deliverySchemaPromise;
}

const generateSecret = () => `whsec_${crypto.randomBytes(24).toString('hex')}`;

function maskSecret(secret) {
  if (!secret) return null;
  const s = String(secret);
  const head = s.startsWith('whsec_') ? 'whsec_' : s.slice(0, 2);
  return `${head}${'•'.repeat(10)}${s.slice(-4)}`;
}

/** List stored as a JSON array (older rows may hold comma/newline separated text). */
function parseList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (e) {}
  return String(raw).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

function parseJsonArray(raw, fallback = []) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

/** The developer_settings row; a signing secret is created the first time it is needed. */
async function getDeveloperSettings() {
  await ensureDeliverySchema();
  const [rows] = await db.query('SELECT * FROM developer_settings ORDER BY id ASC LIMIT 1');
  let row = rows[0];
  if (!row) {
    await db.query('INSERT INTO developer_settings (id) VALUES (1)');
    return getDeveloperSettings();
  }
  if (!row.webhook_signing_secret) {
    const secret = generateSecret();
    await db.query('UPDATE developer_settings SET webhook_signing_secret = ? WHERE id = ? AND webhook_signing_secret IS NULL', [secret, row.id]);
    const [again] = await db.query('SELECT * FROM developer_settings WHERE id = ?', [row.id]);
    row = again[0];
  }
  return row;
}

// Logs older than the retention period are removed at most once an hour
let lastPurge = 0;
async function purgeExpiredLogs(force = false) {
  if (!force && Date.now() - lastPurge < 60 * 60 * 1000) return;
  lastPurge = Date.now();
  try {
    const settings = await getDeveloperSettings();
    const days = Math.max(1, parseInt(settings.log_retention_days, 10) || 30);
    await db.query('DELETE FROM api_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
    await db.query('DELETE FROM webhook_deliveries WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
  } catch (err) {
    console.warn('[Developer API] log cleanup skipped:', err.message);
  }
}

const userName = (u) => (u ? (`${u.first_name || ''} ${u.last_name || ''}`.trim() || String(u.email || '').split('@')[0]) : null);

module.exports = {
  API_SCOPES,
  SCOPE_KEYS,
  WEBHOOK_EVENTS,
  EVENT_KEYS,
  ensureDeliverySchema,
  generateSecret,
  maskSecret,
  parseList,
  parseJsonArray,
  getDeveloperSettings,
  purgeExpiredLogs,
  userName
};
