-- Company Dashboard Database Schema
-- Master Tables for Settings Page

-- City Master
CREATE TABLE IF NOT EXISTS master_cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  state_id INT DEFAULT NULL,
  UNIQUE KEY uq_master_cities_name (name, state_id)
);

-- State Master
CREATE TABLE IF NOT EXISTS master_states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_master_states_name (name)
);

-- Department Master
CREATE TABLE IF NOT EXISTS master_departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_master_departments_name (name)
);

-- Role Master
CREATE TABLE IF NOT EXISTS master_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT DEFAULT NULL,
  UNIQUE KEY uq_master_roles_name_dept (name, department_id),
  CONSTRAINT fk_roles_department FOREIGN KEY (department_id) REFERENCES master_departments(id) ON DELETE SET NULL
);

-- Industry Master (seeded with Pharma, IT, Steel)
CREATE TABLE IF NOT EXISTS master_industries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_master_industries_name (name)
);

-- Operational tables. These make a first run work even when the database is empty.
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  employee_code VARCHAR(50) DEFAULT NULL UNIQUE,
  department VARCHAR(100) DEFAULT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'employee',
  branch VARCHAR(150) DEFAULT NULL,
  employee_type VARCHAR(50) DEFAULT NULL,
  gender VARCHAR(30) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  marital_status VARCHAR(30) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  address TEXT DEFAULT NULL,
  profile_image TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20) DEFAULT NULL,
  alternate_phone VARCHAR(20) DEFAULT NULL,
  house_no VARCHAR(100) DEFAULT NULL,
  locality VARCHAR(150) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  pincode VARCHAR(10) DEFAULT NULL,
  sales_person VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_code VARCHAR(100) NOT NULL UNIQUE,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20) DEFAULT NULL,
  alternate_phone VARCHAR(20) DEFAULT NULL,
  house_no VARCHAR(100) DEFAULT NULL,
  locality VARCHAR(150) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  pincode VARCHAR(10) DEFAULT NULL,
  product TEXT DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  birthday DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Users table for username/password authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  designation VARCHAR(100) NOT NULL DEFAULT 'employee',
  reporting_to INT DEFAULT NULL,
  branch VARCHAR(150) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  address TEXT DEFAULT NULL,
  profile_image TEXT DEFAULT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_reporting_to FOREIGN KEY (reporting_to) REFERENCES employees(id) ON DELETE SET NULL
);

-- Employee portal forms (created by admins, filled in by employees)
CREATE TABLE IF NOT EXISTS employee_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  assigned_to VARCHAR(20) NOT NULL DEFAULT 'all',
  approved_by INT DEFAULT NULL,
  fields TEXT NOT NULL,
  created_by INT DEFAULT NULL,
  created_by_name VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_form_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(150) DEFAULT NULL,
  answers TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_form_response_user (form_id, user_id),
  CONSTRAINT fk_form_responses_form FOREIGN KEY (form_id) REFERENCES employee_forms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_form_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  fields TEXT NOT NULL,
  assigned_to VARCHAR(20) NOT NULL DEFAULT 'all',
  approved_by INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_by_name VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO employee_form_templates (title, fields)
