/**
 * Signature store: who owns which signature, and where each one has been used.
 *
 * The original directory (employee_signatures) is keyed by email alone and has no owner, so every account
 * could read and rewrite every other account's stamp. This module adds the ownership layer on top of it
 * without taking it away: the signing flow still reads and writes employee_signatures by email, and every
 * write here is mirrored back into that table so signing prefill keeps working unchanged.
 *
 * Two tables of its own:
 *   user_signatures      one row per signature, owned by a user (owner_user_id / owner_email)
 *   signature_usage_log  one row per use of a signature, so "which document did I sign with this?" is answerable
 *
 * Ownership rule used everywhere: a row belongs to the caller when owner_user_id matches their id, or when
 * owner_email matches their email case-insensitively (accounts created before the id was resolvable).
 */
const crypto = require('crypto');
const db = require('../db');
const { isUsableSignature } = require('./signatureValidation');

const SIGNATURE_METHODS = ['type', 'draw', 'upload'];
const USAGE_CONTEXTS = ['signing_request', 'self_sign', 'directory_prefill', 'manual'];
const DEFAULT_STYLE = 'font-signature-1';
const PROTECTED_ERROR = 'This signature belongs to another user and is protected. You can only change your own signatures.';

/** Marker meaning "the caller did not send this field", as opposed to null which means "clear it". */
const KEEP = Symbol('keep');

let schemaPromise = null;
function ensureSignatureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS user_signatures (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT NULL,
            owner_email VARCHAR(255) NOT NULL,
            display_name VARCHAR(150) NOT NULL,
            employee_code VARCHAR(50) NULL,
            designation VARCHAR(100) NULL,
            department VARCHAR(100) NULL,
            initials VARCHAR(10) NULL,
            signature_id VARCHAR(100) NOT NULL,
            method ENUM('type', 'draw', 'upload') NOT NULL DEFAULT 'type',
            signature_image LONGTEXT NULL,
            signature_style VARCHAR(50) NOT NULL DEFAULT '${DEFAULT_STYLE}',
            is_default TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            legacy_employee_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_signature_id (signature_id),
            UNIQUE KEY uniq_user_signature_legacy (legacy_employee_id),
            KEY idx_user_signature_owner (owner_user_id),
            KEY idx_user_signature_email (owner_email)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
          CREATE TABLE IF NOT EXISTS signature_usage_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            signature_id INT NULL,
            owner_email VARCHAR(255) NOT NULL,
            document_id INT NULL,
            document_name VARCHAR(255) NULL,
            context ENUM('signing_request', 'self_sign', 'directory_prefill', 'manual') NOT NULL DEFAULT 'manual',
            recipient_id INT NULL,
            signer_name VARCHAR(150) NULL,
            signer_email VARCHAR(255) NULL,
            field_count INT NULL,
            ip_address VARCHAR(64) NULL,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_usage_signature (signature_id, used_at),
            KEY idx_usage_document (document_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await migrateLegacyDirectory();
      } catch (err) {
        schemaPromise = null;
        console.warn('[Schema] Signature store tables not ready:', err.message);
      }
    })();
  }
  return schemaPromise;
}

/**
 * One-time copy of the legacy directory into the owned store. Re-running it adds nothing: every copied row
 * keeps the employee_signatures id it came from, and that column is unique.
 */
async function migrateLegacyDirectory(email = null) {
  const params = [];
  let filter = '';
  if (email) {
    filter = ' AND LOWER(e.employee_email) = LOWER(?)';
    params.push(String(email).trim());
  }
  try {
    await db.query(
      `INSERT IGNORE INTO user_signatures
         (owner_user_id, owner_email, display_name, employee_code, designation, department, initials,
          signature_id, method, signature_image, signature_style, is_default, status, legacy_employee_id, created_at)
       SELECT u.id, e.employee_email, e.employee_name, e.employee_id, e.designation, e.department, e.initials,
              e.signature_id,
              CASE WHEN e.signature_image IS NULL OR e.signature_image = '' THEN 'type' ELSE 'upload' END,
              e.signature_image, COALESCE(e.signature_style, '${DEFAULT_STYLE}'), 1, COALESCE(e.status, 'Active'),
              e.id, e.created_at
         FROM employee_signatures e
         LEFT JOIN users u ON LOWER(u.email) = LOWER(e.employee_email)
         LEFT JOIN user_signatures s ON s.legacy_employee_id = e.id
        WHERE s.id IS NULL${filter}`,
      params
    );
  } catch (err) {
    // A fresh database may not have employee_signatures yet; the signing flow creates it on first use
    console.warn('[SignatureStore] legacy directory not migrated:', err.message);
  }
}

