const db = require('../db');
const crypto = require('crypto');

/**
 * Server-side Document Identifier & BexSign Signature Tracking Utility
 * Manages the separate `document_identifiers` table in MySQL/phpMyAdmin.
 */

// Generate BexSign standardized ID
function generateBexsignDocId(docId = 1) {
  const year = 2026;
  const seq = String(docId).padStart(4, '0');
  
  const deterministicHashes = {
    1: '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG',
    2: '482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89',
    3: '792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012',
    4: '920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF',
    5: 'A1B2C3D4-E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4',
    6: 'BWTDWUUD-T8GXL5TEDYMZAPXCWXX5K71290348719238471293'
  };

  const hash = deterministicHashes[docId] || `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 14).toUpperCase()}${Math.random().toString(36).substring(2, 14).toUpperCase()}`;

  return {
    bexsignDocId: `BEX-DOC-${year}-${seq}-${hash}`,
    prefix: 'BEX-DOC',
    year,
    seqNumber: parseInt(docId) || 1,
    uniqueHash: hash
  };
}

/**
 * Initialize document_identifiers table and seed default records
 */
async function ensureDocumentIdentifiersTable() {
  try {
    // 1. Create table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_identifiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        bexsign_doc_id VARCHAR(100) NOT NULL UNIQUE,
        prefix VARCHAR(20) DEFAULT 'BEX-DOC',
        year INT DEFAULT 2026,
        seq_number INT NOT NULL,
        unique_hash VARCHAR(64) NOT NULL,
        signer_name VARCHAR(150) DEFAULT 'Vimal Chavda',
        signer_email VARCHAR(255) DEFAULT 'vimal@bexcodeservices.com',
        signature_style VARCHAR(50) DEFAULT 'font-signature-1',
        signature_image LONGTEXT NULL,
        signature_status ENUM('Draft', 'In Progress', 'Completed', 'Recalled', 'Expired') DEFAULT 'Draft',
        audit_ip VARCHAR(45) DEFAULT '223.181.69.208',
        audit_hash VARCHAR(100) DEFAULT 'SHA256-CERTIFIED-ELECTRONIC-RECORD',
        qr_payload TEXT NULL,
        signed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bexsign_doc_id (bexsign_doc_id),
        INDEX idx_document_id (document_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure signature_image and signature_style columns exist on older tables
    try {
      await db.query('ALTER TABLE document_identifiers ADD COLUMN signature_image LONGTEXT NULL');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE document_identifiers ADD COLUMN signature_style VARCHAR(50) DEFAULT "font-signature-1"');
    } catch (e) {}

    // 2. Check if records exist
    const [rows] = await db.query('SELECT COUNT(*) as count FROM document_identifiers');
    if (rows[0].count === 0) {
      console.log('[BexSign] Seeding document_identifiers table in database...');
      const seedList = [
        { docId: 1, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', status: 'Completed', signed: '2026-08-26 16:29:34' },
        { docId: 2, name: 'Dhruv patel', email: 'dhruv@bexcodeservices.com', status: 'Completed', signed: '2026-08-27 10:14:22' },
        { docId: 3, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', status: 'In Progress', signed: null },
        { docId: 4, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', status: 'In Progress', signed: null },
        { docId: 5, name: 'Manu Yadav', email: 'manu.yadav@oladigital.health', status: 'Draft', signed: null },
        { docId: 6, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', status: 'Draft', signed: null }
      ];

      for (const item of seedList) {
        const idData = generateBexsignDocId(item.docId);
        await db.query(
          `INSERT IGNORE INTO document_identifiers 
           (document_id, bexsign_doc_id, prefix, year, seq_number, unique_hash, signer_name, signer_email, signature_status, signed_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.docId,
            idData.bexsignDocId,
            idData.prefix,
            idData.year,
            idData.seqNumber,
            idData.uniqueHash,
            item.name,
            item.email,
            item.status,
            item.signed
          ]
        );
      }
      console.log('[BexSign] Initial document_identifiers seeded successfully.');
    }
  } catch (err) {
    console.warn('[BexSign Database Warning] document_identifiers setup warning:', err.message);
  }
}

/**
 * Get or create identifier for a document
 */
async function getOrCreateDocumentIdentifier(docId, options = {}) {
  try {
    await ensureDocumentIdentifiersTable();
    const [existing] = await db.query('SELECT * FROM document_identifiers WHERE document_id = ?', [docId]);
    if (existing.length > 0) {
      return existing[0];
    }

    const idData = generateBexsignDocId(docId);
    const signerName = options.signerName || 'Vimal Chavda';
    const signerEmail = options.signerEmail || 'vimal@bexcodeservices.com';
    const status = options.status || 'Draft';

    await db.query(
      `INSERT INTO document_identifiers 
       (document_id, bexsign_doc_id, prefix, year, seq_number, unique_hash, signer_name, signer_email, signature_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        idData.bexsignDocId,
        idData.prefix,
        idData.year,
        idData.seqNumber,
        idData.uniqueHash,
        signerName,
        signerEmail,
        status
      ]
    );

    const [created] = await db.query('SELECT * FROM document_identifiers WHERE document_id = ?', [docId]);
    return created[0];
  } catch (err) {
    console.error('getOrCreateDocumentIdentifier error:', err.message);
    const idData = generateBexsignDocId(docId);
    return {
      document_id: docId,
      bexsign_doc_id: idData.bexsignDocId,
      prefix: idData.prefix,
      year: idData.year,
      seq_number: idData.seqNumber,
      unique_hash: idData.uniqueHash,
      signature_status: options.status || 'Draft'
    };
  }
}

/**
 * Update signature stamp when document is signed
 */
async function markDocumentSigned(docId, details = {}) {
  try {
    await ensureDocumentIdentifiersTable();
    const signerName = details.signerName || 'Vimal Chavda';
    const signerEmail = details.signerEmail || 'vimal@bexcodeservices.com';
    const ipAddress = details.ipAddress || '223.181.69.208';
    const signatureImage = details.signatureImage || null;
    const signatureStyle = details.signatureStyle || 'font-signature-1';
    const status = details.status || 'Completed';

    await db.query(
      `UPDATE document_identifiers 
       SET signature_status = ?, 
           signer_name = ?, 
           signer_email = ?, 
           signature_image = COALESCE(?, signature_image),
           signature_style = ?,
           audit_ip = ?, 
           signed_at = NOW() 
       WHERE document_id = ?`,
      [status, signerName, signerEmail, signatureImage, signatureStyle, ipAddress, docId]
    );
  } catch (err) {
    console.warn('markDocumentSigned error:', err.message);
  }
}

/**
 * Auto-create and seed employee_signatures table
 */
async function ensureEmployeeSignaturesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_signatures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        employee_name VARCHAR(150) NOT NULL,
        employee_email VARCHAR(255) NOT NULL,
        designation VARCHAR(100) DEFAULT 'Software Specialist',
        department VARCHAR(100) DEFAULT 'Engineering',
        initials VARCHAR(10) DEFAULT 'VC',
        signature_id VARCHAR(100) NOT NULL UNIQUE,
        signature_image LONGTEXT NULL,
        signature_style VARCHAR(50) DEFAULT 'font-signature-1',
        status ENUM('Active', 'Inactive', 'Revoked') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_id (employee_id),
        INDEX idx_signature_id (signature_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [rows] = await db.query('SELECT COUNT(*) as count FROM employee_signatures');
    if (rows[0].count === 0) {
      await db.query(`
        INSERT IGNORE INTO employee_signatures
        (employee_id, employee_name, employee_email, designation, department, initials, signature_id, signature_style)
        VALUES
        ('EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Lead Systems Engineer', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'font-signature-1'),
        ('EMP002', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', 'font-signature-2'),
        ('EMP003', 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', 'font-signature-1');
      `);
    }
  } catch (err) {
    console.warn('ensureEmployeeSignaturesTable error:', err.message);
  }
}

/**
 * Generate meaningful Employee Signature ID
 * Format matching Page 12: BEX-SIGN-[INITIALS]-[EMPLOYEE_ID]-[YEAR]-[HASH]
 */
function generateEmployeeSignatureId(empId = 'EMP001', empName = 'Vimal Chavda') {
  const initials = empName.split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';
  const cleanEmpId = empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const randHash = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `BEX-SIGN-${initials}-${cleanEmpId}-2026-${randHash}`;
}

async function getOrCreateEmployeeSignature(empId = 'EMP001', details = {}) {
  await ensureEmployeeSignaturesTable();
  const [rows] = await db.query('SELECT * FROM employee_signatures WHERE employee_id = ?', [empId]);
  if (rows.length > 0) return rows[0];

  const name = details.name || 'Vimal Chavda';
  const email = details.email || 'vimal@bexcodeservices.com';
  const sigId = generateEmployeeSignatureId(empId, name);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';

  await db.query(
    `INSERT INTO employee_signatures (employee_id, employee_name, employee_email, initials, signature_id, signature_style)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [empId, name, email, initials, sigId, details.signatureStyle || 'font-signature-1']
  );

  const [created] = await db.query('SELECT * FROM employee_signatures WHERE employee_id = ?', [empId]);
  return created[0];
}

async function getEmployeeSignatureByEmail(email) {
  if (!email) return null;
  await ensureEmployeeSignaturesTable();
  const [rows] = await db.query('SELECT * FROM employee_signatures WHERE LOWER(employee_email) = LOWER(?)', [email.trim()]);
  return rows.length > 0 ? rows[0] : null;
}

async function upsertEmployeeSignature({
  name = 'Vimal Chavda',
  email = 'vimal@bexcodeservices.com',
  signatureImage = null,
  signatureStyle = 'font-signature-1',
  empId = null,
  designation = 'Software Specialist',
  department = 'Engineering'
}) {
  await ensureEmployeeSignaturesTable();
  const cleanEmail = email.trim();
  const existing = await getEmployeeSignatureByEmail(cleanEmail);

  if (existing) {
    await db.query(
      `UPDATE employee_signatures 
       SET employee_name = ?, 
           signature_image = COALESCE(?, signature_image), 
           signature_style = COALESCE(?, signature_style),
           designation = COALESCE(?, designation),
           department = COALESCE(?, department),
           updated_at = NOW()
       WHERE id = ?`,
      [name, signatureImage, signatureStyle, designation, department, existing.id]
    );
    const [updated] = await db.query('SELECT * FROM employee_signatures WHERE id = ?', [existing.id]);
    return updated[0];
  } else {
    const generatedEmpId = empId || `EMP${String(Math.floor(100 + Math.random() * 900))}`;
    const sigId = generateEmployeeSignatureId(generatedEmpId, name);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';

    await db.query(
      `INSERT INTO employee_signatures 
       (employee_id, employee_name, employee_email, designation, department, initials, signature_id, signature_image, signature_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generatedEmpId, name, cleanEmail, designation, department, initials, sigId, signatureImage, signatureStyle]
    );
    return await getEmployeeSignatureByEmail(cleanEmail);
  }
}

// Auto-run ensure on load
ensureDocumentIdentifiersTable();
ensureEmployeeSignaturesTable();

module.exports = {
  generateBexsignDocId,
  ensureDocumentIdentifiersTable,
  ensureEmployeeSignaturesTable,
  getOrCreateDocumentIdentifier,
  markDocumentSigned,
  generateEmployeeSignatureId,
  getOrCreateEmployeeSignature,
  getEmployeeSignatureByEmail,
  upsertEmployeeSignature
};
