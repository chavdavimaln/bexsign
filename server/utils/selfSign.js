/**
 * Sign yourself (server/utils/selfSign.js)
 *
 * A self-signed document is a document the signed-in user prepares and signs alone: nobody is emailed to sign it.
 * It reuses the ordinary `documents` row (so the field editor, the PDF pipeline and "Verify document" work exactly
 * as they do for a signature request) and adds three tables of its own, so a self-signed document is never
 * confused with a request that was sent to somebody else:
 *
 *   self_sign_documents  one row per self-sign document, with the stage it reached
 *                          draft     generated only: the text exists, no fields were placed
 *                          prepared  fields (signature, date, full name, stamp...) were placed
 *                          signed    the user signed it and a signed PDF was issued
 *   self_sign_events     the history of one self-sign document: created, merged, renamed, signed, shared...
 *   self_sign_shares     every copy emailed to somebody else, so "who did I send this to" is answerable later
 *
 * Every read is scoped to the caller: a self-sign document belongs to the user who created it.
 */
const db = require('../db');

const STAGES = ['draft', 'prepared', 'signed'];
const SOURCES = ['upload', 'template', 'created', 'merged'];

const STAGE_LABELS = {
  draft: 'Generated',
  prepared: 'Ready to sign',
  signed: 'Signed'
};

/** Actions recorded in self_sign_events (the history timeline shows them in this vocabulary). */
const ACTIONS = [
  'created',
  'document_added',
  'document_replaced',
  'document_removed',
  'merged',
  'renamed',
  'fields_placed',
  'signed',
  'downloaded',
  'shared',
  'printed'
];

const normalizeStage = (value) => (STAGES.includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'draft');
const normalizeSource = (value) => (SOURCES.includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'upload');
const normalizeAction = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return ACTIONS.includes(raw) ? raw : (raw ? raw.slice(0, 40) : 'created');
};

let schemaPromise = null;
function ensureSelfSignSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS self_sign_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            document_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            stage ENUM('draft','prepared','signed') NOT NULL DEFAULT 'draft',
            source ENUM('upload','template','created','merged') NOT NULL DEFAULT 'upload',
            template_name VARCHAR(255) NULL,
            has_fields TINYINT(1) NOT NULL DEFAULT 0,
            field_count INT NOT NULL DEFAULT 0,
            page_count INT NOT NULL DEFAULT 1,
            signed_at DATETIME NULL,
            signed_file_path VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_self_sign_document (document_id),
            KEY idx_self_sign_user_stage (user_id, stage)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS self_sign_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            self_sign_id INT NOT NULL,
            document_id INT NULL,
            action VARCHAR(40) NOT NULL,
            detail VARCHAR(500) NULL,
            actor_id INT NULL,
            actor_name VARCHAR(150) NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_self_sign_events_doc (self_sign_id, created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS self_sign_shares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            self_sign_id INT NOT NULL,
            document_id INT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(150) NULL,
            message TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'sent',
            error_message VARCHAR(500) NULL,
            shared_by INT NULL,
            shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_self_sign_shares_doc (self_sign_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch (err) {
        schemaPromise = null;
        console.warn('[Schema] Self-sign tables not ready:', err.message);
      }
    })();
  }
  return schemaPromise;
}

/** Client IP for the history timeline (same rule as the request audit trail). */
function clientIp(req) {
  if (!req) return null;
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.connection?.remoteAddress || '';
  return ip ? String(ip).replace(/^::ffff:/, '').slice(0, 45) : null;
}

function actorName(user) {
  const joined = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return (joined || String(user?.email || '').split('@')[0] || 'BexSign user').slice(0, 150);
}

/** One row of the history of a self-sign document. Never throws: history must not break the action itself. */
async function recordEvent({ selfSignId, documentId = null, action, detail = '', req = null, user = null } = {}) {
  const id = parseInt(selfSignId, 10) || 0;
  if (!id) return null;
  await ensureSelfSignSchema();
  const actor = user || req?.user || null;
  try {
    const [result] = await db.query(
      `INSERT INTO self_sign_events (self_sign_id, document_id, action, detail, actor_id, actor_name, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parseInt(documentId, 10) || null,
        normalizeAction(action),
        detail ? String(detail).slice(0, 500) : null,
        parseInt(actor?.id, 10) || null,
        actor ? actorName(actor) : null,
        clientIp(req)
      ]
    );
    return result.insertId;
  } catch (err) {
    console.warn('[SelfSign] event not recorded:', err.message);
    return null;
  }
}

async function recordShare({ selfSignId, documentId = null, email, name = '', message = '', status = 'sent', error = null, userId = null } = {}) {
  const id = parseInt(selfSignId, 10) || 0;
  const to = String(email || '').trim();
  if (!id || !to) return null;
  await ensureSelfSignSchema();
  try {
    const [result] = await db.query(
      `INSERT INTO self_sign_shares (self_sign_id, document_id, recipient_email, recipient_name, message, status, error_message, shared_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parseInt(documentId, 10) || null,
        to.slice(0, 255),
        (name || '').slice(0, 150) || null,
        message ? String(message).slice(0, 2000) : null,
        status === 'failed' ? 'failed' : 'sent',
        error ? String(error).slice(0, 500) : null,
        parseInt(userId, 10) || null
      ]
    );
    return result.insertId;
  } catch (err) {
    console.warn('[SelfSign] share not recorded:', err.message);
    return null;
  }
}

