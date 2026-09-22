const express = require('express');
const router = express.Router();
const db = require('../config/db');
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// Generic CRUD for master tables
const masters = {
  states: { table: 'master_states', col: 'name' },
  roles: { table: 'master_roles', col: 'name', hasDept: true },
  departments: { table: 'master_departments', col: 'name' },
  industries: { table: 'master_industries', col: 'name' },
};

router.get('/cities', asyncRoute(async (req, res) => {
  const [rows] = await db.query('SELECT c.id, c.name, c.state_id AS stateId, s.name AS stateName FROM master_cities c LEFT JOIN master_states s ON s.id = c.state_id ORDER BY s.name, c.name');
  res.json(rows);
}));

router.post('/cities', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const stateId = Number(req.body.stateId);
  if (!name || !stateId) return res.status(400).json({ message: 'City and state are required.' });
  const [[state]] = await db.execute('SELECT id, name FROM master_states WHERE id = ?', [stateId]);
  if (!state) return res.status(400).json({ message: 'Selected state does not exist.' });
  const [[existing]] = await db.execute('SELECT id FROM master_cities WHERE LOWER(name) = LOWER(?) AND state_id = ?', [name, stateId]);
  if (existing) return res.status(409).json({ message: name + ' already exists in ' + state.name + '.' });
  const [result] = await db.execute('INSERT INTO master_cities (name, state_id) VALUES (?, ?)', [name, stateId]);
  res.status(201).json({ id: result.insertId, name, stateId, stateName: state.name });
}));

router.put('/cities/:id', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const stateId = Number(req.body.stateId);
  if (!name || !stateId) return res.status(400).json({ message: 'City and state are required.' });
  const [[state]] = await db.execute('SELECT id, name FROM master_states WHERE id = ?', [stateId]);
  if (!state) return res.status(400).json({ message: 'Selected state does not exist.' });
  const [[existing]] = await db.execute('SELECT id FROM master_cities WHERE LOWER(name) = LOWER(?) AND state_id = ? AND id <> ?', [name, stateId, req.params.id]);
  if (existing) return res.status(409).json({ message: name + ' already exists in ' + state.name + '.' });
  const [result] = await db.execute('UPDATE master_cities SET name = ?, state_id = ? WHERE id = ?', [name, stateId, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Master record not found.' });
  res.json({ id: Number(req.params.id), name, stateId, stateName: state.name });
}));

router.delete('/cities/:id', asyncRoute(async (req, res) => {
  const [result] = await db.execute('DELETE FROM master_cities WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Master record not found.' });
  res.status(204).end();
}));

Object.entries(masters).forEach(([key, { table, col, hasDept }]) => {
  if (hasDept) {
    // Special handling for roles with department
    router.get(`/${key}`, asyncRoute(async (req, res) => {
      const [rows] = await db.query('SELECT r.id, r.name, r.department_id AS departmentId, d.name AS departmentName FROM master_roles r LEFT JOIN master_departments d ON d.id = r.department_id ORDER BY d.name, r.name');
      res.json(rows);
    }));
    router.post(`/${key}`, asyncRoute(async (req, res) => {
      const name = String(req.body.name || '').trim();
      const departmentId = Number(req.body.departmentId);
      if (!name || !departmentId) return res.status(400).json({ message: 'Role and department are required.' });
      const [[dept]] = await db.execute('SELECT id, name FROM master_departments WHERE id = ?', [departmentId]);
      if (!dept) return res.status(400).json({ message: 'Selected department does not exist.' });
      const [[existing]] = await db.execute('SELECT id FROM master_roles WHERE LOWER(name) = LOWER(?) AND department_id = ?', [name, departmentId]);
      if (existing) return res.status(409).json({ message: name + ' already exists in ' + dept.name + '.' });
      const [result] = await db.execute('INSERT INTO master_roles (name, department_id) VALUES (?, ?)', [name, departmentId]);
      res.status(201).json({ id: result.insertId, name, departmentId, departmentName: dept.name });
    }));
    router.put(`/${key}/:id`, asyncRoute(async (req, res) => {
      const name = String(req.body.name || '').trim();
      const departmentId = Number(req.body.departmentId);
      if (!name || !departmentId) return res.status(400).json({ message: 'Role and department are required.' });
      const [[dept]] = await db.execute('SELECT id, name FROM master_departments WHERE id = ?', [departmentId]);
      if (!dept) return res.status(400).json({ message: 'Selected department does not exist.' });
      const [[existing]] = await db.execute('SELECT id FROM master_roles WHERE LOWER(name) = LOWER(?) AND department_id = ? AND id <> ?', [name, departmentId, req.params.id]);
      if (existing) return res.status(409).json({ message: name + ' already exists in ' + dept.name + '.' });
      const [result] = await db.execute('UPDATE master_roles SET name = ?, department_id = ? WHERE id = ?', [name, departmentId, req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Master record not found.' });
      res.json({ id: Number(req.params.id), name, departmentId, departmentName: dept.name });
    }));
    router.delete(`/${key}/:id`, asyncRoute(async (req, res) => {
      const [result] = await db.execute('DELETE FROM master_roles WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Master record not found.' });
      res.status(204).end();
    }));
  } else {
    // Standard handling for other masters
    router.get(`/${key}`, asyncRoute(async (req, res) => {
      const [rows] = await db.query(`SELECT id, ${col} AS name FROM ${table} ORDER BY id DESC`);
      res.json(rows);
    }));
    router.post(`/${key}`, asyncRoute(async (req, res) => {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: 'Name is required.' });
      const [[existing]] = await db.execute(`SELECT id FROM ${table} WHERE LOWER(${col}) = LOWER(?) LIMIT 1`, [name]);
      if (existing) return res.status(409).json({ message: `${name} already exists.` });
      const [r] = await db.execute(`INSERT INTO ${table} (${col}) VALUES (?)`, [name]);
      res.status(201).json({ id: r.insertId, name });
    }));
    router.put(`/${key}/:id`, asyncRoute(async (req, res) => {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: 'Name is required.' });
      const [[existing]] = await db.execute(`SELECT id FROM ${table} WHERE LOWER(${col}) = LOWER(?) AND id <> ? LIMIT 1`, [name, req.params.id]);
      if (existing) return res.status(409).json({ message: `${name} already exists.` });
      const [result] = await db.execute(`UPDATE ${table} SET ${col} = ? WHERE id = ?`, [name, req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Master record not found.' });
      res.json({ id: Number(req.params.id), name });
    }));
    router.delete(`/${key}/:id`, asyncRoute(async (req, res) => {
      const [result] = await db.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Master record not found.' });
      res.status(204).end();
    }));
  }
});

module.exports = router;
