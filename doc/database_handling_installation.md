# Database Setup & MySQL Schema Guide (`db_bex_sign`)

This manual details how to configure the MySQL database using phpMyAdmin or node command scripts.

---

## Step 1: Accessing phpMyAdmin

1. Launch XAMPP / WAMP / Laragon control panel and start the **Apache** and **MySQL** services.
2. Open your web browser and visit: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Click on **New** in the left sidebar.
4. Enter Database Name: `db_bex_sign` and set collation to `utf8mb4_unicode_ci`.

---

## Step 2: Running SQL Schema Script

Run the following script in phpMyAdmin's **SQL** tab or execute `node init-db.js` inside `server/`:

```sql
CREATE DATABASE IF NOT EXISTS db_bex_sign;
USE db_bex_sign;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company VARCHAR(150),
    job_title VARCHAR(100),
    date_format VARCHAR(50) DEFAULT 'MM/dd/yyyy',
    time_zone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    folder_name VARCHAR(100) DEFAULT 'Unsorted',
    status ENUM('Draft', 'In Progress', 'Completed', 'Declined', 'Expired', 'Recalled', 'Scheduled') DEFAULT 'Draft',
    recipient_email VARCHAR(150),
    template_used VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Reusable Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    template_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    active_sign_forms INT DEFAULT 1,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Activity History Audit Table
CREATE TABLE IF NOT EXISTS activity_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT,
    activity_description TEXT NOT NULL,
    ip_address VARCHAR(45),
    time_of_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

---

## Step 3: Automated Database Setup Script

You can also run the initialization script directly via terminal:

```bash
cd server
node init-db.js
```