const OWN_SELECT = `SELECT s.*, d.document_name, d.status AS document_status, d.file_path, d.created_at AS document_created_at,
                           di.bexsign_doc_id
                    FROM self_sign_documents s
                    JOIN documents d ON d.id = s.document_id
                    LEFT JOIN document_identifiers di ON di.document_id = s.document_id`;

/** One self-sign document of this user, or null. Another user's row is never returned. */
async function getOwned(selfSignId, userId) {
  await ensureSelfSignSchema();
  const id = parseInt(selfSignId, 10) || 0;
  const uid = parseInt(userId, 10) || 0;
  if (!id || !uid) return null;
  const [rows] = await db.query(`${OWN_SELECT} WHERE s.id = ? AND s.user_id = ?`, [id, uid]);
  return rows[0] || null;
}

/** The self-sign row that wraps a `documents` row (the editor opens documents by their document id). */
async function getOwnedByDocument(documentId, userId) {
  await ensureSelfSignSchema();
  const id = parseInt(documentId, 10) || 0;
  const uid = parseInt(userId, 10) || 0;
  if (!id || !uid) return null;
  const [rows] = await db.query(`${OWN_SELECT} WHERE s.document_id = ? AND s.user_id = ?`, [id, uid]);
  return rows[0] || null;
}

async function listEvents(selfSignId, { limit = 300 } = {}) {
  await ensureSelfSignSchema();
  const id = parseInt(selfSignId, 10) || 0;
  if (!id) return [];
  try {
    const [rows] = await db.query(
      `SELECT id, document_id, action, detail, actor_id, actor_name, ip_address, created_at
       FROM self_sign_events WHERE self_sign_id = ? ORDER BY id ASC LIMIT ${parseInt(limit, 10) || 300}`,
      [id]
    );
    return rows;
  } catch (err) {
    console.warn('[SelfSign] events not read:', err.message);
    return [];
  }
}

async function listShares(selfSignId, { limit = 300 } = {}) {
  await ensureSelfSignSchema();
  const id = parseInt(selfSignId, 10) || 0;
  if (!id) return [];
  try {
    const [rows] = await db.query(
      `SELECT id, document_id, recipient_email, recipient_name, message, status, error_message, shared_by, shared_at
       FROM self_sign_shares WHERE self_sign_id = ? ORDER BY id DESC LIMIT ${parseInt(limit, 10) || 300}`,
      [id]
    );
    return rows;
  } catch (err) {
    console.warn('[SelfSign] shares not read:', err.message);
    return [];
  }
}

/**
 * Recomputes what the document actually holds (placed fields, documents, pages) and moves the stage between
 * "draft" (generated only) and "prepared" (fields placed). A signed document keeps its stage.
 */
async function refreshStats(selfSignId) {
  await ensureSelfSignSchema();
  const id = parseInt(selfSignId, 10) || 0;
  if (!id) return null;
  const [rows] = await db.query('SELECT * FROM self_sign_documents WHERE id = ?', [id]);
  const row = rows[0];
  if (!row) return null;
  try {
    const [[fieldRow]] = await db.query(
      'SELECT COUNT(*) AS total, COALESCE(MAX(page_number), 1) AS pages FROM document_fields WHERE document_id = ?',
      [row.document_id]
    );
    const [[fileRow]] = await db.query('SELECT COUNT(*) AS files FROM document_files WHERE document_id = ?', [row.document_id]);
    const fieldCount = Number(fieldRow?.total || 0);
    const pageCount = Math.max(1, Number(fieldRow?.pages || 1), Number(fileRow?.files || 1));
    const stage = row.stage === 'signed' ? 'signed' : (fieldCount > 0 ? 'prepared' : 'draft');
    await db.query(
      'UPDATE self_sign_documents SET has_fields = ?, field_count = ?, page_count = ?, stage = ? WHERE id = ?',
      [fieldCount > 0 ? 1 : 0, fieldCount, pageCount, stage, id]
    );
  } catch (err) {
    console.warn('[SelfSign] stats not refreshed:', err.message);
  }
  const [updated] = await db.query('SELECT * FROM self_sign_documents WHERE id = ?', [id]);
  return updated[0] || row;
}

module.exports = {
  STAGES,
  SOURCES,
  STAGE_LABELS,
  ACTIONS,
  normalizeStage,
  normalizeSource,
  normalizeAction,
  ensureSelfSignSchema,
  recordEvent,
  recordShare,
  getOwned,
  getOwnedByDocument,
  listEvents,
  listShares,
  refreshStats,
  clientIp,
  actorName
};
