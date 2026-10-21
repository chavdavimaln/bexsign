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
 * Before that it applies the versioned SQL files in server/migrations/ (0001_initial_schema.sql, then every later
 * file in name order) that this database has not seen yet, and records each in migration_files. The folder is the
 * history of structure changes; schema.sql is the current state and acts as the safety net.
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
 *   npm run db:make <name>             write a new file in server/migrations/ with the SQL this database still needs
 *                                      (or an empty template to fill in by hand when it is up to date)
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
// The name may follow --make directly or come as the first word that is not an option (npm run db:make -- --database x name)
const optionValues = ['database', 'make'].map((name) => option(name)).filter(Boolean);
const MAKE = flag('make') ? (option('make') || args.find((a) => !a.startsWith('--') && !optionValues.includes(a)) || 'change') : null;
const DRY_RUN = flag('dry-run') || STATUS || Boolean(MAKE);
const VERBOSE = flag('verbose');
const SKIP_APP_SETUP = flag('no-app-setup');
const DB_NAME = option('database') || process.env.DB_NAME || 'db_bex_sign';
const SCHEMA_FILE = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'database', 'seed.sql');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
// Errors that mean "this part was done before": the statement is skipped and the file still counts as applied
const ALREADY_DONE = new Set([1050, 1060, 1061, 1062, 1022, 1826, 1091, 1054]);

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

/* ---------------------------------------------------------------- the migration files */

/** The SQL files of server/migrations/ in name order: [{ name, file, sql, checksum }] */
function readMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4,}[_-].*\.sql$/i.test(name))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8').replace(/\r\n/g, '\n');
      return { name, file: path.join(MIGRATIONS_DIR, name), sql, checksum: crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16) };
    });
}

/** The statements of a SQL file: split on ";" outside quotes, "--" and "#" comment lines removed. */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  const lines = sql.split('\n');
  for (const line of lines) {
    if (!quote && /^\s*(--|#)/.test(line)) continue;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        current += ch;
        if (ch === '\\' && i + 1 < line.length) {
          current += line[++i];
        } else if (ch === quote) quote = null;
      } else if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        current += ch;
      } else if (ch === ';') {
        if (current.trim()) statements.push(current.trim());
        current = '';
      } else current += ch;
    }
    current += '\n';
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter((st) => !/^(SET\s+(NAMES|FOREIGN_KEY_CHECKS)|USE\s)/i.test(st));
}

