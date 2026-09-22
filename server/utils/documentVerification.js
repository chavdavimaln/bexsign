/**
 * Verify & confirm the completed document (server/utils/documentVerification.js)
 *
 * The sender decides, while the request is being created, whether the completed documents must still be
 * verified and confirmed by a person ("Verify and confirm the document when everyone has signed" in
 * Send for signatures). The checkbox is on by default; a request whose sender turned it off is finished
 * the moment the last recipient signs.
 *
 * When every recipient has signed and verification was required, onRequestCompleted() puts the request in
 * `pending` and notifies the owner. The owner (or a user holding `security.document_validity`) then runs
 * "Verify & confirm": every signed PDF and the certificate of completion that BexSign issued for the request
 * are re-read from disk and checked against the SHA-256 fingerprint registry (issued_pdf_fingerprints, see
 * utils/validityLog.js). The result, the confirmer and an optional note are stored, and the record becomes
 * `confirmed` — or `rejected` with a reason.
 *
 * Two tables of its own:
 *   document_verification         the choice and the state of one request (one row per document)
 *   document_verification_events  every check, confirmation and rejection, so the decision is auditable
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { verifyPdfBuffer, recordValidityCheck } = require('./validityLog');
const { ensureFingerprintTable } = require('./pdfFingerprints');
const { notify, logActivity } = require('./platformEvents');

// A request whose sender never saw the checkbox behaves like a request that kept it on
const DEFAULT_REQUIRED = true;

const STATUSES = {
  pending: { label: 'Awaiting confirmation', tone: 'amber' },
  confirmed: { label: 'Verified & confirmed', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'rose' },
  not_required: { label: 'Not required', tone: 'slate' }
};

// Worst result wins when a request has several issued PDFs
const RESULT_SEVERITY = { valid: 0, unknown: 1, modified: 2, invalid: 3 };
const RESULT_LABELS = {
  valid: 'All issued documents are authentic and unchanged.',
  unknown: 'One or more issued documents could not be recognized.',
  modified: 'One or more issued documents were changed after BexSign issued them.',
  invalid: 'One or more issued files are not readable PDFs.'
};

const isTrue = (value) => [1, '1', true, 'true', 'on', 'yes'].includes(typeof value === 'string' ? value.toLowerCase() : value);
const describeStatus = (status) => STATUSES[status] || STATUSES.pending;
const toInt = (value) => parseInt(value, 10) || 0;
const actorNameOf = (req, fallback = null) => {
  const user = req?.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || fallback;
};

let schemaPromise = null;
function ensureVerificationSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS document_verification (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id INT NOT NULL,
            required TINYINT(1) NOT NULL DEFAULT 1,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            integrity_result VARCHAR(20) NULL,
            integrity_message VARCHAR(500) NULL,
            confirmed_by INT NULL,
            confirmed_at DATETIME NULL,
            note VARCHAR(1000) NULL,
            rejected_reason VARCHAR(1000) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_document_verification_document (document_id),
            KEY idx_document_verification_status (status)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS document_verification_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id INT NOT NULL,
            action VARCHAR(30) NOT NULL,
            actor_id INT NULL,
            actor_name VARCHAR(150) NULL,
            result VARCHAR(20) NULL,
            message VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_verification_events_document (document_id, id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch (err) {
        schemaPromise = null;
        console.warn('[Schema] Document verification tables not ready:', err.message);
      }
    })();
  }
  return schemaPromise;
}

/** One line of the audit trail. Never throws: a logging problem must not break a confirmation. */
async function recordVerificationEvent(documentId, { action, req = null, actorId = null, actorName = null, result = null, message = null } = {}) {
  const id = toInt(documentId);
  if (!id || !action) return null;
  await ensureVerificationSchema();
  try {
    const [inserted] = await db.query(
      `INSERT INTO document_verification_events (document_id, action, actor_id, actor_name, result, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(action).slice(0, 30),
        actorId ?? req?.user?.id ?? null,
        (actorName || actorNameOf(req) || '').slice(0, 150) || null,
        result ? String(result).slice(0, 20) : null,
        message ? String(message).slice(0, 500) : null
      ]
    );
    return inserted.insertId;
  } catch (err) {
    console.warn('[Verification] event not recorded:', err.message);
    return null;
  }
}

async function getVerificationEvents(documentId, { limit = 100 } = {}) {
  const id = toInt(documentId);
  if (!id) return [];
  await ensureVerificationSchema();
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.action, e.actor_id, e.actor_name, e.result, e.message, e.created_at,
              u.email AS actor_email
       FROM document_verification_events e
       LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.document_id = ? ORDER BY e.id DESC LIMIT ${Math.min(500, Math.max(1, toInt(limit) || 100))}`,
      [id]
    );
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorEmail: r.actor_email || null,
      result: r.result,
      message: r.message,
      createdAt: r.created_at
    }));
  } catch (err) {
    console.warn('[Verification] events not read:', err.message);
    return [];
  }
}

