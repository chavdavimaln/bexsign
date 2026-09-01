/**
 * Database Connection Helper (server/db.js)
 * Connects to local MySQL / phpMyAdmin database `db_bex_signature` using mysql2/promise.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with environment variable support
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_bex_signature',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Self-executing connection tester
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database: ${process.env.DB_NAME || 'db_bex_signature'}`);
    connection.release();
    // Ensure document_identifiers table exists and is properly seeded
    try {
      const { ensureDocumentIdentifiersTable } = require('./utils/documentIdentifier');
      await ensureDocumentIdentifiersTable();
    } catch (e) {
      console.warn('[Database] document_identifiers auto-setup:', e.message);
    }
  } catch (err) {
    console.warn(`[Database Warning] Could not connect to MySQL database (${process.env.DB_NAME || 'db_bex_signature'}):`, err.message);
    console.warn('[Database Hint] Make sure MySQL service is running and db_bex_signature is imported in phpMyAdmin.');
  }
})();

module.exports = pool;
