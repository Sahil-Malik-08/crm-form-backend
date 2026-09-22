const db = require('../config/db');

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.customer) { where.push('o.customer_name LIKE ?'); params.push(`%${req.query.customer}%`); }
  if (req.query.status) {
    const statuses = String(req.query.status).split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length) {
      const placeholders = statuses.map(() => '?').join(',');
      where.push(`o.status IN (${placeholders})`);
      params.push(...statuses);
    }
  }
  if (req.query.employee) { where.push('e.full_name LIKE ?'); params.push(`%${req.query.employee}%`); }
  if (req.query.state) { where.push('o.state LIKE ?'); params.push(`%${req.query.state}%`); }
  if (req.query.city) { where.push('o.city LIKE ?'); params.push(`%${req.query.city}%`); }
  if (req.query.dateFrom) { where.push('DATE(o.created_at) >= ?'); params.push(req.query.dateFrom); }
  if (req.query.dateTo) { where.push('DATE(o.created_at) <= ?'); params.push(req.query.dateTo); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = {
    id: 'o.id',
    customer: 'o.customer_name',
    state: 'o.state',
    city: 'o.city',
    date: 'o.created_at',
    employee: 'e.full_name',
    amount: 'o.amount',
  };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'o.id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders o LEFT JOIN employees e ON e.id = o.employee_id ${whereSql}`, params);
  const [rows] = await db.query(`SELECT o.id, o.customer_name AS customer, o.city, o.state, o.product, o.amount, o.status, e.full_name AS employee, DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date, o.created_at AS createdAt FROM orders o LEFT JOIN employees e ON e.id = o.employee_id ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.getOne = async (req, res) => {
  const [[order]] = await db.execute(`
    SELECT o.id, o.customer_name AS customer, o.phone_number AS phoneNumber, o.alternate_phone AS alternatePhone,
      o.house_no AS houseNo, o.locality, o.city, o.state, o.address, o.pincode,
      o.product, o.amount, o.status, o.notes, o.created_at AS createdAt, o.updated_at AS updatedAt,
      o.employee_id AS employeeId, e.full_name AS employee
    FROM orders o LEFT JOIN employees e ON e.id = o.employee_id WHERE o.id = ?
  `, [req.params.id]);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  const [items] = await db.execute('SELECT product_name AS productName, unit_price AS unitPrice, quantity, subtotal FROM order_items WHERE order_id = ?', [req.params.id]);
  if (items.length === 0 && order.product) {
    const parts = order.product.split(', ');
    for (const part of parts) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      let qty = 1, name = cleaned;
      if (/\sx\s\d+$/i.test(cleaned)) {
        const idx = cleaned.lastIndexOf('x');
        name = cleaned.substring(0, idx).trim();
        qty = parseInt(cleaned.substring(idx + 1).trim()) || 1;
      }
      const [[item]] = await db.execute('SELECT price FROM items WHERE item_name LIKE ? LIMIT 1', [`%${name}%`]);
      const unitPrice = item ? Number(item.price) : 0;
      items.push({ productName: name, unitPrice, quantity: qty, subtotal: unitPrice * qty });
    }
  }
  res.json({ ...order, items });
};

exports.create = async (req, res) => {
  const { customerId, employeeId, itemId, quantity = 1, status = 'Pending' } = req.body;
  if (!customerId || !employeeId || !itemId) return res.status(400).json({ message: 'Customer, employee, and item are required.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[customer]] = await connection.execute('SELECT customer_name, city, state FROM customers WHERE id = ?', [customerId]);
    const [[employee]] = await connection.execute('SELECT full_name FROM employees WHERE id = ?', [employeeId]);
    const [[item]] = await connection.execute('SELECT item_name, price, stock FROM items WHERE id = ?', [itemId]);
    const qty = Math.max(1, Number(quantity));
    if (!customer || !employee || !item) throw Object.assign(new Error('Selected record no longer exists.'), { status: 400 });
    if (item.stock < qty) throw Object.assign(new Error('Insufficient item stock.'), { status: 400 });
    const amount = Number(item.price) * qty, product = `${item.item_name} x ${qty}`;
    const [result] = await connection.execute('INSERT INTO orders (employee_id, customer_name, city, state, product, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [employeeId, customer.customer_name, customer.city, customer.state, product, amount, status]);
    await connection.execute('INSERT INTO order_items (order_id, product_name, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?)', [result.insertId, item.item_name, item.price, qty, amount]);
    await connection.execute('UPDATE items SET stock = stock - ? WHERE id = ?', [qty, itemId]);
    await connection.commit();
    res.status(201).json({ id: result.insertId, customer: customer.customer_name, city: customer.city, state: customer.state, product, employee: employee.full_name, amount, status });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

exports.update = async (req, res) => {
  const statuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
  const { status, customerName, phoneNumber, alternatePhone, houseNo, locality, city, state, address, pincode, employeeId, items, notes } = req.body;
  if (status && !statuses.includes(status)) return res.status(400).json({ message: 'Invalid order status.' });
  if (phoneNumber !== undefined && !/^\d{10}$/.test(phoneNumber)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  if (alternatePhone && !/^\d{10}$/.test(alternatePhone)) return res.status(400).json({ message: 'Alternate phone number must contain exactly 10 digits.' });
  // Full update with all fields
  if (customerName !== undefined || items !== undefined) {
    const product = Array.isArray(items) ? items.filter(i => i.itemName || i.productName).map(i => `${i.itemName || i.productName} x ${i.qty || i.quantity || 1}`).join(', ') : req.body.product;
    const amount = Array.isArray(items) ? items.reduce((s, i) => s + Number(i.amount || i.subtotal || 0), 0) : Number(req.body.amount || 0);
    await db.execute(`UPDATE orders SET
      customer_name = COALESCE(?, customer_name),
      phone_number = COALESCE(?, phone_number),
      alternate_phone = COALESCE(?, alternate_phone),
      house_no = COALESCE(?, house_no),
      locality = COALESCE(?, locality),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      address = COALESCE(?, address),
      pincode = COALESCE(?, pincode),
      employee_id = COALESCE(?, employee_id),
      product = COALESCE(?, product),
      amount = COALESCE(?, amount),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
      customerName ?? null, phoneNumber ?? null, alternatePhone ?? null,
      houseNo ?? null, locality ?? null, city ?? null, state ?? null,
      address ?? null, pincode ?? null, employeeId ?? null,
      product, amount, status ?? null, notes ?? null, req.params.id
    ]);
    const [[updated]] = await db.execute('SELECT e.full_name AS employee FROM orders o LEFT JOIN employees e ON e.id = o.employee_id WHERE o.id = ?', [req.params.id]);
    return res.json({ id: Number(req.params.id), customer: customerName, product, amount, status: status || 'Pending', employee: updated?.employee || '' });
  }
  // Simple status update
  if (status) {
    await db.execute('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
  }
  res.json({ id: Number(req.params.id), status: status || 'Pending' });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
  res.status(204).end();
};

