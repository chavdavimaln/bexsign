/**
 * Trash bin (server/utils/trashStore.js). Everything deleted on the site goes through here and is listed in
 * trash_items until it is restored, deleted for good, or removed automatically after the retention period.
 *
 *   document   request documents: kept in `documents` with status "Trashed"; restore puts back the status it had
 *   self_sign  self-sign documents: their rows (document, files, fields, events...) are kept in `snapshot`
 *   template   templates with their fields and roles, kept in `snapshot`
 *   signature  saved signatures, kept in `snapshot`
 *   contact    contacts: kept in `signing_contacts` with deleted_at set
 *
 * A snapshot is [{ table, rows }] in insert order (parent first). Dates and binary values are tagged so they come
 * back with their type, and only columns that still exist are written back.
 */
const db = require('../db');

const TYPES = {
  document: { label: 'Document', plural: 'Documents' },
  self_sign: { label: 'Self-sign document', plural: 'Self-sign' },
  template: { label: 'Template', plural: 'Templates' },
  signature: { label: 'Signature', plural: 'Signatures' },
  contact: { label: 'Contact', plural: 'Contacts' }
};
const TYPE_KEYS = Object.keys(TYPES);
const DEFAULT_RETENTION_DAYS = 30;

const userLabel = (u) => (u ? (`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || null) : null);

/* ---------------------------------------------------------------- snapshots */

function serialize(value) {
  return JSON.stringify(value, function replacer(key, v) {
    const raw = this[key];
    if (raw instanceof Date) return { $date: Number.isNaN(raw.getTime()) ? null : raw.toISOString() };
    if (Buffer.isBuffer(raw)) return { $buffer: raw.toString('base64') };
    return v;
  });
}

function deserialize(text) {
  if (!text) return [];
  return JSON.parse(text, (key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (Object.prototype.hasOwnProperty.call(v, '$date')) return v.$date ? new Date(v.$date) : null;
      if (Object.prototype.hasOwnProperty.call(v, '$buffer')) return Buffer.from(v.$buffer, 'base64');
    }
    return v;
  });
}

async function tableExists(table) {
  const [rows] = await db.query('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
  return rows.length > 0;
}

async function tableColumns(table) {
  const [rows] = await db.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

/** Tables whose rows are removed with a row of `parent` (ON DELETE CASCADE): [{ table, column }] */
async function cascadeChildren(parent) {
  const [rows] = await db.query(
    `SELECT k.TABLE_NAME AS tableName, k.COLUMN_NAME AS columnName
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME = ? AND rc.DELETE_RULE = 'CASCADE'`,
    [parent]
  );
  return rows.map((r) => ({ table: r.tableName, column: r.columnName }));
}

/** Reads the rows of each { table, column, value } (missing tables or columns are skipped). */
async function snapshotRows(specs) {
  const out = [];
  for (const { table, column, value } of specs) {
    if (!(await tableExists(table)) || !(await tableColumns(table)).has(column)) continue;
    const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE \`${column}\` = ?`, [value]);
    if (rows.length) out.push({ table, rows });
  }
  return out;
}