SELECT 'Customer Form', '[{"label":"Customer Name","type":"text","required":true},{"label":"Phone Number","type":"text","required":true},{"label":"Alternate Phone","type":"text","required":false},{"label":"Sales Person","type":"text","required":false},{"label":"House / Flat No.","type":"text","required":false},{"label":"Locality / Sector","type":"text","required":false},{"label":"City","type":"select","required":true,"masterKey":"cities"},{"label":"State","type":"select","required":true,"masterKey":"states"},{"label":"Pincode","type":"number","required":true},{"label":"Full Address","type":"textarea","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM employee_form_templates WHERE title = 'Customer Form');
INSERT INTO employee_form_templates (title, fields)
SELECT 'Contact Form', '[{"label":"Full Name","type":"text","required":true},{"label":"Phone Number","type":"text","required":true},{"label":"Email Address","type":"email","required":false},{"label":"Gender","type":"text","required":false},{"label":"Birthday","type":"date","required":false},{"label":"Address","type":"text","required":false},{"label":"Notes","type":"textarea","required":false}]'
WHERE NOT EXISTS (SELECT 1 FROM employee_form_templates WHERE title = 'Contact Form');
INSERT INTO employee_form_templates (title, fields)
SELECT 'Employee Form', '[{"label":"Full Name","type":"text","required":true},{"label":"Employee Code","type":"text","required":true},{"label":"Email","type":"email","required":true},{"label":"Mobile Phone","type":"text","required":true},{"label":"Department","type":"select","required":true,"masterKey":"departments"},{"label":"Job Title","type":"select","required":true,"masterKey":"roles"},{"label":"Branches","type":"text","required":true},{"label":"Employee Type","type":"text","required":true},{"label":"Gender","type":"text","required":true},{"label":"Date Of Birth","type":"date","required":true},{"label":"Marital Status","type":"text","required":true},{"label":"Status","type":"text","required":true}]'
WHERE NOT EXISTS (SELECT 1 FROM employee_form_templates WHERE title = 'Employee Form');
-- Seeded templates used plain text for master-backed fields, so link untouched copies to their masters.
UPDATE employee_form_templates SET fields = '[{"label":"Full Name","type":"text","required":true},{"label":"Employee Code","type":"text","required":true},{"label":"Email","type":"email","required":true},{"label":"Mobile Phone","type":"text","required":true},{"label":"Department","type":"select","required":true,"masterKey":"departments"},{"label":"Job Title","type":"select","required":true,"masterKey":"roles"},{"label":"Branches","type":"text","required":true},{"label":"Employee Type","type":"text","required":true},{"label":"Gender","type":"text","required":true},{"label":"Date Of Birth","type":"date","required":true},{"label":"Marital Status","type":"text","required":true},{"label":"Status","type":"text","required":true}]'
WHERE title = 'Employee Form' AND fields = '[{"label":"Full Name","type":"text","required":true},{"label":"Employee Code","type":"text","required":true},{"label":"Email","type":"email","required":true},{"label":"Mobile Phone","type":"text","required":true},{"label":"Department","type":"text","required":true},{"label":"Job Title","type":"text","required":true},{"label":"Branches","type":"text","required":true},{"label":"Employee Type","type":"text","required":true},{"label":"Gender","type":"text","required":true},{"label":"Date Of Birth","type":"date","required":true},{"label":"Marital Status","type":"text","required":true},{"label":"Status","type":"text","required":true}]';
UPDATE employee_form_templates SET fields = '[{"label":"Customer Name","type":"text","required":true},{"label":"Phone Number","type":"text","required":true},{"label":"Alternate Phone","type":"text","required":false},{"label":"Sales Person","type":"text","required":false},{"label":"House / Flat No.","type":"text","required":false},{"label":"Locality / Sector","type":"text","required":false},{"label":"City","type":"select","required":true,"masterKey":"cities"},{"label":"State","type":"select","required":true,"masterKey":"states"},{"label":"Pincode","type":"number","required":true},{"label":"Full Address","type":"textarea","required":false}]'
WHERE title = 'Customer Form' AND fields = '[{"label":"Customer Name","type":"text","required":true},{"label":"Phone Number","type":"text","required":true},{"label":"Alternate Phone","type":"text","required":false},{"label":"Sales Person","type":"text","required":false},{"label":"House / Flat No.","type":"text","required":false},{"label":"Locality / Sector","type":"text","required":false},{"label":"City","type":"text","required":true},{"label":"State","type":"text","required":true},{"label":"Pincode","type":"number","required":true},{"label":"Full Address","type":"textarea","required":false}]';

