-- Migration for BexSign Completed Document Workflow & Versioning
USE db_bex_signature;

-- Safely add helper columns to document_versions if not existing
DROP PROCEDURE IF EXISTS AddDocumentVersionsColumns;
DELIMITER //
CREATE PROCEDURE AddDocumentVersionsColumns()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_bex_signature' 
    AND TABLE_NAME = 'document_versions' 
    AND COLUMN_NAME = 'version_label'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN version_label VARCHAR(20) DEFAULT '1.0';
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_bex_signature' 
    AND TABLE_NAME = 'document_versions' 
    AND COLUMN_NAME = 'created_by'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN created_by VARCHAR(150) DEFAULT 'Manu Yadav';
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_bex_signature' 
    AND TABLE_NAME = 'document_versions' 
    AND COLUMN_NAME = 'details'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN details TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_bex_signature' 
    AND TABLE_NAME = 'document_versions' 
    AND COLUMN_NAME = 'action_type'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN action_type VARCHAR(50) DEFAULT 'Completed';
  END IF;
END //
DELIMITER ;

CALL AddDocumentVersionsColumns();
DROP PROCEDURE IF EXISTS AddDocumentVersionsColumns;
