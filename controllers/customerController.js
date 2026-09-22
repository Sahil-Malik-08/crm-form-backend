const db = require('../config/db');

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.name) { where.push('customer_name LIKE ?'); params.push(`%${req.query.name}%`); }
  if (req.query.state) { where.push('state LIKE ?'); params.push(`%${req.query.state}%`); }
  if (req.query.city) { where.push('city LIKE ?'); params.push(`%${req.query.city}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = { id: 'id', name: 'customer_name', phone: 'phone_number', state: 'state', city: 'city', salesPerson: 'sales_person' };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM customers ${whereSql}`, params);
  const [rows] = await db.query(`SELECT id, customer_name AS name, phone_number AS phone, alternate_phone AS alternatePhone, house_no AS houseNo, locality, city, state, address, pincode, sales_person AS salesPerson FROM customers ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.create = async (req, res) => {
  const { name, phone = null, alternatePhone = null, houseNo = null, locality = null, city = null, state = null, address = null, pincode = null, salesPerson = null } = req.body;
  if (!name) return res.status(400).json({ message: 'Customer name is required.' });
  if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  if (alternatePhone && !/^\d{10}$/.test(alternatePhone)) return res.status(400).json({ message: 'Alternate phone must contain exactly 10 digits.' });
  if (!pincode || !/^\d{6}$/.test(pincode)) return res.status(400).json({ message: 'Pincode must contain exactly 6 digits.' });
  const [result] = await db.execute('INSERT INTO customers (customer_name, phone_number, alternate_phone, house_no, locality, city, state, address, pincode, sales_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, phone, alternatePhone, houseNo, locality, city, state, address, pincode, salesPerson]);
  res.status(201).json({ id: result.insertId, name, phone, alternatePhone, houseNo, locality, city, state, address, pincode, salesPerson });
};

exports.update = async (req, res) => {
  const { name, phone = null, alternatePhone = null, houseNo = null, locality = null, city = null, state = null, address = null, pincode = null, salesPerson = null } = req.body;
  if (!name) return res.status(400).json({ message: 'Customer name is required.' });
  if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  if (alternatePhone && !/^\d{10}$/.test(alternatePhone)) return res.status(400).json({ message: 'Alternate phone must contain exactly 10 digits.' });
  if (!pincode || !/^\d{6}$/.test(pincode)) return res.status(400).json({ message: 'Pincode must contain exactly 6 digits.' });
  await db.execute('UPDATE customers SET customer_name = ?, phone_number = ?, alternate_phone = ?, house_no = ?, locality = ?, city = ?, state = ?, address = ?, pincode = ?, sales_person = ? WHERE id = ?',
    [name, phone, alternatePhone, houseNo, locality, city, state, address, pincode, salesPerson, req.params.id]);
  res.json({ id: Number(req.params.id), name, phone, alternatePhone, houseNo, locality, city, state, address, pincode, salesPerson });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.status(204).end();
};
