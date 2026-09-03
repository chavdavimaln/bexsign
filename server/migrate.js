const mysql = require('mysql2');

const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_bex_signature',
  multipleStatements: true
});

conn.connect((err) => {
  if (err) {
    console.error('MySQL connect error:', err.message);
    process.exit(1);
  }

  const sql = `
    ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS version_label VARCHAR(20) DEFAULT '1.0';
    ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) DEFAULT 'Manu Yadav';
    ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'Completed';
  `;

  conn.query(sql, (err, res) => {
    if (err) {
      console.error('Migration failed:', err.message);
    } else {
      console.log('Migration executed successfully!');
    }

    conn.query('DESCRIBE document_versions', (err, rows) => {
      if (err) console.error(err);
      else console.table(rows);
      conn.end();
    });
  });
});