/** The stored row of a request, or null when the sender's choice was never saved. */
async function getVerificationRow(documentId) {
  const id = toInt(documentId);
  if (!id) return null;
  await ensureVerificationSchema();
  try {
    const [rows] = await db.query('SELECT * FROM document_verification WHERE document_id = ?', [id]);
    return rows[0] || null;
  } catch (err) {
    console.warn('[Verification] record not read:', err.message);
    return null;
  }
}

/** True when this request still has to be verified and confirmed after the last signature. */
async function isVerificationRequired(documentId) {
  const row = await getVerificationRow(documentId);
  return row ? Boolean(row.required) : DEFAULT_REQUIRED;
}

/**
 * Saves the sender's choice while the request is created or edited. Turning it off stops the confirmation
 * step; turning it back on puts the request back in `pending` unless it was already confirmed or rejected.
 */
async function saveVerificationSetting(documentId, required, { userId = null, req = null } = {}) {
  const id = toInt(documentId);
  if (!id) return null;
  const wanted = required === undefined || required === null ? DEFAULT_REQUIRED : isTrue(required);
  await ensureVerificationSchema();
  const existing = await getVerificationRow(id);
  if (existing && Boolean(existing.required) === wanted) return describeVerification(existing);
  const status = wanted
    ? (['confirmed', 'rejected'].includes(existing?.status) ? existing.status : 'pending')
    : 'not_required';
  try {
    await db.query(
      `INSERT INTO document_verification (document_id, required, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE required = VALUES(required), status = VALUES(status)`,
      [id, wanted ? 1 : 0, status]
    );
  } catch (err) {
    console.warn('[Verification] setting not saved:', err.message);
    return null;
  }
  if (existing) {
    await recordVerificationEvent(id, {
      action: wanted ? 'required' : 'not_required',
      req,
      actorId: userId ?? req?.user?.id ?? null,
      message: wanted
        ? 'Verification and confirmation is required for this request.'
        : 'The sender turned off verification and confirmation for this request.'
    });
  }
  return describeVerification(await getVerificationRow(id));
}

/** The issued PDFs of a request (signed documents and the certificate of completion) with their disk path. */
async function getIssuedFiles(documentId) {
  const id = toInt(documentId);
  if (!id) return [];
  await ensureFingerprintTable();
  const [rows] = await db.query(
    `SELECT sha256, kind, file_name, file_path, file_index, created_at FROM issued_pdf_fingerprints
     WHERE document_id = ? AND kind IN ('signed', 'certificate') AND file_path IS NOT NULL
     ORDER BY kind DESC, file_index ASC, id ASC`,
    [id]
  );
  // Only the newest fingerprint of each issued file matters (a PDF rebuilt with a newer layout replaces it)
  const newest = new Map();
  rows.forEach((row) => {
    const key = `${row.kind}:${row.file_path}`;
    const current = newest.get(key);
    if (!current || new Date(row.created_at) >= new Date(current.created_at)) newest.set(key, row);
  });
  return [...newest.values()].map((row) => ({
    ...row,
    diskPath: path.join(__dirname, '..', String(row.file_path).replace(/^\/+/, '').split('/').join(path.sep))
  }));
}

/**
 * Re-reads every PDF BexSign issued for the request and compares it with the fingerprint registry.
 * Each file is also stored in the Document validity log (Settings · Security), source 'auto'.
 * -> { result, message, files: [{ kind, fileName, result, message, sha256, expectedSha256 }], checked }
 */
