/**
 * Doc bucket migration (server/scripts/docbucket-migrate.js).
 *
 * Copies the documents already on this server (server/uploads) into the doc bucket configured in
 * server/.env, records every object in `doc_bucket_objects`, and fills in the `storage_key` /
 * `storage_provider` columns so the database says where each file is. Run it once when moving a
 * live server from local disk to S3, Azure or Google Cloud Storage.
 *
 *   node scripts/docbucket-migrate.js                     dry run - lists what would be copied
 *   node scripts/docbucket-migrate.js --apply             copy everything that is not there yet
 *   node scripts/docbucket-migrate.js --apply --prefix completed
 *                                                         one area only (completed, avatars, ...)
 *   node scripts/docbucket-migrate.js --verify            re-read every object and compare SHA-256
 *   node scripts/docbucket-migrate.js --status            counts per area and per state
 *   node scripts/docbucket-migrate.js --apply --delete-local
 *                                                         remove the local copy of each object
 *                                                         whose checksum in the bucket matched
 *   node scripts/docbucket-migrate.js --apply --limit 50  stop after 50 files (a first trial run)
 *   node scripts/docbucket-migrate.js --db-only           only fill the database columns
 *
 * Safe to stop and re-run: a file already in the bucket with the same size and checksum is
 * skipped, and nothing is deleted unless --delete-local is given. Without --apply nothing is
 * written anywhere. Keep a backup of server/uploads until a --verify run reports no problems.
 *
 * See doc/31-doc-bucket.md and doc/32-s3-document-storage-live.md.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
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
const VERIFY = flag('verify');
const STATUS = flag('status');
const DB_ONLY = flag('db-only');
const DELETE_LOCAL = flag('delete-local');
const PREFIX = option('prefix') || '';
const LIMIT = Number(option('limit')) || Infinity;

const log = (text = '') => console.log(text);
const bytes = (n) => {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Files that are not documents and must never be copied. */
const SKIP = [/^\./, /(^|\/)\.docbucket-selftest-/, /(^|\/)Thumbs\.db$/i, /(^|\/)desktop\.ini$/i];
const skipKey = (key) => SKIP.some((re) => re.test(key));

const areaOf = (key) => {
  const head = key.split('/')[0];
  return ['completed', 'avatars', 'physical', 'merged'].includes(head) ? head : 'documents';
};

const sha256File = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

// --- the database side ------------------------------------------------------------------------

/** Every column pair that stores a file path, and the key column that goes with it. */
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

async function connect() {
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
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

async function requireSchema(db) {
  const missing = [];
  const [objects] = await db.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    ['doc_bucket_objects']
  );
  if (objects.length === 0) missing.push('table doc_bucket_objects');
  for (const entry of PATH_COLUMNS) {
    if (!await tableHasColumn(db, entry.table, entry.keyColumn)) missing.push(`${entry.table}.${entry.keyColumn}`);
  }
  if (missing.length > 0) {
    log('The database does not have the doc bucket columns yet:');
    missing.forEach((m) => log(`  - ${m}`));
    log('');
    log('Run the database migration first:  npm run db:migrate --prefix server');
    return false;
  }
  return true;
}

/** Fills storage_key / storage_provider from the file paths already stored. Idempotent. */
async function backfillColumns(db, provider) {
  let touched = 0;
  for (const { table, pathColumn, keyColumn } of PATH_COLUMNS) {
    const sql = `UPDATE \`${table}\`
                    SET \`${keyColumn}\` = SUBSTRING_INDEX(REPLACE(\`${pathColumn}\`, '\\\\', '/'), 'uploads/', -1)
                  WHERE \`${pathColumn}\` IS NOT NULL AND \`${pathColumn}\` <> '' AND \`${keyColumn}\` IS NULL`;
    if (!APPLY) {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${pathColumn}\` IS NOT NULL AND \`${pathColumn}\` <> '' AND \`${keyColumn}\` IS NULL`
      );
      if (rows[0].n > 0) log(`  would set ${table}.${keyColumn} on ${rows[0].n} row(s)`);
      touched += Number(rows[0].n);
      continue;
    }
    const [result] = await db.query(sql);
    if (result.affectedRows > 0) log(`  ${table}.${keyColumn}: ${result.affectedRows} row(s)`);
    touched += result.affectedRows;

    if (await tableHasColumn(db, table, 'storage_provider')) {
      await db.query(`UPDATE \`${table}\` SET \`storage_provider\` = ? WHERE \`${keyColumn}\` IS NOT NULL`, [provider]);
    }
  }
  return touched;
}

