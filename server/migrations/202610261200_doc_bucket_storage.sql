-- ----------------------------------------------------------------------------------------------
-- Doc bucket storage (doc/31-doc-bucket.md)
--
-- Records, next to every stored file, WHICH store holds it and under which key, so the same
-- database works whether documents live on the server's own disk or in an S3 / Azure / GCS
-- bucket - and so a half-finished move can be resumed instead of restarted.
--
-- Additive only: every existing row keeps its file_path and is marked 'local', which is exactly
-- where those files are today. Nothing is dropped, renamed or rewritten, and running this file a
-- second time finds nothing to do.
--
--   npm run db:migrate --prefix server             apply
--   npm run db:migrate --prefix server -- --dry-run   show what it would do
-- ----------------------------------------------------------------------------------------------

-- documents.file_path
ALTER TABLE `documents` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `file_path`;
ALTER TABLE `documents` ADD COLUMN `storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;

-- document_files.file_path and .signed_file_path
ALTER TABLE `document_files` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `file_path`;
ALTER TABLE `document_files` ADD COLUMN `storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;
ALTER TABLE `document_files` ADD COLUMN `signed_storage_key` varchar(400) DEFAULT NULL AFTER `signed_file_path`;

-- document_versions.file_path
ALTER TABLE `document_versions` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `file_path`;
ALTER TABLE `document_versions` ADD COLUMN `storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;

-- document_recipients.physical_copy_path (scans of copies signed on paper)
ALTER TABLE `document_recipients` ADD COLUMN `physical_copy_storage_key` varchar(400) DEFAULT NULL AFTER `physical_copy_path`;

-- self_sign_documents.signed_file_path
ALTER TABLE `self_sign_documents` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `signed_file_path`;
ALTER TABLE `self_sign_documents` ADD COLUMN `signed_storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;

-- templates.file_path
ALTER TABLE `templates` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `file_path`;
ALTER TABLE `templates` ADD COLUMN `storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;

-- issued_pdf_fingerprints.file_path (the hash of every PDF ever issued - the legal record)
ALTER TABLE `issued_pdf_fingerprints` ADD COLUMN `storage_provider` varchar(20) NOT NULL DEFAULT 'local' AFTER `file_path`;
ALTER TABLE `issued_pdf_fingerprints` ADD COLUMN `storage_key` varchar(400) DEFAULT NULL AFTER `storage_provider`;

-- ----------------------------------------------------------------------------------------------
-- The bucket's own ledger: one row per object, written when a file is saved and when the
-- migration script copies an old file up. 'status' lets a move be verified and resumed:
--   pending   found on disk, not copied yet
--   stored    in the bucket
--   verified  in the bucket and its SHA-256 matches the local copy
--   missing   the row points at a file that is in neither place
--   failed    the copy was attempted and did not work (error_text says why)
-- ----------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doc_bucket_objects` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `object_key` varchar(400) NOT NULL,
  `provider` varchar(20) NOT NULL DEFAULT 'local',
  `bucket_name` varchar(190) DEFAULT NULL,
  `area` varchar(40) DEFAULT NULL,
  `byte_size` bigint(20) DEFAULT NULL,
  `content_type` varchar(100) DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `source_table` varchar(64) DEFAULT NULL,
  `source_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'stored',
  `has_local_copy` tinyint(1) NOT NULL DEFAULT 1,
  `error_text` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doc_bucket_object` (`object_key`(191), `provider`),
  KEY `idx_doc_bucket_status` (`status`),
  KEY `idx_doc_bucket_area` (`area`),
  KEY `idx_doc_bucket_source` (`source_table`, `source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------------------------
-- Existing rows: the key is the file path with everything up to and including "uploads/" removed,
-- which is exactly the key the doc bucket uses. Only rows that do not have one yet are touched,
-- so this is safe to re-run and never overwrites a key the application has already written.
-- ----------------------------------------------------------------------------------------------
UPDATE `documents`
   SET `storage_key` = SUBSTRING_INDEX(REPLACE(`file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `file_path` IS NOT NULL AND `file_path` <> '' AND `storage_key` IS NULL;

UPDATE `document_files`
   SET `storage_key` = SUBSTRING_INDEX(REPLACE(`file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `file_path` IS NOT NULL AND `file_path` <> '' AND `storage_key` IS NULL;

UPDATE `document_files`
   SET `signed_storage_key` = SUBSTRING_INDEX(REPLACE(`signed_file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `signed_file_path` IS NOT NULL AND `signed_file_path` <> '' AND `signed_storage_key` IS NULL;

UPDATE `document_versions`
   SET `storage_key` = SUBSTRING_INDEX(REPLACE(`file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `file_path` IS NOT NULL AND `file_path` <> '' AND `storage_key` IS NULL;

UPDATE `document_recipients`
   SET `physical_copy_storage_key` = SUBSTRING_INDEX(REPLACE(`physical_copy_path`, '\\', '/'), 'uploads/', -1)
 WHERE `physical_copy_path` IS NOT NULL AND `physical_copy_path` <> '' AND `physical_copy_storage_key` IS NULL;

UPDATE `self_sign_documents`
   SET `signed_storage_key` = SUBSTRING_INDEX(REPLACE(`signed_file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `signed_file_path` IS NOT NULL AND `signed_file_path` <> '' AND `signed_storage_key` IS NULL;

UPDATE `templates`
   SET `storage_key` = SUBSTRING_INDEX(REPLACE(`file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `file_path` IS NOT NULL AND `file_path` <> '' AND `storage_key` IS NULL;

UPDATE `issued_pdf_fingerprints`
   SET `storage_key` = SUBSTRING_INDEX(REPLACE(`file_path`, '\\', '/'), 'uploads/', -1)
 WHERE `file_path` IS NOT NULL AND `file_path` <> '' AND `storage_key` IS NULL;
