/**
 * Document validity (server/utils/validityLog.js)
 * verifyPdfBuffer() compares a PDF with the fingerprints of every PDF BexSign issued (issued_pdf_fingerprints):
 *  - valid:    an issued PDF, unchanged
 *  - modified: a BexSign PDF changed after it was issued (content appended by an editor, or the BexSign
 *              certification is present but the bytes no longer match)
 *  - unknown:  no issued PDF has this fingerprint
 *  - invalid:  the file is not a PDF
 * recordValidityCheck() stores every check in document_validity (Settings · Document validity). It never throws.
 */
const crypto = require('crypto');
const db = require('../db');
const { sha256, findFingerprint, ensureFingerprintTable } = require('./pdfFingerprints');
const requestHelpers = require('./requestHelpers');

const RESULTS = ['valid', 'modified', 'unknown', 'invalid'];
const SOURCES = ['upload', 'link', 'auto'];
const KIND_LABELS = {
  signed: 'Signed document',
  certificate: 'Certificate of completion',
  'signer-copy': "Signer's copy",
  'progress-copy': 'In-progress copy',
  'protected-copy': 'Protected copy'
};

// The certificate of the invisible BexSign certification signature, as it appears (hex) in the /Contents of a PDF
const CERT_MARKER = Buffer.from('BexSign Document Certification').toString('hex');

// database.sql created document_id, certificate_id and hash_signature as required columns; a check of a file
// BexSign never issued has no document, so they become optional
let schemaPromise = null;
function ensureValiditySchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const definitions = { document_id: 'INT NULL', certificate_id: 'VARCHAR(100) NULL', hash_signature: 'VARCHAR(255) NULL' };
      const [columns] = await db.query(
        `SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'document_validity' AND COLUMN_NAME IN (?)`,
        [Object.keys(definitions)]
      );
      for (const column of columns) {
        if (column.nullable === 'NO') {
          await db.query(`ALTER TABLE document_validity MODIFY \`${column.name}\` ${definitions[column.name]}`);
        }
      }
      const [index] = await db.query(
        "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'document_validity' AND INDEX_NAME = 'idx_document_validity_sha256'"
      );
      if (index.length === 0) await db.query('ALTER TABLE document_validity ADD INDEX idx_document_validity_sha256 (sha256)');
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

// Check reference shown to users, e.g. VRF-20260918-3FA91C0B
function newReference() {
  const now = new Date();
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `VRF-${day}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Stores one verification. { req, documentId, fileName, sha256, result: valid|modified|unknown|invalid, message,
 * source: upload|link|auto, checkedBy } -> { id, reference } or null when it could not be stored.
 */
async function recordValidityCheck({ req = null, documentId = null, fileName = null, sha256: hash = null, result = 'unknown', message = null, source = 'upload', checkedBy } = {}) {
  try {
    await ensureValiditySchema();
    const cleanHash = /^[a-f0-9]{64}$/i.test(String(hash || '')) ? String(hash).toLowerCase() : null;
    const cleanResult = RESULTS.includes(result) ? result : 'unknown';
    const reference = newReference();
    const insert = (docId) => db.query(
      `INSERT INTO document_validity
        (document_id, certificate_id, hash_signature, is_valid, file_name, sha256, result, message, source, checked_by, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId || null,
        reference,
        cleanHash,
        cleanResult === 'valid' ? 1 : 0,
        fileName ? String(fileName).slice(0, 255) : null,
        cleanHash,
        cleanResult,
        message ? String(message).slice(0, 500) : null,
        SOURCES.includes(source) ? source : 'upload',
        checkedBy !== undefined ? checkedBy : req?.user?.id || null,
        requestHelpers.getRequestIp(req)
      ]
    );
    let inserted;
    try {
      [inserted] = await insert(documentId);
    } catch (err) {
      // The document was deleted after the file was issued: keep the check without the link
      if (!documentId || !/foreign key/i.test(err.message)) throw err;
      [inserted] = await insert(null);
    }
    return { id: inserted.insertId, reference };
  } catch (err) {
    console.warn('[Document validity] could not record verification:', err.message);
    return null;
  }
}

function isPdf(buffer) {
  return buffer.length > 8 && buffer.subarray(0, 1024).includes('%PDF-');
}

function hasBexsignCertification(buffer) {
  return buffer.includes(CERT_MARKER) || buffer.includes(CERT_MARKER.toUpperCase());
}

/** A PDF editor that saves incrementally appends to the file: the start of the file is still the issued PDF. */
async function findIssuedPrefix(buffer) {
  const lengths = new Set();
  let at = buffer.indexOf('%%EOF');
  while (at >= 0 && lengths.size < 60) {
    let end = at + 5;
    lengths.add(end);
    if (buffer[end] === 0x0d) lengths.add(++end);
    if (buffer[end] === 0x0a) lengths.add(end + 1);
    at = buffer.indexOf('%%EOF', at + 5);
  }
  const hashes = [...lengths].filter((len) => len < buffer.length).map((len) => sha256(buffer.subarray(0, len)));
  if (hashes.length === 0) return null;
  await ensureFingerprintTable();
  const [rows] = await db.query('SELECT * FROM issued_pdf_fingerprints WHERE sha256 IN (?) ORDER BY created_at DESC LIMIT 1', [hashes]);
  return rows[0] || null;
}

