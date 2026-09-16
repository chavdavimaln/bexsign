/**
 * Signing Request Helpers (server/utils/requestHelpers.js)
 * Shared logic for multi-document, multi-recipient signing requests (Zoho Sign style):
 * schema upgrades, recipient persistence, document file sync, field serialisation,
 * sender lookup, signing-order groups and audit events.
 */
const path = require('path');
const db = require('../db');

const SIGNING_ROLES = ['signer', 'approver'];
const ROLE_LABELS = ['Needs to sign', 'In-person signer', 'Approver', 'Receives a copy'];
const RECIPIENT_COLUMNS = 'id, document_id, name, email, role, role_label, delivery_mode, private_note, signing_order_index, status, sent_at, viewed_at, signed_at, signed_ip, signature_image';

function mapRecipientRole(label) {
  const low = String(label || '').toLowerCase();
  if (low.includes('approv')) return 'approver';
  if (low.includes('copy') || low.includes('view') || low === 'cc') return 'viewer';
  if (low.includes('review')) return 'reviewer';
  return 'signer';
}

function normalizeRoleLabel(label) {
  const low = String(label || '').trim().toLowerCase();
  const known = ROLE_LABELS.find((l) => l.toLowerCase() === low);
  if (known) return known;
  const role = mapRecipientRole(label);
  if (role === 'approver') return 'Approver';
  if (role === 'viewer' || role === 'reviewer') return 'Receives a copy';
  return 'Needs to sign';
}

function isSigningRole(role) {
  return SIGNING_ROLES.includes(String(role || 'signer').toLowerCase());
}

function parseJsonInput(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  if (rows.length === 0) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

let schemaPromise = null;
function ensureRequestSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const columns = [
        ['documents', 'sent_at', 'DATETIME NULL'],
        ['documents', 'document_type', 'VARCHAR(50) NULL'],
        ['documents', 'description', 'TEXT NULL'],
        ['documents', 'validity', 'VARCHAR(50) NULL'],
        ['documents', 'auto_reminders', 'TINYINT(1) DEFAULT 1'],
        ['documents', 'allow_comments', 'TINYINT(1) DEFAULT 0'],
        ['document_recipients', 'role_label', 'VARCHAR(50) NULL'],
        ['document_recipients', 'delivery_mode', 'VARCHAR(30) NULL'],
        ['document_recipients', 'private_note', 'TEXT NULL'],
        ['document_recipients', 'sent_at', 'DATETIME NULL'],
        ['document_recipients', 'viewed_at', 'DATETIME NULL'],
        ['document_recipients', 'signed_ip', 'VARCHAR(45) NULL'],
        ['document_recipients', 'signed_user_agent', 'VARCHAR(255) NULL'],
        ['document_recipients', 'signature_image', 'LONGTEXT NULL'],
        ['document_files', 'document_text', 'LONGTEXT NULL'],
        ['document_files', 'signed_file_path', 'VARCHAR(255) NULL'],
        ['document_files', 'sort_order', 'INT DEFAULT 0']
      ];
      let failed = false;
      for (const [table, column, definition] of columns) {
        try {
          await addColumnIfMissing(table, column, definition);
        } catch (err) {
          failed = true;
          console.warn(`[Schema] Could not ensure ${table}.${column}:`, err.message);
        }
      }
      if (failed) schemaPromise = null;
    })();
  }
  return schemaPromise;
}

async function getRecipients(documentId) {
  await ensureRequestSchema();
  const [rows] = await db.query(
    `SELECT ${RECIPIENT_COLUMNS} FROM document_recipients WHERE document_id = ? ORDER BY signing_order_index ASC, id ASC`,
    [documentId]
  );
  return rows.map((r) => ({ ...r, role: r.role || 'signer', role_label: r.role_label || normalizeRoleLabel(r.role) }));
}

/**
 * Signing steps for an ordered recipient list. A recipient's `signingOrder` (or `signing_order_index`) is its step;
 * recipients sharing a number receive the request at the same time. Missing numbers fall back to the list position.
 * Steps are made consecutive (e.g. 1, 1, 4 -> 1, 1, 2).
 */
