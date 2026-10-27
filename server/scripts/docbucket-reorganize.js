/**
 * Doc bucket tidy-up (server/scripts/docbucket-reorganize.js).
 *
 * Moves the documents that sit at the TOP LEVEL of the bucket into the folders BexSign files new
 * ones in, and rewrites the paths the database stores so every link keeps working:
 *
 *   1793113657323-contract.pdf        ->  documents/2026/10/1793113657323-contract.pdf
 *   1764512345678-template-nda.pdf    ->  templates/1764512345678-template-nda.pdf
 *   1790000000000-merged-pack.pdf     ->  merged/1790000000000-merged-pack.pdf
 *
 * Uploads made before the folders existed are the only files this affects; anything already in a
 * folder (completed/, physical/, avatars/, previews/, templates/, merged/, documents/) is left
 * exactly where it is. The month comes from the timestamp BexSign puts at the front of every
 * stored file name, so a document keeps the date it arrived.
 *
 *   node scripts/docbucket-reorganize.js                  dry run - lists every move, writes nothing
 *   node scripts/docbucket-reorganize.js --apply          do it
 *   node scripts/docbucket-reorganize.js --apply --limit 20
 *                                                         stop after 20 files (a first trial run)
 *   node scripts/docbucket-reorganize.js --include-orphans
 *                                                         also move files no database row points at
 *   node scripts/docbucket-reorganize.js --keep-source    copy, do not delete the old object
 *
 * Each file is copied inside the bucket, the copy is checked against the original, the database is
 * updated, and only then is the old object removed. Safe to stop and re-run: a file already moved
 * is simply no longer at the top level. Without --apply nothing anywhere is written.
 *
 * Run it against whichever store is switched on (DOC_BUCKET_PROVIDER). Doing it while the provider
 * is still `local` is quicker and cheaper than doing it over the network afterwards.
 *
 * See doc/31-doc-bucket.md.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const bucket = require('../utils/docBucket');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null;
};

if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

const APPLY = flag('apply');
const INCLUDE_ORPHANS = flag('include-orphans');
const KEEP_SOURCE = flag('keep-source');
const LIMIT = Number(option('limit')) || Infinity;

const log = (text = '') => console.log(text);
const bytes = (n) => {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Files that are not documents and must never be moved. */
const SKIP = [/^\./, /^\.docbucket-selftest-/, /^Thumbs\.db$/i, /^desktop\.ini$/i, /^sample\.pdf$/i];

/** Every column that stores a file path, with the key column that goes beside it. */
const PATH_COLUMNS = [
  { table: 'documents', pathColumn: 'file_path', keyColumn: 'storage_key' },
  { table: 'document_files', pathColumn: 'file_path', keyColumn: 'storage_key' },
  { table: 'document_files', pathColumn: 'signed_file_path', keyColumn: 'signed_storage_key' },
  { table: 'document_versions', pathColumn: 'file_path', keyColumn: 'storage_key' },
  { table: 'document_recipients', pathColumn: 'physical_copy_path', keyColumn: 'physical_copy_storage_key' },
  { table: 'self_sign_documents', pathColumn: 'signed_file_path', keyColumn: 'signed_storage_key' },
  { table: 'templates', pathColumn: 'file_path', keyColumn: 'storage_key' },
  { table: 'issued_pdf_fingerprints', pathColumn: 'file_path', keyColumn: 'storage_key' }
];

function connect() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'db_bex_sign',
    multipleStatements: false
  });
}

