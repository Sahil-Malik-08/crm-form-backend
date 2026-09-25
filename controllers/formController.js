const xss = require('xss');
const db = require('../config/db');

const FIELD_TYPES = ['text', 'number', 'date', 'email', 'textarea', 'checkbox', 'select', 'multiselect'];
const MASTER_KEYS = ['departments', 'roles', 'states', 'cities'];
const isAdmin = (user) => String(user?.role || '').trim().toLowerCase() === 'admin';
const clean = (value) => xss(String(value ?? '').trim());
const parseJson = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

const toForm = (row) => ({
  id: row.id,
  title: row.title,
  assignedTo: row.assigned_to,
  approvedBy: row.approved_by,
  approvedByName: row.approved_by_name || null,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  fields: parseJson(row.fields, []),
});

const STATUSES = ['pending', 'approved'];

const toResponse = (row) => ({
  id: row.id,
  formId: row.form_id,
  userId: row.user_id,
  userName: row.user_name,
  status: row.status || 'pending',
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  answers: parseJson(row.answers, {}),
});

const groupResponses = (rows) => {
  const byForm = new Map();
  rows.forEach((row) => {
    const list = byForm.get(row.form_id) || [];
    list.push(toResponse(row));
    byForm.set(row.form_id, list);
  });
  return byForm;
};

const normalizeFields = (rawFields) => (Array.isArray(rawFields) ? rawFields : [])
  .map((field, index) => ({
    id: Number.isInteger(Number(field?.id)) && Number(field.id) > 0 ? Number(field.id) : index + 1,
    label: clean(field?.label),
    type: FIELD_TYPES.includes(field?.type) ? field.type : 'text',
    required: field?.required !== false,
    options: Array.isArray(field?.options) ? field.options.map(clean).filter(Boolean).slice(0, 50) : [],
    ...(MASTER_KEYS.includes(field?.masterKey) ? { masterKey: field.masterKey } : {}),
  }))
  .filter((field) => field.label);

const normalizeFormInput = (body) => {
  const title = clean(body.title);
  const fields = normalizeFields(body.fields);
  const assignedTo = body.assignedTo && body.assignedTo !== 'all' ? String(Number(body.assignedTo)) : 'all';
  const approvedBy = body.approvedBy ? Number(body.approvedBy) : null;
  return { title, fields, assignedTo, approvedBy };
};

const FORM_SELECT = `SELECT f.*, u.full_name AS approved_by_name
  FROM employee_forms f LEFT JOIN users u ON u.id = f.approved_by`;

// Admins managing forms (default) get every form with all submissions. `?scope=mine`, and
// any non-admin, gets only the forms assigned to the caller plus their own submission.
exports.list = async (req, res) => {
  const [forms] = await db.query(`${FORM_SELECT} ORDER BY f.id DESC`);
  const [responses] = await db.query('SELECT * FROM employee_form_responses ORDER BY submitted_at DESC');
  const byForm = groupResponses(responses);

  if (isAdmin(req.user) && req.query.scope !== 'mine') {
    return res.json(forms.map((row) => {
      const submissions = byForm.get(row.id) || [];
      return { ...toForm(row), assignedToName: null, submissions };
    }));
  }

  const userId = String(req.user.id);
  const mine = forms
    .filter((row) => row.assigned_to === 'all' || row.assigned_to === userId)
    .map((row) => ({
      ...toForm(row),
      myResponse: (byForm.get(row.id) || []).find((r) => String(r.userId) === userId) || null,
    }));
  res.json(mine);
};

exports.create = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can create forms.' });

  const { title, fields, assignedTo, approvedBy } = normalizeFormInput(req.body);
  if (!title) return res.status(400).json({ message: 'Form title is required.' });
  if (!fields.length) return res.status(400).json({ message: 'Add at least one field with a label.' });
  if (assignedTo === 'NaN') return res.status(400).json({ message: 'Assigned employee is invalid.' });
  if (approvedBy !== null && !Number.isInteger(approvedBy)) return res.status(400).json({ message: 'Approver is invalid.' });

  const [result] = await db.execute(
    'INSERT INTO employee_forms (title, assigned_to, approved_by, fields, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?)',
    [title, assignedTo, approvedBy, JSON.stringify(fields), req.user.id, req.user.fullName || null]
  );
  res.status(201).json({ id: result.insertId });
};

