/**
 * BexSign database migration (server/scripts/migrate.js).
 *
 * Brings the database named in server/.env to the structure in server/database/schema.sql:
 *
 *   - creates the database when it does not exist
 *   - creates every missing table
 *   - adds every missing column, index and foreign key to the tables that exist
 *   - makes a required (NOT NULL) column optional when the schema says it now is
 *   - adds the built-in roles (database/seed.sql) and lets the application seed its own defaults
 *     (permissions, general settings)
 *   - records the run in the schema_migrations table
 *
 * It only ever ADDS or loosens. No table, column or row is dropped or rewritten, and a column whose type differs
 * from the schema file is reported, not changed. Running it twice is harmless: the second run finds nothing to do.
 *
 *   npm run db:migrate                 apply
 *   npm run db:migrate -- --dry-run    show what would be done, change nothing
 *   npm run db:status                  same as --dry-run, with the history of earlier runs
 *   npm run db:migrate -- --database other_db      another database than DB_NAME (same server and user)
 *   npm run db:migrate -- --no-app-setup           structure and roles only (skip the application's own seeding)
 *   npm run db:migrate -- --verbose                also list columns whose type differs and things only in the database
 *
 * Connection: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME from server/.env. See doc/30-database-migration.md.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null;
};

const STATUS = flag('status');
const DRY_RUN = flag('dry-run') || STATUS;
const VERBOSE = flag('verbose');
const SKIP_APP_SETUP = flag('no-app-setup');
const DB_NAME = option('database') || process.env.DB_NAME || 'db_bex_sign';
const SCHEMA_FILE = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'database', 'seed.sql');

if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}
if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
  console.error(`"${DB_NAME}" is not a usable database name (letters, digits and _ only).`);
  process.exit(1);
}

const q = (name) => `\`${String(name).replace(/`/g, '')}\``;
const log = (text = '') => console.log(text);

/* ---------------------------------------------------------------- the target structure */

/**
 * The tables of schema.sql: [{ name, createSql, columns: [{ name, definition }], indexes: [{ name, definition }],
 * foreignKeys: [{ name, definition }] }]
 */
function readSchema() {
  if (!fs.existsSync(SCHEMA_FILE)) throw new Error(`${SCHEMA_FILE} is missing. Create it with "npm run db:snapshot" on a development machine.`);
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf8').replace(/\r\n/g, '\n');
  const tables = [];
  const pattern = /CREATE TABLE IF NOT EXISTS `([^`]+)` \(\n([\s\S]*?)\n\) ([^;]*);/g;
  let match;
  while ((match = pattern.exec(sql))) {
    const table = { name: match[1], createSql: match[0].replace(/;$/, ''), columns: [], indexes: [], foreignKeys: [] };
    match[2].split('\n').map((line) => line.trim().replace(/,$/, '')).filter(Boolean).forEach((line) => {
      let m;
      if ((m = /^`([^`]+)` (.+)$/.exec(line))) table.columns.push({ name: m[1], definition: line });
      else if (/^PRIMARY KEY/.test(line)) table.indexes.push({ name: 'PRIMARY', definition: line });
      else if ((m = /^(?:UNIQUE |FULLTEXT |SPATIAL )?KEY `([^`]+)`/.exec(line))) table.indexes.push({ name: m[1], definition: line });
      else if ((m = /^CONSTRAINT `([^`]+)` FOREIGN KEY/.exec(line))) table.foreignKeys.push({ name: m[1], definition: line });
    });
    tables.push(table);
  }
  if (tables.length === 0) throw new Error(`${SCHEMA_FILE} contains no table definitions.`);
  return { tables, hash: crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16) };
}

/** A column definition without the things that differ between servers but mean the same. */
const normalize = (definition) => String(definition)
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/\b(tiny|small|medium|big)?int\(\d+\)/g, '$1int')
  .replace(/current_timestamp\(\)/g, 'current_timestamp')
  .replace(/ character set \w+/g, '')
  .replace(/ collate \w+/g, '')
  .replace(/ check \(json_valid\([^)]*\)\)/g, '')
  .replace(/\bjson\b/g, 'longtext')
  .trim();

/* ---------------------------------------------------------------- run */

