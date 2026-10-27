/**
 * Document archive (server/utils/documentArchive.js) - doc/35-document-archive.md
 *
 * The safety net under "delete for good". Emptying the trash removes the rows, children go with
 * them by cascade, and the files used to stay in storage with nothing left to say what they were.
 * Deleting the right thing by mistake was therefore final in practice, and the stored bytes turned
 * into litter nobody could identify.
 *
 * So before the rows go, every file is copied to `archive/<year>/<month>/<type>-<id>/` in the doc
 * bucket and one row is written describing what was deleted. The row is self-describing on purpose
 * - handing the thing back needs nothing but the archive.
 *
 * Three kinds are covered, and they are deleted in two different ways:
 *
 *   document    a signature request. Its rows are still there when it is deleted for good, so they
 *               are read: the BexSign id, the recipients, the text of each document.
 *   self_sign   a document you signed on your own, and
 *   template    a template. Both are *snapshot* types: the trash already holds their rows as JSON
 *               (see trashStore) and the tables no longer do, so the snapshot is what gets archived
 *               - rows and all, which is why a restore can offer to put them back.
 *
 * Nothing in the app reads any of this. It is reached with `node scripts/document-archive.js` on
 * the server, so recovering a deleted document takes server access and leaves a trail, rather than
 * being a button somebody can be talked into pressing.
 *
 * Archiving never blocks a delete: if the copy fails, the reason is recorded and the delete goes
 * ahead, because a user who asked for something to be gone should not be stuck behind storage.
 */

const crypto = require('crypto');
const db = require('../db');
const bucket = require('./docBucket');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

let schemaPromise = null;

/** Creates document_archive when it is missing, so a server that has not run the migration still archives. */
function ensureArchiveSchema() {
  if (!schemaPromise) {
    schemaPromise = db.query(`
      CREATE TABLE IF NOT EXISTS document_archive (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        item_type varchar(20) NOT NULL DEFAULT 'document',
        item_id int(11) NOT NULL,
        bexsign_doc_id varchar(120) DEFAULT NULL,
        document_name varchar(255) DEFAULT NULL,
        owner_id int(11) DEFAULT NULL,
        owner_email varchar(190) DEFAULT NULL,
        status_before varchar(40) DEFAULT NULL,
        recipient_emails text DEFAULT NULL,
        file_count int(11) NOT NULL DEFAULT 0,
        total_bytes bigint(20) NOT NULL DEFAULT 0,
        archive_prefix varchar(400) DEFAULT NULL,
        manifest longtext DEFAULT NULL,
        storage_provider varchar(20) NOT NULL DEFAULT 'local',
        deleted_by_id int(11) DEFAULT NULL,
        deleted_by varchar(190) DEFAULT NULL,
        deleted_reason varchar(190) DEFAULT NULL,
        deleted_at datetime NOT NULL DEFAULT current_timestamp(),
        restored_at datetime DEFAULT NULL,
        restored_by varchar(190) DEFAULT NULL,
        error_text varchar(500) DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (id),
        KEY idx_document_archive_item (item_type, item_id),
        KEY idx_document_archive_deleted_at (deleted_at),
        KEY idx_document_archive_owner (owner_id),
        KEY idx_document_archive_bexsign (bexsign_doc_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `)
      // A table created before self-sign documents and templates were covered: bring it up to date
      .then(() => db.query("ALTER TABLE document_archive ADD COLUMN item_type varchar(20) NOT NULL DEFAULT 'document' AFTER id").catch(() => {}))
      .then(() => db.query('ALTER TABLE document_archive CHANGE COLUMN document_id item_id int(11) NOT NULL').catch(() => {}))
      .catch((err) => {
        schemaPromise = null;
        throw err;
      });
  }
  return schemaPromise;
}

/** Columns that hold the path of a stored file, by table - used to find the files inside a snapshot. */
const PATH_COLUMNS = {
  documents: ['file_path'],
  document_files: ['file_path', 'signed_file_path'],
  document_versions: ['file_path'],
  document_recipients: ['physical_copy_path'],
  self_sign_documents: ['signed_file_path'],
  templates: ['file_path']
};