function initialsOf(name = '') {
  const letters = String(name).trim().split(/\s+/).map((part) => part[0]).filter(Boolean).join('');
  return (letters || 'BX').toUpperCase().slice(0, 4);
}

function generateSignatureId(employeeCode = 'EMP', displayName = 'BexSign User') {
  const code = String(employeeCode || 'EMP').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EMP';
  const hash = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `BEX-SIGN-${initialsOf(displayName)}-${code}-${new Date().getFullYear()}-${hash}`;
}

function normalizeMethod(value, fallback = 'type') {
  const raw = String(value || '').trim().toLowerCase();
  return SIGNATURE_METHODS.includes(raw) ? raw : fallback;
}

function normalizeStatus(value, fallback = 'Active') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'active') return 'Active';
  if (raw === 'inactive') return 'Inactive';
  if (raw === 'revoked') return 'Revoked';
  return fallback;
}

/** The caller's email, lowercased, from whatever the auth middleware attached. */
function callerEmail(user) {
  return String(user?.email || '').trim().toLowerCase();
}

function callerName(user) {
  const joined = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return joined || String(user?.email || 'BexSign User').split('@')[0];
}

/** True when the row is the caller's own: same user id, or same email when the row predates the id link. */
function ownsRow(user, row) {
  if (!row) return false;
  const id = parseInt(user?.id, 10) || 0;
  if (id && parseInt(row.owner_user_id, 10) === id) return true;
  const email = callerEmail(user);
  return Boolean(email) && String(row.owner_email || '').trim().toLowerCase() === email;
}

/** A row never leaves the server with an image that renders as nothing: the card falls back to the typed style. */
function presentable(row, { canEdit }) {
  if (!row) return null;
  const image = row.signature_image && isUsableSignature(row.signature_image) ? row.signature_image : null;
  return {
    id: row.id,
    signature_id: row.signature_id,
    owner_user_id: row.owner_user_id || null,
    owner_email: row.owner_email,
    // Legacy field names so the existing stamp card, signing prefill and table columns keep working unchanged
    employee_name: row.display_name,
    employee_email: row.owner_email,
    employee_id: row.employee_code,
    display_name: row.display_name,
    employee_code: row.employee_code,
    designation: row.designation,
    department: row.department,
    initials: row.initials,
    signature_image: image,
    signature_style: row.signature_style || DEFAULT_STYLE,
    method: row.method || (image ? 'upload' : 'type'),
    is_default: Boolean(row.is_default),
    status: row.status || 'Active',
    usage_count: Number(row.usage_count || 0),
    last_used_at: row.last_used_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    canEdit: Boolean(canEdit),
    readOnly: !canEdit
  };
}

const LIST_COLUMNS = `s.id, s.owner_user_id, s.owner_email, s.display_name, s.employee_code, s.designation,
  s.department, s.initials, s.signature_id, s.method, s.signature_image, s.signature_style, s.is_default,
  s.status, s.legacy_employee_id, s.created_at, s.updated_at,
  (SELECT COUNT(*) FROM signature_usage_log l WHERE l.signature_id = s.id) AS usage_count,
  (SELECT MAX(l.used_at) FROM signature_usage_log l WHERE l.signature_id = s.id) AS last_used_at`;

/**
 * Pulls in any legacy directory row that belongs to the caller but has never been owned: rows the signing flow
 * created by email (upsertEmployeeSignature) show up in the owner's own list the next time they open the page.
 */
async function reconcileOwnership(user) {
  const email = callerEmail(user);
  if (!email) return;
  await migrateLegacyDirectory(email);
  const id = parseInt(user?.id, 10) || 0;
  if (!id) return;
  try {
    await db.query(
      'UPDATE user_signatures SET owner_user_id = ? WHERE owner_user_id IS NULL AND LOWER(owner_email) = ?',
      [id, email]
    );
  } catch (err) {
    console.warn('[SignatureStore] ownership not reconciled:', err.message);
  }
}

