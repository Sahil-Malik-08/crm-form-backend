const db = require('../config/db');

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.name) { where.push('full_name LIKE ?'); params.push(`%${req.query.name}%`); }
  if (req.query.phone) { where.push('phone_number LIKE ?'); params.push(`%${req.query.phone}%`); }
  if (req.query.email) { where.push('email LIKE ?'); params.push(`%${req.query.email}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = { id: 'id', fullName: 'full_name', phoneNumber: 'phone_number', email: 'email', gender: 'gender', birthday: 'birthday' };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM contacts ${whereSql}`, params);
  const [rows] = await db.query(`SELECT id, full_name AS fullName, phone_number AS phoneNumber, email, address, notes, birthday, gender FROM contacts ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.create = async (req, res) => {
  const { fullName, phoneNumber = null, email = null, address = null, notes = null, birthday = null, gender = null } = req.body;
  if (!fullName) return res.status(400).json({ message: 'Full name is required.' });
  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });

  const [result] = await db.execute(
    'INSERT INTO contacts (full_name, phone_number, email, address, notes, birthday, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [fullName, phoneNumber, email, address, notes, birthday, gender]
  );
  res.status(201).json({ id: result.insertId, fullName, phoneNumber, email, address, notes, birthday, gender });
};

exports.update = async (req, res) => {
  const { fullName, phoneNumber = null, email = null, address = null, notes = null, birthday = null, gender = null } = req.body;
  if (!fullName) return res.status(400).json({ message: 'Full name is required.' });
  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });

  await db.execute(
    'UPDATE contacts SET full_name = ?, phone_number = ?, email = ?, address = ?, notes = ?, birthday = ?, gender = ? WHERE id = ?',
    [fullName, phoneNumber, email, address, notes, birthday, gender, req.params.id]
  );
  res.json({ id: Number(req.params.id), fullName, phoneNumber, email, address, notes, birthday, gender });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
  res.status(204).end();
};