const localTime = (value) => { const d = new Date(value); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
};

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
  const report = { createdDatabase: false, filesApplied: [], filesPending: [], tablesCreated: [], columnsAdded: [], columnsRelaxed: [], indexesAdded: [], foreignKeysAdded: [], warnings: [], differences: [], extras: [], seeded: 0 };
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

    /* ---- versioned files in server/migrations/, in order; each file is recorded once it ran */
    const migrationFiles = readMigrationFiles();
    if (migrationFiles.length > 0) {
      let applied = new Set();
      if (databaseExists && existingTables.has('migration_files')) {
        const [rows] = await server.query('SELECT name FROM migration_files');
        applied = new Set(rows.map((r) => r.name));
      }
      const pending = migrationFiles.filter((m) => !applied.has(m.name));
      report.filesPending = pending.map((m) => m.name);
      if (!DRY_RUN && pending.length > 0) {
        await server.query(
          `CREATE TABLE IF NOT EXISTS migration_files (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL UNIQUE,
            checksum VARCHAR(32) NOT NULL,
            statements INT NOT NULL DEFAULT 0,
            skipped INT NOT NULL DEFAULT 0,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        );
        await server.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const migration of pending) {
          const statements = splitStatements(migration.sql);
          let skipped = 0;
          let failed = null;
          for (const [index, statement] of statements.entries()) {
            try {
              await server.query(statement);
            } catch (err) {
              if (ALREADY_DONE.has(err.errno)) {
                skipped += 1;
                continue;
              }
              failed = `statement ${index + 1} of ${migration.name}: ${err.message}`;
              break;
            }
          }
          if (failed) {
            report.warnings.push(`Migration file stopped at ${failed}. Fix the file (or the database) and run again; later files were not applied.`);
            break;
          }
          await server.query('INSERT INTO migration_files (name, checksum, statements, skipped) VALUES (?, ?, ?, ?)', [migration.name, migration.checksum, statements.length, skipped]);
          report.filesApplied.push(`${migration.name} (${statements.length} statement${statements.length === 1 ? '' : 's'}${skipped ? `, ${skipped} already done` : ''})`);
        }
        await server.query('SET FOREIGN_KEY_CHECKS = 1');
        // The files may have created tables: look again before the schema file is compared
        existingTables.clear();
        const [rows] = await server.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [DB_NAME]);
        rows.forEach((r) => existingTables.add(r.name));
      }
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
    [...existingTables].filter((name) => !['schema_migrations', 'migration_files'].includes(name) && !schema.tables.some((t) => t.name === name)).forEach((name) => report.extras.push(`table ${name}`));

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
    list(DRY_RUN ? 'Migration files to apply (server/migrations)' : 'Migration files applied (server/migrations)', DRY_RUN ? report.filesPending : report.filesApplied);
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
    if (MAKE) {
      // A new versioned file with exactly the SQL this database still needs (what the dry run planned)
      const slug = String(MAKE).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'change';
      const name = `${stamp()}_${slug}.sql`;
      const target = path.join(MIGRATIONS_DIR, name);
      const body = planned.filter((sql) => !/^CREATE DATABASE/i.test(sql));
      const lines = [
        `-- BexSign migration: ${slug.replace(/_/g, ' ')}`,
        `-- Created ${localTime(new Date())} by "npm run db:make" from the difference between ${DB_NAME} and database/schema.sql.`,
        '-- Applied in name order by "npm run db:migrate"; a statement whose change already exists is skipped.',
        '-- Add further statements by hand below. One statement per ";". Only add or loosen: never drop data.',
        ''
      ];
      if (body.length === 0) lines.push('-- (The database already matched the schema file when this was created: add your statements here.)', '');
      else body.forEach((sql) => lines.push(`${sql};`, ''));
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      fs.writeFileSync(target, lines.join('\n'));
      log(`Wrote ${path.relative(process.cwd(), target)} with ${body.length} statement(s).`);
      if (report.filesPending.length > 0) log(`Note: ${report.filesPending.length} earlier migration file(s) are not applied to this database yet, so their changes may be repeated in the new file. Run "npm run db:migrate" first to avoid that.`);
    } else if (DRY_RUN) {
      const total = changes + report.filesPending.length;
      log(total === 0 ? 'The database is up to date. Nothing to do.' : `${total} change(s) would be made. Run "npm run db:migrate" to apply them.`);
    } else {
      if (structural > 0 || report.filesApplied.length > 0 || report.seeded > 0 || report.warnings.length > 0 || report.createdDatabase) {
        await server.query(
          'INSERT INTO schema_migrations (schema_version, tables_created, columns_added, indexes_added, warnings, details) VALUES (?, ?, ?, ?, ?, ?)',
          [schema.hash, report.tablesCreated.length, report.columnsAdded.length, report.indexesAdded.length + report.foreignKeysAdded.length, report.warnings.length,
            JSON.stringify({ tablesCreated: report.tablesCreated, columnsAdded: report.columnsAdded, columnsRelaxed: report.columnsRelaxed, indexesAdded: report.indexesAdded, foreignKeysAdded: report.foreignKeysAdded, warnings: report.warnings })]
        );
      }
      log(structural === 0 && report.filesApplied.length === 0 && !report.createdDatabase
        ? 'The database was already up to date.'
        : `Done: ${report.tablesCreated.length} table(s) created, ${report.columnsAdded.length} column(s), ${report.indexesAdded.length} index(es) and ${report.foreignKeysAdded.length} foreign key(s) added${report.columnsRelaxed.length ? `, ${report.columnsRelaxed.length} required column(s) made optional` : ''}.`);
      if (report.warnings.length > 0) log(`${report.warnings.length} warning(s) above need a look.`);
    }

    if (STATUS && databaseExists && existingTables.has('migration_files')) {
      const [files] = await server.query('SELECT name, applied_at, statements, skipped FROM migration_files ORDER BY name');
      log('\nMigration files applied to this database');
      if (files.length === 0) log('  none');
      files.forEach((f) => log(`  ${localTime(f.applied_at)}  ${f.name}  (${f.statements} statements${f.skipped ? `, ${f.skipped} already done` : ''})`));
    }
    if (STATUS && databaseExists && existingTables.has('schema_migrations')) {
      const [history] = await server.query('SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 10');
      log('\nEarlier runs');
      if (history.length === 0) log('  none recorded');
      history.forEach((h) => log(`  ${localTime(h.applied_at)}  version ${h.schema_version}  +${h.tables_created} tables  +${h.columns_added} columns  +${h.indexes_added} indexes  ${h.warnings} warning(s)`));
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