-- Add missing columns/constraints for schema migrations
-- Note: no "IF NOT EXISTS" here — standard MySQL doesn't support that clause on
-- ADD COLUMN (only MariaDB does). db.js already catches ER_DUP_FIELDNAME on rerun.
ALTER TABLE employee_form_responses ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE employee_form_responses ADD COLUMN reviewed_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE customers ADD COLUMN sales_person VARCHAR(100) DEFAULT NULL;
ALTER TABLE master_cities ADD COLUMN state_id INT DEFAULT NULL;
ALTER TABLE contacts ADD COLUMN birthday DATE DEFAULT NULL;
ALTER TABLE contacts ADD COLUMN gender VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN email VARCHAR(150) DEFAULT NULL;
ALTER TABLE users ADD COLUMN branch VARCHAR(150) DEFAULT NULL;
ALTER TABLE users ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Active';
ALTER TABLE employees ADD COLUMN employee_code VARCHAR(50) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN branch VARCHAR(150) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN employee_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN gender VARCHAR(30) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN date_of_birth DATE DEFAULT NULL;
ALTER TABLE employees ADD COLUMN marital_status VARCHAR(30) DEFAULT NULL;
ALTER TABLE employees ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Active';
ALTER TABLE master_roles ADD COLUMN department_id INT DEFAULT NULL;
ALTER TABLE master_roles ADD CONSTRAINT fk_roles_department FOREIGN KEY (department_id) REFERENCES master_departments(id) ON DELETE SET NULL;
ALTER TABLE employee_form_templates ADD COLUMN assigned_to VARCHAR(20) NOT NULL DEFAULT 'all';
ALTER TABLE employee_form_templates ADD COLUMN approved_by INT DEFAULT NULL;
ALTER TABLE employee_form_templates ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE employee_forms ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Seed default departments without duplicating records when the server restarts.
INSERT INTO master_departments (name)
SELECT 'Sales' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'sales');
INSERT INTO master_departments (name)
SELECT 'Marketing' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'marketing');
INSERT INTO master_departments (name)
SELECT 'IT' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'it');
INSERT INTO master_departments (name)
SELECT 'Human Resources' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'human resources');
INSERT INTO master_departments (name)
SELECT 'Finance' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'finance');
INSERT INTO master_departments (name)
SELECT 'Operations' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'operations');
INSERT INTO master_departments (name)
SELECT 'Engineering' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'engineering');
INSERT INTO master_departments (name)
SELECT 'Customer Service' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'customer service');
INSERT INTO master_departments (name)
SELECT 'Legal' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'legal');
INSERT INTO master_departments (name)
SELECT 'Administration' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'administration');
INSERT INTO master_departments (name)
SELECT 'Product' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'product');
INSERT INTO master_departments (name)
SELECT 'Research' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'research');
INSERT INTO master_departments (name)
SELECT 'Management' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'management');
INSERT INTO master_departments (name)
SELECT 'Design' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'design');
INSERT INTO master_departments (name)
SELECT 'Quality Assurance' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'quality assurance');
INSERT INTO master_departments (name)
SELECT 'Procurement' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'procurement');
INSERT INTO master_departments (name)
SELECT 'Training' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'training');
INSERT INTO master_departments (name)
SELECT 'Security' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'security');
INSERT INTO master_departments (name)
SELECT 'Data' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'data');
INSERT INTO master_departments (name)
SELECT 'DevOps' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'devops');
INSERT INTO master_departments (name)
SELECT 'Media' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'media');
INSERT INTO master_departments (name)
SELECT 'Healthcare' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'healthcare');
INSERT INTO master_departments (name)
SELECT 'Finance & Accounts' WHERE NOT EXISTS (SELECT 1 FROM master_departments WHERE LOWER(name) = 'finance & accounts');

-- Seed defaults without duplicating records when the server restarts.
INSERT INTO master_industries (name)
SELECT 'Pharma' WHERE NOT EXISTS (SELECT 1 FROM master_industries WHERE name = 'Pharma');
INSERT INTO master_industries (name)
SELECT 'IT' WHERE NOT EXISTS (SELECT 1 FROM master_industries WHERE name = 'IT');
INSERT INTO master_industries (name)
SELECT 'Steel' WHERE NOT EXISTS (SELECT 1 FROM master_industries WHERE name = 'Steel');

