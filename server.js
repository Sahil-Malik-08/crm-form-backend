const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const customerRoutes = require('./routes/customerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const orderRoutes = require('./routes/orderRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const formTemplateRoutes = require('./routes/formTemplateRoutes');

const { authenticate } = require('./middleware/auth');
const { authLimiter, generalLimiter, strictLimiter } = require('./middleware/rateLimiter');
const { corsMiddleware, securityHeaders } = require('./middleware/security');
const { sanitizeBody } = require('./middleware/validation');

const app = express();

app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeBody);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth', generalLimiter, authRoutes);

app.use('/api/employees', authenticate, strictLimiter, employeeRoutes);
app.use('/api/customers', authenticate, strictLimiter, customerRoutes);
app.use('/api/items', authenticate, strictLimiter, itemRoutes);
app.use('/api/orders', authenticate, strictLimiter, orderRoutes);
app.use('/api/contacts', authenticate, strictLimiter, contactRoutes);
app.use('/api/users', authenticate, strictLimiter, userRoutes);
app.use('/api/forms', authenticate, strictLimiter, formRoutes);
app.use('/api/form-templates', authenticate, strictLimiter, formTemplateRoutes);
app.use('/api/settings', authenticate, strictLimiter, settingsRoutes);

app.use('/api/health', generalLimiter, asyncRoute(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ database: 'company_dashboard', connected: true });
}));

