export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_CHECKOUT';

export interface User {
  user_id: string; // e.g. "PG-2026-001"
  name: string;
  phone: string;
  email: string;
  joining_date: string; // "YYYY-MM-DD"
  id_proof_url: string;
  status: UserStatus;
  workplace_or_college?: string;
  emergency_contact?: string;
  blood_group?: string;
  portal_password?: string;      // Used when creating/updating tenant login password
  portal_password_hint?: string; // Stored for Admin reference in Tenant Directory
}

export interface Room {
  room_id: string; // e.g. "room-204"
  room_number: string; // "204"
  floor: number; // 2
  is_ac: boolean;
  capacity: number;
}

export type OccupancyStatus = 'OCCUPIED' | 'VACANT' | 'RESERVED' | 'MAINTENANCE';

export interface Bed {
  bed_id: string; // e.g. "bed-204-b"
  room_id: string; // FK to Room
  bed_label: string; // "Bed B"
  monthly_room_rent: number; // e.g. 8000
  monthly_ac_rent: number; // e.g. 1500
  occupancy_status: OccupancyStatus;
}

export interface TenantStay {
  stay_id: string;
  user_id: string; // FK to User
  bed_id: string; // FK to Bed
  start_date: string; // "YYYY-MM-DD"
  end_date: string | null;
  deposit_paid: number; // e.g. 15000
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'UNDER_REVIEW' | 'REJECTED';

export type YoupiLifecycleStatus =
  | 'INITIATED'
  | 'QUEUED'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'OBSERVED_SUCCESS'
  | 'RECONCILED'
  | 'MANUAL_REVIEW'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export type YoupiSettlementState =
  | 'NOT_RECONCILED'
  | 'RECONCILED'
  | 'NOT_BANK_SETTLEMENT'
  | 'MANUAL_REVIEW';

export type YoupiPaymentMethod = 'UPI' | 'CASH_COUNTER' | 'CARD_COUNTER' | 'COD';

export type YoupiObserverSource =
  | 'ANDROID_OBSERVER'
  | 'GMAIL'
  | 'GOOGLE_MESSAGES'
  | 'MANUAL_COUNTER'
  | 'BANK_STATEMENT_CSV';

export interface Payment {
  payment_id: string;
  user_id: string; // FK to User
  billing_month: string; // e.g. "October 2026"
  room_amount: number;
  ac_amount: number;
  total_dues: number; // room_amount + ac_amount
  status: PaymentStatus;
  payment_date?: string;
  proof_image_url?: string;
  proof_file_name?: string;
  transaction_ref?: string;
  payment_mode?: 'UPI' | 'Net Banking' | 'Cash' | 'Card' | 'YouPI PG (UPI)' | 'YouPI PG (Counter)';
  verified_by?: string;
  verification_date?: string;
  notes?: string;
  // ── YouPI-PG V2 Gateway Integration Fields ──────────────────────────────
  youpi_payment_id?: string;
  youpi_order_id?: string;
  youpi_status?: YoupiLifecycleStatus;
  settlement_state?: YoupiSettlementState;
  verification_source?: YoupiObserverSource;
  amount_paise?: number;
  hmac_signature?: string;
}

export interface YoupiGatewayConfig {
  mode: 'HYBRID_AUTO' | 'LIVE_SERVER' | 'EMBEDDED_LOCAL';
  apiUrl: string;           // default: http://localhost:6100
  portalUrl: string;        // default: http://localhost:7000
  merchantId: string;       // default: 00000000-0000-0000-0000-000000000001
  merchantName: string;     // Hostel Name
  payeeVpa: string;         // Owner Receiving UPI ID
  webhookSecret: string;    // HMAC Secret
  sellingMode: 'ONLINE' | 'OFFLINE';
  enabledMethods: YoupiPaymentMethod[];
  autoFulfillOnObserver: boolean;
  requireWhatsappOtp: boolean;
  primaryColor: string;
}

export interface YoupiSessionRecord {
  id: string;               // Gateway paymentId UUID
  hostelPaymentId: string;  // FK to Payment.payment_id
  userId: string;           // FK to User.user_id
  tenantName: string;
  roomNumber: string;
  billingMonth: string;
  orderId: string;
  amount: string;
  amountPaise: number;
  currency: 'INR';
  method: YoupiPaymentMethod;
  status: YoupiLifecycleStatus;
  settlementState: YoupiSettlementState;
  queuePosition: number;
  payeeVpa: string;
  payeeName: string;
  upiUri: string;
  utr?: string;
  verificationSource?: YoupiObserverSource;
  customerMobile: string;
  customerEmail: string;
  customerVerified: boolean;
  checkoutUrl: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface YoupiWebhookLog {
  deliveryId: string;
  timestamp: number;
  event: YoupiLifecycleStatus;
  paymentId: string;
  orderId: string;
  hostelPaymentId: string;
  amount: string;
  amountPaise: number;
  currency: 'INR';
  method: YoupiPaymentMethod;
  settlementState: YoupiSettlementState;
  utr: string;
  signature: string;
  signatureV2: string;
  verified: boolean;
  rawPayload: string;
}

export interface MaintenanceRequest {
  request_id: string;
  user_id: string;
  room_number: string;
  category: 'AC Repair' | 'Plumbing' | 'Electrical' | 'WiFi' | 'Cleaning' | 'Furniture' | 'Other';
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reported_date: string;
  resolution_note?: string;
}

export interface TenantStayDetails {
  user: User;
  stay: TenantStay;
  bed: Bed;
  room: Room;
  calculatedDuration: string;
  totalPaid: number;
  totalPending: number;
  payments: Payment[];
}

// ── Staff / Worker ────────────────────────────────────────────────────────────
export type WorkerRole = 'Cleaner' | 'Electrician' | 'Plumber' | 'Security' | 'Cook' | 'Manager' | 'Other';
export type WorkerStatus = 'ACTIVE' | 'INACTIVE';

export interface Worker {
  worker_id: string;
  name: string;
  phone: string;
  role: WorkerRole;
  salary: number;
  joining_date: string;
  status: WorkerStatus;
  notes?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export interface AttendanceRecord {
  record_id: string;
  worker_id: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}