-- Seed all roles from departmentRoleData into master_roles with department associations
-- This will only insert roles that don't already exist with the same name and department
INSERT INTO master_roles (name, department_id)
SELECT 'employee', d.id FROM master_departments d WHERE LOWER(d.name) = 'administration' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'employee' AND LOWER(d2.name) = 'administration');
INSERT INTO master_roles (name, department_id)
SELECT 'admin', d.id FROM master_departments d WHERE LOWER(d.name) = 'administration' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'admin' AND LOWER(d2.name) = 'administration');
INSERT INTO master_roles (name, department_id)
SELECT 'manager', d.id FROM master_departments d WHERE LOWER(d.name) = 'management' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'manager' AND LOWER(d2.name) = 'management');
INSERT INTO master_roles (name, department_id)
SELECT 'director', d.id FROM master_departments d WHERE LOWER(d.name) = 'management' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'director' AND LOWER(d2.name) = 'management');
INSERT INTO master_roles (name, department_id)
SELECT 'supervisor', d.id FROM master_departments d WHERE LOWER(d.name) = 'management' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'supervisor' AND LOWER(d2.name) = 'management');
INSERT INTO master_roles (name, department_id)
SELECT 'team lead', d.id FROM master_departments d WHERE LOWER(d.name) = 'management' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'team lead' AND LOWER(d2.name) = 'management');
INSERT INTO master_roles (name, department_id)
SELECT 'executive', d.id FROM master_departments d WHERE LOWER(d.name) = 'management' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'executive' AND LOWER(d2.name) = 'management');
INSERT INTO master_roles (name, department_id)
SELECT 'accountant', d.id FROM master_departments d WHERE LOWER(d.name) = 'finance & accounts' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'accountant' AND LOWER(d2.name) = 'finance & accounts');
INSERT INTO master_roles (name, department_id)
SELECT 'sales representative', d.id FROM master_departments d WHERE LOWER(d.name) = 'sales' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'sales representative' AND LOWER(d2.name) = 'sales');
INSERT INTO master_roles (name, department_id)
SELECT 'intern', d.id FROM master_departments d WHERE LOWER(d.name) = 'administration' AND NOT EXISTS (SELECT 1 FROM master_roles r JOIN master_departments d2 ON r.department_id = d2.id WHERE LOWER(r.name) = 'intern' AND LOWER(d2.name) = 'administration');

