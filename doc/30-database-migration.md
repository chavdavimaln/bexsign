# 30 — Database Migration

One command brings any BexSign database — a brand-new server, or an older copy of the database — to the structure
the current code expects.

```
cd server
npm run db:migrate
```

Files: `server/scripts/migrate.js` (the migration), `server/database/schema.sql` (the target structure, 68 tables),
`server/database/seed.sql` (the three built-in roles), `server/scripts/snapshot-schema.js` (regenerates the two
SQL files).

---

## 1. What it does

1. Connects with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` from `server/.env`.
2. **Creates the database** `DB_NAME` (utf8mb4) when it does not exist.
3. **Creates every missing table** exactly as defined in `schema.sql`.
4. For tables that exist: **adds missing columns** (in schema order), **missing indexes** and **missing foreign
   keys**.
5. Makes a required (`NOT NULL`) column **optional** when the schema says it now is — the only change ever made to
   an existing column, and one that cannot lose data.
6. Adds the **built-in roles** (Manager, Leader, Team Member) if they are missing.
7. Runs the **application's own setup**: the 34 permissions, the default permissions of each role, the default
   general and developer settings.
8. Writes one row to the `schema_migrations` table describing what was done.

### What it never does

- It never drops a table, a column, an index or a row.
- It never changes a column's type or shortens it. A column whose definition differs from `schema.sql` is
  **reported** and left alone.
- Tables and columns that exist only in your database are left untouched.

So it is safe to run on a database with live data, and safe to run again: a second run reports
*"The database was already up to date."*

---

## 2. Commands

Run them in `server/`.

| Command | What it does |
|---|---|
| `npm run db:migrate` | Apply the migration |
| `npm run db:migrate -- --dry-run` | List what would be done; change nothing |
| `npm run db:status` | The dry run, plus the last ten recorded runs |
| `npm run db:migrate -- --verbose` | Also list column definitions that differ and things only in the database |
| `npm run db:migrate -- --database other_db` | Use another database than `DB_NAME` (same server and user) |
| `npm run db:migrate -- --no-app-setup` | Structure and roles only; skip step 7 |
| `npm run db:snapshot` | Developers: regenerate `schema.sql` and `seed.sql` from the development database |

(The `--` before the options is how npm passes them through to the script.)

Exit code: `0` success, `2` finished with warnings, `1` could not run.

---

## 3. New server, step by step

1. Install MySQL 8 or MariaDB 10.4+ and Node.js.
2. Create a database user for BexSign (as the database administrator):

   ```sql
   CREATE USER 'bexsign'@'localhost' IDENTIFIED BY 'a-strong-password';
   GRANT ALL PRIVILEGES ON db_bex_sign.* TO 'bexsign'@'localhost';
   FLUSH PRIVILEGES;
   ```

   A user limited to one database cannot create it, so either create the empty database yourself
   (`CREATE DATABASE db_bex_sign CHARACTER SET utf8mb4;`) or run the migration once as an administrator.
3. Copy `server/.env.example` to `server/.env` and fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   (and `DB_PORT` if it is not 3306).
4. `cd server`, `npm install`, then:

   ```
   npm run db:migrate -- --dry-run
   npm run db:migrate
   ```

   Expected: *68 table(s) created*, *Built-in roles added: 3*, *Application setup: done*.
5. `npm start`, open the app and register the first account.

No SQL dump has to be imported. (Import a dump only when you want to move existing **data** — see section 5.)

---

## 4. Updating an existing server

Do this every time new code is deployed.

1. **Back up first.** The migration only adds, but a backup is what makes any change reversible:

   ```
   mysqldump -u bexsign -p --single-transaction --routines db_bex_sign > backup_YYYYMMDD.sql
   ```

2. Deploy the new code (`git pull`, `npm install` in `server/`).
3. Look, then apply:

   ```
   npm run db:migrate -- --dry-run
   npm run db:migrate
   ```

4. Restart the API (`npm start`, or your process manager).

The application also adds some of its own tables and columns when it starts. The migration does all of that and
the rest in one visible, recorded step, so nothing depends on which pages people happen to open first.

To undo: restore the backup (`mysql -u bexsign -p db_bex_sign < backup_YYYYMMDD.sql`). There is no automatic
"down" migration, because nothing is ever removed.

---

## 5. Moving data to another server

1. On the old server: `mysqldump -u root -p --single-transaction db_bex_sign > bexsign_data.sql`
2. On the new server: `mysql -u bexsign -p db_bex_sign < bexsign_data.sql`
3. `npm run db:migrate` — brings the imported database up to the structure of the code on the new server.
4. Copy the `server/uploads/` folder too: the database stores paths, the files live there.
5. Keep the same `JWT_SECRET` / `INTEGRATION_SECRET_KEY`, or saved integration secrets and cloud connections cannot
   be decrypted and have to be entered again.

---

## 6. Reading the output

```
BexSign database migration
  Server    localhost:3306 (10.4.32-MariaDB)
  Database  db_bex_sign
  Schema    68 tables, version f6905274831a10de