/** Issued files with the same file name (a hint for files changed beyond recognition). */
async function findByFileName(fileName) {
  const name = String(fileName || '').trim();
  if (!name) return null;
  await ensureFingerprintTable();
  const [rows] = await db.query(
    `SELECT * FROM issued_pdf_fingerprints
     WHERE LOWER(file_name) = LOWER(?) OR LOWER(file_path) LIKE LOWER(?)
     ORDER BY created_at DESC LIMIT 1`,
    [name, `%/${name.replace(/[\\%_]/g, (c) => `\\${c}`)}`]
  );
  return rows[0] || null;
}

/**
 * Classifies a file: { result, message, sha256, fileName, fileSize, match (the issued fingerprint row or null),
 * matchType: 'exact' | 'original' | 'name' | null }
 */
async function verifyPdfBuffer(buffer, fileName = '') {
  const hash = sha256(buffer);
  const base = { sha256: hash, fileName: fileName || null, fileSize: buffer.length };
  if (!isPdf(buffer)) {
    return { ...base, result: 'invalid', match: null, matchType: null, message: 'This file is not a PDF document, so it cannot be a document issued by BexSign.' };
  }
  const exact = await findFingerprint(hash);
  if (exact) {
    return { ...base, result: 'valid', match: exact, matchType: 'exact', message: 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.' };
  }
  const original = await findIssuedPrefix(buffer);
  if (original) {
    return {
      ...base,
      result: 'modified',
      match: original,
      matchType: 'original',
      message: 'Modified: this PDF was issued by BexSign, but content was added to it afterwards (for example annotations or edits saved by a PDF editor).'
    };
  }
  const sameName = await findByFileName(fileName);
  if (hasBexsignCertification(buffer)) {
    return {
      ...base,
      result: 'modified',
      match: sameName,
      matchType: sameName ? 'name' : null,
      message: 'Modified: this PDF carries the BexSign certification, but its content no longer matches any PDF BexSign issued.'
    };
  }
  return {
    ...base,
    result: 'unknown',
    match: sameName,
    matchType: sameName ? 'name' : null,
    message: sameName
      ? 'Not recognized: BexSign issued a file with this name, but its content is different. This copy was changed or re-saved.'
      : 'Not recognized: no PDF issued by BexSign has this fingerprint. It was not issued by BexSign, or it was changed or re-saved.'
  };
}

/** Document, issued file and signers of an issued fingerprint row. */
async function describeIssuedFile(match) {
  if (!match) return { document: null, file: null, signers: [] };
  const [docs] = await db.query(
    `SELECT d.id, d.document_name, d.status, d.sent_at, d.completed_at, d.created_at,
            u.first_name, u.last_name, u.email,
            (SELECT di.bexsign_doc_id FROM document_identifiers di WHERE di.document_id = d.id ORDER BY di.id LIMIT 1) AS bexsign_doc_id
     FROM documents d LEFT JOIN users u ON u.id = d.user_id
     WHERE d.id = ?`,
    [match.document_id]
  );
  const doc = docs[0] || null;
  const [newer] = await db.query(
    `SELECT MAX(created_at) AS newest FROM issued_pdf_fingerprints
     WHERE document_id = ? AND kind = ? AND file_index <=> ? AND recipient_email <=> ? AND created_at > ?`,
    [match.document_id, match.kind, match.file_index, match.recipient_email, match.created_at]
  );
  let signers = [];
  if (doc) {
    const recipients = await requestHelpers.getRecipients(match.document_id);
    signers = recipients
      .filter((r) => requestHelpers.isSigningRole(r.role))
      .map((r) => ({ name: r.name, email: r.email, role: r.role_label || r.role, status: r.status, signedAt: r.signed_at, signedIp: r.signed_ip || null }));
  }
  return {
    document: doc
      ? {
        id: doc.id,
        name: doc.document_name,
        bexsignDocId: doc.bexsign_doc_id || null,
        status: doc.status,
        sentAt: doc.sent_at,
        completedAt: doc.completed_at,
        owner: doc.email ? { name: `${doc.first_name || ''} ${doc.last_name || ''}`.trim(), email: doc.email } : null
      }
      : { id: match.document_id, name: 'Deleted document', bexsignDocId: null, status: 'Deleted', deleted: true },
    file: {
      kind: match.kind,
      kindLabel: KIND_LABELS[match.kind] || match.kind,
      fileName: match.file_name,
      fileIndex: match.file_index,
      recipientEmail: match.recipient_email,
      issuedAt: match.created_at,
      sha256: match.sha256,
      // A newer copy of this file was issued later (e.g. rebuilt with a newer PDF layout); this one stays authentic
      newerIssuedAt: newer[0]?.newest || null
    },
    signers
  };
}

module.exports = {
  RESULTS,
  SOURCES,
  KIND_LABELS,
  ensureValiditySchema,
  recordValidityCheck,
  verifyPdfBuffer,
  describeIssuedFile
};