async function recordObject(db, row) {
  if (!APPLY) return;
  await db.query(
    `INSERT INTO doc_bucket_objects
       (object_key, provider, bucket_name, area, byte_size, content_type, checksum_sha256, status, has_local_copy, error_text, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       bucket_name = VALUES(bucket_name), area = VALUES(area), byte_size = VALUES(byte_size),
       content_type = VALUES(content_type), checksum_sha256 = VALUES(checksum_sha256),
       status = VALUES(status), has_local_copy = VALUES(has_local_copy),
       error_text = VALUES(error_text), verified_at = VALUES(verified_at)`,
    [
      row.key, row.provider, row.bucketName || null, row.area, row.size, row.contentType,
      row.checksum || null, row.status, row.hasLocalCopy ? 1 : 0, row.error || null,
      row.status === 'verified' ? new Date() : null
    ]
  );
}

// --- the file side ----------------------------------------------------------------------------

/** Every document on this server's disk, as bucket keys. */
async function localKeys(root, prefix) {
  const start = prefix ? path.join(root, prefix.split('/').join(path.sep)) : root;
  const keys = [];
  const walk = async (dir) => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) keys.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  await walk(start);
  return keys.filter((key) => !skipKey(key)).sort();
}

async function showStatus(db) {
  const [rows] = await db.query(
    `SELECT area, status, COUNT(*) AS files, COALESCE(SUM(byte_size), 0) AS total
       FROM doc_bucket_objects GROUP BY area, status ORDER BY area, status`
  );
  if (rows.length === 0) {
    log('The ledger is empty: no file has been copied into the doc bucket yet.');
    return;
  }
  log('Area          State       Files      Size');
  log('--------------------------------------------------');
  for (const row of rows) {
    log(`${String(row.area || '-').padEnd(14)}${String(row.status).padEnd(12)}${String(row.files).padStart(5)}  ${bytes(Number(row.total)).padStart(9)}`);
  }
  const [failed] = await db.query(
    "SELECT object_key, error_text FROM doc_bucket_objects WHERE status IN ('failed', 'missing') LIMIT 20"
  );
  if (failed.length > 0) {
    log('');
    log('Needs attention:');
    failed.forEach((row) => log(`  ${row.object_key} - ${row.error_text || 'not found in either place'}`));
  }
}

