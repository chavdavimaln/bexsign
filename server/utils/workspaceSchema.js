/**
 * Tables of the workspace modules (db_bex_sign): integrations, the contact book, the trash bin and OAuth apps.
 * Each module has its own table; the older empty `integrations`, `contacts` and `trash` tables are left untouched.
 * ensureWorkspaceSchema() is idempotent and runs from ensurePlatformSchema() once per server start.
 */
const db = require('../db');

const CREATE_TABLES = [
  // Integrations: one row per configured app (built-in providers and custom integrations)
  `CREATE TABLE IF NOT EXISTS integration_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_key VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'custom',
    is_custom TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'connected',
    config LONGTEXT NULL,
    secrets LONGTEXT NULL,
    events LONGTEXT NULL,
    options LONGTEXT NULL,
    last_tested_at DATETIME NULL,
    last_test_ok TINYINT(1) NULL,
    last_test_message VARCHAR(500) NULL,
    last_event_at DATETIME NULL,
    event_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_integration_provider (provider_key)
  )`,
  // What each integration did: configured, tested, event delivered, file uploaded, failures
  `CREATE TABLE IF NOT EXISTS integration_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    connection_id INT NOT NULL,
    action VARCHAR(40) NOT NULL,
    event VARCHAR(60) NULL,
    success TINYINT(1) NOT NULL DEFAULT 1,
    message VARCHAR(500) NULL,
    status_code INT NULL,
    duration_ms INT NULL,
    document_id INT NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_integration_activity_conn (connection_id, created_at)
  )`,
  // Contact book: people the user sends documents to (added by hand, imported or taken from sent requests)
  `CREATE TABLE IF NOT EXISTS signing_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(150) NULL,
    job_title VARCHAR(120) NULL,
    phone VARCHAR(40) NULL,
    country_code VARCHAR(8) NULL,
    notes TEXT NULL,
    tags LONGTEXT NULL,
    is_favorite TINYINT(1) NOT NULL DEFAULT 0,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    documents_sent INT NOT NULL DEFAULT 0,
    documents_signed INT NOT NULL DEFAULT 0,
    last_sent_at DATETIME NULL,
    last_signed_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_contact_owner_email (owner_id, email),
    KEY idx_contacts_owner (owner_id, deleted_at)
  )`,
  // Trash bin: every deleted item, restorable until purge_after. `snapshot` keeps the rows of items whose rows were
  // removed (templates, self-sign documents, signatures); documents and contacts stay in their table, marked deleted.
  `CREATE TABLE IF NOT EXISTS trash_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_type VARCHAR(30) NOT NULL,
    item_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL,
    owner_id INT NULL,
    deleted_by INT NULL,
    deleted_by_name VARCHAR(150) NULL,
    previous_status VARCHAR(40) NULL,
    snapshot LONGTEXT NULL,
    size_hint VARCHAR(60) NULL,
    deleted_at DATETIME NOT NULL,
    purge_after DATETIME NULL,
    UNIQUE KEY uniq_trash_item (item_type, item_id),
    KEY idx_trash_deleted (deleted_at),
    KEY idx_trash_owner (owner_id)
  )`,
  // OAuth apps: client credentials for external applications
  `CREATE TABLE IF NOT EXISTS oauth_apps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    homepage_url VARCHAR(500) NULL,
    redirect_uris LONGTEXT NULL,
    client_id VARCHAR(64) NOT NULL,
    client_secret_hash CHAR(64) NOT NULL,
    secret_last4 VARCHAR(8) NULL,
    scopes LONGTEXT NULL,
    token_ttl_minutes INT NOT NULL DEFAULT 60,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_used_at DATETIME NULL,
    token_count INT NOT NULL DEFAULT 0,
    secret_rotated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_oauth_client_id (client_id),
    KEY idx_oauth_apps_user (user_id)
  )`,
  // Access tokens issued to OAuth apps (only the SHA-256 hash is kept)
  `CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    token_prefix VARCHAR(24) NOT NULL,
    scopes LONGTEXT NULL,
    grant_type VARCHAR(40) NOT NULL DEFAULT 'client_credentials',
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    request_count INT NOT NULL DEFAULT 0,
    created_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_oauth_token_hash (token_hash),
    KEY idx_oauth_tokens_app (app_id, created_at)
  )`
];

// Columns added to existing tables: [table, column, definition]
const COLUMNS = [
  // Days a deleted item stays in the trash before it is removed for good
  ['general_settings', 'trash_retention_days', 'INT NOT NULL DEFAULT 30'],
  // Requests made with an OAuth access token are logged against the app
  ['api_logs', 'oauth_app_id', 'INT NULL']
];

async function columnExists(table, column) {
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
}

let schemaPromise = null;

function ensureWorkspaceSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const sql of CREATE_TABLES) await db.query(sql);
      for (const [table, column, definition] of COLUMNS) {
        if (!(await columnExists(table, column))) {
          await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        }
      }
      // Documents trashed before the trash bin existed get their trash row (restored to Draft, as they always were).
      // Their retention starts now, so the automatic cleanup never removes them on the first start.
      await db.query(
        `INSERT IGNORE INTO trash_items (item_type, item_id, title, owner_id, deleted_by, previous_status, deleted_at, purge_after)
         SELECT 'document', d.id, COALESCE(NULLIF(d.document_name, ''), CONCAT('Document ', d.id)), d.user_id, d.user_id, 'Draft',
                NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
         FROM documents d WHERE LOWER(COALESCE(d.status, '')) = 'trashed'`
      );
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

module.exports = { ensureWorkspaceSchema };
