const db = require('../config/db');

exports.getAll = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = [];
  const params = [];
  if (req.query.name) { where.push('item_name LIKE ?'); params.push(`%${req.query.name}%`); }
  if (req.query.category) { where.push('category LIKE ?'); params.push(`%${req.query.category}%`); }
  if (req.query.status) { where.push('status LIKE ?'); params.push(`%${req.query.status}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = { id: 'id', name: 'item_name', sku: 'item_code', category: 'category', price: 'price', stock: 'stock', status: 'status' };
  const sortBy = allowedSort[req.query.sortBy] ? allowedSort[req.query.sortBy] : 'id';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM items ${whereSql}`, params);
  const [rows] = await db.query(`SELECT id, item_name AS name, item_code AS sku, item_code AS itemCode, category, description, price, stock, status FROM items ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ rows, total, limit, offset });
};

exports.create = async (req, res) => {
  const { name, itemCode, sku, price, stock = 0, category = null, description = null, status = 'Active' } = req.body;
  if (!name || price === undefined) return res.status(400).json({ message: 'Item name and price are required.' });
  const code = itemCode || sku || `ITEM-${Date.now()}`;
  const [result] = await db.execute('INSERT INTO items (item_code, item_name, category, description, price, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [code, name, category, description, Number(price), Number(stock), status]);
  res.status(201).json({ id: result.insertId, name, itemCode: code, category, description, price: Number(price), stock: Number(stock), status });
};

exports.update = async (req, res) => {
  const { name, itemCode, sku, price, stock, category, description, status } = req.body;
  const code = itemCode || sku;
  await db.execute('UPDATE items SET item_name = ?, item_code = ?, category = ?, description = ?, price = ?, stock = ?, status = ? WHERE id = ?', [name, code, category || null, description || null, Number(price), Number(stock), status || 'Active', req.params.id]);
  res.json({ id: Number(req.params.id), name, itemCode: code, category, description, price: Number(price), stock: Number(stock), status: status || 'Active' });
};

exports.remove = async (req, res) => {
  await db.execute('DELETE FROM items WHERE id = ?', [req.params.id]);
  res.status(204).end();
};

