# BexSign Database Documentation (`db_bex_sign`)

The database consists of 4 primary MySQL tables:

1. **`users`**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `first_name` (VARCHAR(100) NOT NULL)
   - `last_name` (VARCHAR(100) NOT NULL)
   - `email` (VARCHAR(150) UNIQUE NOT NULL)
   - `password` (VARCHAR(255) NOT NULL - Bcrypt Hashed)
   - `company` (VARCHAR(150))
   - `job_title` (VARCHAR(100))
   - `date_format` (VARCHAR(50) DEFAULT 'MM/dd/yyyy')
   - `time_zone` (VARCHAR(100) DEFAULT 'Asia/Kolkata')
   - `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

2. **`documents`**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `user_id` (INT, FOREIGN KEY -> users.id ON DELETE CASCADE)
   - `document_name` (VARCHAR(255) NOT NULL)
   - `file_path` (VARCHAR(255) NOT NULL)
   - `folder_name` (VARCHAR(100) DEFAULT 'Unsorted')
   - `status` (ENUM: 'Draft', 'In Progress', 'Completed', 'Declined', 'Expired', 'Recalled', 'Scheduled' DEFAULT 'Draft')
   - `recipient_email` (VARCHAR(150))
   - `template_used` (VARCHAR(150))
   - `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

3. **`templates`**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `user_id` (INT, FOREIGN KEY -> users.id ON DELETE CASCADE)
   - `template_name` (VARCHAR(255) NOT NULL)
   - `file_path` (VARCHAR(255) NOT NULL)
   - `active_sign_forms` (INT DEFAULT 0)
   - `last_modified` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

4. **`activity_history`**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `document_id` (INT, FOREIGN KEY -> documents.id ON DELETE CASCADE)
   - `activity_description` (TEXT NOT NULL)
   - `ip_address` (VARCHAR(45))
   - `time_of_activity` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