/** Every signature the caller owns, newest default first. */
async function listOwnSignatures(user) {
  await ensureSignatureSchema();
  await reconcileOwnership(user);
  const id = parseInt(user?.id, 10) || 0;
  const email = callerEmail(user);
  const [rows] = await db.query(
    // COALESCE, not a bare comparison: a row whose owner_user_id is still NULL must compare false, not NULL,
    // or three-valued logic drops it from both this list and the directory
    `SELECT ${LIST_COLUMNS} FROM user_signatures s
      WHERE (? > 0 AND COALESCE(s.owner_user_id, 0) = ?) OR LOWER(s.owner_email) = ?
      ORDER BY s.is_default DESC, s.updated_at DESC, s.id DESC`,
    [id, id, email]
  );
  return rows.map((row) => presentable(row, { canEdit: true }));
}

/** Everyone else's signatures: enough to render the card, never enough to change one. */
async function listDirectorySignatures(user) {
  await ensureSignatureSchema();
  const id = parseInt(user?.id, 10) || 0;
  const email = callerEmail(user);
  const [rows] = await db.query(
    `SELECT ${LIST_COLUMNS} FROM user_signatures s
      WHERE NOT ((? > 0 AND COALESCE(s.owner_user_id, 0) = ?) OR LOWER(s.owner_email) = ?)
      ORDER BY s.display_name ASC, s.id ASC`,
    [id, id, email]
  );
  return rows.map((row) => presentable(row, { canEdit: false }));
}

async function findSignature(id) {
  await ensureSignatureSchema();
  const [rows] = await db.query(
    `SELECT ${LIST_COLUMNS} FROM user_signatures s WHERE s.id = ?`,
    [parseInt(id, 10) || 0]
  );
  return rows[0] || null;
}

/** Throws a 403-shaped error unless the row exists and belongs to the caller. */
async function requireOwnedSignature(user, id) {
  const row = await findSignature(id);
  if (!row) {
    const err = new Error('That signature no longer exists.');
    err.status = 404;
    throw err;
  }
  if (!ownsRow(user, row)) {
    const err = new Error(PROTECTED_ERROR);
    err.status = 403;
    throw err;
  }
  return row;
}

