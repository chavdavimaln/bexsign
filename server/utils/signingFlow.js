/**
 * Signing flow: how a request is sent to its recipients and what each recipient may see.
 *
 * Three modes (Zoho Sign style):
 *   sequential_shared   Recipient 2 is emailed only after recipient 1 finishes, and sees the signature,
 *                       stamp, date and other fields the earlier recipients completed.
 *   sequential_private  Same one-by-one order, but earlier recipients' fields stay private.
 *   parallel_private    Everyone is emailed at the same time; nobody sees anyone else's fields.
 *
 * Recipients that share a signing step are emailed together and sign in parallel inside that step.
 *
 * Two tables of its own:
 *   document_signing_flow   the mode chosen for a request (one row per document)
 *   signing_email_dispatch  every signing email the request sent, with its step, so the order is auditable
 */
const db = require('../db');

const SIGNING_FLOW_MODES = [
  {
    key: 'sequential_shared',
    label: 'In order, showing completed fields',
    order: 'sequential',
    showPreviousFields: true,
    short: 'In order · fields visible',
    summary: 'One recipient at a time. The next recipient is emailed once the previous one finishes, and sees the fields they completed (signature, stamp, date, and so on).'
  },
  {
    key: 'sequential_private',
    label: 'In order, keeping fields private',
    order: 'sequential',
    showPreviousFields: false,
    short: 'In order · fields private',
    summary: 'One recipient at a time. The next recipient is emailed once the previous one finishes, but never sees the fields the earlier recipients completed.'
  },
  {
    key: 'parallel_private',
    label: 'All at once, keeping fields private',
    order: 'parallel',
    showPreviousFields: false,
    short: 'All at once · fields private',
    summary: 'Everyone is emailed at the same time and can sign in any order. Nobody sees the fields the others completed.'
  }
];

const DEFAULT_SIGNING_MODE = 'sequential_shared';
// Requests and settings saved before the three modes existed
const LEGACY_MODES = { sequential: 'sequential_shared', parallel: 'parallel_private' };

function describeMode(mode) {
  return SIGNING_FLOW_MODES.find((m) => m.key === mode) || SIGNING_FLOW_MODES.find((m) => m.key === DEFAULT_SIGNING_MODE);
}

/** Accepts a mode key, a legacy 'sequential' / 'parallel' value, or nothing. */
function normalizeMode(value, fallback = DEFAULT_SIGNING_MODE) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (SIGNING_FLOW_MODES.some((m) => m.key === raw)) return raw;
  return LEGACY_MODES[raw] || fallback;
}

let schemaPromise = null;
function ensureSigningFlowSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS document_signing_flow (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id INT NOT NULL,
            mode VARCHAR(30) NOT NULL DEFAULT '${DEFAULT_SIGNING_MODE}',
            signing_order VARCHAR(20) NOT NULL DEFAULT 'sequential',
            show_previous_fields TINYINT(1) NOT NULL DEFAULT 1,
            current_step INT NOT NULL DEFAULT 1,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_signing_flow_document (document_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS signing_email_dispatch (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id INT NOT NULL,
            recipient_id INT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(150) NULL,
            step_index INT NOT NULL DEFAULT 1,
            email_type VARCHAR(20) NOT NULL DEFAULT 'invitation',
            trigger_source VARCHAR(30) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'sent',
            error_message VARCHAR(500) NULL,
            sent_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_dispatch_document (document_id, step_index),
            KEY idx_dispatch_status (status),
            KEY idx_dispatch_created (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch (err) {
        schemaPromise = null;
        console.warn('[Schema] Signing flow tables not ready:', err.message);
      }
    })();
  }
  return schemaPromise;
}

/**
 * The flow of one request. Requests saved before this module existed fall back to their documents.signing_order,
 * so nothing has to be migrated by hand.
 */
async function getSigningFlow(documentId, doc = null) {
  const id = parseInt(documentId, 10) || 0;
  let row = null;
  if (id) {
    await ensureSigningFlowSchema();
    try {
      const [rows] = await db.query('SELECT * FROM document_signing_flow WHERE document_id = ?', [id]);
      row = rows[0] || null;
    } catch (err) {
      console.warn('[SigningFlow] flow not read:', err.message);
    }
  }
  const mode = normalizeMode(row?.mode || doc?.signing_order);
  const meta = describeMode(mode);
  return {
    documentId: id,
    mode,
    label: meta.label,
    short: meta.short,
    summary: meta.summary,
    order: meta.order,
    isSequential: meta.order === 'sequential',
    // A stored row may keep the field visibility the sender picked even if the catalog entry changes later
    showPreviousFields: row ? Boolean(row.show_previous_fields) : meta.showPreviousFields,
    currentStep: row?.current_step || 1,
    updatedAt: row?.updated_at || null,
    isDefault: !row
  };
}

