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
    const [users] = await conn.query('SELECT id, full_name, username, designation FROM users LIMIT 5');
    console.log(JSON.stringify(users, null, 2));
    await conn.end();
  } catch (e) {
    console.error(e.message);
  }
})();