exports.update = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can update forms.' });

  const { title, fields, assignedTo, approvedBy } = normalizeFormInput(req.body);
  if (!title) return res.status(400).json({ message: 'Form title is required.' });
  if (!fields.length) return res.status(400).json({ message: 'Add at least one field with a label.' });
  if (assignedTo === 'NaN') return res.status(400).json({ message: 'Assigned employee is invalid.' });
  if (approvedBy !== null && !Number.isInteger(approvedBy)) return res.status(400).json({ message: 'Approver is invalid.' });

  const [result] = await db.execute(
    'UPDATE employee_forms SET title = ?, assigned_to = ?, approved_by = ?, fields = ? WHERE id = ?',
    [title, assignedTo, approvedBy, JSON.stringify(fields), req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Form not found.' });
  res.json({ id: Number(req.params.id) });
};

exports.remove = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only administrators can delete forms.' });
  await db.execute('DELETE FROM employee_forms WHERE id = ?', [req.params.id]);
  res.status(204).end();
};

exports.submit = async (req, res) => {
  const [[form]] = await db.execute('SELECT * FROM employee_forms WHERE id = ?', [req.params.id]);
  if (!form) return res.status(404).json({ message: 'Form not found.' });
  if (form.assigned_to !== 'all' && form.assigned_to !== String(req.user.id)) {
    return res.status(403).json({ message: 'This form is not assigned to you.' });
  }

  const [[existing]] = await db.execute('SELECT status FROM employee_form_responses WHERE form_id = ? AND user_id = ?', [form.id, req.user.id]);
  if (existing?.status === 'approved') {
    return res.status(409).json({ message: 'This response has already been approved and can no longer be changed.' });
  }

  const fields = parseJson(form.fields, []);
  const input = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const answers = {};
  for (const field of fields) {
    const rawValue = input[field.id];
    const values = Array.isArray(rawValue) ? rawValue.map(clean).filter(Boolean) : [clean(rawValue)];
    if (field.required && !values.length) return res.status(400).json({ message: `"${field.label}" is required.` });
    answers[field.id] = values;
  }

  await db.execute(
    `INSERT INTO employee_form_responses (form_id, user_id, user_name, answers) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE answers = VALUES(answers), user_name = VALUES(user_name), status = 'pending', reviewed_at = NULL, submitted_at = CURRENT_TIMESTAMP`,
    [form.id, req.user.id, req.user.fullName || req.user.username || 'Employee', JSON.stringify(answers)]
  );
  res.status(201).json({ ok: true });
};

// Forms the caller is the designated approver for, with every submission to review.
exports.approvals = async (req, res) => {
  const [forms] = await db.query(`${FORM_SELECT} WHERE f.approved_by = ? ORDER BY f.id DESC`, [req.user.id]);
  if (!forms.length) return res.json([]);
  const [responses] = await db.query(
    'SELECT * FROM employee_form_responses WHERE form_id IN (?) ORDER BY submitted_at DESC',
    [forms.map((form) => form.id)]
  );
  const byForm = groupResponses(responses);
  res.json(forms.map((row) => ({ ...toForm(row), submissions: byForm.get(row.id) || [] })));
};

// Only the approver named on the form may change the status of its responses.
exports.setStatus = async (req, res) => {
  const status = String(req.body.status || '').toLowerCase();
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be pending or approved.' });

  const [[row]] = await db.execute(
    `SELECT r.id, f.approved_by FROM employee_form_responses r
     JOIN employee_forms f ON f.id = r.form_id WHERE r.id = ?`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ message: 'Response not found.' });
  if (row.approved_by === null || Number(row.approved_by) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'You are not the approver for this form.' });
  }

  await db.execute(
    'UPDATE employee_form_responses SET status = ?, reviewed_at = ? WHERE id = ?',
    [status, status === 'pending' ? null : new Date(), row.id]
  );
  res.json({ id: row.id, status });
};
