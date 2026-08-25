# Server Configuration & Architecture Guide

This document outlines the Express server setup, environment configuration, database connection pool, security settings, and middleware for **BexSign**.

---

## 1. Directory Structure

```text
server/
├── index.js              # Express app entry point
├── db.js                 # MySQL2 connection pool setup
├── database.sql          # Database schema script
├── init-db.js            # Automated database execution script
├── uploads/              # Physical file storage directory
└── routes/
    ├── auth.js           # Authentication (/api/register, /api/login)
    ├── documents.js      # Document upload, sending, and status filtering
    ├── templates.js      # Reusable templates creation & retrieval
    ├── reports.js        # Status statistics and activity history timeline
    └── settings.js       # User profile details and configuration
```

---

## 2. Environment Variables Configuration (`.env`)

Create a `.env` file in `server/` root:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=db_bex_sign
JWT_SECRET=bexsign_secure_jwt_secret_key_2026
```

---

## 3. Database Connection Pool (`server/db.js`)

Uses `mysql2/promise` pool for high performance and async/await syntax:

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_bex_sign',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
```

---

## 4. CORS & Body Parsing Middleware (`server/index.js`)

- `cors()` allows cross-origin requests from React Vite client (`http://localhost:5173` or `http://localhost:3000`).
- `express.json()` parses JSON payloads.
- `multer` disk storage handles multipart `FormData` file uploads for PDFs and templates into `server/uploads/`.
