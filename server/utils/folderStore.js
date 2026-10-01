/**
 * Folders: a flat list used to group documents (e.g. by client/project), shown under "Folders" in the left nav.
 * Documents keep their existing `folder_name` string column (used by older code and the documents list) as a
 * denormalized display copy; `folder_id` is the source of truth once a document is assigned to a real folder.
 * ensureFoldersSchema() is idempotent and runs from ensurePlatformSchema() once per server start.
 */
const db = require('../db');

// Seeded once, the first time the folders table is created. Renaming/deleting them afterwards is left to the user.
const DEFAULT_FOLDERS = ['Ola Digital Health', 'HomelyMD'];

async function columnExists(table, column) {
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
}

let schemaPromise = null;
function ensureFoldersSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS folders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            color VARCHAR(20) DEFAULT '#00a884',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_folder_name (name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        if (!(await columnExists('documents', 'folder_id'))) {
          await db.query('ALTER TABLE documents ADD COLUMN folder_id INT NULL');
        }
        await db.query(
          `INSERT IGNORE INTO folders (name) VALUES ${DEFAULT_FOLDERS.map(() => '(?)').join(', ')}`,
          DEFAULT_FOLDERS
        );
      } catch (err) {
        schemaPromise = null;
        console.warn('[Schema] Folders table not ready:', err.message);
      }
    })();
  }
  return schemaPromise;
}

function present(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#00a884',
    documentCount: Number(row.document_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listFolders() {
  await ensureFoldersSchema();
  const [rows] = await db.query(
    `SELECT f.*, COUNT(d.id) AS document_count
     FROM folders f
     LEFT JOIN documents d ON d.folder_id = f.id AND LOWER(COALESCE(d.status, '')) != 'trashed'
     GROUP BY f.id
     ORDER BY f.name ASC`
  );
  return rows.map(present);
}

async function createFolder(name, { color = null, createdBy = null } = {}) {
  await ensureFoldersSchema();
  const clean = String(name || '').trim().slice(0, 150);
  if (!clean) throw new Error('Enter a folder name.');
  const [existing] = await db.query('SELECT id FROM folders WHERE name = ?', [clean]);
  if (existing.length) throw new Error('A folder with this name already exists.');
  const [result] = await db.query(
    'INSERT INTO folders (name, color, created_by) VALUES (?, ?, ?)',
    [clean, color || '#00a884', createdBy || null]
  );
  return present({ id: result.insertId, name: clean, color: color || '#00a884', document_count: 0 });
}

async function renameFolder(id, name, color) {
  await ensureFoldersSchema();
  const folderId = parseInt(id, 10) || 0;
  if (!folderId) throw new Error('Folder not found.');
  const updates = [];
  const params = [];
  let cleanName;
  if (name !== undefined) {
    cleanName = String(name || '').trim().slice(0, 150);
    if (!cleanName) throw new Error('Enter a folder name.');
    updates.push('name = ?');
    params.push(cleanName);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color || '#00a884');
  }
  if (!updates.length) return;
  params.push(folderId);
  await db.query(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`, params);
  // Keep documents.folder_name (the legacy display column) in step with the rename
  if (cleanName !== undefined) {
    await db.query('UPDATE documents SET folder_name = ? WHERE folder_id = ?', [cleanName, folderId]);
  }
}

/** Deleting a folder never deletes its documents: they are moved to "No folder". */
async function deleteFolder(id) {
  await ensureFoldersSchema();
  const folderId = parseInt(id, 10) || 0;
  if (!folderId) throw new Error('Folder not found.');
  await db.query('UPDATE documents SET folder_id = NULL, folder_name = ? WHERE folder_id = ?', ['None', folderId]);
  const [result] = await db.query('DELETE FROM folders WHERE id = ?', [folderId]);
  if (!result.affectedRows) throw new Error('Folder not found.');
}

/** Resolves a folderId from a request into {folder_id, folder_name} ready to save on a document. */
async function resolveFolderAssignment(folderId) {
  const id = parseInt(folderId, 10) || 0;
  if (!id) return { folder_id: null, folder_name: 'None' };
  await ensureFoldersSchema();
  const [rows] = await db.query('SELECT id, name FROM folders WHERE id = ?', [id]);
  if (!rows.length) return { folder_id: null, folder_name: 'None' };
  return { folder_id: rows[0].id, folder_name: rows[0].name };
}

module.exports = {
  ensureFoldersSchema,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  resolveFolderAssignment
};