/** Every stored file that belongs to this document: the uploads, the signed copies, the certificate. */
async function filesOf(documentId) {
  const found = [];
  // `speculative` marks a file BexSign writes to a fixed place rather than records in a column: it is
  // looked for, and its absence is normal (a draft has no certificate), so it is never a problem.
  const add = (kind, name, filePath, speculative = false) => {
    const path = String(filePath || '').trim();
    if (!path || /\/sample\.pdf$/i.test(path)) return;
    const key = bucket.keyFromPath(path);
    if (!key || found.some((f) => f.key === key)) return;
    found.push({ kind, name: name || key.split('/').pop(), originalPath: path, key, speculative });
  };

  const [[doc]] = await db.query('SELECT file_path, document_name FROM documents WHERE id = ?', [documentId]);
  if (doc) add('document', doc.document_name, doc.file_path);

  const [files] = await db.query(
    'SELECT file_name, file_path, signed_file_path FROM document_files WHERE document_id = ? ORDER BY sort_order, id',
    [documentId]
  );
  for (const file of files) {
    add('document', file.file_name, file.file_path);
    add('signed', file.file_name ? `Signed - ${file.file_name}` : null, file.signed_file_path);
  }

  // The certificate of completion is written to a fixed place rather than recorded in a column, and only
  // exists once the request completed - so it is looked for, not expected
  add('certificate', 'Certificate of Completion.pdf', `/uploads/${bucket.keyFor('completed', String(documentId), 'certificate-of-completion.pdf')}`, true);

  const [recipients] = await db.query(
    'SELECT physical_copy_path, name, email FROM document_recipients WHERE document_id = ?',
    [documentId]
  );
  for (const r of recipients) add('physical-copy', r.name ? `Paper copy - ${r.name}` : null, r.physical_copy_path);

  const [versions] = await db.query('SELECT file_path FROM document_versions WHERE document_id = ?', [documentId])
    .catch(() => [[]]);
  for (const v of versions) add('version', null, v.file_path);

  return found;
}

/** What the document was, in the words the archive keeps: used for the manifest and the listing. */
async function describe(documentId) {
  const [[doc]] = await db.query(
    `SELECT d.*, u.email AS owner_email
       FROM documents d LEFT JOIN users u ON u.id = d.user_id
      WHERE d.id = ?`,
    [documentId]
  );
  if (!doc) return null;

  const [[identifier]] = await db.query(
    'SELECT bexsign_doc_id FROM document_identifiers WHERE document_id = ? LIMIT 1',
    [documentId]
  ).catch(() => [[]]);

  const [recipients] = await db.query(
    'SELECT name, email, role, status, signed_at FROM document_recipients WHERE document_id = ? ORDER BY id',
    [documentId]
  );

  const [files] = await db.query(
    'SELECT file_name, file_path, signed_file_path, file_type, file_size, document_text FROM document_files WHERE document_id = ? ORDER BY sort_order, id',
    [documentId]
  );

  return { doc, bexsignDocId: identifier?.bexsign_doc_id || null, recipients, files };
}

/**
 * Copies a document's files into the archive and records what it was. Call it immediately BEFORE the
 * rows are deleted - it reads them.
 *
 * Returns { archived: true, id, files, bytes } or { archived: false, reason }. It never throws: a
 * delete the user asked for is not held up by a storage problem.
 */
async function archiveDocument(documentId, { reason = 'deleted', user = null } = {}) {
  const id = parseInt(documentId, 10);
  if (!id) return { archived: false, reason: 'no document id' };

  try {
    await ensureArchiveSchema();
    const described = await describe(id);
    if (!described) return { archived: false, reason: 'the document row is already gone' };

    const { doc, bexsignDocId, recipients, files } = described;
    const when = doc.created_at ? new Date(doc.created_at) : new Date();
    const prefix = bucket.keyFor('archive', String(when.getFullYear()), String(when.getMonth() + 1).padStart(2, '0'), String(id));

    // Flattened into one folder per document; the manifest keeps the path each file came from
    const stored = await filesOf(id);
    const { archivedFiles, problems, totalBytes } = await copyIntoArchive(stored, prefix);

    const manifest = {
      itemType: 'document',
      documentId: id,
      bexsignDocId,
      documentName: doc.document_name,
      status: doc.status,
      documentType: doc.document_type || null,
      folder: doc.folder_name || null,
      createdAt: doc.created_at,
      sentAt: doc.sent_at,
      completedAt: doc.completed_at,
      owner: { id: doc.user_id, email: doc.owner_email || null },
      customMessage: doc.custom_message || null,
      recipients: recipients.map((r) => ({ name: r.name, email: r.email, role: r.role, status: r.status, signedAt: r.signed_at })),
      // The text is kept as well: a document written in the app has no uploaded file to archive
      documents: files.map((f) => ({ name: f.file_name, type: f.file_type, sizeKb: f.file_size, text: f.document_text || '' })),
      files: archivedFiles,
      problems
    };

    const archiveId = await writeArchiveRow({
      itemType: 'document', itemId: id, bexsignDocId,
      name: doc.document_name, ownerId: doc.user_id, ownerEmail: doc.owner_email || null,
      statusBefore: doc.status,
      recipientEmails: recipients.map((r) => r.email).filter(Boolean).join(', ') || null,
      fileCount: archivedFiles.length, totalBytes, prefix, manifest,
      user, reason, problems
    });

    console.log(`[Archive] Document ${id} "${doc.document_name}" archived as #${archiveId}`
      + ` (${archivedFiles.length} file(s), ${totalBytes} bytes)${problems.length ? ` - ${problems.length} problem(s)` : ''}`);
    return { archived: true, id: archiveId, files: archivedFiles.length, bytes: totalBytes, problems };
  } catch (err) {
    // A delete is never blocked by the archive failing; the reason is logged so it can be looked into
    console.warn(`[Archive] Document ${id} could not be archived: ${err.message}`);
    return { archived: false, reason: err.message };
  }
}