async function run() {
  const info = bucket.status();
  log('');
  log('BexSign doc bucket migration');
  log('============================');
  log(`Provider          ${info.provider}${info.requested !== info.provider ? ` (DOC_BUCKET_PROVIDER=${info.requested} could not be used)` : ''}`);
  log(`Local folder      ${info.localRoot}`);
  if (info.info && Object.keys(info.info).length > 0) {
    Object.entries(info.info).forEach(([k, v]) => log(`${k.padEnd(18)}${v}`));
  }
  if (info.error) log(`Warning           ${info.error}`);
  log(`Mode              ${APPLY ? 'APPLY - files and rows are written' : 'DRY RUN - nothing is written (add --apply)'}`);
  log('');

  const db = await connect();
  try {
    if (!await requireSchema(db)) {
      process.exitCode = 1;
      return;
    }

    if (STATUS) {
      await showStatus(db);
      return;
    }

    log(APPLY ? 'Filling the database columns...' : 'Database columns:');
    const touched = await backfillColumns(db, info.provider);
    if (touched === 0) log('  nothing to do - every row already has its key');
    log('');

    if (DB_ONLY) {
      log('--db-only: the files themselves were not touched.');
      return;
    }

    if (info.provider === 'local') {
      log('The provider is "local": the documents are already where this server reads them, so');
      log('there is nothing to copy. Set DOC_BUCKET_PROVIDER=s3 (or azure / gcs) in server/.env');
      log('and run this again to move them into the bucket.');
      return;
    }

    if (!APPLY) {
      const check = await bucket.selfTest();
      if (!check.success) {
        log(`The bucket is not writable: ${check.error}`);
        log('Fix the credentials in server/.env before running with --apply.');
        process.exitCode = 1;
        return;
      }
      log('Bucket write, read and delete: OK');
      log('');
    }

    const keys = await localKeys(info.localRoot, PREFIX);
    log(`${keys.length} file(s) on this server${PREFIX ? ` under "${PREFIX}"` : ''}`);
    log('');

    const counts = { copied: 0, skipped: 0, verified: 0, failed: 0, deleted: 0 };
    let copiedBytes = 0;
    let seen = 0;

    for (const key of keys) {
      if (seen >= LIMIT) {
        log(`--limit ${LIMIT} reached: stopping here. Run again to continue.`);
        break;
      }
      seen += 1;
      const localPath = bucket.localPathFor(key);
      const area = areaOf(key);
      const contentType = bucket.contentTypeFor(key);

      try {
        const localStat = await fsp.stat(localPath);
        const remote = await bucket.stat(key);

        if (remote && Number(remote.size) === localStat.size && !VERIFY) {
          counts.skipped += 1;
          await recordObject(db, {
            key, provider: info.provider, bucketName: info.info.bucket || info.info.container,
            area, size: localStat.size, contentType, status: 'stored', hasLocalCopy: true
          });
          continue;
        }

        const localHash = await sha256File(localPath);

        if (!remote || Number(remote.size) !== localStat.size) {
          if (!APPLY) {
            log(`  would copy  ${key}  (${bytes(localStat.size)})`);
            counts.copied += 1;
            copiedBytes += localStat.size;
            continue;
          }
          await bucket.putFile(key, localPath, { contentType });
          counts.copied += 1;
          copiedBytes += localStat.size;
        }

        // Read it back out of the bucket and compare: the only proof the copy is good
        const readBack = await bucket.get(key);
        const remoteHash = crypto.createHash('sha256').update(readBack).digest('hex');
        const matched = remoteHash === localHash;
        if (matched) counts.verified += 1;
        else counts.failed += 1;

        await recordObject(db, {
          key, provider: info.provider, bucketName: info.info.bucket || info.info.container,
          area, size: localStat.size, contentType, checksum: localHash,
          status: matched ? 'verified' : 'failed',
          hasLocalCopy: true,
          error: matched ? null : 'The copy in the bucket does not match the local file.'
        });

        if (!matched) {
          log(`  MISMATCH    ${key} - the local file and the bucket copy differ; the local file was kept`);
          continue;
        }

        if (DELETE_LOCAL && APPLY) {
          await fsp.unlink(localPath);
          counts.deleted += 1;
          await recordObject(db, {
            key, provider: info.provider, bucketName: info.info.bucket || info.info.container,
            area, size: localStat.size, contentType, checksum: localHash,
            status: 'verified', hasLocalCopy: false
          });
        }
      } catch (err) {
        counts.failed += 1;
        log(`  FAILED      ${key} - ${err.message}`);
        await recordObject(db, {
          key, provider: info.provider, bucketName: info.info.bucket || info.info.container,
          area, size: 0, contentType, status: 'failed', hasLocalCopy: true, error: err.message.slice(0, 500)
        });
      }
    }

    log('');
    log('Result');
    log('------');
    log(`${APPLY ? 'Copied' : 'To copy'}        ${counts.copied} file(s), ${bytes(copiedBytes)}`);
    log(`Already there  ${counts.skipped}`);
    log(`Verified       ${counts.verified}`);
    log(`Problems       ${counts.failed}`);
    if (DELETE_LOCAL) log(`Local removed  ${counts.deleted}`);
    log('');
    if (!APPLY) {
      log('This was a dry run. Re-run with --apply to copy the files.');
    } else if (counts.failed > 0) {
      log('Some files had problems - they are listed above and kept on this server.');
      log('Fix the cause and run again; files already copied are skipped.');
      process.exitCode = 1;
    } else {
      log('Done. Check "node scripts/docbucket-migrate.js --status" at any time.');
      if (!DELETE_LOCAL) {
        log('The local copies were kept. Once a --verify run is clean you can free the disk with');
        log('--apply --delete-local, or simply leave them as a second copy.');
      }
    }
  } finally {
    await db.end();
  }
}

run().catch((err) => {
  console.error('');
  console.error('The migration stopped:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ECONNREFUSED') {
    console.error('Check DB_HOST, DB_USER and DB_PASSWORD in server/.env, and that MySQL is running.');
  }
  process.exit(1);
});
