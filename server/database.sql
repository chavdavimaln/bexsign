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

-- 39. Document Identifiers (BexSign Generated Unique IDs & Electronic Stamp Tracking)
CREATE TABLE IF NOT EXISTS document_identifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  bexsign_doc_id VARCHAR(100) NOT NULL UNIQUE,
  prefix VARCHAR(20) DEFAULT 'BEX-DOC',
  year INT DEFAULT 2026,
  seq_number INT NOT NULL,
  unique_hash VARCHAR(64) NOT NULL,
  signer_name VARCHAR(150) DEFAULT 'Vimal Chavda',
  signer_email VARCHAR(255) DEFAULT 'vimal@bexcodeservices.com',
  signature_style VARCHAR(50) DEFAULT 'font-signature-1',
  signature_status ENUM('Draft', 'In Progress', 'Completed', 'Recalled', 'Expired') DEFAULT 'Draft',
  audit_ip VARCHAR(45) DEFAULT '223.181.69.208',
  audit_hash VARCHAR(100) DEFAULT 'SHA256-CERTIFIED-ELECTRONIC-RECORD',
  qr_payload TEXT NULL,
  signed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bexsign_doc_id (bexsign_doc_id),
  INDEX idx_document_id (document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Seed initial records into document_identifiers
INSERT IGNORE INTO document_identifiers 
(document_id, bexsign_doc_id, prefix, year, seq_number, unique_hash, signer_name, signer_email, signature_status, signed_at) 
VALUES
(1, 'BEX-DOC-2026-0001-361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'BEX-DOC', 2026, 1, '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Completed', '2026-08-26 16:29:34'),
(2, 'BEX-DOC-2026-0002-482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89', 'BEX-DOC', 2026, 2, '482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89', 'Dhruv patel', 'dhruv@bexcodeservices.com', 'Completed', '2026-08-27 10:14:22'),
(3, 'BEX-DOC-2026-0003-792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012', 'BEX-DOC', 2026, 3, '792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'In Progress', NULL),
(4, 'BEX-DOC-2026-0004-920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF', 'BEX-DOC', 2026, 4, '920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'In Progress', NULL),
(5, 'BEX-DOC-2026-0005-A1B2C3D4-E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4', 'BEX-DOC', 2026, 5, 'A1B2C3D4-E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Draft', NULL),
(6, 'BEX-DOC-2026-0006-BWTDWUUD-T8GXL5TEDYMZAPXCWXX5K71290348719238471293', 'BEX-DOC', 2026, 6, 'BWTDWUUD-T8GXL5TEDYMZAPXCWXX5K71290348719238471293', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Draft', NULL);

-- 40. Employee Signatures (Employee ID & Signature Stamps)
CREATE TABLE IF NOT EXISTS employee_signatures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  designation VARCHAR(100) DEFAULT 'Software Specialist',
  department VARCHAR(100) DEFAULT 'Engineering',
  initials VARCHAR(10) DEFAULT 'VC',
  signature_id VARCHAR(100) NOT NULL UNIQUE,
  signature_image LONGTEXT NULL,
  signature_style VARCHAR(50) DEFAULT 'font-signature-1',
  status ENUM('Active', 'Inactive', 'Revoked') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_id (employee_id),
  INDEX idx_signature_id (signature_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial records into employee_signatures
INSERT IGNORE INTO employee_signatures
(employee_id, employee_name, employee_email, designation, department, initials, signature_id, signature_style)
VALUES
('EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Lead Systems Engineer', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'font-signature-1'),
('EMP002', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', 'font-signature-2'),
('EMP003', 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', 'font-signature-1');