/**
 * Copies a list of files into the archive and returns what was stored. Shared by all three kinds,
 * so a document, a self-sign document and a template are archived and checked the same way.
 */
async function copyIntoArchive(files, prefix) {
  const archivedFiles = [];
  const problems = [];
  let totalBytes = 0;
  for (const file of files) {
    try {
      const buffer = await bucket.readByPath(file.originalPath);
      if (!buffer) {
        // A file a column pointed at and that is not there is worth recording; one that was merely
        // looked for (the certificate of an unfinished request) is not
        if (!file.speculative) problems.push(`${file.key}: not in storage`);
        continue;
      }
      const archiveKey = `${prefix}/${file.kind}-${file.key.split('/').pop()}`;
      await bucket.put(archiveKey, buffer, { contentType: bucket.contentTypeFor(file.key) });
      archivedFiles.push({
        kind: file.kind,
        name: file.name,
        originalPath: file.originalPath,
        archiveKey,
        bytes: buffer.length,
        sha256: sha256(buffer)
      });
      totalBytes += buffer.length;
    } catch (err) {
      problems.push(`${file.key}: ${err.message}`);
    }
  }
  return { archivedFiles, problems, totalBytes };
}

/** Writes the archive row. Shared by every kind so they are all listed and read back the same way. */
async function writeArchiveRow(fields) {
  const [result] = await db.query(
    `INSERT INTO document_archive
       (item_type, item_id, bexsign_doc_id, document_name, owner_id, owner_email, status_before, recipient_emails,
        file_count, total_bytes, archive_prefix, manifest, storage_provider,
        deleted_by_id, deleted_by, deleted_reason, deleted_at, error_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      fields.itemType, fields.itemId, fields.bexsignDocId || null, fields.name || null,
      fields.ownerId || null, fields.ownerEmail || null, fields.statusBefore || null,
      fields.recipientEmails || null, fields.fileCount, fields.totalBytes,
      fields.prefix, JSON.stringify(fields.manifest), bucket.provider(),
      fields.user?.id || null, fields.user?.email || null, fields.reason,
      fields.problems.length ? fields.problems.join('; ').slice(0, 500) : null
    ]
  );
  return result.insertId;
}

const LABELS = { document: 'Document', self_sign: 'Self-sign document', template: 'Template' };

/**
 * Archives a self-sign document or a template from the snapshot the trash is holding.
 *
 * These two never reach "delete for good" with rows in their own tables: trashing them moved the
 * rows into `trash_items.snapshot` as JSON and removed them. So the snapshot is the thing being
 * deleted, and it is archived whole - which is why a restore can offer to put the rows back, not
 * just hand over the files.
 */
async function archiveSnapshotItem(item, { reason = 'deleted', user = null } = {}) {
  const itemType = item.item_type;
  const itemId = parseInt(item.item_id, 10);
  try {
    await ensureArchiveSchema();
    const snapshot = typeof item.snapshot === 'string' ? JSON.parse(item.snapshot) : (item.snapshot || []);
    const tables = Array.isArray(snapshot) ? snapshot : [];

    // Every stored file the snapshot's rows point at
    const files = [];
    const seen = new Set();
    for (const entry of tables) {
      const columns = PATH_COLUMNS[entry?.table];
      if (!columns) continue;
      for (const row of entry.rows || []) {
        for (const column of columns) {
          const path = String(row?.[column] || '').trim();
          if (!path || /\/sample\.pdf$/i.test(path)) continue;
          const key = bucket.keyFromPath(path);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const kind = column.startsWith('signed') ? 'signed' : (entry.table === 'templates' ? 'template' : 'document');
          files.push({ kind, name: row.file_name || row.title || row.document_name || key.split('/').pop(), originalPath: path, key });
        }
      }
    }

    const when = item.deleted_at ? new Date(item.deleted_at) : new Date();
    const prefix = bucket.keyFor('archive', String(when.getFullYear()), String(when.getMonth() + 1).padStart(2, '0'), `${itemType}-${itemId}`);
    const { archivedFiles, problems, totalBytes } = await copyIntoArchive(files, prefix);

    const manifest = {
      itemType,
      itemId,
      title: item.title,
      subtitle: item.subtitle || null,
      ownerId: item.owner_id || null,
      previousStatus: item.previous_status || null,
      deletedAt: item.deleted_at,
      files: archivedFiles,
      // The rows themselves, exactly as the trash held them: this is what makes a put-back possible
      snapshot: tables,
      problems
    };

    // The trash records the owner by id; the archive is read long after, when a name is more use than a number
    const [[owner]] = item.owner_id
      ? await db.query('SELECT email FROM users WHERE id = ?', [item.owner_id]).catch(() => [[]])
      : [[]];

    const id = await writeArchiveRow({
      itemType, itemId, name: item.title, ownerId: item.owner_id, ownerEmail: owner?.email || null,
      statusBefore: item.previous_status || null,
      fileCount: archivedFiles.length, totalBytes, prefix, manifest,
      user, reason, problems
    });

    console.log(`[Archive] ${LABELS[itemType] || itemType} ${itemId} "${item.title}" archived as #${id}`
      + ` (${archivedFiles.length} file(s), ${totalBytes} bytes, ${tables.length} table(s) of rows)`
      + `${problems.length ? ` - ${problems.length} problem(s)` : ''}`);
    return { archived: true, id, files: archivedFiles.length, bytes: totalBytes, problems };
  } catch (err) {
    console.warn(`[Archive] ${itemType} ${itemId} could not be archived: ${err.message}`);
    return { archived: false, reason: err.message };
  }
}

