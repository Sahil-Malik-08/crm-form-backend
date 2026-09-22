const db = require('../config/db');
const bcrypt = require('bcryptjs');

const validatePasswordStrength = (password) => {
  const pwd = String(password || '');
  if (pwd.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(pwd)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character.';
  return null;
};

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.name) { where.push('full_name LIKE ?'); params.push(`%${req.query.name}%`); }
  if (req.query.department) { where.push('department LIKE ?'); params.push(`%${req.query.department}%`); }
  if (req.query.designation) { where.push('role LIKE ?'); params.push(`%${req.query.designation}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = { id: 'id', fullName: 'full_name', email: 'email', department: 'department', designation: 'role' };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM employees ${whereSql}`, params);
  const [rows] = await db.query(`SELECT id, full_name AS fullName, employee_code AS employeeCode, email, phone, department, role AS designation, branch, employee_type AS employeeType, gender, date_of_birth AS dateOfBirth, marital_status AS maritalStatus, status FROM employees ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.create = async (req, res) => {
  const { fullName, employeeCode = null, email, phone = null, department = null, designation = 'employee', branch = null, employeeType = null, gender = null, dateOfBirth = null, maritalStatus = null, status = 'Active' } = req.body;
  if (!fullName || !email) return res.status(400).json({ message: 'Full name and email are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Invalid email address.' });
  if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const [result] = await db.execute('INSERT INTO employees (full_name, employee_code, email, password_hash, phone, department, role, branch, employee_type, gender, date_of_birth, marital_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fullName, employeeCode, email, passwordHash, phone, department, designation, branch, employeeType, gender, dateOfBirth, maritalStatus, status]);
  res.status(201).json({ id: result.insertId, fullName, employeeCode, email, phone, department, designation, branch, employeeType, gender, dateOfBirth, maritalStatus, status });
};

exports.update = async (req, res) => {
  const { fullName, employeeCode = null, email, phone = null, department = null, designation = 'employee', branch = null, employeeType = null, gender = null, dateOfBirth = null, maritalStatus = null, status = 'Active' } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Invalid email address.' });
  if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  await db.execute('UPDATE employees SET full_name = ?, employee_code = ?, email = ?, phone = ?, department = ?, role = ?, branch = ?, employee_type = ?, gender = ?, date_of_birth = ?, marital_status = ?, status = ? WHERE id = ?', [fullName, employeeCode, email, phone, department, designation, branch, employeeType, gender, dateOfBirth, maritalStatus, status, req.params.id]);
  res.json({ id: Number(req.params.id), fullName, employeeCode, email, phone, department, designation, branch, employeeType, gender, dateOfBirth, maritalStatus, status });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM employees WHERE id = ?', [req.params.id]);
  res.status(204).end();
};


