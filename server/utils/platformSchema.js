/**
 * Tables of the platform modules (db_bex_sign): notifications, permissions, security logs (failed access, document
 * validity, activity), developer API (keys, logs, webhooks), general / developer settings and reports.
 * Each module has its own table. Existing tables from database.sql are extended with the columns they need;
 * new tables are created. ensurePlatformSchema() is idempotent and runs once per server start.
 */
const db = require('../db');

const CREATE_TABLES = [
  // Notifications shown in the header bell and on the Notifications page
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read TINYINT(1) DEFAULT 0,
    type VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL
  )`,
  // Permission catalog, role grants and per-user overrides
  `CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(80) NOT NULL,
    module VARCHAR(60) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_permission_key (permission_key)
  )`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_key VARCHAR(50) NOT NULL,
    permission_key VARCHAR(80) NOT NULL,
    allowed TINYINT(1) NOT NULL DEFAULT 1,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_role_permission (role_key, permission_key),
    KEY idx_role_permissions_role (role_key)
  )`,
  `CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission_key VARCHAR(80) NOT NULL,
    allowed TINYINT(1) NOT NULL DEFAULT 1,
    reason VARCHAR(255) NULL,
    expires_at DATETIME NULL,
    granted_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_permission (user_id, permission_key),
    KEY idx_user_permissions_user (user_id)
  )`,
  // Security logs
  `CREATE TABLE IF NOT EXISTS failed_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    reason VARCHAR(255),
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS document_validity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NULL,
    certificate_id VARCHAR(100) NULL,
    hash_signature VARCHAR(255) NULL,
    is_valid TINYINT(1) DEFAULT 0,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    browser_info VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Developer API
  `CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    permissions LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    events LONGTEXT NULL,
    secret_token VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT NOT NULL,
    event VARCHAR(80) NOT NULL,
    payload LONGTEXT NULL,
    status_code INT NULL,
    response_body TEXT NULL,
    success TINYINT(1) DEFAULT 0,
    duration_ms INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_webhook_deliveries_webhook (webhook_id)
  )`,
  // Settings (one row each)
  `CREATE TABLE IF NOT EXISTS general_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_name VARCHAR(150) DEFAULT 'BexSign',
    organization_email VARCHAR(255) NULL,
    logo_url VARCHAR(500) NULL,
    brand_color VARCHAR(20) DEFAULT '#E71414',
    timezone VARCHAR(80) DEFAULT 'Asia/Kolkata',
    date_format VARCHAR(30) DEFAULT 'MMM dd, yyyy',
    time_format VARCHAR(10) DEFAULT '12h',
    language VARCHAR(20) DEFAULT 'en',
    default_expiry_days INT DEFAULT 15,
    reminder_frequency_days INT DEFAULT 5,
    auto_reminders TINYINT(1) DEFAULT 1,
    default_signing_order VARCHAR(20) DEFAULT 'parallel',
    allow_decline TINYINT(1) DEFAULT 1,
    allow_reassign TINYINT(1) DEFAULT 1,
    allow_print_sign TINYINT(1) DEFAULT 1,
    require_signer_otp TINYINT(1) DEFAULT 0,
    session_timeout_minutes INT DEFAULT 60,
    email_footer TEXT NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS developer_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_enabled TINYINT(1) DEFAULT 1,
    sandbox_mode TINYINT(1) DEFAULT 1,
    rate_limit_per_minute INT DEFAULT 60,
    allowed_origins TEXT NULL,
    ip_allowlist TEXT NULL,
    webhook_signing_secret VARCHAR(128) NULL,
    webhook_retry_count INT DEFAULT 3,
    webhook_timeout_seconds INT DEFAULT 10,
    default_callback_url VARCHAR(500) NULL,
    log_retention_days INT DEFAULT 30,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  // Reports
  `CREATE TABLE IF NOT EXISTS scheduled_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    frequency VARCHAR(20) DEFAULT 'weekly',
    recipient_email VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduled_report_id INT NULL,
    report_type VARCHAR(60) NULL,
    triggered_by VARCHAR(20) DEFAULT 'schedule',
    status VARCHAR(20) DEFAULT 'success',
    row_count INT DEFAULT 0,
    recipients TEXT NULL,
    file_name VARCHAR(255) NULL,
    error TEXT NULL,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_report_runs_schedule (scheduled_report_id)
  )`
];

