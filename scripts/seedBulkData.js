/**
 * Bulk Seed Script
 * -----------------
 * Adds 20,000 new customers and gives:
 *   - every one of the 20,000 new customers exactly 2 orders (40,000 orders)
 *   - ~6 selected customers an additional 5,000 orders each (30,000 orders)
 *
 * Total added: 20,000 customers + ~70,000 orders.
 *
 * Run from the backend directory:
 *   node scripts/seedBulkData.js
 *
 * The script is idempotent and will not duplicate rows if re-run.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'company_dashboard';

const TARGET_NEW_CUSTOMERS = 20000;
const ORDERS_PER_CUSTOMER = 2;
const HIGH_VOLUME_COUNT = 6;
const HIGH_VOLUME_ORDERS = 5000;

// Product catalogue for realistic order content
const PRODUCTS = [
  'Steel Sheet', 'Cement Bag', 'PVC Pipe', 'Copper Wire', 'Aluminium Profile',
  'Ceramic Tiles', 'Paint Bucket', 'Timber Plank', 'Glass Panel', 'Brick Paver',
  'Sanitary Fitting', 'Electrical Switch', 'Laminates', 'Adhesive Sealant', 'Insulation Board'
];

const STATUSES = ['Pending', 'Processing', 'Completed', 'Completed', 'Completed', 'Cancelled'];

// First names and last names to compose unique customer names
const FIRST_NAMES = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Rohan','Karthik','Aryan','Ishaan','Rahul','Amit','Ravi','Sanjay','Vikram','Ramesh','Suresh','Mahesh','Dinesh','Prakash','Rajesh','Anil','Sunil','Nitin','Vinod','Gopal','Harish','Kiran','Manoj','Naveen','Pawan','Prashant','Rakesh','Sandeep','Shyam','Tarun','Umesh','Yogesh','Abhishek','Ankit','Anurag','Deepak','Gaurav','Harsh','Jayesh','Kunal','Mohit','Nikhil','Pankaj','Rajat','Sachin','Sameer','Vishal','Varun','Aditi','Ananya','Aisha','Diya','Isha','Kavya','Meera','Neha','Pooja','Priya','Riya','Sneha','Tanvi','Anjali','Divya','Komal','Lakshmi','Madhavi','Nandini','Pallavi','Rekha','Shalini','Swati','Vandana','Geeta','Sunita','Ritu','Sonia','Priyanka','Shreya','Purnima','Anushka','Bhavna','Charu','Deepika','Farah','Gauri','Hema','Jyoti','Kiran'];

const LAST_NAMES = ['Sharma','Verma','Gupta','Mehta','Kapoor','Malhotra','Chopra','Agarwal','Yadav','Jain','Patel','Shah','Kumar','Singh','Reddy','Rao','Nair','Menon','Iyer','Pillai','Das','Bose','Ghosh','Banerjee','Chatterjee','Mukherjee','Roy','Sen','Sinha','Bhattacharya','Naidu','Prasad','Pande','Joshi','Kulkarni','Deshpande','Patil','Chavan','Pawar','Shelke','Mahajan','Kamble','Ingle','Thakur','Mishra','Tripathi','Dwivedi','Pandey','Dubey','Tiwari','Chauhan','Rathore','Solanki','Sisodia','Pareek','Meena','Gurjar','Saini','Khatri','Arora','Bhatia','Sodhi','Gill','Dhillon','Bajwa','Sidhu','Sandhu','Cheema','Brar','Grewal','Toor','Monga','Bhandari','Rana','Negi','Rawat','Kandpal','Bisht','Gusain'];

// Utility random helpers
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const random2025Date = () => {
  const month = randBetween(1, 12);
  const day = randBetween(1, 28);
  const hour = randBetween(0, 23);
  const minute = randBetween(0, 59);
  const second = randBetween(0, 59);
  return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
};

// Unique phone number generator (disjoint over a 10-digit space)
let phoneCounter = randBetween(6000000000, 6999999999) - 1000000;
const nextPhone = () => {
  phoneCounter += 1;
  const s = String(phoneCounter).padStart(10, '0');
  return s.slice(0, 10);
};

// Unique pincode for a city (fallback to a generated 6-digit number)
function usePincodeFor(cityPincodes, city) {
  if (cityPincodes[city]) return cityPincodes[city];
  return String(randBetween(100000, 999999));
}

// Generate a single customer record
function makeCustomer(seedData, cityPincodes) {
  const { STATES_CITIES } = seedData;
  const stateObj = pick(STATES_CITIES);
  const state = stateObj.state;
  const city = pick(stateObj.cities);
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const phone = nextPhone();
  const alternate = Math.random() < 0.4 ? nextPhone() : null;
  const houseNo = `${randBetween(1, 999)}`;
  const locality = pick(['Gandhi Nagar','Patel Colony','Shastri Road','MG Road','Sardar Marg','Nehru Street','Laxmi Nagar','Indira Colony','Ashok Vihar','Green Park']);
  const pincode = usePincodeFor(cityPincodes, city);
  const address = `${houseNo}, ${locality}, ${city}, ${state} - ${pincode}`;
  const salesPerson = null;
  return { name, phone, alternate, houseNo, locality, city, state, address, pincode, salesPerson };
}

// Generate a single order row matching a customer
function makeOrder(customerId, customer, employeeId) {
  const product = pick(PRODUCTS);
  const amount = Number((randBetween(1000, 250000) / 1).toFixed(2));
  const status = pick(STATUSES);
  const createdAt = random2025Date();
  const alternate = (customer.alternatePhone !== undefined) ? customer.alternatePhone : customer.alternate;
  return {
    employee_id: employeeId,
    customer_name: customer.name,
    phone_number: customer.phone,
    alternate_phone: alternate,
    house_no: customer.houseNo,
    locality: customer.locality,
    city: customer.city,
    state: customer.state,
    address: customer.address,
    pincode: customer.pincode,
    product,
    amount,
    status,
    notes: null,
    created_at: createdAt
  };
}

async function run() {
  const seedData = require('../config/seedData');
  const cityPincodes = require('../../frontend/src/data/cityPincodeData');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
    multipleStatements: true
  });
  console.log(`Connected to database "${DB_NAME}".`);

  // ---- Ensure an employee exists to satisfy the order FK ----
  const [[anyEmp]] = await conn.execute('SELECT id FROM employees LIMIT 1');
  let defaultEmpId;
  if (anyEmp) {
    defaultEmpId = anyEmp.id;
    console.log(`Using existing employee id=${defaultEmpId} for orders.`);
  } else {
    const [empRes] = await conn.execute(
      "INSERT INTO employees (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ['Bulk Seed Admin', 'bulkseed@example.com', 'not-a-real-hash-seed-script', 'admin']
    );
    defaultEmpId = empRes.insertId;
    console.log(`Created a seed employee (id=${defaultEmpId}) for orders.`);
  }

  // ---- Check current customer count ----
  const [[cntRow]] = await conn.execute('SELECT COUNT(*) AS n FROM customers');
  const existingCount = cntRow.n;
  const alreadyTarget = existingCount >= TARGET_NEW_CUSTOMERS;
  console.log(`Current customer count: ${existingCount}.`);

  // ---- Determine high-volume customer ids if already seeded ----
  // We flag high-volume customers with a marker via their pincode prefix "99999" so re-runs are stable.
  const [[flagRow]] = await conn.execute("SELECT COUNT(*) AS n FROM customers WHERE pincode LIKE '99999%'");
  const highVolumeExisting = flagRow.n;

  if (alreadyTarget && highVolumeExisting >= HIGH_VOLUME_COUNT) {
    console.log('Target already seeded. Nothing to do.');
    await conn.end();
    return;
  }

  // ---- STEP 1: Insert customers (only if under target) ----
  let newCustomers = [];
  if (!alreadyTarget) {
    console.log(`Generating ${TARGET_NEW_CUSTOMERS} customers...`);
    const [[maxRow]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS m FROM customers');
    const idFloor = maxRow.m;
    const BATCH = 500;
    for (let start = 0; start < TARGET_NEW_CUSTOMERS; start += BATCH) {
      const end = Math.min(start + BATCH, TARGET_NEW_CUSTOMERS);
      const placeholders = [];
      const values = [];
      for (let i = start; i < end; i++) {
        const c = makeCustomer(seedData, cityPincodes);
        placeholders.push('(?,?,?,?,?,?,?,?,?,?)');
        values.push(c.name, c.phone, c.alternate, c.houseNo, c.locality, c.city, c.state, c.address, c.pincode, c.salesPerson);
      }
      const sql = `INSERT INTO customers (customer_name, phone_number, alternate_phone, house_no, locality, city, state, address, pincode, sales_person) VALUES ${placeholders.join(',')}`;
      await conn.execute(sql, values);
      if (start % 2000 === 0) console.log(`  inserted customers ${start}-${end}`);
    }
    // Reload the customers we just inserted (by id > idFloor) so we have their ids for orders.
    const [rows] = await conn.execute(
      'SELECT id, customer_name AS name, phone_number AS phone, alternate_phone AS alternatePhone, house_no AS houseNo, locality, city, state, address, pincode FROM customers WHERE id > ? ORDER BY id ASC LIMIT ?',
      [idFloor, TARGET_NEW_CUSTOMERS]
    );
    newCustomers = rows;
    console.log(`Inserted ${TARGET_NEW_CUSTOMERS} customers (ids ${idFloor + 1}..${newCustomers.length ? newCustomers[newCustomers.length - 1].id : idFloor}).`);
  } else {
    // Load last TARGET_NEW_CUSTOMERS customers for base orders
    const [rows] = await conn.execute(`SELECT id, customer_name AS name, phone_number AS phone, alternate_phone AS alternatePhone, house_no AS houseNo, locality, city, state, address, pincode FROM customers ORDER BY id DESC LIMIT ${TARGET_NEW_CUSTOMERS}`);
    newCustomers = rows.reverse();
    console.log(`Loaded existing ${newCustomers.length} customers for orders.`);
  }

  // ---- STEP 2: 2 orders per customer ----
  const baseOrderCount = newCustomers.length * ORDERS_PER_CUSTOMER;
  let totalOrdersInserted = 0;
  console.log(`Inserting ${ORDERS_PER_CUSTOMER} base orders for ${newCustomers.length} customers (${baseOrderCount} orders)...`);
  const ORDER_BATCH = 500;
  for (let start = 0; start < baseOrderCount; start += ORDER_BATCH) {
    const end = Math.min(start + ORDER_BATCH, baseOrderCount);
    const placeholders = [];
    const values = [];
    await conn.beginTransaction();
    try {
      for (let idx = start; idx < end; idx++) {
        const custIdx = Math.floor(idx / ORDERS_PER_CUSTOMER);
        const cust = newCustomers[custIdx];
        const o = makeOrder(cust.id, cust, defaultEmpId);
        placeholders.push('(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        values.push(o.employee_id, o.customer_name, o.phone_number, o.alternate_phone, o.house_no, o.locality, o.city, o.state, o.address, o.pincode, o.product, o.amount, o.status, o.notes, o.created_at);
      }
      const sql = `INSERT INTO orders (employee_id, customer_name, phone_number, alternate_phone, house_no, locality, city, state, address, pincode, product, amount, status, notes, created_at) VALUES ${placeholders.join(',')}`;
      await conn.execute(sql, values);
      await conn.commit();
      totalOrdersInserted += end - start;
    } catch (err) {
      await conn.rollback();
      throw err;
    }
    if (start % 10000 === 0) console.log(`  base orders progress: ${totalOrdersInserted}/${baseOrderCount}`);
  }
  console.log(`Inserted ${totalOrdersInserted} base orders.`);

  // ---- STEP 3: Ensure 5-10 high-volume customers with 5000 orders each ----
  // Pick 6 customers from the existing ones (prefer ones not already flagged). If flagged count exists, reuse them.
  let pickFrom = [...newCustomers];
  // Existing flagged customers
  const [flagRows] = await conn.execute("SELECT id, customer_name AS name, phone_number AS phone, alternate_phone AS alternatePhone, house_no AS houseNo, locality, city, state, address, pincode FROM customers WHERE pincode LIKE '99999%'");
  const flaggedMap = new Map(flagRows.map(r => [r.id, r]));

  // Remove flagged from pick pool
  pickFrom = pickFrom.filter(c => !flaggedMap.has(c.id));

  const needed = HIGH_VOLUME_COUNT - flaggedMap.size;
  const extra = [];
  for (let i = 0; i < needed && pickFrom.length > 0; i++) {
    const c = pickFrom.splice(randBetween(0, pickFrom.length - 1), 1)[0];
    // Mark them by setting pincode to a "99999"-prefixed value
    await conn.execute("UPDATE customers SET pincode = CONCAT('99999', SUBSTRING(pincode, 6, 1)) WHERE id = ?", [c.id]);
    extra.push(c);
  }

  const highVolumeCustomers = [...flagRows, ...extra];
  console.log(`High-volume customers (${highVolumeCustomers.length}):`);
  highVolumeCustomers.forEach(c => console.log(`  id=${c.id} ${c.name}`));

  // Insert 5000 orders for each high-volume customer
  const HIGH_BATCH = 500;
  for (const cust of highVolumeCustomers) {
    // Count by phone_number (globally unique in our generated data) to avoid
    // collisions caused by duplicate first/last-name combinations.
    const [[priorRow]] = await conn.execute('SELECT COUNT(*) AS n FROM orders WHERE phone_number = ?', [cust.phone]);
    const existingOrders = priorRow.n;
    const toAdd = HIGH_VOLUME_ORDERS - existingOrders;
    if (toAdd <= 0) {
      console.log(`  ${cust.name} already has ${existingOrders} orders; skipping.`);
      continue;
    }
    console.log(`  ${cust.name}: inserting ${toAdd} more orders.`);
    for (let start = 0; start < toAdd; start += HIGH_BATCH) {
      const end = Math.min(start + HIGH_BATCH, toAdd);
      const placeholders = [];
      const values = [];
      await conn.beginTransaction();
      try {
        for (let idx = start; idx < end; idx++) {
          const o = makeOrder(cust.id, cust, defaultEmpId);
          placeholders.push('(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
          values.push(o.employee_id, o.customer_name, o.phone_number, o.alternate_phone, o.house_no, o.locality, o.city, o.state, o.address, o.pincode, o.product, o.amount, o.status, o.notes, o.created_at);
        }
        const sql = `INSERT INTO orders (employee_id, customer_name, phone_number, alternate_phone, house_no, locality, city, state, address, pincode, product, amount, status, notes, created_at) VALUES ${placeholders.join(',')}`;
        await conn.execute(sql, values);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
      totalOrdersInserted += end - start;
    }
  }

  // ---- Final summary ----
  const [[finalCust]] = await conn.execute('SELECT COUNT(*) AS n FROM customers');
  const [[finalOrders]] = await conn.execute('SELECT COUNT(*) AS n FROM orders');
  console.log('\n========== SEED COMPLETE ==========');
  console.log(`Total customers now: ${finalCust.n}`);
  console.log(`Total orders now:    ${finalOrders.n}`);
  console.log(`Orders inserted this run: ${totalOrdersInserted}`);
  console.log('====================================');

  await conn.end();
}

run().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });

