const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateOrderDates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'company_dashboard',
  });

  try {
    // Get all order IDs
    const [orders] = await connection.query('SELECT id FROM orders');
    console.log(`Found ${orders.length} orders to update`);

    // Helper: random date between two dates
    const randomDate = (start, end) => {
      const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    const start = new Date('2025-01-01');
    const end = new Date('2026-12-31');

    // Update each order
    for (const order of orders) {
      const createdAt = randomDate(start, end);
      const updatedAt = randomDate(new Date(createdAt), end);
      
      await connection.execute(
        'UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?',
        [createdAt, updatedAt, order.id]
      );
    }

    console.log('All order dates updated successfully');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

updateOrderDates();