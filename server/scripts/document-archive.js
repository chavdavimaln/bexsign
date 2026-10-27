/**
 * Recovering something deleted for good (server/scripts/document-archive.js) - doc/35-document-archive.md
 *
 * A signature request, a self-sign document or a template deleted for good - emptied from the trash,
 * aged out of the retention period, or discarded as a draft - leaves nothing behind: the rows go and
 * the files stop being identifiable. Just before that happens BexSign copies the files into
 * `archive/<year>/<month>/<kind>-<id>/` in the doc bucket and records what the thing was. This is how
 * that archive is read and handed back.
 *
 * There is no screen and no API for it: recovering a deleted document takes access to the server, which
 * is the point. Every restore is stamped into the archive row with who did it and when.
 *
 *   node scripts/document-archive.js --list                     the 50 most recent, newest first
 *   node scripts/document-archive.js --list --search contract   by name, BexSign id, owner or recipient
 *   node scripts/document-archive.js --list --type template     one kind: document, self_sign, template
 *   node scripts/document-archive.js --list --limit 200
 *   node scripts/document-archive.js --show 12                  everything recorded about archive 12
 *   node scripts/document-archive.js --show document:140        by the id it used to have
 *   node scripts/document-archive.js --show template:7
 *   node scripts/document-archive.js --restore 12               write its files to ./restored/<kind>-<id>/
 *   node scripts/document-archive.js --restore 12 --out /tmp/x  somewhere else
 *   node scripts/document-archive.js --verify 12                re-read every file, compare SHA-256
 *   node scripts/document-archive.js --by "you@example.com"     who to stamp on the restore
 *
 * A restore writes the files to a folder; it does not put anything back into BexSign on its own. For a
 * signature request that is deliberate - rebuilding one around signatures already collected would be a
 * worse answer than handing over the PDF. A self-sign document and a template are archived with their
 * database rows as well, in the manifest's "snapshot", so putting those back is possible by hand.
 *
 * Reads server/.env for the database and the storage settings, the same as the API.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const archive = require('../utils/documentArchive');
const bucket = require('../utils/docBucket');
const db = require('../db');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null;
};

if (flag('help') || flag('h') || args.length === 0) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

const log = (text = '') => console.log(text);
const bytes = (n) => {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
const when = (value) => (value ? new Date(value).toISOString().replace('T', ' ').slice(0, 19) : '-');

const KINDS = { document: 'request', self_sign: 'self-sign', template: 'template' };

async function showList() {
  const type = option('type') || '';
  if (type && !KINDS[type]) {
    log('');
    log(`--type must be one of: ${Object.keys(KINDS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const rows = await archive.listArchive({
    search: option('search') || '',
    type,
    limit: Number(option('limit')) || 50
  });
  if (rows.length === 0) {
    log('');
    log(option('search') || type
      ? 'Nothing in the archive matches that.'
      : 'The archive is empty: nothing has been deleted for good yet.');
    return;
  }
  log('');
  log(`${rows.length} archived item(s), newest first`);
  log('');
  log('  ID     KIND       ID    DELETED              FILES  SIZE       NAME / OWNER');
  log('  ---------------------------------------------------------------------------------------');
  for (const row of rows) {
    log(`  ${String(row.id).padEnd(6)} ${(KINDS[row.item_type] || row.item_type).padEnd(10)} ${String(row.item_id).padEnd(5)} `
      + `${when(row.deleted_at).padEnd(20)} ${String(row.file_count).padEnd(6)} ${bytes(row.total_bytes).padEnd(10)} `
      + `${row.document_name || '(no name)'}`);
    const by = row.deleted_by ? `by ${row.deleted_by}` : 'by the system';
    log(`  ${''.padEnd(6)} ${''.padEnd(10)} ${''.padEnd(5)} ${by.padEnd(20)}  ${''.padEnd(6)} ${''.padEnd(10)} `
      + `${row.owner_email || 'owner unknown'}`
      + `${row.restored_at ? `  [restored ${when(row.restored_at)}]` : ''}`
      + `${row.error_text ? '  [had problems - see --show]' : ''}`);
  }
  log('');
  log('Next:  node scripts/document-archive.js --show <ID>');
}

async function showOne(reference) {
  const row = await archive.getArchive(reference);
  if (!row) {
    log('');
    log(`Nothing in the archive for "${reference}".`);
    process.exitCode = 1;
    return null;
  }
  const m = row.manifest || {};
  log('');
  log(`Archive #${row.id}`);
  log('='.repeat(60));
  log(`Kind                ${KINDS[row.item_type] || row.item_type}`);
  log(`Name                ${row.document_name || '(no name)'}  (was ${row.item_type} ${row.item_id})`);
  if (row.bexsign_doc_id) log(`BexSign ID          ${row.bexsign_doc_id}`);
  log(`Status when deleted ${row.status_before || '-'}`);
  log(`Owner               ${row.owner_email || (m.ownerId ? `user ${m.ownerId}` : '-')}`);
  if (row.recipient_emails) log(`Recipients          ${row.recipient_emails}`);
  log(`Deleted             ${when(row.deleted_at)} by ${row.deleted_by || 'the system'} (${row.deleted_reason || '-'})`);
  log(`Stored in           ${row.storage_provider} at ${row.archive_prefix || '-'}`);
  if (row.restored_at) log(`Already restored    ${when(row.restored_at)} by ${row.restored_by || '-'}`);
  if (row.error_text) log(`Problems archiving  ${row.error_text}`);

  // A self-sign document or a template is archived with its rows, so a put-back is possible
  if (Array.isArray(m.snapshot) && m.snapshot.length) {
    log('');
    log(`Rows held (${m.snapshot.length} table(s)) - enough to put this back by hand:`);
    for (const entry of m.snapshot) {
      log(`  - ${entry.table}: ${(entry.rows || []).length} row(s)`);
    }
  }

  const files = m.files || [];
  log('');
  log(`Files (${files.length}, ${bytes(row.total_bytes)})`);
  for (const file of files) {
    log(`  - ${file.name || file.archiveKey.split('/').pop()}  [${file.kind}]  ${bytes(file.bytes)}`);
    log(`      was      ${file.originalPath}`);
    log(`      archived ${file.archiveKey}`);
    log(`      sha256   ${file.sha256}`);
  }

  const texts = (m.documents || []).filter((d) => d.text);
  if (texts.length) {
    log('');
    log(`Document text held for ${texts.length} document(s) (a document written in the app has no uploaded file):`);
    for (const d of texts) {
      const plain = String(d.text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      log(`  - ${d.name || '(no name)'}: ${plain.slice(0, 120)}${plain.length > 120 ? '…' : ''}`);
    }
  }

  if ((m.recipients || []).length) {
    log('');
    log('Recipients');
    for (const r of m.recipients) {
      log(`  - ${r.name || '(no name)'} <${r.email}>  ${r.role || ''} ${r.status || ''}${r.signedAt ? ` signed ${when(r.signedAt)}` : ''}`);
    }
  }
  log('');
  log(`Next:  node scripts/document-archive.js --restore ${row.id}`);
  return row;
}

async function restore(reference) {
  const row = await archive.getArchive(reference);
  if (!row) {
    log('');
    log(`Nothing in the archive for "${reference}".`);
    process.exitCode = 1;
    return;
  }
  const files = row.manifest?.files || [];
  const hasRows = Array.isArray(row.manifest?.snapshot) && row.manifest.snapshot.length > 0;
  if (files.length === 0 && !hasRows) {
    log('');
    log(`Archive #${row.id} has no files: it was written in the app and has only text.`);
    log('Use --show to read the text it held.');
    return;
  }

  const outDir = path.resolve(option('out') || path.join(process.cwd(), 'restored', `${row.item_type}-${row.item_id}`));
  await fsp.mkdir(outDir, { recursive: true });

  log('');
  log(`Restoring archive #${row.id} - "${row.document_name}" (was ${row.item_type} ${row.item_id})`);
  log(`Into ${outDir}`);
  log('');

  let written = 0;
  let mismatched = 0;
  for (const entry of files) {
    const got = await archive.readArchivedFile(entry);
    if (!got) {
      log(`  MISSING   ${entry.name} - ${entry.archiveKey} is not in ${row.storage_provider}`);
      continue;
    }
    const safeName = String(entry.name || entry.archiveKey.split('/').pop()).replace(/[\\/:*?"<>|]+/g, '_');
    const target = path.join(outDir, safeName.endsWith('.pdf') || /\.[a-z0-9]{2,5}$/i.test(safeName) ? safeName : `${safeName}.pdf`);
    await fsp.writeFile(target, got.buffer);
    written += 1;
    if (!got.matches) mismatched += 1;
    log(`  ${got.matches ? 'ok      ' : 'CHANGED '}  ${path.basename(target)}  ${bytes(got.buffer.length)}`
      + `${got.matches ? '' : '  <- the checksum does not match what was archived'}`);
  }

  // The manifest goes with the files, so whoever receives them can see what they are
  await fsp.writeFile(path.join(outDir, 'archive-manifest.json'), JSON.stringify(row.manifest, null, 2));

  const by = option('by') || process.env.USER || process.env.USERNAME || 'server';
  await archive.recordRestore(row.id, by);

  log('');
  log(`${written} file(s) written, plus archive-manifest.json.${mismatched ? ` ${mismatched} did NOT match their checksum.` : ''}`);
  if (hasRows) {
    const rowCount = row.manifest.snapshot.reduce((n, e) => n + (e.rows || []).length, 0);
    log(`The manifest also holds ${rowCount} database row(s) across ${row.manifest.snapshot.length} table(s),`);
    log('under "snapshot" - what a put-back would need. Writing them back is a deliberate act: see');
    log('doc/35-document-archive.md §4 before doing it.');
  }
  log(`Recorded on archive #${row.id} as restored by "${by}".`);
  if (mismatched) process.exitCode = 1;
}

async function verify(reference) {
  const row = await archive.getArchive(reference);
  if (!row) {
    log('');
    log(`Nothing in the archive for "${reference}".`);
    process.exitCode = 1;
    return;
  }
  const files = row.manifest?.files || [];
  log('');
  log(`Checking ${files.length} file(s) of archive #${row.id} against the checksums recorded when it was archived`);
  log('');
  let bad = 0;
  for (const entry of files) {
    const got = await archive.readArchivedFile(entry);
    if (!got) {
      bad += 1;
      log(`  MISSING   ${entry.name}  (${entry.archiveKey})`);
      continue;
    }
    if (!got.matches) bad += 1;
    log(`  ${got.matches ? 'ok      ' : 'CHANGED '}  ${entry.name}  ${bytes(got.buffer.length)}`);
  }
  log('');
  log(bad === 0 ? 'Every file is intact.' : `${bad} file(s) are missing or changed.`);
  if (bad) process.exitCode = 1;
}

async function main() {
  const status = bucket.status();
  log('');
  log('BexSign document archive');
  log('========================');
  log(`Storage   ${status.provider}${status.info.bucket ? ` (${status.info.bucket})` : ''}`);
  if (!status.ready) {
    log(`The store is not usable: ${status.error}`);
    process.exitCode = 1;
    return;
  }

  await archive.ensureArchiveSchema();

  if (flag('list')) return showList();
  if (option('show')) return showOne(option('show')).then(() => {});
  if (option('restore')) return restore(option('restore'));
  if (option('verify')) return verify(option('verify'));

  log('');
  log('Nothing to do. Use --list, --show <id>, --restore <id> or --verify <id> (--help for the full list).');
}

main()
  .catch((err) => {
    console.error('');
    console.error(`Stopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Requiring the database starts a couple of fire-and-forget "create the table if it is missing"
    // calls; closing the pool out from under them prints warnings that mean nothing here
    await new Promise((resolve) => setTimeout(resolve, 400));
    await db.end().catch(() => {});
  });
