// backend/config/db.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'company_dashboard';

// Create pool without database first to ensure DB exists
const initPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrateRoleIndex() {
  // Drop old single-column unique index and use composite (name, department_id)
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'master_roles'
          AND INDEX_NAME = 'uq_master_roles_name' AND COLUMN_NAME = 'name'`,
      [DB_NAME]
    );
    if (rows[0].cnt > 0) {
      await pool.query('ALTER TABLE master_roles DROP INDEX uq_master_roles_name');
      console.log('Dropped legacy single-column unique index on master_roles.');
    }
  } catch (err) {
    console.error('migrateRoleIndex (drop) error:', err.message);
  }
  try {
    await pool.query('ALTER TABLE master_roles ADD UNIQUE KEY uq_master_roles_name_dept (name, department_id)');
  } catch (err) {
    // Ignore: index already exists
  }
}

async function migrateCityIndex() {
  // Drop old single-column unique index and use composite (name, state_id)
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'master_cities'
          AND INDEX_NAME = 'uq_master_cities_name' AND COLUMN_NAME = 'name'`,
      [DB_NAME]
    );
    if (rows[0].cnt > 0) {
      await pool.query('ALTER TABLE master_cities DROP INDEX uq_master_cities_name');
      console.log('Dropped legacy single-column unique index on master_cities.');
    }
  } catch (err) {
    console.error('migrateCityIndex (drop) error:', err.message);
  }
  try {
    await pool.query('ALTER TABLE master_cities ADD UNIQUE KEY uq_master_cities_name (name, state_id)');
  } catch (err) {
    // Ignore: index already exists
  }
}

async function cleanupDepartmentsAndRoles() {
  const keepNames = ['IT', 'Sales', 'Management'];
  const [deptRows] = await pool.query('SELECT id, name FROM master_departments');
  const keepDeptIds = deptRows
    .filter((row) => keepNames.some((k) => k.toLowerCase() === String(row.name || '').toLowerCase()))
    .map((row) => row.id);

  if (keepDeptIds.length > 0) {
    const placeholders = keepDeptIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM master_roles WHERE department_id NOT IN (${placeholders})`, keepDeptIds);
    await pool.query(`DELETE FROM master_departments WHERE id NOT IN (${placeholders})`, keepDeptIds);
  } else {
    await pool.query('DELETE FROM master_roles');
    await pool.query('DELETE FROM master_departments');
  }
}

async function seedDepartmentsRolesAndIndustries() {
  const { INDUSTRIES, DEPARTMENT_ROLES } = require('./seedData');

  const [deptRows] = await pool.query('SELECT id, name FROM master_departments');
  const deptMap = new Map(deptRows.map((row) => [row.name.toLowerCase(), row.id]));

  for (const deptName of Object.keys(DEPARTMENT_ROLES)) {
    const key = deptName.toLowerCase();
    if (!deptMap.has(key)) {
      const [result] = await pool.query('INSERT INTO master_departments (name) VALUES (?)', [deptName]);
      deptMap.set(key, result.insertId);
    }
  }

  const [roleRows] = await pool.query('SELECT id, name, department_id FROM master_roles');
  const roleChecks = new Set(
    roleRows.map((row) => `${String(row.name || '').toLowerCase()}|${row.department_id}`)
  );

  for (const [deptName, roles] of Object.entries(DEPARTMENT_ROLES)) {
    const deptId = deptMap.get(deptName.toLowerCase());
    if (!deptId) continue;
    for (const role of roles) {
      const key = `${role.toLowerCase()}|${deptId}`;
      if (roleChecks.has(key)) continue;
      await pool.query(
        'INSERT INTO master_roles (name, department_id) VALUES (?, ?)',
        [role, deptId]
      );
      roleChecks.add(key);
    }
  }

  for (const industry of INDUSTRIES) {
    await pool.query(
      'INSERT INTO master_industries (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM master_industries WHERE LOWER(name) = LOWER(?))',
      [industry, industry]
    );
  }

  console.log('Departments, roles, and industries seeded successfully.');
}

async function seedStatesAndCities() {
  const { STATES_CITIES } = require('./seedData');
  const [stateRows] = await pool.query('SELECT id, name FROM master_states');
  const existing = new Map(stateRows.map((row) => [row.name.toLowerCase(), row.id]));
  const cityChecks = new Map();

  // Load all existing cities for duplicate checking
  const [cityRows] = await pool.query('SELECT id, name, state_id FROM master_cities');
  for (const row of cityRows) {
    const key = `${String(row.name || '').toLowerCase()}|${row.state_id}`;
    cityChecks.set(key, row.id);
  }

  for (const { state, cities } of STATES_CITIES) {
    let stateId = existing.get(state.toLowerCase());
    if (!stateId) {
      const [result] = await pool.query('INSERT INTO master_states (name) VALUES (?)', [state]);
      stateId = result.insertId;
      existing.set(state.toLowerCase(), stateId);
    }
    for (const city of cities) {
      const key = `${city.toLowerCase()}|${stateId}`;
      if (!cityChecks.has(key)) {
        const [result] = await pool.query('INSERT INTO master_cities (name, state_id) VALUES (?, ?)', [city, stateId]);
        cityChecks.set(key, result.insertId);
      }
    }
  }
  console.log('States and cities seeded successfully.');
}

// Export a ready promise that resolves when DB + schema are initialized
const ready = (async () => {
  try {
    // Ensure database exists
    const conn = await initPool.getConnection();
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    conn.release();
    await initPool.end();
    console.log(`Database "${DB_NAME}" ensured.`);

    // Run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      const statements = sql.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            await pool.query(stmt);
          } catch (err) {
            if (
              err.code === 'ER_DUP_FIELDNAME' ||
              err.code === 'ER_DUP_KEYNAME' ||
              err.code === 'ER_FK_DUP_NAME' ||
              err.code === 'ER_DUP_ENTRY' ||
              err.code === 'ER_CANT_CREATE_TABLE' ||
              err.errno === 1005 ||
              (err.message && (err.message.toLowerCase().includes('already exists') || err.message.includes('errno: 121')))
            ) {
              console.warn('Schema migration: column, constraint, or index already exists, skipping.');
            } else {
              throw err;
            }
          }
        }
      }
      console.log('Schema initialized successfully.');
    }

    // Migrate indexes to composite unique keys
    await migrateCityIndex();
    await migrateRoleIndex();

    // Seed all master tables
    await cleanupDepartmentsAndRoles();
    await seedDepartmentsRolesAndIndustries();
    await seedStatesAndCities();
  } catch (err) {
    console.error('Database/schema initialization error:', err.message);
    throw err;
  }
})();

module.exports = pool;
module.exports.ready = ready;