async function runIntegrityCheck(documentId, { req = null, persist = true } = {}) {
  const id = toInt(documentId);
  if (!id) return { result: 'unknown', message: 'Unknown request.', files: [], checked: 0 };
  let issued = [];
  try {
    issued = await getIssuedFiles(id);
  } catch (err) {
    console.warn('[Verification] issued files not read:', err.message);
  }
  if (issued.length === 0) {
    return {
      result: 'unknown',
      message: 'No signed PDF has been issued for this request yet, so there is nothing to check.',
      files: [],
      checked: 0
    };
  }

  const files = [];
  for (const item of issued) {
    let buffer = null;
    try {
      buffer = fs.readFileSync(item.diskPath);
    } catch (err) {
      files.push({
        kind: item.kind,
        fileName: item.file_name || path.basename(item.diskPath),
        filePath: item.file_path,
        result: 'unknown',
        message: 'This issued file is no longer on the server, so it could not be checked.',
        sha256: null,
        expectedSha256: item.sha256
      });
      continue;
    }
    const outcome = await verifyPdfBuffer(buffer, item.file_name || path.basename(item.diskPath));
    files.push({
      kind: item.kind,
      fileName: item.file_name || path.basename(item.diskPath),
      filePath: item.file_path,
      result: outcome.result,
      message: outcome.message,
      sha256: outcome.sha256,
      expectedSha256: item.sha256
    });
    if (persist) {
      await recordValidityCheck({
        req,
        documentId: id,
        fileName: item.file_name || path.basename(item.diskPath),
        sha256: outcome.sha256,
        result: outcome.result,
        message: outcome.message,
        source: 'auto'
      });
    }
  }

  const worst = files.reduce((acc, f) => (RESULT_SEVERITY[f.result] > RESULT_SEVERITY[acc] ? f.result : acc), 'valid');
  const failing = files.filter((f) => f.result !== 'valid');
  const message = worst === 'valid'
    ? `${files.length} issued document${files.length === 1 ? '' : 's'} checked: every fingerprint matches the copy BexSign issued.`
    : `${RESULT_LABELS[worst]} (${failing.map((f) => f.fileName).join(', ')})`;
  return { result: worst, message, files, checked: files.length };
}

/** The saved record shaped for the API and the client. */
function describeVerification(row, { documentStatus = null } = {}) {
  const required = row ? Boolean(row.required) : DEFAULT_REQUIRED;
  const status = row?.status || (required ? 'pending' : 'not_required');
  const meta = describeStatus(status);
  const isCompleted = String(documentStatus || '').toLowerCase() === 'completed';
  return {
    documentId: row?.document_id || null,
    required,
    status,
    statusLabel: meta.label,
    tone: meta.tone,
    // The owner is asked to act only once every recipient has signed
    awaitingConfirmation: required && status === 'pending' && isCompleted,
    integrityResult: row?.integrity_result || null,
    integrityMessage: row?.integrity_message || null,
    confirmedById: row?.confirmed_by || null,
    confirmedAt: row?.confirmed_at || null,
    note: row?.note || null,
    rejectedReason: row?.rejected_reason || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
    documentStatus: documentStatus || null,
    isCompleted,
    isDefault: !row
  };
}

/** Document row plus owner, used by the route to decide who may confirm. */
async function getDocumentContext(documentId) {
  const id = toInt(documentId);
  if (!id) return null;
  const [rows] = await db.query(
    `SELECT d.id, d.user_id, d.document_name, d.status, d.completed_at,
            u.first_name, u.last_name, u.email
     FROM documents d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
    [id]
  );
  const doc = rows[0];
  if (!doc) return null;
  return {
    id: doc.id,
    userId: doc.user_id,
    name: doc.document_name,
    status: doc.status,
    completedAt: doc.completed_at,
    owner: {
      id: doc.user_id,
      name: `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || doc.email || null,
      email: doc.email || null
    }
  };
}

/** Record, audit trail and the confirmer's name, for GET /api/verification/:documentId. */
async function getVerification(documentId, { withEvents = true } = {}) {
  const id = toInt(documentId);
  const context = await getDocumentContext(id);
  const row = await getVerificationRow(id);
  const record = describeVerification(row, { documentStatus: context?.status });
  record.documentId = id;
  record.documentName = context?.name || null;
  if (record.confirmedById) {
    try {
      const [users] = await db.query('SELECT id, first_name, last_name, email FROM users WHERE id = ?', [record.confirmedById]);
      const user = users[0];
      record.confirmedBy = user
        ? { id: user.id, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email, email: user.email }
        : null;
    } catch (err) {
      record.confirmedBy = null;
    }
  } else {
    record.confirmedBy = null;
  }
  return {
    document: context,
    verification: record,
    events: withEvents ? await getVerificationEvents(id) : []
  };
}

