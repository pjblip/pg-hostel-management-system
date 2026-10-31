import React, { useState } from 'react';
import { Database, Code, Table, Play, Check } from 'lucide-react';

export const SqlSchemaDrawer: React.FC = () => {
  const [activeQuery, setActiveQuery] = useState<'search' | 'dues' | 'youpi' | 'ddl'>('ddl');
  const [simulatedExecutionTime, setSimulatedExecutionTime] = useState<number | null>(null);

  const runSimulation = () => {
    setSimulatedExecutionTime(Math.floor(Math.random() * 4) + 1);
  };

  const DDL_CODE = `-- 1. USERS TABLE
CREATE TABLE users (
  user_id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(128) NOT NULL,
  joining_date DATE NOT NULL,
  id_proof_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);
CREATE INDEX idx_users_name ON users(name);

-- 2. ROOMS TABLE
CREATE TABLE rooms (
  room_id VARCHAR(32) PRIMARY KEY,
  room_number VARCHAR(16) NOT NULL UNIQUE,
  floor INT NOT NULL,
  is_ac BOOLEAN DEFAULT FALSE,
  capacity INT NOT NULL
);

-- 3. BEDS TABLE
CREATE TABLE beds (
  bed_id VARCHAR(32) PRIMARY KEY,
  room_id VARCHAR(32) REFERENCES rooms(room_id) ON DELETE CASCADE,
  bed_label VARCHAR(32) NOT NULL,
  monthly_room_rent DECIMAL(10,2) NOT NULL,
  monthly_ac_rent DECIMAL(10,2) DEFAULT 0.00,
  occupancy_status VARCHAR(20) DEFAULT 'VACANT'
);

-- 4. TENANT_STAYS TABLE
CREATE TABLE tenant_stays (
  stay_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) REFERENCES users(user_id) ON DELETE RESTRICT,
  bed_id VARCHAR(32) REFERENCES beds(bed_id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  deposit_paid DECIMAL(10,2) DEFAULT 0.00
);

-- 5. PAYMENTS TABLE (Enhanced with YouPI-PG V2 Gateway Columns)
CREATE TABLE payments (
  payment_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) REFERENCES users(user_id) ON DELETE CASCADE,
  billing_month VARCHAR(32) NOT NULL,
  room_amount DECIMAL(10,2) NOT NULL,
  ac_amount DECIMAL(10,2) DEFAULT 0.00,
  total_dues DECIMAL(10,2) GENERATED ALWAYS AS (room_amount + ac_amount) STORED,
  amount_paise BIGINT GENERATED ALWAYS AS (CAST((room_amount + ac_amount) * 100 AS BIGINT)) STORED,
  status VARCHAR(20) DEFAULT 'PENDING',
  proof_image_url TEXT,
  transaction_ref VARCHAR(64),
  payment_date DATE,
  youpi_payment_id VARCHAR(64),
  youpi_order_id VARCHAR(64),
  youpi_status VARCHAR(32),
  settlement_state VARCHAR(32) DEFAULT 'NOT_RECONCILED',
  verification_source VARCHAR(32),
  hmac_signature VARCHAR(128)
);

-- 6. YOUPI_PAYMENT_SESSIONS TABLE (Single-Slot FIFO Queue & Paise Lock)
CREATE TABLE youpi_payment_sessions (
  id TEXT PRIMARY KEY,
  hostel_payment_id VARCHAR(32) REFERENCES payments(payment_id) ON DELETE CASCADE,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  payee_vpa VARCHAR(255) NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  method VARCHAR(32) NOT NULL DEFAULT 'UPI',
  status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
  settlement_state VARCHAR(32) NOT NULL DEFAULT 'NOT_RECONCILED',
  queue_position INT DEFAULT 0,
  utr VARCHAR(32),
  verification_source VARCHAR(32),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BANK_STATEMENT_LINES TABLE (Operator CSV Import & Reconciliation)
CREATE TABLE bank_statement_lines (
  id TEXT PRIMARY KEY,
  receiving_vpa VARCHAR(255) NOT NULL,
  booked_on DATE NOT NULL,
  amount_paise BIGINT NOT NULL,
  direction VARCHAR(16) NOT NULL,
  utr VARCHAR(32),
  narration TEXT NOT NULL,
  match_status VARCHAR(32) NOT NULL DEFAULT 'UNMATCHED',
  payment_session_id TEXT REFERENCES youpi_payment_sessions(id)
);`;

  const YOUPI_RECONCILE_QUERY = `-- YouPI-PG V2 Bank Statement CSV Reconciliation Query
-- Matches OBSERVED_SUCCESS UPI sessions on receiving VPA, integer paise, and 12-digit UTR
UPDATE youpi_payment_sessions ys
SET
  status = 'RECONCILED',
  settlement_state = 'RECONCILED',
  verification_source = 'BANK_STATEMENT_CSV',
  completed_at = NOW()
FROM bank_statement_lines bsl
WHERE
  ys.payee_vpa = bsl.receiving_vpa
  AND ys.amount_paise = bsl.amount_paise
  AND ys.utr = bsl.utr
  AND bsl.direction = 'CREDIT'
  AND ys.status IN ('OBSERVED_SUCCESS', 'MANUAL_REVIEW');

-- Sync reconciled status to Hostel Payments Ledger
UPDATE payments p
SET
  status = 'PAID',
  youpi_status = 'RECONCILED',
  settlement_state = 'RECONCILED',
  verification_source = 'BANK_STATEMENT_CSV'
FROM youpi_payment_sessions ys
WHERE p.payment_id = ys.hostel_payment_id
  AND ys.status = 'RECONCILED';`;

  const SEARCH_QUERY_CODE = `-- Step 2: Backend Search API with LIKE & DATE_DIFF
SELECT 
  u.user_id,
  u.name,
  u.phone,
  u.email,
  ts.start_date,
  CONCAT(
    FLOOR(DATEDIFF('2026-09-26', ts.start_date) / 365), ' Years, ',
    FLOOR(MOD(DATEDIFF('2026-09-26', ts.start_date), 365) / 30), ' Months'
  ) AS calculated_duration,
  r.room_number,
  b.bed_label,
  r.is_ac,
  b.monthly_room_rent,
  b.monthly_ac_rent,
  COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.total_dues ELSE 0 END), 0) AS total_pending_dues
FROM users u
JOIN tenant_stays ts ON ts.user_id = u.user_id AND ts.end_date IS NULL
JOIN beds b ON b.bed_id = ts.bed_id
JOIN rooms r ON r.room_id = b.room_id
LEFT JOIN payments p ON p.user_id = u.user_id
WHERE 
  u.name ILIKE '%Pushkar Joshi%' 
  OR u.user_id ILIKE '%Pushkar Joshi%'
GROUP BY 
  u.user_id, u.name, u.phone, u.email, ts.start_date, 
  r.room_number, b.bed_label, r.is_ac, b.monthly_room_rent, b.monthly_ac_rent;`;

  const DUES_QUERY_CODE = `-- Summing pending ledger items segregated by Room, AC & YouPI-PG Settlement State
SELECT 
  p.billing_month,
  p.room_amount,
  p.ac_amount,
  (p.room_amount + p.ac_amount) AS total_dues,
  p.amount_paise,
  p.status,
  p.youpi_order_id,
  p.youpi_status,
  p.settlement_state,
  p.transaction_ref
FROM payments p
WHERE p.user_id = 'PG-2024-089'
ORDER BY p.billing_month ASC;`;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Relational Database Schema & YouPI-PG V2 Query Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architecture blueprint combining PG Hostel Tables & YouPI-PG Sovereign Gateway Schema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveQuery('ddl')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeQuery === 'ddl'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Step 1: Full Schema (DDL)
          </button>
          <button
            onClick={() => setActiveQuery('youpi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeQuery === 'youpi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            YouPI-PG Reconciliation SQL
          </button>
          <button
            onClick={() => setActiveQuery('search')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeQuery === 'search'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tenant Search Query
          </button>
          <button
            onClick={() => setActiveQuery('dues')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeQuery === 'dues'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dues & Ledger Query
          </button>
        </div>
      </div>

      {/* Relational Entity Mapping Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        {[
          { name: 'USERS', cols: 'user_id PK, name, phone, email, status' },
          { name: 'ROOMS', cols: 'room_id PK, room_number, floor, is_ac' },
          { name: 'BEDS', cols: 'bed_id PK, room_id FK, monthly_room_rent' },
          { name: 'TENANT_STAYS', cols: 'stay_id PK, user_id FK, bed_id FK' },
          { name: 'PAYMENTS', cols: 'payment_id PK, total_dues, youpi_status' },
          { name: 'YOUPI_SESSIONS', cols: 'id PK, order_id, amount_paise, utr' },
        ].map((t) => (
          <div key={t.name} className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" />
              {t.name}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">{t.cols}</p>
          </div>
        ))}
      </div>

      {/* SQL Code Viewport */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Code className="w-4 h-4 text-indigo-400" />
            <span>
              {activeQuery === 'ddl' && 'schema/create_hostel_and_youpi_tables.sql'}
              {activeQuery === 'youpi' && 'queries/youpi_statement_reconciliation.sql'}
              {activeQuery === 'search' && 'queries/backend_search_tenure.sql'}
              {activeQuery === 'dues' && 'queries/segregated_payment_dues.sql'}
            </span>
          </div>

          <button
            onClick={runSimulation}
            className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Test Execution
          </button>
        </div>

        <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[460px]">
          <code>
            {activeQuery === 'ddl' && DDL_CODE}
            {activeQuery === 'youpi' && YOUPI_RECONCILE_QUERY}
            {activeQuery === 'search' && SEARCH_QUERY_CODE}
            {activeQuery === 'dues' && DUES_QUERY_CODE}
          </code>
        </pre>

        {simulatedExecutionTime && (
          <div className="px-5 py-2.5 bg-slate-900/60 border-t border-slate-800 text-xs font-mono text-emerald-400 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>Query plan executed in {simulatedExecutionTime}ms across relational foreign keys.</span>
          </div>
        )}
      </div>
    </div>
  );
};