app.use('/api/dashboard', authenticate, strictLimiter, asyncRoute(async (req, res) => {
  const { dateFrom, dateTo, employee, product, customer, status, city } = req.query;

  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('o.created_at >= ?'); params.push(dateFrom); }
  if (dateTo) { conditions.push('o.created_at <= ?'); params.push(dateTo + ' 23:59:59'); }
  if (employee) { conditions.push('o.employee_id = ?'); params.push(Number(employee)); }
  if (product) { conditions.push('o.product LIKE ?'); params.push(`%${product}%`); }
  if (customer) { conditions.push('o.customer_name LIKE ?'); params.push(`%${customer}%`); }
  if (status) { conditions.push('o.status = ?'); params.push(status); }
  if (city) { conditions.push('o.city LIKE ?'); params.push(`%${city}%`); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [[totalEmployees]] = await db.query('SELECT COUNT(*) AS count FROM employees');
  const [[totalCustomers]] = await db.query('SELECT COUNT(*) AS count FROM customers');
  const [[orderStats]] = await db.query(`
    SELECT COUNT(*) AS totalOrders,
      COALESCE(SUM(amount), 0) AS totalRevenue,
      COALESCE(SUM(status = 'Pending'), 0) AS pending,
      COALESCE(SUM(status = 'Completed'), 0) AS completed
    FROM orders o ${where}`, params);

  const [recentOrders] = await db.query(`
    SELECT o.id, o.customer_name AS customer, o.city, o.product, o.amount, o.status, e.full_name AS employee,
      DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 1) AS quantity
    FROM orders o JOIN employees e ON e.id = o.employee_id
    ${where} ORDER BY o.created_at DESC LIMIT 20`, params);

  const [topCustomers] = await db.query(`
    SELECT o.customer_name AS name, COUNT(*) AS totalOrders, SUM(o.amount) AS totalPurchase
    FROM orders o ${where} GROUP BY o.customer_name ORDER BY totalPurchase DESC LIMIT 10`, params);

  let [bestSelling] = await db.query(`
    SELECT oi.product_name AS name, SUM(oi.quantity) AS qtySold, SUM(oi.subtotal) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id ${where}
    GROUP BY oi.product_name ORDER BY qtySold DESC LIMIT 10`, params);
  const fromItems = new Map(bestSelling.map((r) => [r.name.toLowerCase(), r]));
  const productWhere = where ? `${where} AND o.product IS NOT NULL AND o.product <> ''` : "WHERE o.product IS NOT NULL AND o.product <> ''";
  const [fromOrders] = await db.query(`
    SELECT o.product AS name, COUNT(*) AS qtySold, SUM(o.amount) AS revenue
    FROM orders o ${productWhere}
    GROUP BY o.product ORDER BY revenue DESC LIMIT 20`, params);
  for (const row of fromOrders) {
    const key = row.name.toLowerCase();
    if (!fromItems.has(key)) {
      fromItems.set(key, row);
    }
  }
  bestSelling = Array.from(fromItems.values()).sort((a, b) => (b.qtySold || 0) - (a.qtySold || 0)).slice(0, 10);

  const [lowStock] = await db.query(`
    SELECT id, item_name AS name, stock, status FROM items WHERE stock <= 10 ORDER BY stock ASC LIMIT 10`);

  const empWhere = conditions.length > 0 ? ' AND ' + conditions.map(c => c.replace(/^o\./, 'o.')).join(' AND ') : '';
  const [employeePerformance] = await db.query(`
  SELECT 
    e.id,
    e.full_name AS name,
    COUNT(CASE WHEN o.status = 'Completed' THEN 1 END) AS ordersCompleted,
    COALESCE(
      SUM(CASE WHEN o.status = 'Completed' THEN o.amount ELSE 0 END),
      0
    ) AS sales
  FROM employees e
  LEFT JOIN orders o 
    ON e.id = o.employee_id${empWhere}
  GROUP BY e.id, e.full_name
  ORDER BY ordersCompleted DESC
  LIMIT 10
`, params);

  const [monthlySales] = await db.query(`
    SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month,
      DATE_FORMAT(o.created_at, '%b') AS name,
      COUNT(*) AS sales, COALESCE(SUM(o.amount), 0) AS revenue
    FROM orders o ${where}
    GROUP BY DATE_FORMAT(o.created_at, '%Y-%m'), DATE_FORMAT(o.created_at, '%b')
    ORDER BY month DESC LIMIT 12`, params);
  monthlySales.reverse();
  const normalizedMonthlySales = monthlySales.map((row) => ({ ...row, sales: Number(row.sales || 0), revenue: Number(row.revenue || 0) }));

  const recentRevenueWhere = where || 'WHERE o.created_at >= CURDATE() - INTERVAL 6 DAY';
  const [weeklyRevenue] = await db.query(`
    SELECT DATE_FORMAT(DATE(o.created_at), '%d %b') AS name,
      DATE_FORMAT(DATE(o.created_at), '%Y-%m-%d') AS date,
      COALESCE(SUM(o.amount), 0) AS revenue
    FROM orders o ${recentRevenueWhere}
    GROUP BY DATE(o.created_at), DATE_FORMAT(DATE(o.created_at), '%d %b'), DATE_FORMAT(DATE(o.created_at), '%Y-%m-%d')
    ORDER BY DATE(o.created_at) DESC LIMIT 7`, params);
  const normalizeRevenue = (row) => ({ ...row, revenue: Number(row.revenue || 0) });
  weeklyRevenue.reverse();
  const normalizedWeeklyRevenue = weeklyRevenue.map(normalizeRevenue);

  // Daily revenue for the last 12 months so the Revenue Trend chart can offer a
  // "month first, then week of month" selection instead of only the latest 7 days.
  const dailyRevenueWhere = where || 'WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
  const [dailyRevenue] = await db.query(`
    SELECT DATE_FORMAT(DATE(o.created_at), '%Y-%m-%d') AS date,
      DATE_FORMAT(DATE(o.created_at), '%d %b') AS name,
      COALESCE(SUM(o.amount), 0) AS revenue
    FROM orders o ${dailyRevenueWhere}
    GROUP BY DATE(o.created_at), DATE_FORMAT(DATE(o.created_at), '%Y-%m-%d'), DATE_FORMAT(DATE(o.created_at), '%d %b')
    ORDER BY DATE(o.created_at) ASC`, params);
  const normalizedDailyRevenue = dailyRevenue.map(normalizeRevenue);

  const [statusData] = await db.query(`
    SELECT o.status AS name, COUNT(*) AS value FROM orders o ${where}
    GROUP BY o.status ORDER BY value DESC`, params);
  const [employees] = await db.query('SELECT id, full_name AS fullName, department, role AS designation FROM employees ORDER BY id DESC LIMIT 5');
  const [customers] = await db.query('SELECT id, customer_name AS name, phone_number AS phone, city FROM customers ORDER BY id DESC LIMIT 5');

  res.json({
    stats: {
      employees: totalEmployees.count || 0,
      customers: totalCustomers.count || 0,
      totalOrders: orderStats.totalOrders || 0,
      totalRevenue: Number(orderStats.totalRevenue || 0),
      pending: orderStats.pending || 0,
      completed: orderStats.completed || 0
    },
    recentOrders,
    topCustomers,
    bestSelling,
    lowStock,
    employeePerformance,
    monthlySales: normalizedMonthlySales,
    weeklyRevenue: normalizedWeeklyRevenue,
    dailyRevenue: normalizedDailyRevenue,
    statusData,
    employees,
    customers
  });
}));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'Database request failed.', detail: process.env.NODE_ENV === 'development' ? error.code : undefined });
});

db.ready.then(() => {
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`Company dashboard API running on http://localhost:${port}`));
}).catch((err) => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