/** An employee code nobody else in the legacy directory is using. */
async function uniqueEmployeeCode(preferred, excludeLegacyId = null) {
  const base = String(preferred || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
    || `EMP${String(Math.floor(100 + Math.random() * 900))}`;
  let candidate = base;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const [rows] = await db.query(
        'SELECT id FROM employee_signatures WHERE employee_id = ? AND (? IS NULL OR id <> ?) LIMIT 1',
        [candidate, excludeLegacyId, excludeLegacyId]
      );
      if (rows.length === 0) return candidate;
    } catch (err) {
      return candidate;
    }
    candidate = `${base}-${Math.floor(10 + Math.random() * 90)}`;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Keeps employee_signatures (what the signing flow reads by email) in step with the owned store.
 * The email's default signature is the one mirrored; when the owner has none left, the legacy row goes too.
 */
async function syncLegacyForEmail(email) {
  const clean = String(email || '').trim();
  if (!clean) return;
  try {
    const [rows] = await db.query(
      `SELECT * FROM user_signatures WHERE LOWER(owner_email) = LOWER(?)
        ORDER BY is_default DESC, updated_at DESC, id DESC LIMIT 1`,
      [clean]
    );
    const primary = rows[0] || null;
    const [legacyRows] = await db.query(
      'SELECT * FROM employee_signatures WHERE LOWER(employee_email) = LOWER(?) ORDER BY id ASC LIMIT 1',
      [clean]
    );
    const legacy = legacyRows[0] || null;

    if (!primary) {
      if (legacy) await db.query('DELETE FROM employee_signatures WHERE id = ?', [legacy.id]);
      return;
    }

    if (legacy) {
      // Plain assignment, not COALESCE: clearing the image here is the whole point of the Type tab
      await db.query(
        `UPDATE employee_signatures
            SET employee_name = ?, designation = ?, department = ?, initials = ?,
                signature_image = ?, signature_style = ?, status = ?, updated_at = NOW()
          WHERE id = ?`,
        [
          primary.display_name,
          primary.designation || 'Specialist',
          primary.department || 'Operations',
          primary.initials || initialsOf(primary.display_name),
          primary.signature_image || null,
          primary.signature_style || DEFAULT_STYLE,
          normalizeStatus(primary.status),
          legacy.id
        ]
      );
      if (!primary.legacy_employee_id) {
        await db.query(
          'UPDATE user_signatures SET legacy_employee_id = ? WHERE id = ? AND legacy_employee_id IS NULL',
          [legacy.id, primary.id]
        );
      }
      return;
    }

    const code = await uniqueEmployeeCode(primary.employee_code || `EMP${String(Math.floor(100 + Math.random() * 900))}`);
    const [result] = await db.query(
      `INSERT INTO employee_signatures
         (employee_id, employee_name, employee_email, designation, department, initials, signature_id,
          signature_image, signature_style, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        primary.display_name,
        clean,
        primary.designation || 'Specialist',
        primary.department || 'Operations',
        primary.initials || initialsOf(primary.display_name),
        primary.signature_id,
        primary.signature_image || null,
        primary.signature_style || DEFAULT_STYLE,
        normalizeStatus(primary.status)
      ]
    );
    await db.query(
      'UPDATE user_signatures SET legacy_employee_id = ? WHERE id = ? AND legacy_employee_id IS NULL',
      [result.insertId, primary.id]
    );
  } catch (err) {
    console.warn('[SignatureStore] legacy directory not synced:', err.message);
  }
}

/** Only one signature per owner carries the default flag. */
async function clearOtherDefaults(email, keepId) {
  await db.query(
    'UPDATE user_signatures SET is_default = 0 WHERE LOWER(owner_email) = LOWER(?) AND id <> ?',
    [String(email || '').trim(), parseInt(keepId, 10) || 0]
  );
}

/**
 * Reads a field the caller may legitimately want to clear. Missing from the body means "leave it alone";
 * null or an empty string means "set it to NULL". This is what makes the Type tab able to drop a stored image.
 */
function optionalField(body, ...names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(body, name)) {
      const value = body[name];
      if (value === null || value === undefined || value === '') return null;
      return value;
    }
  }
  return KEEP;
}

/** Creates a signature owned by the caller. */
async function createSignature(user, body = {}) {
  await ensureSignatureSchema();
  const email = callerEmail(user);
  if (!email) {
    const err = new Error('Your account has no email address, so a signature cannot be saved.');
    err.status = 400;
    throw err;
  }

  const method = normalizeMethod(body.method, body.signature_image || body.signatureImage ? 'upload' : 'type');
  const rawImage = optionalField(body, 'signature_image', 'signatureImage');
  // A typed signature is the font style alone: it must not carry an image, or the image wins when rendering
  const image = method === 'type' || rawImage === KEEP || rawImage === null ? null : String(rawImage);
  if (image && !isUsableSignature(image)) {
    const err = new Error('The signature is empty. Draw, type or upload a signature before saving.');
    err.status = 400;
    throw err;
  }
  if (method !== 'type' && !image) {
    const err = new Error('The signature is empty. Draw or upload a signature, or use the Type tab.');
    err.status = 400;
    throw err;
  }

  const displayName = String(body.display_name || body.employee_name || callerName(user)).trim().slice(0, 150)
    || callerName(user);
  const employeeCode = String(body.employee_code || body.employee_id || '').trim().slice(0, 50)
    || `EMP${String(Math.floor(100 + Math.random() * 900))}`;
  const [existing] = await db.query(
    'SELECT COUNT(*) AS total FROM user_signatures WHERE LOWER(owner_email) = ?',
    [email]
  );
  const isFirst = Number(existing[0]?.total || 0) === 0;
  const makeDefault = isFirst || body.is_default === true || body.is_default === 1;

  const [result] = await db.query(
    `INSERT INTO user_signatures
       (owner_user_id, owner_email, display_name, employee_code, designation, department, initials,
        signature_id, method, signature_image, signature_style, is_default, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parseInt(user?.id, 10) || null,
      email,
      displayName,
      employeeCode,
      String(body.designation || '').trim().slice(0, 100) || 'Specialist',
      String(body.department || '').trim().slice(0, 100) || 'Operations',
      initialsOf(displayName),
      generateSignatureId(employeeCode, displayName),
      method,
      image,
      String(body.signature_style || body.signatureStyle || DEFAULT_STYLE).slice(0, 50),
      makeDefault ? 1 : 0,
      normalizeStatus(body.status)
    ]
  );
  if (makeDefault) await clearOtherDefaults(email, result.insertId);
  await syncLegacyForEmail(email);
  const row = await findSignature(result.insertId);
  return presentable(row, { canEdit: true });
}

/** Updates one of the caller's own signatures. Fields left out of the body keep their stored value. */
async function updateSignature(user, id, body = {}) {
  const current = await requireOwnedSignature(user, id);

  const rawImage = optionalField(body, 'signature_image', 'signatureImage');
  const method = Object.prototype.hasOwnProperty.call(body, 'method')
    ? normalizeMethod(body.method, current.method)
    : current.method;

  let image;
  if (method === 'type') {
    // The typed style is what renders, so any stored image is dropped: this is the "changed signature does not
    // show up" bug at its root, where a null used to mean "keep the old image"
    image = null;
  } else if (rawImage === KEEP) {
    image = current.signature_image;
  } else if (rawImage === null) {
    image = null;
  } else {
    image = String(rawImage);
  }

  if (image && !isUsableSignature(image)) {
    const err = new Error('The signature is empty. Draw, type or upload a signature before saving.');
    err.status = 400;
    throw err;
  }
  if (method !== 'type' && !image) {
    const err = new Error('The signature is empty. Draw or upload a signature, or use the Type tab.');
    err.status = 400;
    throw err;
  }

  const displayName = String(body.display_name || body.employee_name || current.display_name).trim().slice(0, 150)
    || current.display_name;
  const employeeCode = String(body.employee_code || body.employee_id || current.employee_code || '').trim().slice(0, 50);

  await db.query(
    `UPDATE user_signatures
        SET display_name = ?, employee_code = ?, designation = ?, department = ?, initials = ?,
            method = ?, signature_image = ?, signature_style = ?, status = ?, updated_at = NOW()
      WHERE id = ?`,
    [
      displayName,
      employeeCode || null,
      String(body.designation ?? current.designation ?? '').trim().slice(0, 100) || 'Specialist',
      String(body.department ?? current.department ?? '').trim().slice(0, 100) || 'Operations',
      initialsOf(displayName),
      method,
      image,
      String(body.signature_style || body.signatureStyle || current.signature_style || DEFAULT_STYLE).slice(0, 50),
      normalizeStatus(body.status, current.status),
      current.id
    ]
  );

  if (body.is_default === true || body.is_default === 1) {
    await db.query('UPDATE user_signatures SET is_default = 1 WHERE id = ?', [current.id]);
    await clearOtherDefaults(current.owner_email, current.id);
  }
  await syncLegacyForEmail(current.owner_email);
  const row = await findSignature(current.id);
  return presentable(row, { canEdit: true });
}

/** Deletes one of the caller's own signatures and keeps the legacy directory in step. */
async function deleteSignature(user, id) {
  const current = await requireOwnedSignature(user, id);
  // Kept in the trash so it can be restored
  await require('./trashStore').trashSignature(current, user);
  await db.query('DELETE FROM user_signatures WHERE id = ?', [current.id]);
  if (current.legacy_employee_id) {
    await db.query('DELETE FROM employee_signatures WHERE id = ?', [current.legacy_employee_id]);
  }
  if (current.is_default) {
    // Promote the next one so the owner always has a default to prefill with
    await db.query(
      `UPDATE user_signatures SET is_default = 1
        WHERE LOWER(owner_email) = LOWER(?) ORDER BY updated_at DESC, id DESC LIMIT 1`,
      [current.owner_email]
    );
  }
  await syncLegacyForEmail(current.owner_email);
  return { id: current.id, signature_id: current.signature_id };
}

/** Marks one of the caller's own signatures as the one used to prefill signing. */
async function setDefaultSignature(user, id) {
  const current = await requireOwnedSignature(user, id);
  await db.query('UPDATE user_signatures SET is_default = 1, updated_at = NOW() WHERE id = ?', [current.id]);
  await clearOtherDefaults(current.owner_email, current.id);
  await syncLegacyForEmail(current.owner_email);
  const row = await findSignature(current.id);
  return presentable(row, { canEdit: true });
}

/**
 * Records that a signature was used on a document. Never throws: a failure here must not stop someone signing.
 * The signature is resolved from the owner's email, preferring the row whose image (or style) actually matches.
 */
async function recordSignatureUsage({
  ownerEmail,
  signatureImage = null,
  signatureStyle = null,
  documentId = null,
  documentName = null,
  context = 'manual',
  recipientId = null,
  signerName = null,
  signerEmail = null,
  fieldCount = null,
  ip = null
} = {}) {
  const email = String(ownerEmail || signerEmail || '').trim();
  if (!email) return null;
  try {
    await ensureSignatureSchema();
    const [rows] = await db.query(
      `SELECT id, signature_image, signature_style, is_default FROM user_signatures
        WHERE LOWER(owner_email) = LOWER(?) ORDER BY is_default DESC, updated_at DESC, id DESC`,
      [email]
    );
    let match = null;
    if (signatureImage) match = rows.find((r) => r.signature_image && r.signature_image === signatureImage) || null;
    if (!match && signatureStyle) match = rows.find((r) => !r.signature_image && r.signature_style === signatureStyle) || null;
    if (!match) match = rows[0] || null;

    let name = documentName;
    if (!name && documentId) {
      try {
        const [docs] = await db.query('SELECT document_name FROM documents WHERE id = ?', [parseInt(documentId, 10) || 0]);
        name = docs[0]?.document_name || null;
      } catch (err) {
        name = null;
      }
    }

    const [result] = await db.query(
      `INSERT INTO signature_usage_log
         (signature_id, owner_email, document_id, document_name, context, recipient_id, signer_name,
          signer_email, field_count, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        match?.id || null,
        email.slice(0, 255),
        parseInt(documentId, 10) || null,
        name ? String(name).slice(0, 255) : null,
        USAGE_CONTEXTS.includes(context) ? context : 'manual',
        parseInt(recipientId, 10) || null,
        signerName ? String(signerName).slice(0, 150) : null,
        (signerEmail || email) ? String(signerEmail || email).slice(0, 255) : null,
        Number.isFinite(Number(fieldCount)) ? Number(fieldCount) : null,
        ip ? String(ip).slice(0, 64) : null
      ]
    );
    return result.insertId;
  } catch (err) {
    console.warn('[SignatureStore] usage not recorded:', err.message);
    return null;
  }
}

/** Where one signature has been used, newest first, with the document it was used on. */
async function getSignatureHistory(signatureId, { limit = 100 } = {}) {
  const id = parseInt(signatureId, 10) || 0;
  if (!id) return [];
  await ensureSignatureSchema();
  try {
    const [rows] = await db.query(
      `SELECT l.id, l.document_id, COALESCE(d.document_name, l.document_name) AS document_name,
              d.status AS document_status, d.completed_at, l.context, l.recipient_id, l.signer_name,
              l.signer_email, l.field_count, l.ip_address, l.used_at
         FROM signature_usage_log l
         LEFT JOIN documents d ON d.id = l.document_id
        WHERE l.signature_id = ?
        ORDER BY l.used_at DESC, l.id DESC
        LIMIT ${Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500)}`,
      [id]
    );
    return rows;
  } catch (err) {
    console.warn('[SignatureStore] history not read:', err.message);
    return [];
  }
}

/** "Used in N documents, last used ..." for the history drawer header. */
function summarizeHistory(rows = []) {
  const documents = new Set();
  rows.forEach((row) => { if (row.document_id) documents.add(row.document_id); });
  return {
    total: rows.length,
    documents: documents.size,
    lastUsedAt: rows[0]?.used_at || null,
    firstUsedAt: rows.length ? rows[rows.length - 1].used_at : null
  };
}

module.exports = {
  SIGNATURE_METHODS,
  USAGE_CONTEXTS,
  PROTECTED_ERROR,
  ensureSignatureSchema,
  ownsRow,
  listOwnSignatures,
  listDirectorySignatures,
  findSignature,
  requireOwnedSignature,
  createSignature,
  updateSignature,
  deleteSignature,
  setDefaultSignature,
  recordSignatureUsage,
  getSignatureHistory,
  summarizeHistory,
  syncLegacyForEmail
};
