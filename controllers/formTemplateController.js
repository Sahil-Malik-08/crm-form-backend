const xss = require('xss');
const db = require('../config/db');

const FIELD_TYPES = ['text', 'number', 'date', 'email', 'textarea', 'checkbox', 'select', 'multiselect'];
const isAdmin = (user) => String(user?.role || '').trim().toLowerCase() === 'admin';
const clean = (value) => xss(String(value ?? '').trim());

const normalizeFields = (rawFields) => (Array.isArray(rawFields) ? rawFields : [])
  .map((field, index) => ({
    id: index + 1,
    label: clean(field?.label),
    type: FIELD_TYPES.includes(field?.type) ? field.type : 'text',
    required: field?.required !== false,
    options: Array.isArray(field?.options) ? field.options.map(clean).filter(Boolean).slice(0, 50) : [],
  }))
  .filter((field) => field.label);

const toTemplate = (row) => {
  let fields = [];
  try { fields = JSON.parse(row.fields) || []; } catch { fields = []; }
  return { id: row.id, title: row.title, fields, createdAt: row.created_at };
};

exports.list = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can view form templates.' });
  const [rows] = await db.query('SELECT id, title, fields, created_at FROM employee_form_templates ORDER BY title ASC');
  res.json(rows.map(toTemplate));
};

exports.create = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can manage form templates.' });
  const title = clean(req.body.title);
  const fields = normalizeFields(req.body.fields);
  if (!title) return res.status(400).json({ message: 'Template title is required.' });
  if (!fields.length) return res.status(400).json({ message: 'Add at least one field with a label.' });
  const [result] = await db.execute(
    'INSERT INTO employee_form_templates (title, fields, created_by, created_by_name) VALUES (?, ?, ?, ?)',
    [title, JSON.stringify(fields), req.user.id, req.user.fullName || null],
  );
  res.status(201).json({ id: result.insertId, title, fields });
};

exports.remove = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can manage form templates.' });
  await db.execute('DELETE FROM employee_form_templates WHERE id = ?', [req.params.id]);
  res.status(204).end();
};