/**
 * Archives whatever a trash row stands for, before it is deleted for good. The one entry point the
 * trash calls: it knows which kinds are archived and which are not.
 */
async function archiveTrashItem(item, options = {}) {
  if (!item) return { archived: false, reason: 'no item' };
  if (item.item_type === 'document') return archiveDocument(item.item_id, options);
  if (item.item_type === 'self_sign' || item.item_type === 'template') return archiveSnapshotItem(item, options);
  // Signatures and contacts carry no stored file and are small enough to retype; they are not archived
  return { archived: false, reason: `${item.item_type} is not archived` };
}

const parseManifest = (row) => {
  try {
    return row.manifest ? JSON.parse(row.manifest) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Archived things, newest first. `search` matches the name, the BexSign id, the owner, a recipient
 * or the id it had; `type` narrows to 'document', 'self_sign' or 'template'.
 */
async function listArchive({ search = '', type = '', limit = 50, offset = 0 } = {}) {
  await ensureArchiveSchema();
  const where = [];
  const params = [];
  if (search) {
    const like = `%${search}%`;
    where.push('(document_name LIKE ? OR bexsign_doc_id LIKE ? OR owner_email LIKE ? OR recipient_emails LIKE ? OR item_id = ?)');
    params.push(like, like, like, like, parseInt(search, 10) || 0);
  }
  if (type) {
    where.push('item_type = ?');
    params.push(type);
  }
  const [rows] = await db.query(
    `SELECT id, item_type, item_id, bexsign_doc_id, document_name, owner_email, status_before, recipient_emails,
            file_count, total_bytes, archive_prefix, storage_provider, deleted_by, deleted_reason,
            deleted_at, restored_at, error_text
       FROM document_archive
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY deleted_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return rows;
}

/**
 * One archived thing with its manifest, by archive id - or by the id it used to have, as
 * `document:140`, `self_sign:12` or `template:7`.
 */
async function getArchive(reference) {
  await ensureArchiveSchema();
  const text = String(reference || '').trim();
  const byOriginal = /^(document|self_sign|template):(\d+)$/i.exec(text);
  const [rows] = byOriginal
    ? await db.query(
      'SELECT * FROM document_archive WHERE item_type = ? AND item_id = ? ORDER BY id DESC LIMIT 1',
      [byOriginal[1].toLowerCase(), Number(byOriginal[2])]
    )
    : await db.query('SELECT * FROM document_archive WHERE id = ?', [parseInt(text, 10) || 0]);
  const row = rows[0];
  if (!row) return null;
  return { ...row, manifest: parseManifest(row) };
}

/**
 * The bytes of one archived file, checked against the SHA-256 recorded when it was archived.
 * Returns { name, buffer, sha256, matches } or null.
 */
async function readArchivedFile(entry) {
  const buffer = await bucket.readByPath(`/uploads/${entry.archiveKey}`);
  if (!buffer) return null;
  const digest = sha256(buffer);
  return { name: entry.name, buffer, sha256: digest, matches: digest === entry.sha256 };
}

/** Notes that an archived document was handed back, and by whom. */
async function recordRestore(archiveId, by = '') {
  await db.query('UPDATE document_archive SET restored_at = NOW(), restored_by = ? WHERE id = ?', [by || null, archiveId]);
}

module.exports = {
  ensureArchiveSchema,
  archiveDocument,
  archiveSnapshotItem,
  archiveTrashItem,
  listArchive,
  getArchive,
  readArchivedFile,
  recordRestore
};
