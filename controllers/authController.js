const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'company-dashboard-local-secret';

const userPayload = (user) => ({ id: user.id, fullName: user.full_name, username: user.username, role: user.designation });

const validatePasswordStrength = (password) => {
  const pwd = String(password || '');
  if (pwd.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(pwd)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character.';
  return null;
};

exports.signup = async (req, res) => {
  const { fullName, username, password, phone = null, department = null } = req.body;
  if (!fullName || !username || !password) return res.status(400).json({ message: 'Name, username, and password are required.' });
  if (username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters.' });
  const passwordError = validatePasswordStrength(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await db.execute('INSERT INTO users (full_name, username, password_hash, phone, department, designation) VALUES (?, ?, ?, ?, ?, ?)', [fullName, username, passwordHash, phone, department, 'employee']);
  const user = { id: result.insertId, full_name: fullName, username, designation: 'employee' };
  res.status(201).json({ token: jwt.sign(userPayload(user), jwtSecret, { expiresIn: '8h' }), user: userPayload(user) });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });

  const [[user]] = await db.execute('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
  if (!user) return res.status(401).json({ message: 'Incorrect username or password.' });

  // No lockout after failed attempts: a wrong password just fails, and the user can retry right away.
  const valid = await bcrypt.compare(password || '', user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Incorrect username or password.' });

  res.json({ token: jwt.sign(userPayload(user), jwtSecret, { expiresIn: '8h' }), user: userPayload(user) });
};

exports.forgotPassword = async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) return res.status(400).json({ message: 'Username and new password are required.' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const [result] = await db.execute('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE username = ?', [passwordHash, username]);
  if (!result.affectedRows) return res.status(404).json({ message: 'No user account uses that username.' });
  res.json({ message: 'Password updated. You can now sign in.' });
};

exports.getProfile = async (req, res) => {
  const [[user]] = await db.execute('SELECT id, full_name AS fullName, username, email, phone, department, designation, reporting_to AS reportingTo, address, profile_image AS profileImage, created_at AS createdAt FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { fullName, username, email = null, phone = null, department = null, designation = null, reportingTo = null, address = null } = req.body;
  if (!fullName || !username) return res.status(400).json({ message: 'Name and username are required.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Invalid email address.' });
  if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
  await db.execute('UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, department = ?, designation = ?, reporting_to = ?, address = ? WHERE id = ?', [fullName, username, email, phone, department, designation, reportingTo, address, req.user.id]);
  res.json({ id: req.user.id, fullName, username, email, phone, department, designation, reportingTo, address });
};

exports.updateProfileImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a JPG, PNG, or WEBP image up to 2 MB.' });
  const profileImage = `/uploads/${req.file.filename}`;
  await db.execute('UPDATE users SET profile_image = ? WHERE id = ?', [profileImage, req.user.id]);
  res.json({ profileImage });
};


