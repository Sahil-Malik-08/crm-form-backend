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
  return {
    id: row.id,
    title: row.title,
    fields,
    assignedTo: row.assigned_to,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name || null,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeTemplateInput = (body) => {
  const title = clean(body.title);
  const fields = normalizeFields(body.fields);
  const assignedTo = body.assignedTo && body.assignedTo !== 'all' ? String(Number(body.assignedTo)) : 'all';
  const approvedBy = body.approvedBy ? Number(body.approvedBy) : null;
  return { title, fields, assignedTo, approvedBy };
};

const TEMPLATE_SELECT = `SELECT t.*, u.full_name AS approved_by_name
  FROM employee_form_templates t LEFT JOIN users u ON u.id = t.approved_by`;

exports.list = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can view form templates.' });
  const [rows] = await db.query(`${TEMPLATE_SELECT} ORDER BY t.title ASC`);
  res.json(rows.map(toTemplate));
};

exports.create = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can manage form templates.' });
  const { title, fields, assignedTo, approvedBy } = normalizeTemplateInput(req.body);
  if (!title) return res.status(400).json({ message: 'Template title is required.' });
  if (!fields.length) return res.status(400).json({ message: 'Add at least one field with a label.' });
  if (assignedTo === 'NaN') return res.status(400).json({ message: 'Assigned employee is invalid.' });
  if (approvedBy !== null && !Number.isInteger(approvedBy)) return res.status(400).json({ message: 'Approver is invalid.' });
  const [result] = await db.execute(
    'INSERT INTO employee_form_templates (title, fields, assigned_to, approved_by, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?)',
    [title, JSON.stringify(fields), assignedTo, approvedBy, req.user.id, req.user.fullName || null],
  );
  res.status(201).json({ id: result.insertId, title, fields, assignedTo, approvedBy });
};

exports.update = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can manage form templates.' });
  const { title, fields, assignedTo, approvedBy } = normalizeTemplateInput(req.body);
  if (!title) return res.status(400).json({ message: 'Template title is required.' });
  if (!fields.length) return res.status(400).json({ message: 'Add at least one field with a label.' });
  if (assignedTo === 'NaN') return res.status(400).json({ message: 'Assigned employee is invalid.' });
  if (approvedBy !== null && !Number.isInteger(approvedBy)) return res.status(400).json({ message: 'Approver is invalid.' });
  const [result] = await db.execute(
    'UPDATE employee_form_templates SET title = ?, fields = ?, assigned_to = ?, approved_by = ? WHERE id = ?',
    [title, JSON.stringify(fields), assignedTo, approvedBy, req.params.id],
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Form template not found.' });
  res.json({ id: Number(req.params.id) });
};

exports.remove = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can manage form templates.' });
  await db.execute('DELETE FROM employee_form_templates WHERE id = ?', [req.params.id]);
  res.status(204).end();
};