function normalizeSigningSteps(list) {
  const requested = list.map((r, idx) => {
    const n = parseInt(r.signingOrder ?? r.signing_order_index, 10);
    return Number.isFinite(n) && n > 0 ? n : idx + 1;
  });
  const ranks = new Map([...new Set(requested)].sort((a, b) => a - b).map((value, idx) => [value, idx + 1]));
  return requested.map((value) => ranks.get(value));
}

/**
 * Upsert recipients by email so ids, statuses and signatures survive draft saves and re-sends.
 * List order (or each recipient's signingOrder step) is the signing order. An empty/invalid list leaves
 * existing recipients untouched.
 */
async function saveRecipients(documentId, list) {
  const seen = new Set();
  const incoming = (Array.isArray(list) ? list : []).filter((r) => {
    const key = String(r?.email || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (incoming.length === 0) return getRecipients(documentId);
  await ensureRequestSchema();

  const [existingRows] = await db.query('SELECT * FROM document_recipients WHERE document_id = ?', [documentId]);
  const existingByEmail = new Map(existingRows.map((row) => [String(row.email || '').trim().toLowerCase(), row]));
  const steps = normalizeSigningSteps(incoming);

  for (const [index, r] of incoming.entries()) {
    const email = String(r.email).trim();
    const key = email.toLowerCase();
    const position = steps[index];

    const existing = existingByEmail.get(key);
    const rawLabel = r.role_label || r.roleLabel || r.role;
    const isUiLabel = ROLE_LABELS.some((l) => l.toLowerCase() === String(rawLabel || '').trim().toLowerCase());
    let roleLabel = normalizeRoleLabel(rawLabel);
    if (!isUiLabel && existing?.role_label && mapRecipientRole(existing.role_label) === mapRecipientRole(rawLabel)) {
      roleLabel = existing.role_label;
    }
    const role = mapRecipientRole(roleLabel);
    const name = String(r.name || '').trim() || email.split('@')[0];
    const deliveryMode = r.deliveryMode ?? r.delivery_mode ?? existing?.delivery_mode ?? 'Email';
    const privateNote = r.privateNote ?? r.private_note ?? existing?.private_note ?? null;

    if (existing) {
      await db.query(
        `UPDATE document_recipients
         SET name = ?, email = ?, role = ?, role_label = ?, delivery_mode = ?, private_note = ?, signing_order_index = ?
         WHERE id = ?`,
        [name, email, role, roleLabel, deliveryMode, privateNote, position, existing.id]
      );
      existingByEmail.delete(key);
    } else {
      await db.query(
        `INSERT INTO document_recipients (document_id, name, email, role, role_label, delivery_mode, private_note, signing_order_index, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [documentId, name, email, role, roleLabel, deliveryMode, privateNote, position]
      );
    }
  }

  for (const stale of existingByEmail.values()) {
    try {
      await db.query('DELETE FROM document_recipients WHERE id = ?', [stale.id]);
    } catch (err) {
      console.warn('[Recipients] Could not remove recipient', stale.email, err.message);
    }
  }

  const recipients = await getRecipients(documentId);
  const primary = recipients.find((r) => isSigningRole(r.role)) || recipients[0];
  if (primary) {
    await db.query('UPDATE documents SET recipient_email = ? WHERE id = ?', [primary.email, documentId]);
  }
  return recipients;
}

// Data written on a field when its recipient signs (POST /api/signatures/submit)
const FIELD_SIGNING_KEYS = ['signatureImage', 'signatureStyle', 'signerName', 'signerEmail', 'signedAt'];

/**
 * Start a new signing round for a request that was sent before (e.g. a completed request that was edited and
 * sent again). Every recipient goes back to pending (and is emailed again in signing order); signatures,
 * signer-entered field values, signed copies and the completion date of the previous round are cleared.
 * Field values the sender prefilled are kept.
 */
async function restartSigningRound(documentId) {
  await ensureRequestSchema();
  await db.query(
    `UPDATE document_recipients
     SET status = 'pending', sent_at = NULL, viewed_at = NULL, signed_at = NULL,
         signed_ip = NULL, signed_user_agent = NULL, signature_image = NULL
     WHERE document_id = ?`,
    [documentId]
  );

  const [fieldRows] = await db.query('SELECT id, field_type, options FROM document_fields WHERE document_id = ?', [documentId]);
  for (const row of fieldRows) {
    const opts = parseJsonInput(row.options, {}) || {};
    if (!FIELD_SIGNING_KEYS.some((key) => opts[key] !== undefined)) continue;
    const filledBySigner = opts.signedAt !== undefined;
    FIELD_SIGNING_KEYS.forEach((key) => delete opts[key]);
    if (filledBySigner) {
      // Same starting value as a newly placed field in the editor
      delete opts.gridValue;
      delete opts.checked;
      if (row.field_type === 'Sign date') delete opts.value; // the signing page shows the signing day
      else if (row.field_type === 'Split text') opts.value = '';
      else if (row.field_type === 'Checkbox') opts.value = 'true';
      else if (row.field_type === 'Full name') opts.value = opts.assignee || row.field_type;
      else opts.value = row.field_type;
    }
    await db.query('UPDATE document_fields SET options = ? WHERE id = ?', [JSON.stringify(opts), row.id]);
  }

  try {
    await db.query(
      `DELETE v FROM document_field_values v
       JOIN document_recipients r ON r.id = v.recipient_id
       WHERE r.document_id = ?`,
      [documentId]
    );
  } catch (err) {
    console.warn('[Restart] field value cleanup warning:', err.message);
  }
  await db.query('UPDATE document_files SET signed_file_path = NULL WHERE document_id = ?', [documentId]);
  await db.query('UPDATE documents SET completed_at = NULL WHERE id = ?', [documentId]);
}

async function getDocumentFiles(documentId) {
  await ensureRequestSchema();
  const [rows] = await db.query(
    'SELECT * FROM document_files WHERE document_id = ? ORDER BY sort_order ASC, id ASC',
    [documentId]
  );
  return rows;
}

async function remapFieldDocIndexes(documentId, indexMap) {
  const [rows] = await db.query('SELECT id, options FROM document_fields WHERE document_id = ?', [documentId]);
  for (const row of rows) {
    const opts = parseJsonInput(row.options, {}) || {};
    const oldIndex = parseInt(opts.docIndex, 10) || 0;
    if (!indexMap.has(oldIndex)) {
      await db.query('DELETE FROM document_fields WHERE id = ?', [row.id]);
    } else if (indexMap.get(oldIndex) !== oldIndex) {
      opts.docIndex = indexMap.get(oldIndex);
      await db.query('UPDATE document_fields SET options = ? WHERE id = ?', [JSON.stringify(opts), row.id]);
    }
  }
}

/**
 * Persist the ordered document list of a request. Existing rows are matched by `fileId`
 * (or a legacy `id` equal to the row id) and updated in place; uploads are matched by
 * `uploadKey` (multer field name `file_<uploadKey>`). Field docIndexes follow re-ordering/removal.
 * An empty list is ignored unless `allowEmpty` is set (the user removed every document of a draft).
 */
async function syncDocumentFiles(documentId, metaDocs, uploadedFiles = [], { allowEmpty = false } = {}) {
  if (!Array.isArray(metaDocs) || (metaDocs.length === 0 && !allowEmpty)) return getDocumentFiles(documentId);
  const oldFiles = await getDocumentFiles(documentId);
  const oldById = new Map(oldFiles.map((f, idx) => [String(f.id), { row: f, index: idx }]));
  const keptIds = new Set();
  const indexMap = new Map();
  const uploadKeyByRow = new Map();

  for (let i = 0; i < metaDocs.length; i++) {
    const d = metaDocs[i] || {};
    const upload = d.uploadKey ? uploadedFiles.find((f) => f.fieldname === `file_${d.uploadKey}`) : null;
    const previousRef = oldById.get(String(d.fileId ?? '')) || oldById.get(String(d.id ?? ''));
    const previous = previousRef && !keptIds.has(String(previousRef.row.id)) ? previousRef : null;
    const name = String(d.name || d.file_name || `Document ${i + 1}.pdf`).trim().slice(0, 255);
    const filePath = upload
      ? `/uploads/${upload.filename}`
      : (previous?.row.file_path || d.filePath || d.file_path || '/uploads/sample.pdf');
    const fileSize = upload ? Math.round(upload.size / 1024) : (previous?.row.file_size || null);
    const fileType = upload
      ? (path.extname(upload.originalname).replace('.', '').toLowerCase() || 'pdf')
      : (previous?.row.file_type || 'pdf');
    const text = d.documentText ?? previous?.row.document_text ?? null;

    if (previous) {
      await db.query(
        `UPDATE document_files
         SET file_name = ?, file_path = ?, file_size = ?, file_type = ?, document_text = ?, sort_order = ?${upload ? ', signed_file_path = NULL' : ''}
         WHERE id = ?`,
        [name, filePath, fileSize, fileType, text, i, previous.row.id]
      );
      keptIds.add(String(previous.row.id));
      indexMap.set(previous.index, i);
      if (d.uploadKey) uploadKeyByRow.set(String(previous.row.id), d.uploadKey);
    } else {
      const [res] = await db.query(
        `INSERT INTO document_files (document_id, file_name, file_path, file_size, file_type, document_text, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [documentId, name, filePath, fileSize, fileType, text, i]
      );
      if (d.uploadKey) uploadKeyByRow.set(String(res.insertId), d.uploadKey);
    }
  }

  const removed = oldFiles.filter((f) => !keptIds.has(String(f.id)));
  if (removed.length > 0) {
    await db.query('DELETE FROM document_files WHERE document_id = ? AND id IN (?)', [documentId, removed.map((f) => f.id)]);
  }
  // Only remap fields when the client identified its existing documents; a list with no matches is
  // treated as a same-order replacement so placed fields are never dropped by legacy callers.
  const reindexed = removed.length > 0 || [...indexMap].some(([from, to]) => from !== to);
  if (oldFiles.length > 0 && keptIds.size > 0 && reindexed) {
    await remapFieldDocIndexes(documentId, indexMap);
  } else if (metaDocs.length === 0 && oldFiles.length > 0) {
    // Every document was removed: their placed fields go with them
    await db.query('DELETE FROM document_fields WHERE document_id = ?', [documentId]);
  }

  const files = await getDocumentFiles(documentId);
  return files.map((f) => ({ ...f, uploadKey: uploadKeyByRow.get(String(f.id)) || null }));
}

function parseFieldRow(row) {
  const opts = parseJsonInput(row.options, {}) || {};
  const type = row.field_type;
  return {
    ...opts,
    id: row.id,
    type,
    label: row.label || type,
    description: row.description || opts.description || '',
    x: row.pos_x,
    y: row.pos_y,
    width: row.width || 150,
    height: row.height || 40,
    page: row.page_number || 1,
    docIndex: opts.docIndex !== undefined ? (parseInt(opts.docIndex, 10) || 0) : ((row.page_number || 1) - 1),
    value: opts.value !== undefined
      ? opts.value
      : (type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''),
    required: Boolean(row.is_required),
    recipientId: row.recipient_id || null
  };
}

function groupFieldsByDoc(fields) {
  const byDoc = {};
  fields.forEach((f) => {
    const idx = f.docIndex !== undefined ? f.docIndex : 0;
    if (!byDoc[idx]) byDoc[idx] = [];
    byDoc[idx].push(f);
  });
  return byDoc;
}

/**
 * Replace the placed fields of a request. `fieldsByDoc` keys are authoritative for docIndex.
 * Returns null when no field payload was supplied (fields are left untouched).
 */
async function saveDocumentFields(documentId, { fieldsByDoc, fields } = {}, recipients = []) {
  let list = null;
  if (fieldsByDoc && typeof fieldsByDoc === 'object' && !Array.isArray(fieldsByDoc)) {
    list = Object.entries(fieldsByDoc).flatMap(([idx, arr]) =>
      (Array.isArray(arr) ? arr : []).map((f) => ({ ...f, docIndex: parseInt(idx, 10) || 0 }))
    );
  } else if (Array.isArray(fields)) {
    list = fields.map((f) => ({ ...f, docIndex: parseInt(f.docIndex, 10) || 0 }));
  }
  if (!list) return null;

  const recipientByEmail = new Map(recipients.map((r) => [String(r.email || '').toLowerCase(), r]));
  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  await db.query('DELETE FROM document_fields WHERE document_id = ?', [documentId]);
  for (const f of list) {
    const { id, type, label, required, x, y, page, width, height, description, recipientId, isAssignedToOther, ...rest } = f;
    const assigned = recipientByEmail.get(String(rest.assigneeEmail || '').toLowerCase());
    // assigneeId always refers to the saved recipient row, so every client matches the field to the same recipient
    const options = { ...rest, ...(assigned ? { assigneeId: assigned.id } : {}), clientId: rest.clientId ?? id, docIndex: f.docIndex };
    await db.query(
      `INSERT INTO document_fields (document_id, recipient_id, page_number, field_type, label, description, is_required, pos_x, pos_y, width, height, options)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        assigned ? assigned.id : null,
        parseInt(page, 10) || 1,
        String(type || 'Signature').slice(0, 50),
        String(label || type || 'Field').slice(0, 100),
        description ? String(description).slice(0, 255) : null,
        required === false ? 0 : 1,
        num(x, 60),
        num(y, 420),
        num(width, 150),
        num(height, 40),
        JSON.stringify(options)
      ]
    );
  }
  return list.length;
}

function fieldBelongsToRecipient(field, recipient, signingRecipients = []) {
  if (!field || !recipient) return false;
  const email = String(field.assigneeEmail || '').trim().toLowerCase();
  if (email) return email === String(recipient.email || '').trim().toLowerCase();
  if (field.recipientId) return String(field.recipientId) === String(recipient.id);
  if (signingRecipients.length <= 1) return true;
  const name = String(field.assignee || '').trim().toLowerCase();
  return Boolean(name) && name === String(recipient.name || '').trim().toLowerCase();
}

async function getRequestSender(doc) {
  const fallback = {
    id: doc?.user_id || 1,
    name: 'BexSign',
    email: process.env.SMTP_USER || 'info@bexcodeservices.com',
    company: 'BexSign'
  };
  try {
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, email, company FROM users WHERE id = ?',
      [doc?.user_id || 1]
    );
    const u = rows[0];
    if (!u || !u.email) return fallback;
    return {
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email.split('@')[0],
      email: u.email,
      company: u.company || 'BexSign'
    };
  } catch (err) {
    return fallback;
  }
}

// Owner of a request = the user who created it (documents.user_id). Use with `documents d` in the FROM clause.
const OWNER_JOIN = 'LEFT JOIN users owner_user ON owner_user.id = d.user_id';
const OWNER_COLUMNS = `NULLIF(TRIM(CONCAT(COALESCE(owner_user.first_name, ''), ' ', COALESCE(owner_user.last_name, ''))), '') AS owner,
       owner_user.email AS owner_email,
       owner_user.company AS owner_company`;

function getRequestExpiry(doc) {
  const base = doc?.sent_at ? new Date(doc.sent_at) : new Date();
  const days = parseInt(doc?.expiration_days, 10) || 15;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDisplayDate(value, withTime = false) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Recipients whose turn it is: everyone pending (parallel) or the lowest pending order (sequential). */
function getActiveSigningGroup(recipients, isSequential) {
  const pending = recipients.filter((r) => isSigningRole(r.role) && !['signed', 'declined'].includes(r.status));
  if (!isSequential || pending.length === 0) return pending;
  const minOrder = Math.min(...pending.map((r) => r.signing_order_index || 1));
  return pending.filter((r) => (r.signing_order_index || 1) === minOrder);
}

function getClientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:3003').replace(/\/$/, '');
}

function buildSigningUrl(documentId, email) {
  return `${getClientBaseUrl()}/documents/sign/${documentId}?email=${encodeURIComponent(email)}`;
}

function getRequestIp(req) {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = (forwarded ? String(forwarded).split(',')[0] : (req.ip || req.socket?.remoteAddress || '')).trim();
  return ip.replace(/^::ffff:/, '') || null;
}

async function logRequestEvent(documentId, { recipientId = null, eventType = null, description = null, req = null } = {}) {
  const ip = getRequestIp(req);
  if (eventType) {
    try {
      await db.query(
        'INSERT INTO signature_events (document_id, recipient_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [documentId, recipientId, eventType, ip, req?.headers?.['user-agent']?.slice(0, 255) || null]
      );
    } catch (err) {
      console.warn('[Events] signature event warning:', err.message);
    }
  }
  if (description) {
    try {
      await db.query(
        'INSERT INTO activity_history (document_id, activity_description, ip_address) VALUES (?, ?, ?)',
        [documentId, description, ip || '127.0.0.1']
      );
    } catch (err) {
      console.warn('[Events] activity log warning:', err.message);
    }
  }
}

/**
 * Email the signing invitation (or a reminder) to a group of recipients.
 * Invitations move the recipient from pending to sent; every attempt is logged in the audit trail.
 */
async function sendSigningInvitations(doc, group, { req = null, isReminder = false } = {}) {
  const { sendSignatureRequestEmail, sendReminderEmail } = require('./emailService');
  const sender = await getRequestSender(doc);
  const files = await getDocumentFiles(doc.id);
  const documentNames = files.map((f) => f.file_name);
  const expiresOn = formatDisplayDate(getRequestExpiry(doc));
  const send = isReminder ? sendReminderEmail : sendSignatureRequestEmail;
  const results = [];

  for (const r of group) {
    const result = await send({
      to: r.email,
      recipientName: r.name || String(r.email).split('@')[0],
      documentName: doc.document_name || 'Document',
      documentNames,
      senderName: sender.name,
      senderEmail: sender.email,
      orgName: sender.company,
      expiresOn,
      message: doc.custom_message || '-',
      privateMessage: r.private_note || '-',
      signingUrl: buildSigningUrl(doc.id, r.email)
    });

    if (result.success && !isReminder && r.id) {
      await db.query(
        "UPDATE document_recipients SET status = IF(status = 'pending', 'sent', status), sent_at = COALESCE(sent_at, NOW()) WHERE id = ?",
        [r.id]
      );
    }
    await logRequestEvent(doc.id, {
      recipientId: r.id || null,
      eventType: result.success ? (isReminder ? 'reminded' : 'sent') : 'email_failed',
      description: result.success
        ? `${isReminder ? 'Reminder' : 'Signature request'} emailed to ${r.name || r.email} (${r.email})`
        : `Email to ${r.email} failed: ${result.error}`
    });
    results.push({ id: r.id || null, email: r.email, name: r.name, success: result.success, error: result.error || null });
  }
  return results;
}

module.exports = {
  ROLE_LABELS,
  sendSigningInvitations,
  mapRecipientRole,
  normalizeRoleLabel,
  isSigningRole,
  parseJsonInput,
  ensureRequestSchema,
  getRecipients,
  saveRecipients,
  normalizeSigningSteps,
  restartSigningRound,
  getDocumentFiles,
  syncDocumentFiles,
  parseFieldRow,
  groupFieldsByDoc,
  saveDocumentFields,
  fieldBelongsToRecipient,
  getRequestSender,
  OWNER_JOIN,
  OWNER_COLUMNS,
  getRequestExpiry,
  formatDisplayDate,
  getActiveSigningGroup,
  getClientBaseUrl,
  buildSigningUrl,
  getRequestIp,
  logRequestEvent
};