async function main() {
  const schema = readSchema();
  const server = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false
  });
  const report = { createdDatabase: false, tablesCreated: [], columnsAdded: [], columnsRelaxed: [], indexesAdded: [], foreignKeysAdded: [], warnings: [], differences: [], extras: [], seeded: 0 };
  const planned = [];
  /** Runs a statement that changes the structure (or only notes it in a dry run). Returns false when it failed. */
  const change = async (sql, describe, onError) => {
    planned.push(sql);
    if (DRY_RUN) return true;
    try {
      await server.query(sql);
      return true;
    } catch (err) {
      report.warnings.push(`${describe}: ${err.message}`);
      if (onError) onError(err);
      return false;
    }
  };

  try {
    const [[{ version }]] = await server.query('SELECT VERSION() AS version');
    log(`BexSign database migration${DRY_RUN ? ' (dry run: nothing is changed)' : ''}`);
    log(`  Server    ${process.env.DB_HOST || 'localhost'}:${Number(process.env.DB_PORT) || 3306} (${version})`);
    log(`  Database  ${DB_NAME}`);
    log(`  Schema    ${schema.tables.length} tables, version ${schema.hash}`);
    log();

    const [found] = await server.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [DB_NAME]);
    const databaseExists = found.length > 0;
    if (!databaseExists) {
      report.createdDatabase = true;
      await change(`CREATE DATABASE ${q(DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`, `Create database ${DB_NAME}`);
    }
    if (databaseExists || !DRY_RUN) await server.query(`USE ${q(DB_NAME)}`);

    const existingTables = new Set();
    if (databaseExists) {
      const [rows] = await server.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [DB_NAME]);
      rows.forEach((r) => existingTables.add(r.name));
    }

    if (!DRY_RUN) {
      await server.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          schema_version VARCHAR(32) NOT NULL,
          tables_created INT NOT NULL DEFAULT 0,
          columns_added INT NOT NULL DEFAULT 0,
          indexes_added INT NOT NULL DEFAULT 0,
          warnings INT NOT NULL DEFAULT 0,
          details MEDIUMTEXT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }

    /* ---- tables that do not exist: created exactly as in the schema file (foreign keys checked afterwards) */
    if (!DRY_RUN) await server.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of schema.tables.filter((t) => !existingTables.has(t.name))) {
      if (await change(table.createSql, `Create table ${table.name}`)) report.tablesCreated.push(table.name);
    }
    if (!DRY_RUN) await server.query('SET FOREIGN_KEY_CHECKS = 1');

    /* ---- tables that exist: missing columns, then missing indexes, then missing foreign keys */
    for (const table of schema.tables.filter((t) => existingTables.has(t.name))) {
      const [columnRows] = await server.query(`SHOW COLUMNS FROM ${q(table.name)}`);
      const present = new Set(columnRows.map((c) => c.Field));
      const [[createRow]] = await server.query(`SHOW CREATE TABLE ${q(table.name)}`);
      const currentLines = new Map();
      String(createRow['Create Table']).split('\n').forEach((line) => {
        const m = /^\s*`([^`]+)` (.+?),?$/.exec(line);
        if (m) currentLines.set(m[1], line.trim().replace(/,$/, ''));
      });

      for (const [index, column] of table.columns.entries()) {
        if (present.has(column.name)) {
          const current = normalize(currentLines.get(column.name));
          const target = normalize(column.definition);
          // The one change made to an existing column: a required column the application now leaves empty becomes
          // optional. Nothing stored is lost by that; every other difference is only reported.
          const onlyNullability = current !== target && current.replace(' not null', '') === target.replace(' default null', '') && / not null/.test(current) && !/auto_increment/.test(current);
          if (onlyNullability) {
            if (await change(`ALTER TABLE ${q(table.name)} MODIFY COLUMN ${column.definition}`, `Make ${table.name}.${column.name} optional`)) report.columnsRelaxed.push(`${table.name}.${column.name}`);
          } else if (current !== target) {
            report.differences.push(`${table.name}.${column.name}: database has "${(currentLines.get(column.name) || '').replace(/^`[^`]+` /, '')}", schema has "${column.definition.replace(/^`[^`]+` /, '')}"`);
          }
          continue;
        }
        if (/\bAUTO_INCREMENT\b/i.test(column.definition)) {
          report.warnings.push(`${table.name}.${column.name} is an AUTO_INCREMENT key that is missing: add it by hand, it cannot be added safely to a table with rows.`);
          continue;
        }
        // Kept in the order of the schema file when the column before it is there
        const before = table.columns.slice(0, index).reverse().find((c) => present.has(c.name));
        const sql = `ALTER TABLE ${q(table.name)} ADD COLUMN ${column.definition}${before ? ` AFTER ${q(before.name)}` : ''}`;
        if (await change(sql, `Add column ${table.name}.${column.name}`)) {
          report.columnsAdded.push(`${table.name}.${column.name}`);
          present.add(column.name);
        }
      }
      columnRows.filter((c) => !table.columns.some((t) => t.name === c.Field)).forEach((c) => report.extras.push(`column ${table.name}.${c.Field}`));

      const [indexRows] = await server.query(`SHOW INDEX FROM ${q(table.name)}`);
      const indexNames = new Set(indexRows.map((i) => i.Key_name));
      for (const index of table.indexes.filter((i) => !indexNames.has(i.name))) {
        // An index over a column that could not be added is skipped with that column's warning
        const columnsOfIndex = [...index.definition.matchAll(/`([^`]+)`/g)].map((m) => m[1]).slice(index.name === 'PRIMARY' ? 0 : 1);
        if (columnsOfIndex.some((c) => !present.has(c))) continue;
        const sql = `ALTER TABLE ${q(table.name)} ADD ${index.definition}`;
        const ok = await change(sql, `Add index ${table.name}.${index.name}`);
        if (ok) report.indexesAdded.push(`${table.name}.${index.name}`);
      }

      const [constraintRows] = await server.query(
        "SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
        [DB_NAME, table.name]
      );
      const constraintNames = new Set(constraintRows.map((c) => c.name));
      for (const foreignKey of table.foreignKeys.filter((f) => !constraintNames.has(f.name))) {
        // Checked against the rows that exist: rows pointing at a missing parent make it fail, and it is reported
        const sql = `ALTER TABLE ${q(table.name)} ADD ${foreignKey.definition}`;
        if (await change(sql, `Add foreign key ${table.name}.${foreignKey.name} (existing rows may not satisfy it)`)) {
          report.foreignKeysAdded.push(`${table.name}.${foreignKey.name}`);
        }
      }
    }
    [...existingTables].filter((name) => name !== 'schema_migrations' && !schema.tables.some((t) => t.name === name)).forEach((name) => report.extras.push(`table ${name}`));

    /* ---- reference data: the built-in roles (existing rows are left as they are) */
    if (fs.existsSync(SEED_FILE)) {
      const statements = fs.readFileSync(SEED_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^INSERT IGNORE INTO /i.test(l)).map((l) => l.replace(/;$/, ''));
      for (const statement of statements) {
        if (DRY_RUN) continue;
        try {
          const [result] = await server.query(statement);
          report.seeded += result.affectedRows || 0;
        } catch (err) {
          report.warnings.push(`Seed row not added: ${err.message}`);
        }
      }
      if (DRY_RUN && (report.createdDatabase || report.tablesCreated.includes('roles'))) report.seeded = statements.length;
    }

    /* ---- the application's own setup: permissions, role permissions, default settings */
    let appSetup = 'skipped';
    if (!DRY_RUN && !SKIP_APP_SETUP) {
      try {
        process.env.DB_NAME = DB_NAME;
        await require('../utils/platformSchema').ensurePlatformSchema();
        await require('../utils/requestHelpers').ensureRequestSchema();
        await require('../utils/cloudStorage').ensureCloudSchema();
        appSetup = 'done';
      } catch (err) {
        appSetup = 'failed';
        report.warnings.push(`The application's own setup did not finish (it runs again when the server starts): ${err.message}`);
      }
    }

    /* ---- report */
    const list = (title, items) => {
      if (items.length === 0) return;
      log(`${title} (${items.length})`);
      items.forEach((item) => log(`  ${item}`));
      log();
    };
    if (report.createdDatabase) log(`${DRY_RUN ? 'Would create' : 'Created'} the database ${DB_NAME}.\n`);
    list(`${DRY_RUN ? 'Tables to create' : 'Tables created'}`, DRY_RUN ? schema.tables.filter((t) => !existingTables.has(t.name)).map((t) => t.name) : report.tablesCreated);
    list(`${DRY_RUN ? 'Columns to add' : 'Columns added'}`, report.columnsAdded);
    list(`${DRY_RUN ? 'Required columns to make optional' : 'Required columns made optional'}`, report.columnsRelaxed);
    list(`${DRY_RUN ? 'Indexes to add' : 'Indexes added'}`, report.indexesAdded);
    list(`${DRY_RUN ? 'Foreign keys to add' : 'Foreign keys added'}`, report.foreignKeysAdded);
    if (report.seeded > 0) log(`${DRY_RUN ? 'Built-in roles to add' : 'Built-in roles added'}: ${report.seeded}\n`);
    if (!DRY_RUN) log(`Application setup (permissions, default settings): ${appSetup}\n`);
    list('Warnings', report.warnings);
    if (VERBOSE) {
      list('Columns whose definition differs from the schema file (left unchanged)', report.differences);
      list('Only in the database (left untouched)', report.extras);
    } else if (report.differences.length + report.extras.length > 0) {
      log(`${report.differences.length} column definition(s) differ from the schema file and ${report.extras.length} table(s)/column(s) exist only in the database. They are left as they are; add --verbose to list them.\n`);
    }

    const changes = planned.length;
    const structural = report.tablesCreated.length + report.columnsAdded.length + report.columnsRelaxed.length + report.indexesAdded.length + report.foreignKeysAdded.length
      + (DRY_RUN ? schema.tables.filter((t) => !existingTables.has(t.name)).length : 0);
    if (DRY_RUN) {
      log(changes === 0 ? 'The database is up to date. Nothing to do.' : `${changes} change(s) would be made. Run "npm run db:migrate" to apply them.`);
    } else {
      if (structural > 0 || report.seeded > 0 || report.warnings.length > 0 || report.createdDatabase) {
        await server.query(
          'INSERT INTO schema_migrations (schema_version, tables_created, columns_added, indexes_added, warnings, details) VALUES (?, ?, ?, ?, ?, ?)',
          [schema.hash, report.tablesCreated.length, report.columnsAdded.length, report.indexesAdded.length + report.foreignKeysAdded.length, report.warnings.length,
            JSON.stringify({ tablesCreated: report.tablesCreated, columnsAdded: report.columnsAdded, columnsRelaxed: report.columnsRelaxed, indexesAdded: report.indexesAdded, foreignKeysAdded: report.foreignKeysAdded, warnings: report.warnings })]
        );
      }
      log(structural === 0 && !report.createdDatabase
        ? 'The database was already up to date.'
        : `Done: ${report.tablesCreated.length} table(s) created, ${report.columnsAdded.length} column(s), ${report.indexesAdded.length} index(es) and ${report.foreignKeysAdded.length} foreign key(s) added${report.columnsRelaxed.length ? `, ${report.columnsRelaxed.length} required column(s) made optional` : ''}.`);
      if (report.warnings.length > 0) log(`${report.warnings.length} warning(s) above need a look.`);
    }

    if (STATUS && databaseExists && existingTables.has('schema_migrations')) {
      const [history] = await server.query('SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 10');
      log('\nEarlier runs');
      if (history.length === 0) log('  none recorded');
      history.forEach((h) => log(`  ${new Date(h.applied_at).toISOString().slice(0, 16).replace('T', ' ')}  version ${h.schema_version}  +${h.tables_created} tables  +${h.columns_added} columns  +${h.indexes_added} indexes  ${h.warnings} warning(s)`));
    }
    return report.warnings.length > 0 ? 2 : 0;
  } finally {
    await server.end().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`\nMigration failed: ${err.message}`);
    if (err.code === 'ECONNREFUSED') console.error('The database server is not reachable. Start MySQL / MariaDB and check DB_HOST and DB_PORT in server/.env.');
    if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('Check DB_USER and DB_PASSWORD in server/.env.');
    process.exit(1);
  });
