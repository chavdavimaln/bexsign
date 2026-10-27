# Database migrations

Versioned SQL files, applied in name order by `npm run db:migrate` (in `server/`). Each file runs once per
database; `migration_files` in the database remembers which ones ran.

| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | the complete structure (68 tables), generated from `database/schema.sql` |
| `202610261200_doc_bucket_storage.sql` | doc bucket: `storage_provider` / `storage_key` next to every stored path, plus the `doc_bucket_objects` ledger ([doc/31](../../doc/31-doc-bucket.md)) |
| `YYYYMMDDHHMM_<name>.sql` | one change each, created with `npm run db:make <name>` |

## Adding a change

1. Change the structure in the application (an `ensure…Schema` helper) and run the app once, or run the
   `ALTER TABLE` by hand on your development database.
2. `npm run db:snapshot` - updates `database/schema.sql` from your development database.
3. `npm run db:make <name>` against a database that does **not** have the change yet (for example
   `npm run db:make -- --database staging_copy add_invoice_number`): the file receives exactly the SQL that
   database still needs. Against an up-to-date database it creates an empty file for you to fill in by hand.
4. Commit the file together with `schema.sql`. Every server picks it up on its next `npm run db:migrate`.

Rules: one statement per `;`; only add tables, columns, indexes, rows, or loosen a column - never drop data.
A statement whose change already exists (duplicate column, index, table, row) is skipped, so a file can be
applied safely to a database that was updated another way. See `doc/30-database-migration.md`.
