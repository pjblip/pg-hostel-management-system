-- ============================================================================
-- PG HOSTEL MANAGEMENT SYSTEM + YOUPI-PG V2 PRODUCTION DATABASE SCHEMA
-- Compatible with SQLite (node:sqlite WAL) and PostgreSQL (Supabase / Neon / Render)
-- ============================================================================

-- 1. ADMINS TABLE (Hostel Owner / Manager Accounts - PBKDF2-SHA512 Hashed)
CREATE TABLE IF NOT EXISTS admins (
  admin_id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(128) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  hostel_name VARCHAR(128) NOT NULL DEFAULT 'PG Hostel',
  phone VARCHAR(20),
  created_at TEXT NOT NULL
);

-- 2. USERS TABLE (Tenants with Self-Service Portal Credentials)
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(128) NOT NULL,
  password_hash VARCHAR(256),
  portal_password_hint VARCHAR(64),
  joining_date TEXT NOT NULL,
  id_proof_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  workplace_or_college TEXT,
  emergency_contact TEXT,
  blood_group VARCHAR(10)
);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
  room_id VARCHAR(32) PRIMARY KEY,
  room_number VARCHAR(16) NOT NULL UNIQUE,
  floor INT NOT NULL,
  is_ac INT DEFAULT 0,
  capacity INT NOT NULL
);

-- 4. BEDS TABLE
CREATE TABLE IF NOT EXISTS beds (
  bed_id VARCHAR(32) PRIMARY KEY,
  room_id VARCHAR(32) NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  bed_label VARCHAR(32) NOT NULL,
  monthly_room_rent DECIMAL(10,2) NOT NULL,
  monthly_ac_rent DECIMAL(10,2) DEFAULT 0.00,
  occupancy_status VARCHAR(20) DEFAULT 'VACANT'
);

-- 5. TENANT_STAYS TABLE
CREATE TABLE IF NOT EXISTS tenant_stays (
  stay_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  bed_id VARCHAR(32) NOT NULL REFERENCES beds(bed_id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL,
  end_date TEXT NULL,
  deposit_paid DECIMAL(10,2) DEFAULT 0.00
);

-- 6. PAYMENTS TABLE (Segregated Room & AC Rent + YouPI-PG V2 Settlement Columns)
CREATE TABLE IF NOT EXISTS payments (
  payment_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  billing_month VARCHAR(64) NOT NULL,
  room_amount DECIMAL(10,2) NOT NULL,
  ac_amount DECIMAL(10,2) DEFAULT 0.00,
  total_dues DECIMAL(10,2) NOT NULL,
  amount_paise BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  payment_date TEXT,
  proof_image_url TEXT,
  proof_file_name TEXT,
  transaction_ref VARCHAR(64),
  payment_mode VARCHAR(32),
  verified_by VARCHAR(64),
  verification_date TEXT,
  notes TEXT,
  youpi_payment_id VARCHAR(64),
  youpi_order_id VARCHAR(64),
  youpi_status VARCHAR(32),
  settlement_state VARCHAR(32),
  verification_source VARCHAR(32),
  hmac_signature VARCHAR(128)
);

-- 7. MAINTENANCE_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS maintenance_requests (
  request_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  room_number VARCHAR(16) NOT NULL,
  category VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  urgency VARCHAR(16) NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  reported_date TEXT NOT NULL,
  resolution_note TEXT
);

-- 8. WORKERS TABLE (Hostel Staff)
CREATE TABLE IF NOT EXISTS workers (
  worker_id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(32) NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  joining_date TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  notes TEXT
);

-- 9. ATTENDANCE_RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
  record_id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(32) NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  note TEXT
);

-- 10. YOUPI_CONFIG TABLE (Gateway Merchant & Receiving VPA Configuration)
CREATE TABLE IF NOT EXISTS youpi_config (
  id INT PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 11. YOUPI_SESSIONS TABLE (YouPI-PG V2 Checkout Sessions & FIFO Queue)
CREATE TABLE IF NOT EXISTS youpi_sessions (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  hostel_payment_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  settlement_state VARCHAR(32) NOT NULL,
  amount_paise BIGINT NOT NULL,
  utr VARCHAR(32),
  session_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 12. YOUPI_WEBHOOKS TABLE (Signed HMAC-SHA256 Webhook Outbox & Audit Log)
CREATE TABLE IF NOT EXISTS youpi_webhooks (
  delivery_id VARCHAR(64) PRIMARY KEY,
  event VARCHAR(32) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  signature VARCHAR(160) NOT NULL,
  webhook_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
