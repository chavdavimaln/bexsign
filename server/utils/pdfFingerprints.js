/**
 * Issued PDF fingerprints (server/utils/pdfFingerprints.js)
 * Every signed PDF BexSign issues (signed documents, certificates, a signer's own copy) is locked against editing
 * and its SHA-256 fingerprint is recorded here. "Verify document" recomputes the fingerprint of any file: a copy
 * changed in any way, by any application, no longer matches.
 */
const crypto = require('crypto');
const db = require('../db');
const { PDF_LAYOUT_VERSION } = require('./pdfLock');

let tablePromise = null;
function ensureFingerprintTable() {
  if (!tablePromise) {
    tablePromise = db.query(`
      CREATE TABLE IF NOT EXISTS issued_pdf_fingerprints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sha256 CHAR(64) NOT NULL,
        document_id INT NOT NULL,
        file_index INT NULL,
        kind VARCHAR(20) NOT NULL,
        file_name VARCHAR(255) NULL,
        recipient_email VARCHAR(255) NULL,
        file_path VARCHAR(255) NULL,
        layout_version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_sha256 (sha256),
        INDEX idx_document (document_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(async () => {
      // Tables created before layout versions were tracked: their rows are layout 1
      const [columns] = await db.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issued_pdf_fingerprints' AND COLUMN_NAME = 'layout_version'"
      );
      if (columns.length === 0) {
        await db.query('ALTER TABLE issued_pdf_fingerprints ADD COLUMN layout_version INT NOT NULL DEFAULT 1 AFTER file_path');
      }
    }).catch((err) => {
      tablePromise = null;
      throw err;
    });
  }
  return tablePromise;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Records an issued PDF (with the current PDF layout version) and returns its fingerprint. kind: 'signed' | 'certificate' | 'signer-copy' | 'progress-copy' */
async function recordFingerprint(buffer, { documentId, fileIndex = null, kind, fileName = null, recipientEmail = null, filePath = null }) {
  const hash = sha256(buffer);
  await ensureFingerprintTable();
  await db.query(
    `INSERT INTO issued_pdf_fingerprints (sha256, document_id, file_index, kind, file_name, recipient_email, file_path, layout_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
    [hash, documentId, fileIndex, kind, fileName, recipientEmail, filePath, PDF_LAYOUT_VERSION]
  );
  return hash;
}

async function findFingerprint(hash) {
  await ensureFingerprintTable();
  const [rows] = await db.query('SELECT * FROM issued_pdf_fingerprints WHERE sha256 = ?', [hash]);
  return rows[0] || null;
}

/** True when a stored issued PDF was built with the current layout (older files are rebuilt on download). */
async function isCurrentIssuedPdf(buffer) {
  const row = buffer ? await findFingerprint(sha256(buffer)) : null;
  return Boolean(row && Number(row.layout_version || 1) >= PDF_LAYOUT_VERSION);
}

module.exports = { sha256, recordFingerprint, findFingerprint, isCurrentIssuedPdf, ensureFingerprintTable };
