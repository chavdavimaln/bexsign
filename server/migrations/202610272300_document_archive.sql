-- ----------------------------------------------------------------------------------------------
-- Document archive (doc/35-document-archive.md)
--
-- The last copy of a document that was deleted for good. Until now a permanent delete dropped the
-- rows and left the stored file behind with nothing to identify it: the bytes survived, but which
-- document they were, who owned it and what it was called did not. This table is that record.
--
-- One row per deleted document, holding everything needed to hand it back: its BexSign id, its
-- name, its owner, who deleted it and when, and a JSON manifest naming every file with the archive
-- key, size and SHA-256 of each. The files themselves are copied to `archive/<year>/<month>/<id>/`
-- in the doc bucket before the rows go.
--
-- Nothing reads it in the app: it is reached from the server with
-- `node scripts/document-archive.js`, so recovering a deleted document needs server access.
--
-- Additive only: no existing table is touched, and running this file a second time finds nothing
-- to do.
--
--   npm run db:migrate --prefix server             apply
--   npm run db:migrate --prefix server -- --dry-run   show what it would do
-- ----------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `document_archive` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  -- The id the document had; it is gone from `documents`, so this is a record, not a foreign key
  `document_id` int(11) NOT NULL,
  `bexsign_doc_id` varchar(120) DEFAULT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `owner_email` varchar(190) DEFAULT NULL,
  `status_before` varchar(40) DEFAULT NULL,
  `recipient_emails` text DEFAULT NULL,
  `file_count` int(11) NOT NULL DEFAULT 0,
  `total_bytes` bigint(20) NOT NULL DEFAULT 0,
  -- Where the copies live in the doc bucket, e.g. 'archive/2026/10/140/'
  `archive_prefix` varchar(400) DEFAULT NULL,
  -- JSON: every file (name, original path, archive key, bytes, sha256), the recipients and the
  -- document text. Self-describing on purpose, so a restore needs no other table.
  `manifest` longtext DEFAULT NULL,
  `storage_provider` varchar(20) NOT NULL DEFAULT 'local',
  `deleted_by_id` int(11) DEFAULT NULL,
  `deleted_by` varchar(190) DEFAULT NULL,
  `deleted_reason` varchar(190) DEFAULT NULL,
  `deleted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `restored_at` datetime DEFAULT NULL,
  `restored_by` varchar(190) DEFAULT NULL,
  `error_text` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_document_archive_document` (`document_id`),
  KEY `idx_document_archive_deleted_at` (`deleted_at`),
  KEY `idx_document_archive_owner` (`owner_id`),
  KEY `idx_document_archive_bexsign` (`bexsign_doc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