/** Saves the mode for a request and keeps documents.signing_order (used by reports and certificates) in step. */
async function saveSigningFlow(documentId, mode, { userId = null, currentStep = null } = {}) {
  const id = parseInt(documentId, 10) || 0;
  if (!id) return null;
  const key = normalizeMode(mode);
  const meta = describeMode(key);
  await ensureSigningFlowSchema();
  try {
    await db.query(
      `INSERT INTO document_signing_flow (document_id, mode, signing_order, show_previous_fields, current_step, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE mode = VALUES(mode), signing_order = VALUES(signing_order),
         show_previous_fields = VALUES(show_previous_fields), updated_by = VALUES(updated_by),
         current_step = COALESCE(?, current_step)`,
      [id, key, meta.order, meta.showPreviousFields ? 1 : 0, currentStep || 1, userId, currentStep]
    );
    await db.query('UPDATE documents SET signing_order = ? WHERE id = ?', [meta.order, id]);
  } catch (err) {
    console.warn('[SigningFlow] flow not saved:', err.message);
  }
  return getSigningFlow(id);
}

/** Remembers which step of the order the request is waiting on (shown in the request's signing flow API). */
async function setCurrentStep(documentId, step) {
  const id = parseInt(documentId, 10) || 0;
  const value = parseInt(step, 10) || 1;
  if (!id) return;
  await ensureSigningFlowSchema();
  try {
    await db.query(
      `INSERT INTO document_signing_flow (document_id, current_step) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE current_step = VALUES(current_step)`,
      [id, value]
    );
  } catch (err) {
    console.warn('[SigningFlow] step not saved:', err.message);
  }
}

/** One row per signing email, so "who was emailed, in which step, and when" is answerable later. */
async function recordDispatch({
  documentId,
  recipient = null,
  stepIndex = null,
  emailType = 'invitation',
  triggerSource = null,
  status = 'sent',
  error = null
} = {}) {
  const id = parseInt(documentId, 10) || 0;
  const email = String(recipient?.email || '').trim();
  if (!id || !email) return null;
  await ensureSigningFlowSchema();
  try {
    const [result] = await db.query(
      `INSERT INTO signing_email_dispatch
         (document_id, recipient_id, recipient_email, recipient_name, step_index, email_type, trigger_source, status, error_message, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        recipient?.id || null,
        email.slice(0, 255),
        (recipient?.name || '').slice(0, 150) || null,
        parseInt(stepIndex ?? recipient?.signing_order_index, 10) || 1,
        String(emailType || 'invitation').slice(0, 20),
        triggerSource ? String(triggerSource).slice(0, 30) : null,
        String(status || 'sent').slice(0, 20),
        error ? String(error).slice(0, 500) : null,
        status === 'sent' ? new Date() : null
      ]
    );
    return result.insertId;
  } catch (err) {
    console.warn('[SigningFlow] dispatch not recorded:', err.message);
    return null;
  }
}

async function getDispatchLog(documentId, { limit = 200 } = {}) {
  const id = parseInt(documentId, 10) || 0;
  if (!id) return [];
  await ensureSigningFlowSchema();
  try {
    const [rows] = await db.query(
      `SELECT id, recipient_id, recipient_email, recipient_name, step_index, email_type, trigger_source,
              status, error_message, sent_at, created_at
       FROM signing_email_dispatch WHERE document_id = ?
       ORDER BY id ASC LIMIT ${parseInt(limit, 10) || 200}`,
      [id]
    );
    return rows;
  } catch (err) {
    console.warn('[SigningFlow] dispatch log not read:', err.message);
    return [];
  }
}

module.exports = {
  SIGNING_FLOW_MODES,
  DEFAULT_SIGNING_MODE,
  normalizeMode,
  describeMode,
  ensureSigningFlowSchema,
  getSigningFlow,
  saveSigningFlow,
  setCurrentStep,
  recordDispatch,
  getDispatchLog
};
