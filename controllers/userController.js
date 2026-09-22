const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.name) { where.push('(u.full_name LIKE ? OR u.username LIKE ?)'); params.push(`%${req.query.name}%`, `%${req.query.name}%`); }
  if (req.query.department) { where.push('u.department LIKE ?'); params.push(`%${req.query.department}%`); }
  if (req.query.role) { where.push('u.designation LIKE ?'); params.push(`%${req.query.role}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = { id: 'u.id', fullName: 'u.full_name', username: 'u.username', department: 'u.department', role: 'u.designation' };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'u.id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users u LEFT JOIN employees e ON e.id = u.reporting_to ${whereSql}`, params);
  const [rows] = await db.query(`SELECT u.id, u.full_name AS fullName, u.username, u.email, u.phone, u.department, u.designation AS role, u.reporting_to AS reportingTo, u.branch, u.status, e.full_name AS reportsTo FROM users u LEFT JOIN employees e ON e.id = u.reporting_to ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.create = async (req, res) => {
  const { fullName, username, email = null, password, phone = null, department = null, role = 'employee', reportingTo = null, branch = null, status = 'Active' } = req.body;
  if (!fullName || !username || !password) return res.status(400).json({ message: 'Full name, username, and password are required.' });
  if (username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (reportingTo !== null && reportingTo !== '' && !Number.isInteger(Number(reportingTo))) return res.status(400).json({ message: 'Reporting manager is invalid.' });
  if (reportingTo !== null && reportingTo !== '') {
    const [[manager]] = await db.execute('SELECT id FROM employees WHERE id = ?', [Number(reportingTo)]);
    if (!manager) return res.status(400).json({ message: 'Selected reporting manager was not found.' });
  }
  const [[existing]] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  if (existing) return res.status(409).json({ message: 'Username already exists.' });
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.execute('INSERT INTO users (full_name, username, email, password_hash, phone, department, designation, reporting_to, branch, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fullName, username, email, passwordHash, phone, department, role, reportingTo, branch, status]);
  const user = { id: result.insertId, fullName, username, email, phone, department, role, reportingTo, branch, status };
  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const { fullName, username, email = null, password, phone = null, department = null, role = 'employee', reportingTo = null, branch = null, status = 'Active' } = req.body;
  if (!fullName || !username) return res.status(400).json({ message: 'Full name and username are required.' });
  if (reportingTo !== null && reportingTo !== '' && !Number.isInteger(Number(reportingTo))) return res.status(400).json({ message: 'Reporting manager is invalid.' });
  if (reportingTo !== null && reportingTo !== '') {
    const [[manager]] = await db.execute('SELECT id FROM employees WHERE id = ?', [Number(reportingTo)]);
    if (!manager) return res.status(400).json({ message: 'Selected reporting manager was not found.' });
  }
  const [[existing]] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?', [username, req.params.id]);
  if (existing) return res.status(409).json({ message: 'Username already exists.' });
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute('UPDATE users SET full_name = ?, username = ?, email = ?, password_hash = ?, phone = ?, department = ?, designation = ?, reporting_to = ?, branch = ?, status = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [fullName, username, email, passwordHash, phone, department, role, reportingTo, branch, status, req.params.id]);
  } else {
    await db.execute('UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, department = ?, designation = ?, reporting_to = ?, branch = ?, status = ? WHERE id = ?', [fullName, username, email, phone, department, role, reportingTo, branch, status, req.params.id]);
  }
  res.json({ id: Number(req.params.id), fullName, username, email, phone, department, role, reportingTo, branch, status });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.status(204).end();
};
