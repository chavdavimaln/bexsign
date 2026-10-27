-- ----------------------------------------------------------------------------------------------
-- The archive covers self-sign documents and templates too (doc/35-document-archive.md)
--
-- `document_archive` was written for signature requests. Self-sign documents and templates are
-- deleted for good the same way and were just as unrecoverable, so the table now holds all three
-- and says which kind each row is.
--
-- `document_id` becomes `item_id`: for a template it holds a template id, so the old name was
-- misleading. The table carries no rows in any deployment yet, so this renames a column rather
-- than moving data.
--
-- Both statements are skipped if they have already happened (duplicate column, unknown column), so
-- running this file again is safe.
--
--   npm run db:migrate --prefix server             apply
--   npm run db:migrate --prefix server -- --dry-run   show what it would do
-- ----------------------------------------------------------------------------------------------

-- 'document' (a signature request), 'self_sign' or 'template'
ALTER TABLE `document_archive` ADD COLUMN `item_type` varchar(20) NOT NULL DEFAULT 'document' AFTER `id`;

-- The id the thing had before it was deleted, whichever kind it is
ALTER TABLE `document_archive` CHANGE COLUMN `document_id` `item_id` int(11) NOT NULL;

ALTER TABLE `document_archive` ADD INDEX `idx_document_archive_type` (`item_type`);