-- Update existing roles to have department associations
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'engineering') WHERE LOWER(r.name) IN ('software engineer', 'senior software engineer', 'web developer', 'mobile developer', 'frontend developer', 'backend developer', 'full stack developer', 'devops engineer', 'qa engineer', 'automation engineer', 'system architect', 'tech lead', 'engineering manager', 'data engineer', 'ml engineer', 'security engineer', 'system administrator', 'network engineer', 'network administrator', 'it support specialist', 'it project manager', 'it manager', 'cybersecurity analyst', 'information security manager', 'database administrator', 'cloud engineer', 'cloud architect', 'technical support specialist', 'help desk analyst', 'it consultant', 'devops architect', 'site reliability engineer', 'build engineer', 'release manager', 'kubernetes engineer', 'ci/cd specialist', 'platform engineer', 'infrastructure engineer', 'devops manager', 'etl developer');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'sales') WHERE LOWER(r.name) IN ('sales executive', 'sales manager', 'business development manager', 'account manager', 'sales representative', 'regional sales manager', 'inside sales representative', 'sales analyst', 'sales coordinator', 'key account manager', 'territory sales manager', 'sales engineer');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'marketing') WHERE LOWER(r.name) IN ('marketing manager', 'digital marketing specialist', 'content writer', 'content strategist', 'seo specialist', 'social media manager', 'brand manager', 'marketing analyst', 'product marketing manager', 'growth hacker', 'marketing coordinator', 'ppc specialist', 'email marketing specialist', 'marketing consultant', 'journalist', 'editor', 'content creator', 'video editor', 'social media executive', 'pr manager', 'copywriter', 'news anchor', 'reporter', 'digital content strategist', 'media planner', 'brand journalist');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'human resources') WHERE LOWER(r.name) IN ('hr manager', 'hr executive', 'recruiter', 'talent acquisition specialist', 'training coordinator', 'l&d specialist', 'hr business partner', 'compensation analyst', 'employee relations specialist', 'talent acquisition manager', 'hr consultant', 'payroll specialist', 'hr generalist', 'organizational development specialist', 'training manager', 'learning and development specialist', 'instructional designer', 'corporate trainer', 'skills development manager', 'l&d manager', 'training specialist', 'technical trainer', 'e-learning developer', 'training consultant', 'od consultant');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'finance & accounts') WHERE LOWER(r.name) IN ('finance manager', 'accountant', 'financial analyst', 'tax specialist', 'tax consultant', 'auditor', 'cfo', 'financial controller', 'budget analyst', 'investment analyst', 'accounts executive', 'bookkeeper', 'financial planner', 'treasury manager', 'risk analyst', 'credit analyst', 'payroll manager', 'accounts receivable specialist', 'accounts payable specialist', 'cost accountant');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'operations') WHERE LOWER(r.name) IN ('operations manager', 'operations executive', 'supply chain manager', 'logistics coordinator', 'warehouse manager', 'quality assurance manager', 'process improvement specialist', 'inventory manager', 'operations analyst', 'production manager', 'facilities manager', 'vendor manager', 'logistics manager', 'demand planner', 'procurement manager', 'purchasing manager', 'buyer', 'procurement specialist', 'supply chain analyst', 'sourcing specialist', 'procurement lead', 'materials manager', 'strategic sourcing manager', 'category manager', 'procurement analyst');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'customer service') WHERE LOWER(r.name) IN ('customer service manager', 'customer support representative', 'customer success manager', 'technical support specialist', 'call center agent', 'customer experience manager', 'support team lead', 'customer care executive', 'help desk technician', 'client relations manager', 'customer success executive', 'support engineer');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'legal') WHERE LOWER(r.name) IN ('legal manager', 'corporate lawyer', 'legal counsel', 'compliance officer', 'contract manager', 'legal analyst', 'patent attorney', 'legal assistant', 'paralegal', 'legal advisor', 'company secretary', 'compliance analyst', 'intellectual property specialist');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'administration') WHERE LOWER(r.name) IN ('administrative manager', 'executive assistant', 'office manager', 'receptionist', 'administrative assistant', 'office coordinator', 'office administrator', 'data entry clerk', 'administrative coordinator', 'front office manager', 'personal assistant', 'employee', 'admin', 'intern');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'product') WHERE LOWER(r.name) IN ('product manager', 'product owner', 'ux designer', 'ui designer', 'product designer', 'product analyst', 'head of product', 'associate product manager', 'ux researcher', 'product strategy manager', 'growth product manager');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'research') WHERE LOWER(r.name) IN ('research scientist', 'research analyst', 'data scientist', 'research associate', 'lab manager', 'r&d manager', 'market research analyst', 'clinical research coordinator', 'research fellow', 'principal scientist', 'research director', 'biostatistician');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'management') WHERE LOWER(r.name) IN ('ceo', 'coo', 'cto', 'cfo', 'general manager', 'director', 'vice president', 'senior manager', 'team lead', 'assistant vice president', 'regional head', 'business unit head', 'managing director', 'president', 'manager', 'director', 'supervisor', 'team lead', 'executive');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'design') WHERE LOWER(r.name) IN ('design manager', 'graphic designer', 'ux/ui designer', 'art director', 'creative director', 'visual designer', 'brand designer', 'motion graphics designer', 'ui/ux developer', 'illustrator', 'design lead');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'quality assurance') WHERE LOWER(r.name) IN ('qa manager', 'qa engineer', 'qa analyst', 'test lead', 'quality control inspector', 'compliance specialist', 'qa lead', 'software tester', 'manual tester', 'performance tester', 'qa director');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'training') WHERE LOWER(r.name) IN ('training manager', 'training coordinator', 'learning and development specialist', 'instructional designer', 'corporate trainer', 'skills development manager', 'l&d manager', 'training specialist', 'technical trainer', 'e-learning developer', 'training consultant', 'od consultant');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'security') WHERE LOWER(r.name) IN ('security manager', 'security officer', 'security guard', 'loss prevention specialist', 'security supervisor', 'cctv operator', 'fire safety officer', 'physical security specialist', 'information security analyst', 'security consultant', 'access control manager', 'emergency response coordinator');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'data') WHERE LOWER(r.name) IN ('data engineer', 'data scientist', 'data analyst', 'business intelligence analyst', 'data architect', 'big data engineer', 'machine learning engineer', 'ai engineer', 'analytics manager', 'data governance specialist');
UPDATE master_roles r SET r.department_id = (SELECT id FROM master_departments WHERE LOWER(name) = 'healthcare') WHERE LOWER(r.name) IN ('doctor', 'nurse', 'medical officer', 'lab technician', 'pharmacist', 'medical representative', 'hospital administrator', 'physiotherapist', 'radiologist', 'healthcare manager', 'clinical specialist', 'medical records officer');

-- Seed default admin user if not exists
INSERT INTO users (full_name, username, password_hash, department, designation)
SELECT 'Admin User', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7bX6VfM1vK', 'Management', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