async function tableHasColumn(db, table, column) {
  try {
    const [rows] = await db.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
      [table, column]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

/** A key with no slash in it is a file at the top level of the bucket - the ones this script moves. */
const isTopLevel = (key) => Boolean(key) && !key.includes('/');

/**
 * Where a top-level file belongs. A template goes to templates/, a merged pack to merged/, and
 * everything else is a document, filed under the year and month it was stored.
 */
function destinationFor(key, { table, when }) {
  if (table === 'templates' || /^\d+-template-/.test(key)) return bucket.keyFor('templates', key);
  if (/-merged-/.test(key)) return bucket.keyFor('merged', key);
  return bucket.newKeyFor('documents', key, when);
}

/**
 * The date a file was stored. BexSign names every stored file `<epoch ms>-<original name>`, so the
 * name itself carries it; a file named any other way falls back to the row's date, then the
 * object's own modified time.
 */
function dateFor(key, rowDate, objectDate) {
  const stamp = /^(\d{10,14})-/.exec(key);
  if (stamp) {
    const when = new Date(Number(stamp[1]));
    if (!Number.isNaN(when.getTime()) && when.getFullYear() >= 2000 && when.getFullYear() <= 2100) return when;
  }
  for (const candidate of [rowDate, objectDate]) {
    if (!candidate) continue;
    const when = new Date(candidate);
    if (!Number.isNaN(when.getTime())) return when;
  }
  return new Date();
}

/** Every top-level file the database points at, with the rows that reference it. */
async function collectFromDatabase(db) {
  const found = new Map();
  for (const { table, pathColumn } of PATH_COLUMNS) {
    if (!await tableHasColumn(db, table, pathColumn)) continue;
    const hasCreatedAt = await tableHasColumn(db, table, 'created_at');
    const [rows] = await db.query(
      `SELECT id, \`${pathColumn}\` AS filePath${hasCreatedAt ? ', created_at AS createdAt' : ''}
         FROM \`${table}\`
        WHERE \`${pathColumn}\` IS NOT NULL AND \`${pathColumn}\` <> ''`
    );
    for (const row of rows) {
      const key = bucket.keyFromPath(row.filePath);
      if (!isTopLevel(key) || SKIP.some((re) => re.test(key))) continue;
      if (!found.has(key)) found.set(key, { key, rows: [], table, when: null });
      const entry = found.get(key);
      entry.rows.push({ table, id: row.id });
      // The earliest row that mentions the file is the closest thing to when it arrived
      const when = dateFor(key, row.createdAt, null);
      if (!entry.when || when < entry.when) entry.when = when;
      // A template row decides the destination even when another table also points at the file
      if (table === 'templates') entry.table = 'templates';
    }
  }
  return found;
}

/** Top-level objects in the bucket that no database row mentions. */
async function collectOrphans(db, known) {
  const listing = await bucket.list('', { limit: 5000 });
  const objects = Array.isArray(listing) ? listing : (listing.objects || []);
  const orphans = [];
  for (const object of objects) {
    const key = object.key || object.Key;
    if (!isTopLevel(key) || SKIP.some((re) => re.test(key)) || known.has(key)) continue;
    orphans.push({ key, rows: [], table: null, when: dateFor(key, null, object.modified) });
  }
  return orphans;
}

/** Points every row that mentions the old path at the new one. */
async function repoint(db, entry, newKey, keyColumns) {
  const oldPath = `/uploads/${entry.key}`;
  const newPath = `/uploads/${newKey}`;
  let updated = 0;
  for (const { table, pathColumn, keyColumn } of PATH_COLUMNS) {
    if (!keyColumns.has(`${table}.${pathColumn}`)) continue;
    const setKey = keyColumns.get(`${table}.${pathColumn}`) ? `, \`${keyColumn}\` = ?` : '';
    const params = setKey ? [newPath, newKey, oldPath, entry.key] : [newPath, oldPath, entry.key];
    const [result] = await db.query(
      `UPDATE \`${table}\` SET \`${pathColumn}\` = ?${setKey}
        WHERE \`${pathColumn}\` = ? OR \`${pathColumn}\` = ?`,
      params
    );
    updated += result.affectedRows || 0;
  }
  try {
    await db.query(
      'UPDATE `doc_bucket_objects` SET `object_key` = ?, `area` = ? WHERE `object_key` = ? AND `provider` = ?',
      [newKey, newKey.split('/')[0], entry.key, bucket.provider()]
    );
  } catch (err) {
    // No ledger yet, or a row already there for the new key: the move itself is what matters
  }
  return updated;
}

async function main() {
  const status = bucket.status();
  log('');
  log('BexSign doc bucket tidy-up');
  log('==========================');
  log(`Provider          ${status.provider}${status.info.bucket ? ` (${status.info.bucket})` : ''}`);
  log(`Local folder      ${status.localRoot}`);
  log(`Mode              ${APPLY ? 'APPLY - files are moved and the database is updated' : 'DRY RUN - nothing is written (add --apply)'}`);
  if (!status.ready) {
    log('');
    log(`The bucket is not usable: ${status.error}`);
    process.exitCode = 1;
    return;
  }

  const db = await connect();
  try {
    const keyColumns = new Map();
    for (const { table, pathColumn, keyColumn } of PATH_COLUMNS) {
      if (await tableHasColumn(db, table, pathColumn)) {
        keyColumns.set(`${table}.${pathColumn}`, await tableHasColumn(db, table, keyColumn));
      }
    }

    const fromDb = await collectFromDatabase(db);
    const orphans = INCLUDE_ORPHANS ? await collectOrphans(db, fromDb) : [];
    const entries = [...fromDb.values(), ...orphans].slice(0, LIMIT === Infinity ? undefined : LIMIT);

    if (entries.length === 0) {
      log('');
      log('Nothing to move: no documents are sitting at the top level of the bucket.');
      if (!INCLUDE_ORPHANS) log('(Files no database row points at are only counted with --include-orphans.)');
      return;
    }

    log('');
    log(`${entries.length} file(s) to move${orphans.length ? ` (${orphans.length} with no database row)` : ''}`);
    log('');

    let moved = 0;
    let missing = 0;
    let failed = 0;
    let totalBytes = 0;

    for (const entry of entries) {
      const newKey = destinationFor(entry.key, entry);
      const info = await bucket.stat(entry.key).catch(() => null);
      const label = `${entry.key}  ->  ${newKey}`;

      if (!info) {
        missing += 1;
        log(`  missing  ${label}`);
        log(`           the database points at this file but the bucket does not have it`);
        continue;
      }
      totalBytes += info.size || 0;

      if (!APPLY) {
        log(`  would move  ${label}  (${bytes(info.size)}, ${entry.rows.length || 'no'} row${entry.rows.length === 1 ? '' : 's'})`);
        continue;
      }

      try {
        await bucket.copy(entry.key, newKey);
        const copied = await bucket.stat(newKey);
        if (!copied || (info.size && copied.size !== info.size)) {
          throw new Error(`the copy is ${copied ? bytes(copied.size) : 'missing'}, the original is ${bytes(info.size)}`);
        }
        const rows = await repoint(db, entry, newKey, keyColumns);
        if (!KEEP_SOURCE) await bucket.remove(entry.key);
        moved += 1;
        log(`  moved    ${label}  (${bytes(info.size)}, ${rows} row${rows === 1 ? '' : 's'} updated)`);
      } catch (err) {
        failed += 1;
        log(`  FAILED   ${label}`);
        log(`           ${err.message}`);
        // The copy is left in place: re-running finds the original still at the top level
      }
    }

    log('');
    if (APPLY) {
      log(`Moved ${moved} file(s), ${bytes(totalBytes)}.${failed ? ` ${failed} failed.` : ''}${missing ? ` ${missing} not in the bucket.` : ''}`);
      if (KEEP_SOURCE) log('--keep-source was given, so the old objects are still there.');
      if (moved > 0) {
        log('Every path the database held was rewritten, so the app, its downloads and its emails');
        log('follow the files. A /uploads/... address written down by hand somewhere outside the');
        log('database would not - re-run with --keep-source if anything relies on the old address.');
      }
    } else {
      log(`${entries.length} file(s), ${bytes(totalBytes)} would move.${missing ? ` ${missing} are not in the bucket and would be skipped.` : ''}`);
      log('Run it again with --apply to do it.');
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('');
  console.error(`The tidy-up stopped: ${err.message}`);
  process.exitCode = 1;
});