/** Writes a snapshot back, parent tables first. Rows that already exist again are skipped. */
async function restoreSnapshot(snapshot, { transform } = {}) {
  let written = 0;
  for (const { table, rows } of snapshot) {
    if (!(await tableExists(table))) continue;
    const columns = await tableColumns(table);
    for (const original of rows) {
      const row = transform ? transform(table, { ...original }) : original;
      const keys = Object.keys(row).filter((k) => columns.has(k));
      if (!keys.length) continue;
      await db.query(
        `INSERT IGNORE INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        keys.map((k) => row[k])
      );
      written += 1;
    }
  }
  return written;
}

/** A document row and every row that depends on it, parent first. */
async function snapshotDocumentTree(documentId) {
  const children = await cascadeChildren('documents');
  const specs = [{ table: 'documents', column: 'id', value: documentId }];
  const seen = new Set(['documents']);
  // Rows the delete code removes by hand as well as the cascading ones
  [...children, { table: 'document_identifiers', column: 'document_id' }, { table: 'document_field_values', column: 'document_id' }]
    .forEach(({ table, column }) => {
      if (seen.has(`${table}.${column}`) || table === 'trash') return;
      seen.add(`${table}.${column}`);
      specs.push({ table, column, value: documentId });
    });
  return snapshotRows(specs);
}

/* ---------------------------------------------------------------- settings */

async function getRetentionDays() {
  try {
    const [rows] = await db.query('SELECT trash_retention_days FROM general_settings ORDER BY id ASC LIMIT 1');
    const days = parseInt(rows[0]?.trash_retention_days, 10);
    return days >= 1 ? days : DEFAULT_RETENTION_DAYS;
  } catch (e) {
    return DEFAULT_RETENTION_DAYS;
  }
}

async function setRetentionDays(days) {
  await db.query('UPDATE general_settings SET trash_retention_days = ?', [days]);
  // Items already in the trash follow the new period
  await db.query('UPDATE trash_items SET purge_after = DATE_ADD(deleted_at, INTERVAL ? DAY)', [days]);
}

/* ---------------------------------------------------------------- recording */

async function record({ type, itemId, title, subtitle = null, ownerId = null, user = null, previousStatus = null, snapshot = null, sizeHint = null }) {
  const days = await getRetentionDays();
  await db.query(
    `INSERT INTO trash_items (item_type, item_id, title, subtitle, owner_id, deleted_by, deleted_by_name, previous_status, snapshot, size_hint, deleted_at, purge_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))
     ON DUPLICATE KEY UPDATE title = VALUES(title), subtitle = VALUES(subtitle), owner_id = VALUES(owner_id), deleted_by = VALUES(deleted_by),
       deleted_by_name = VALUES(deleted_by_name), previous_status = VALUES(previous_status), snapshot = VALUES(snapshot),
       size_hint = VALUES(size_hint), deleted_at = NOW(), purge_after = VALUES(purge_after)`,
    [
      type, itemId, String(title || TYPES[type].label).slice(0, 255), subtitle ? String(subtitle).slice(0, 255) : null, ownerId,
      user?.id || null, userLabel(user), previousStatus, snapshot ? serialize(snapshot) : null, sizeHint, days
    ]
  );
}

/* ---------------------------------------------------------------- per type: move to trash */

/** Request documents: status "Trashed", the status they had is kept for restore. Returns the ids moved. */
async function trashDocuments(ids, user) {
  const clean = [...new Set((ids || []).map((v) => parseInt(v, 10)).filter(Boolean))];
  if (!clean.length) return [];
  const [docs] = await db.query(
    `SELECT d.id, d.document_name, d.status, d.user_id,
            (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = d.id) AS recipient_count
     FROM documents d WHERE d.id IN (?)`,
    [clean]
  );
  const moved = [];
  for (const doc of docs) {
    const status = String(doc.status || 'Draft');
    if (status.toLowerCase() !== 'trashed') {
      await record({
        type: 'document',
        itemId: doc.id,
        title: doc.document_name || `Document ${doc.id}`,
        subtitle: `Was ${status}`,
        ownerId: doc.user_id,
        user,
        previousStatus: status,
        sizeHint: `${doc.recipient_count} recipient${Number(doc.recipient_count) === 1 ? '' : 's'}`
      });
      await db.query("UPDATE documents SET status = 'Trashed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [doc.id]);
    }
    moved.push(doc.id);
  }
  return moved;
}

/** Self-sign document: its rows go into the snapshot, then they are removed as before. */
async function trashSelfSign(row, user) {
  const documentId = row.document_id;
  const tree = await snapshotDocumentTree(documentId);
  const own = await snapshotRows([
    { table: 'self_sign_documents', column: 'id', value: row.id },
    { table: 'self_sign_events', column: 'self_sign_id', value: row.id },
    { table: 'self_sign_shares', column: 'self_sign_id', value: row.id }
  ]);
  await record({
    type: 'self_sign',
    itemId: row.id,
    title: row.title || `Self-sign document ${row.id}`,
    subtitle: `Self-sign · ${row.stage || 'draft'}`,
    ownerId: row.user_id,
    user,
    previousStatus: row.stage || null,
    snapshot: [...tree, ...own],
    sizeHint: `${row.page_count || 1} page${Number(row.page_count) === 1 ? '' : 's'}`
  });
  for (const [table, column] of [['self_sign_events', 'self_sign_id'], ['self_sign_shares', 'self_sign_id']]) {
    try {
      await db.query(`DELETE FROM ${table} WHERE ${column} = ?`, [row.id]);
    } catch (e) {}
  }
  await db.query('DELETE FROM self_sign_documents WHERE id = ?', [row.id]);
  for (const table of ['document_fields', 'document_recipients', 'document_files', 'document_identifiers']) {
    try {
      await db.query(`DELETE FROM ${table} WHERE document_id = ?`, [documentId]);
    } catch (e) {}
  }
  await db.query('DELETE FROM documents WHERE id = ?', [documentId]);
}

/** Templates (with their fields and roles). */
async function trashTemplates(templates, user) {
  const children = await cascadeChildren('templates');
  for (const t of templates) {
    const snapshot = await snapshotRows([
      { table: 'templates', column: 'id', value: t.id },
      ...children.map(({ table, column }) => ({ table, column, value: t.id }))
    ]);
    await record({
      type: 'template',
      itemId: t.id,
      title: t.title || `Template ${t.id}`,
      subtitle: `Template · ${t.category || 'custom'}${t.is_shared ? ' · shared' : ''}`,
      ownerId: t.user_id,
      user,
      snapshot
    });
  }
  if (templates.length) await db.query('DELETE FROM templates WHERE id IN (?)', [templates.map((t) => t.id)]);
}

/** A saved signature (the caller of signatureStore.deleteSignature removes it afterwards). */
async function trashSignature(row, user) {
  const snapshot = await snapshotRows([{ table: 'user_signatures', column: 'id', value: row.id }]);
  await record({
    type: 'signature',
    itemId: row.id,
    title: row.display_name ? `${row.display_name} signature` : `Signature ${row.signature_id || row.id}`,
    subtitle: `Signature · ${row.owner_email || ''}`.trim(),
    ownerId: user?.id || null,
    user,
    previousStatus: row.is_default ? 'default' : null,
    snapshot
  });
}

/** Contacts: marked deleted in signing_contacts. */
async function trashContacts(ids, user) {
  const clean = [...new Set((ids || []).map((v) => parseInt(v, 10)).filter(Boolean))];
  if (!clean.length) return [];
  const [rows] = await db.query('SELECT * FROM signing_contacts WHERE id IN (?) AND owner_id = ? AND deleted_at IS NULL', [clean, user.id]);
  for (const c of rows) {
    await record({ type: 'contact', itemId: c.id, title: c.name || c.email, subtitle: c.email, ownerId: c.owner_id, user, sizeHint: c.company || null });
  }
  if (rows.length) await db.query('UPDATE signing_contacts SET deleted_at = NOW() WHERE id IN (?)', [rows.map((c) => c.id)]);
  return rows.map((c) => c.id);
}

/* ---------------------------------------------------------------- restore / delete for good */

async function restoreItem(item) {
  switch (item.item_type) {
    case 'document': {
      await db.query('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.previous_status || 'Draft', item.item_id]);
      break;
    }
    case 'contact': {
      // An active contact with the same email may exist again: then the restored one is merged into it
      const [rows] = await db.query('SELECT owner_id, email FROM signing_contacts WHERE id = ?', [item.item_id]);
      const c = rows[0];
      if (c) {
        const [dupes] = await db.query('SELECT id FROM signing_contacts WHERE owner_id = ? AND email = ? AND deleted_at IS NULL AND id <> ?', [c.owner_id, c.email, item.item_id]);
        if (dupes.length) await db.query('DELETE FROM signing_contacts WHERE id = ?', [item.item_id]);
        else await db.query('UPDATE signing_contacts SET deleted_at = NULL WHERE id = ?', [item.item_id]);
      }
      break;
    }
    case 'signature': {
      const snapshot = deserialize(item.snapshot);
      const email = snapshot[0]?.rows?.[0]?.owner_email;
      const [others] = email ? await db.query('SELECT COUNT(*) AS n FROM user_signatures WHERE LOWER(owner_email) = LOWER(?)', [email]) : [[{ n: 1 }]];
      await restoreSnapshot(snapshot, {
        // The legacy mirror is rebuilt below; it only stays the default when the owner has no other signature
        transform: (table, row) => (table === 'user_signatures' ? { ...row, legacy_employee_id: null, is_default: Number(others[0].n) === 0 ? 1 : 0 } : row)
      });
      if (email) await require('./signatureStore').syncLegacyForEmail(email);
      break;
    }
    default: {
      if (!item.snapshot) throw new Error('This item cannot be restored: its data was not kept.');
      await restoreSnapshot(deserialize(item.snapshot));
    }
  }
  await db.query('DELETE FROM trash_items WHERE id = ?', [item.id]);
}

async function deleteItemForGood(item) {
  if (item.item_type === 'document') {
    try {
      await db.query('DELETE FROM document_identifiers WHERE document_id = ?', [item.item_id]);
    } catch (e) {}
    // Only a document that is still in the trash (never one that was restored some other way)
    await db.query("DELETE FROM documents WHERE id = ? AND LOWER(COALESCE(status, '')) = 'trashed'", [item.item_id]);
  } else if (item.item_type === 'contact') {
    await db.query('DELETE FROM signing_contacts WHERE id = ? AND deleted_at IS NOT NULL', [item.item_id]);
  }
  // Snapshot types: the rows were removed when they were trashed; dropping the snapshot is the permanent delete
  await db.query('DELETE FROM trash_items WHERE id = ?', [item.id]);
}

/** Document ids (legacy endpoints) to their trash rows; documents trashed without a row get one first. */
async function documentItems(documentIds, user) {
  const clean = [...new Set((documentIds || []).map((v) => parseInt(v, 10)).filter(Boolean))];
  if (!clean.length) return [];
  let [items] = await db.query("SELECT * FROM trash_items WHERE item_type = 'document' AND item_id IN (?)", [clean]);
  const missing = clean.filter((id) => !items.some((i) => Number(i.item_id) === id));
  if (missing.length) {
    const [docs] = await db.query("SELECT id, document_name, user_id FROM documents WHERE id IN (?) AND LOWER(COALESCE(status, '')) = 'trashed'", [missing]);
    for (const d of docs) {
      await record({ type: 'document', itemId: d.id, title: d.document_name || `Document ${d.id}`, ownerId: d.user_id, user, previousStatus: 'Draft' });
    }
    [items] = await db.query("SELECT * FROM trash_items WHERE item_type = 'document' AND item_id IN (?)", [clean]);
  }
  return items;
}

/* ---------------------------------------------------------------- automatic cleanup */

let lastPurge = 0;
async function purgeExpired(force = false) {
  if (!force && Date.now() - lastPurge < 60 * 60 * 1000) return 0;
  lastPurge = Date.now();
  try {
    const [items] = await db.query('SELECT * FROM trash_items WHERE purge_after IS NOT NULL AND purge_after <= NOW()');
    for (const item of items) await deleteItemForGood(item);
    if (items.length) console.log(`[Trash] Removed ${items.length} item(s) whose retention period ended`);
    return items.length;
  } catch (err) {
    console.warn('[Trash] cleanup skipped:', err.message);
    return 0;
  }
}

module.exports = {
  TYPES,
  TYPE_KEYS,
  DEFAULT_RETENTION_DAYS,
  getRetentionDays,
  setRetentionDays,
  trashDocuments,
  trashSelfSign,
  trashTemplates,
  trashSignature,
  trashContacts,
  restoreItem,
  deleteItemForGood,
  documentItems,
  purgeExpired,
  serialize,
  deserialize
};
