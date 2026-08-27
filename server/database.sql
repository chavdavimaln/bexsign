-- BexSign Complete Database Schema (MySQL 8.0+)
CREATE DATABASE IF NOT EXISTS db_bex_signature;
USE db_bex_signature;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  company VARCHAR(150),
  phone VARCHAR(50),
  role ENUM('super_admin', 'admin', 'manager', 'member') DEFAULT 'member',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  profile_image VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'UTC',
  language VARCHAR(20) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Documents
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NULL,
  folder_name VARCHAR(150) DEFAULT 'General',
  status ENUM('Draft', 'Scheduled', 'In Progress', 'Completed', 'Declined', 'Expired', 'Recalled', 'Trashed', 'Failed') DEFAULT 'Draft',
  signing_order ENUM('parallel', 'sequential') DEFAULT 'parallel',
  recipient_email VARCHAR(255) NULL,
  template_used VARCHAR(150) NULL,
  custom_message TEXT,
  reminder_days INT DEFAULT 3,
  expiration_days INT DEFAULT 30,
  scheduled_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Document Files
CREATE TABLE IF NOT EXISTS document_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 6. Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  version_number INT DEFAULT 1,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 7. Document Recipients
CREATE TABLE IF NOT EXISTS document_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('signer', 'approver', 'viewer', 'cc', 'reviewer') DEFAULT 'signer',
  signing_order_index INT DEFAULT 1,
  status ENUM('pending', 'sent', 'viewed', 'signed', 'declined') DEFAULT 'pending',
  secure_token VARCHAR(255) UNIQUE,
  otp_code VARCHAR(10),
  signed_at DATETIME NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 8. Document Fields
CREATE TABLE IF NOT EXISTS document_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  recipient_id INT NULL,
  page_number INT DEFAULT 1,
  field_type VARCHAR(50) NOT NULL,
  label VARCHAR(100),
  description VARCHAR(255),
  is_required BOOLEAN DEFAULT TRUE,
  pos_x FLOAT NOT NULL,
  pos_y FLOAT NOT NULL,
  width FLOAT DEFAULT 150,
  height FLOAT DEFAULT 40,
  options JSON NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 9. Document Field Values
CREATE TABLE IF NOT EXISTS document_field_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id INT NOT NULL,
  recipient_id INT NOT NULL,
  field_value TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_id) REFERENCES document_fields(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES document_recipients(id) ON DELETE CASCADE
);

-- 10. Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  signature_name VARCHAR(100) DEFAULT 'My Signature',
  signature_type ENUM('draw', 'type', 'upload') DEFAULT 'draw',
  signature_data TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Signature Requests
CREATE TABLE IF NOT EXISTS signature_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  recipient_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('pending', 'opened', 'completed', 'expired') DEFAULT 'pending',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES document_recipients(id) ON DELETE CASCADE
);

-- 12. Signature Events
CREATE TABLE IF NOT EXISTS signature_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  recipient_id INT NULL,
  event_type VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 13. Activity History
CREATE TABLE IF NOT EXISTS activity_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  activity_description TEXT NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 14. Templates
CREATE TABLE IF NOT EXISTS templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. Template Fields
CREATE TABLE IF NOT EXISTS template_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  pos_x FLOAT NOT NULL,
  pos_y FLOAT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- 16. Template Roles
CREATE TABLE IF NOT EXISTS template_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  signing_order_index INT DEFAULT 1,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- 17. Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(150),
  phone VARCHAR(50),
  last_used TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  type VARCHAR(50) DEFAULT 'info',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 19. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  notify_doc_sent BOOLEAN DEFAULT TRUE,
  notify_doc_viewed BOOLEAN DEFAULT TRUE,
  notify_doc_signed BOOLEAN DEFAULT TRUE,
  notify_doc_completed BOOLEAN DEFAULT TRUE,
  notify_doc_declined BOOLEAN DEFAULT TRUE,
  notify_doc_expired BOOLEAN DEFAULT TRUE,
  notify_reminders BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 20. Emails
CREATE TABLE IF NOT EXISTS emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  subject_line VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL
);

-- 22. Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(100) NOT NULL,
  status ENUM('success', 'failed') NOT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  browser_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  action_summary TEXT NOT NULL,
  checksum_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 26. Reports
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  report_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 27. Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly',
  recipient_email VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 28. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 29. API Logs
CREATE TABLE IF NOT EXISTS api_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_key_id INT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSON NOT NULL,
  secret_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 31. Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider VARCHAR(100) NOT NULL,
  access_token TEXT,
  status ENUM('connected', 'disconnected') DEFAULT 'connected',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 32. Delegates
CREATE TABLE IF NOT EXISTS delegates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  delegate_to_email VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 33. Failed Access Logs
CREATE TABLE IF NOT EXISTS failed_access_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 34. Document Validity
CREATE TABLE IF NOT EXISTS document_validity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  certificate_id VARCHAR(100) UNIQUE NOT NULL,
  hash_signature VARCHAR(255) NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 35. Trash
CREATE TABLE IF NOT EXISTS trash (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  deleted_by INT NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 36. Portals & Portal Users
CREATE TABLE IF NOT EXISTS portals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portal_name VARCHAR(150) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portal_id INT NOT NULL,
  user_id INT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES portals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 38. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
