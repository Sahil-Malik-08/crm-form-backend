const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'company_dashboard'
    });
    const [rows] = await conn.query("SELECT id, created_at, DATE_FORMAT(created_at, '%Y-%m-%d') AS formatted FROM orders LIMIT 3");
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (e) {
    console.error(e.message);
  }
})();