/**
 * Called from the completion path once every recipient has signed. When the sender asked for a confirmation
 * the request goes to `pending` and the owner is notified; otherwise nothing changes for that request.
 * Never throws, so a problem here can never break the completion of a request.
 */
async function onRequestCompleted(documentId, { req = null } = {}) {
  const id = toInt(documentId);
  if (!id) return null;
  try {
    await ensureVerificationSchema();
    const required = await isVerificationRequired(id);
    if (!required) {
      await db.query(
        `INSERT INTO document_verification (document_id, required, status) VALUES (?, 0, 'not_required')
         ON DUPLICATE KEY UPDATE required = 0, status = 'not_required'`,
        [id]
      );
      return { required: false, status: 'not_required' };
    }
    const existing = await getVerificationRow(id);
    if (existing && ['confirmed', 'rejected'].includes(existing.status)) {
      return { required: true, status: existing.status };
    }
    await db.query(
      `INSERT INTO document_verification (document_id, required, status) VALUES (?, 1, 'pending')
       ON DUPLICATE KEY UPDATE required = 1, status = 'pending'`,
      [id]
    );
    const context = await getDocumentContext(id);
    await recordVerificationEvent(id, {
      action: 'awaiting',
      req,
      actorId: null,
      actorName: 'BexSign',
      message: 'Every recipient has signed. The completed documents are waiting to be verified and confirmed.'
    });
    if (context?.userId) {
      await notify({
        userIds: [context.userId],
        category: 'document',
        severity: 'warning',
        title: `"${context.name || 'Document'}" is waiting for your confirmation`,
        message: 'Every recipient has signed. Open the document and run "Verify & confirm" to finish the request.',
        link: `/documents/${id}/details`,
        entityType: 'document',
        entityId: id
      });
    }
    return { required: true, status: 'pending' };
  } catch (err) {
    console.warn('[Verification] completion step skipped:', err.message);
    return null;
  }
}

/** Verifies the issued PDFs of a completed request and marks it confirmed. */
async function confirmVerification(documentId, { req = null, note = '' } = {}) {
  const id = toInt(documentId);
  const context = await getDocumentContext(id);
  if (!context) throw new Error('Document not found');
  if (String(context.status || '').toLowerCase() !== 'completed') {
    throw new Error('This request can only be confirmed once every recipient has signed.');
  }
  await ensureVerificationSchema();
  const row = await getVerificationRow(id);
  if (row && !row.required) throw new Error('This request was sent without a confirmation step.');
  if (row && row.status === 'confirmed') throw new Error('This document has already been verified and confirmed.');

  const integrity = await runIntegrityCheck(id, { req });
  const cleanNote = String(note || '').trim().slice(0, 1000) || null;
  const actorId = req?.user?.id ?? null;
  await db.query(
    `INSERT INTO document_verification (document_id, required, status, integrity_result, integrity_message, confirmed_by, confirmed_at, note, rejected_reason)
     VALUES (?, 1, 'confirmed', ?, ?, ?, NOW(), ?, NULL)
     ON DUPLICATE KEY UPDATE required = 1, status = 'confirmed', integrity_result = VALUES(integrity_result),
       integrity_message = VALUES(integrity_message), confirmed_by = VALUES(confirmed_by),
       confirmed_at = VALUES(confirmed_at), note = VALUES(note), rejected_reason = NULL`,
    [id, integrity.result, integrity.message.slice(0, 500), actorId, cleanNote]
  );
  await recordVerificationEvent(id, {
    action: 'confirmed',
    req,
    result: integrity.result,
    message: cleanNote ? `${integrity.message} Note: ${cleanNote}` : integrity.message
  });
  await logActivity({
    req,
    category: 'document',
    action: `Verified and confirmed "${context.name || 'Document'}"`,
    entityType: 'document',
    entityId: id,
    details: { integrity: integrity.result, note: cleanNote }
  });
  if (context.userId && context.userId !== actorId) {
    await notify({
      userIds: [context.userId],
      category: 'document',
      severity: 'success',
      title: `"${context.name || 'Document'}" was verified and confirmed`,
      message: `${actorNameOf(req, 'A manager')} confirmed the completed documents. ${integrity.message}`,
      link: `/documents/${id}/details`,
      entityType: 'document',
      entityId: id,
      actorName: actorNameOf(req)
    });
  }
  return { ...(await getVerification(id)), integrity };
}

