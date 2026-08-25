const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
    console.log('[Antigravity] Accessing MySQL database server...');
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';
    const dbName = process.env.DB_NAME || 'db_bex_sign';

    try {
        // Step 1: Connect to MySQL server (without selecting a DB first)
        const connection = await mysql.createConnection({
            host,
            user,
            password,
            multipleStatements: true
        });

        console.log(`[Antigravity] Connected to MySQL at ${host}:3306.`);

        // Step 2: Read SQL schema from database.sql
        const sqlPath = path.join(__dirname, 'database.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');

        // Step 3: Execute SQL script
        console.log(`[Antigravity] Creating database "${dbName}" and executing table initialization script...`);
        await connection.query(sqlScript);

        console.log('[Antigravity] Database and all tables successfully created/verified!');
        
        // Step 4: Verify created tables
        const [tables] = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
        console.log(`[Antigravity] Tables present in ${dbName}:`, tables.map(t => Object.values(t)[0]));

        await connection.end();
    } catch (err) {
        console.error('[Antigravity Error] Could not initialize database:', err.message);
        console.warn('[Antigravity Hint] Ensure your local MySQL server (XAMPP / WAMP / Laragon / MySQL Service) is running on port 3306.');
    }
}

initDatabase();
