/**
 * Issued PDF fingerprints (server/utils/pdfFingerprints.js)
 * Every signed PDF BexSign issues (signed documents, certificates, a signer's own copy) is locked against editing
 * and its SHA-256 fingerprint is recorded here. "Verify document" recomputes the fingerprint of any file: a copy
 * changed in any way, by any application, no longer matches.
 */
const crypto = require('crypto');
const db = require('../db');

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_sha256 (sha256),
        INDEX idx_document (document_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch((err) => {
      tablePromise = null;
      throw err;
    });
  }
  return tablePromise;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Records an issued PDF and returns its fingerprint. kind: 'signed' | 'certificate' | 'signer-copy' */
async function recordFingerprint(buffer, { documentId, fileIndex = null, kind, fileName = null, recipientEmail = null, filePath = null }) {
  const hash = sha256(buffer);
  await ensureFingerprintTable();
  await db.query(
    `INSERT INTO issued_pdf_fingerprints (sha256, document_id, file_index, kind, file_name, recipient_email, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
    [hash, documentId, fileIndex, kind, fileName, recipientEmail, filePath]
  );
  return hash;
}

async function findFingerprint(hash) {
  await ensureFingerprintTable();
  const [rows] = await db.query('SELECT * FROM issued_pdf_fingerprints WHERE sha256 = ?', [hash]);
  return rows[0] || null;
}

module.exports = { sha256, recordFingerprint, findFingerprint, ensureFingerprintTable };