Tables created (25)
  cloud_connections
  …
Columns added (88)
  documents.folder_id
  …
Required columns made optional (4)
  templates.file_path
  …
Indexes added (9)
  …
Application setup (permissions, default settings): done

Done: 25 table(s) created, 88 column(s), 9 index(es) and 0 foreign key(s) added, 4 required column(s) made optional.
```

- **Schema version** is a fingerprint of `schema.sql`; it changes whenever the structure does.
- **Warnings** name the statement that failed and why; everything else was still applied. Typical causes:

  | Warning | Meaning | What to do |
  |---|---|---|
  | Add index … Duplicate entry | A unique index cannot be built because rows repeat the value | Remove or merge the duplicates, run again |
  | Add foreign key … existing rows may not satisfy it | Rows point at a parent row that no longer exists | Delete the orphan rows, run again; the app works without the key |
  | … is an AUTO_INCREMENT key that is missing | A table lacks its id column | Fix by hand; this does not happen with databases created by BexSign |
  | The application's own setup did not finish | Step 7 failed | It runs again when the server starts; check the message |

- *"N column definition(s) differ …"* is information, not an error. Run with `--verbose` to see them.

History of runs: `SELECT * FROM schema_migrations ORDER BY id DESC;` (or `npm run db:status`).

---

## 7. For developers: keeping the schema file current

`schema.sql` is **generated**, never edited by hand.

1. Change the structure the way the application does it (an `ensure…Schema` helper with
   `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN`), and run the app so your development database has it.
2. `npm run db:snapshot` — rewrites `server/database/schema.sql` from the development database (structure only: no
   documents, users or other data are written) and `seed.sql` with the built-in roles.
3. Commit both files with the code change.
4. Everyone else, and every server, runs `npm run db:migrate`.

---

## 8. Good to know

- **Tested on** MariaDB 10.4 (XAMPP): an empty database (68 tables created), a second run (nothing to do), and the
  oldest project dump `db_bex_sign_170926.sql` (43 tables → 25 tables, 88 columns and 9 indexes added, data kept).
  The schema file uses MariaDB's `SHOW CREATE TABLE` wording, which MySQL 8.0.16+ also accepts; it has not been run
  against MySQL 8 here, so do the first run there with `--dry-run` and a backup.
- The migration creates no user accounts. Register the first account in the app; roles are managed under **Users**.
- The dated dumps in the project root (`db_bex_sign_*.sql`) and the older `server/database.sql` /
  `server/db_migration_completed.sql` are no longer needed to set up a database. They contain data and are kept
  only as history.
- The migration needs the database server to be running. Locally with XAMPP:
  `G:\xampp\mysql\bin\mysqld.exe --defaults-file=G:\xampp\mysql\bin\my.ini --standalone`.