/** Marks the request rejected, with the reason the confirmer gave. */
async function rejectVerification(documentId, { req = null, reason = '' } = {}) {
  const id = toInt(documentId);
  const context = await getDocumentContext(id);
  if (!context) throw new Error('Document not found');
  const cleanReason = String(reason || '').trim().slice(0, 1000);
  if (!cleanReason) throw new Error('Give a reason for rejecting this document.');
  if (String(context.status || '').toLowerCase() !== 'completed') {
    throw new Error('This request can only be rejected once every recipient has signed.');
  }
  await ensureVerificationSchema();
  const row = await getVerificationRow(id);
  if (row && !row.required) throw new Error('This request was sent without a confirmation step.');

  const integrity = await runIntegrityCheck(id, { req });
  const actorId = req?.user?.id ?? null;
  await db.query(
    `INSERT INTO document_verification (document_id, required, status, integrity_result, integrity_message, confirmed_by, confirmed_at, rejected_reason)
     VALUES (?, 1, 'rejected', ?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE required = 1, status = 'rejected', integrity_result = VALUES(integrity_result),
       integrity_message = VALUES(integrity_message), confirmed_by = VALUES(confirmed_by),
       confirmed_at = VALUES(confirmed_at), rejected_reason = VALUES(rejected_reason)`,
    [id, integrity.result, integrity.message.slice(0, 500), actorId, cleanReason]
  );
  await recordVerificationEvent(id, {
    action: 'rejected',
    req,
    result: integrity.result,
    message: `Rejected: ${cleanReason}`
  });
  await logActivity({
    req,
    category: 'document',
    action: `Rejected the completed documents of "${context.name || 'Document'}"`,
    entityType: 'document',
    entityId: id,
    details: { integrity: integrity.result, reason: cleanReason }
  });
  if (context.userId && context.userId !== actorId) {
    await notify({
      userIds: [context.userId],
      category: 'document',
      severity: 'error',
      title: `"${context.name || 'Document'}" was not confirmed`,
      message: `${actorNameOf(req, 'A manager')} rejected the completed documents: ${cleanReason}`,
      link: `/documents/${id}/details`,
      entityType: 'document',
      entityId: id,
      actorName: actorNameOf(req)
    });
  }
  return { ...(await getVerification(id)), integrity };
}

/** Runs the fingerprint check without changing the state (the "Check again" button). */
async function checkOnly(documentId, { req = null } = {}) {
  const id = toInt(documentId);
  const context = await getDocumentContext(id);
  if (!context) throw new Error('Document not found');
  const integrity = await runIntegrityCheck(id, { req });
  await ensureVerificationSchema();
  try {
    await db.query(
      `INSERT INTO document_verification (document_id, required, status, integrity_result, integrity_message)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE integrity_result = VALUES(integrity_result), integrity_message = VALUES(integrity_message)`,
      [id, DEFAULT_REQUIRED ? 1 : 0, DEFAULT_REQUIRED ? 'pending' : 'not_required', integrity.result, integrity.message.slice(0, 500)]
    );
  } catch (err) {
    console.warn('[Verification] check not stored:', err.message);
  }
  await recordVerificationEvent(id, { action: 'checked', req, result: integrity.result, message: integrity.message });
  return { ...(await getVerification(id)), integrity };
}

/** Removes the verification of a document (used when a request is deleted for good). */
async function deleteVerification(documentId) {
  const id = toInt(documentId);
  if (!id) return;
  await ensureVerificationSchema();
  try {
    await db.query('DELETE FROM document_verification WHERE document_id = ?', [id]);
    await db.query('DELETE FROM document_verification_events WHERE document_id = ?', [id]);
  } catch (err) {
    console.warn('[Verification] record not deleted:', err.message);
  }
}

module.exports = {
  DEFAULT_REQUIRED,
  STATUSES,
  describeStatus,
  describeVerification,
  ensureVerificationSchema,
  getVerificationRow,
  getVerification,
  getVerificationEvents,
  getDocumentContext,
  isVerificationRequired,
  saveVerificationSetting,
  runIntegrityCheck,
  recordVerificationEvent,
  onRequestCompleted,
  confirmVerification,
  rejectVerification,
  checkOnly,
  deleteVerification
};