// Columns added to existing tables: [table, column, definition]
const COLUMNS = [
  // Registration and first sign-in store a job title
  ['users', 'job_title', 'VARCHAR(100) NULL'],

  ['notifications', 'category', "VARCHAR(40) NOT NULL DEFAULT 'system'"],
  ['notifications', 'severity', "VARCHAR(20) NOT NULL DEFAULT 'info'"],
  ['notifications', 'link', 'VARCHAR(255) NULL'],
  ['notifications', 'entity_type', 'VARCHAR(40) NULL'],
  ['notifications', 'entity_id', 'INT NULL'],
  ['notifications', 'actor_name', 'VARCHAR(150) NULL'],
  ['notifications', 'read_at', 'DATETIME NULL'],
  ['notifications', 'email_sent', 'TINYINT(1) NOT NULL DEFAULT 0'],

  ['notification_preferences', 'preferences', 'LONGTEXT NULL'],
  ['notification_preferences', 'email_digest', "VARCHAR(20) NOT NULL DEFAULT 'off'"],
  ['notification_preferences', 'muted_until', 'DATETIME NULL'],
  ['notification_preferences', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],

  ['roles', 'is_system', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['roles', 'color', "VARCHAR(20) NULL"],
  ['roles', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],

  ['failed_access_logs', 'email', 'VARCHAR(255) NULL'],
  ['failed_access_logs', 'user_id', 'INT NULL'],
  ['failed_access_logs', 'source', "VARCHAR(40) NOT NULL DEFAULT 'login'"],
  ['failed_access_logs', 'user_agent', 'VARCHAR(255) NULL'],
  ['failed_access_logs', 'document_id', 'INT NULL'],
  ['failed_access_logs', 'resolved', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['failed_access_logs', 'resolved_by', 'INT NULL'],
  ['failed_access_logs', 'resolved_at', 'DATETIME NULL'],

  ['document_validity', 'file_name', 'VARCHAR(255) NULL'],
  ['document_validity', 'sha256', 'CHAR(64) NULL'],
  ['document_validity', 'result', "VARCHAR(30) NOT NULL DEFAULT 'unknown'"],
  ['document_validity', 'message', 'VARCHAR(500) NULL'],
  ['document_validity', 'source', "VARCHAR(30) NOT NULL DEFAULT 'upload'"],
  ['document_validity', 'checked_by', 'INT NULL'],
  ['document_validity', 'ip_address', 'VARCHAR(45) NULL'],

  ['activity_logs', 'user_email', 'VARCHAR(255) NULL'],
  ['activity_logs', 'category', "VARCHAR(40) NOT NULL DEFAULT 'system'"],
  ['activity_logs', 'entity_type', 'VARCHAR(40) NULL'],
  ['activity_logs', 'entity_id', 'INT NULL'],
  ['activity_logs', 'details', 'TEXT NULL'],

  ['api_keys', 'key_prefix', 'VARCHAR(24) NULL'],
  ['api_keys', 'key_hash', 'CHAR(64) NULL'],
  ['api_keys', 'environment', "VARCHAR(20) NOT NULL DEFAULT 'live'"],
  ['api_keys', 'last_used_at', 'DATETIME NULL'],
  ['api_keys', 'expires_at', 'DATETIME NULL'],
  ['api_keys', 'revoked_at', 'DATETIME NULL'],
  ['api_keys', 'request_count', 'INT NOT NULL DEFAULT 0'],

  ['api_logs', 'ip_address', 'VARCHAR(45) NULL'],
  ['api_logs', 'duration_ms', 'INT NULL'],
  ['api_logs', 'user_agent', 'VARCHAR(255) NULL'],

  ['webhooks', 'name', 'VARCHAR(120) NULL'],
  ['webhooks', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ['webhooks', 'last_status', 'INT NULL'],
  ['webhooks', 'last_delivery_at', 'DATETIME NULL'],
  ['webhooks', 'failure_count', 'INT NOT NULL DEFAULT 0'],

  ['scheduled_reports', 'report_type', "VARCHAR(60) NOT NULL DEFAULT 'document_summary'"],
  ['scheduled_reports', 'format', "VARCHAR(10) NOT NULL DEFAULT 'csv'"],
  ['scheduled_reports', 'recipients', 'TEXT NULL'],
  ['scheduled_reports', 'filters', 'TEXT NULL'],
  ['scheduled_reports', 'day_of_week', 'TINYINT NULL'],
  ['scheduled_reports', 'day_of_month', 'TINYINT NULL'],
  ['scheduled_reports', 'time_of_day', "VARCHAR(5) NOT NULL DEFAULT '09:00'"],
  ['scheduled_reports', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ['scheduled_reports', 'last_run_at', 'DATETIME NULL'],
  ['scheduled_reports', 'next_run_at', 'DATETIME NULL'],
  ['scheduled_reports', 'last_status', 'VARCHAR(20) NULL'],
  ['scheduled_reports', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
  ['scheduled_reports', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
];

const INDEXES = [
  ['notifications', 'idx_notifications_user_read', '(user_id, is_read, created_at)'],
  ['failed_access_logs', 'idx_failed_access_time', '(attempt_time)'],
  ['activity_logs', 'idx_activity_logs_time', '(created_at)'],
  ['document_validity', 'idx_document_validity_time', '(checked_at)']
];

async function columnExists(table, column) {
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, index) {
  const [rows] = await db.query(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [table, index]
  );
  return rows.length > 0;
}

let schemaPromise = null;

function ensurePlatformSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const sql of CREATE_TABLES) await db.query(sql);
      for (const [table, column, definition] of COLUMNS) {
        if (!(await columnExists(table, column))) {
          await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        }
      }
      for (const [table, index, columns] of INDEXES) {
        if (!(await indexExists(table, index))) await db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` ${columns}`);
      }
      // Single settings rows
      await db.query('INSERT INTO general_settings (id) SELECT 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM general_settings)');
      await db.query('INSERT INTO developer_settings (id) SELECT 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM developer_settings)');
      // Seed the permission catalog and default role grants (existing grants are kept)
      const { seedPermissions } = require('./permissions');
      await seedPermissions();
      // Signing flow tables (document_signing_flow, signing_email_dispatch)
      const signingFlow = require('./signingFlow');
      await signingFlow.ensureSigningFlowSchema();
      // Module tables that would otherwise only appear the first time someone opens the module
      await require('./signatureStore').ensureSignatureSchema();
      await require('./selfSign').ensureSelfSignSchema();
      await require('./documentVerification').ensureVerificationSchema();
      // Integrations, contact book, trash bin and OAuth apps
      await require('./workspaceSchema').ensureWorkspaceSchema();
      // The organization default moves from 'parallel' / 'sequential' to a signing flow key
      await db.query(
        `UPDATE general_settings SET default_signing_order = ?
         WHERE default_signing_order = 'sequential'`,
        ['sequential_shared']
      );
      await db.query(
        `UPDATE general_settings SET default_signing_order = ?
         WHERE default_signing_order = 'parallel'`,
        [signingFlow.DEFAULT_SIGNING_MODE]
      );
      await db.query("ALTER TABLE general_settings MODIFY COLUMN default_signing_order VARCHAR(30) DEFAULT 'sequential_shared'");
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

module.exports = { ensurePlatformSchema };
