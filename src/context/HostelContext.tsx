import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  User, Room, Bed, TenantStay, Payment, MaintenanceRequest,
  TenantStayDetails, PaymentStatus, OccupancyStatus, Worker, AttendanceRecord,
  YoupiGatewayConfig, YoupiSessionRecord, YoupiWebhookLog, YoupiPaymentMethod,
  YoupiLifecycleStatus, YoupiSettlementState, YoupiObserverSource,
} from '../types/hostel';
import {
  INITIAL_USERS, INITIAL_ROOMS, INITIAL_BEDS, INITIAL_STAYS, INITIAL_PAYMENTS, INITIAL_MAINTENANCE,
  DEFAULT_YOUPI_CONFIG, INITIAL_YOUPI_SESSIONS, INITIAL_YOUPI_WEBHOOKS,
} from '../data/initialData';
import { computeStayDuration } from '../utils/dateDiff';
import {
  toPaise, toRupeesString, buildUpiUri, computeHmacSha256Sync, verifyWebhookSignature, parseStatementCsv,
} from '../utils/youpiCore';

interface HostelContextType {
  users: User[]; rooms: Room[]; beds: Bed[]; stays: TenantStay[];
  payments: Payment[]; maintenance: MaintenanceRequest[];
  workers: Worker[]; attendance: AttendanceRecord[];
  activeRole: 'ADMIN' | 'TENANT'; setActiveRole: (role: 'ADMIN' | 'TENANT') => void;
  activeTenantId: string; setActiveTenantId: (id: string) => void;
  activeTenantDetails: TenantStayDetails | null;
  searchQuery: string; setSearchQuery: (query: string) => void;
  searchResults: TenantStayDetails[];
  getTenantDetailsById: (userId: string) => TenantStayDetails | null;
  getAllTenantsDetails: () => TenantStayDetails[];
  dbStatus: { connected: boolean; engine: string; lastSynced: string | null };
  refreshFromDatabase: () => Promise<void>;
  wipeDatabaseToCleanSlate: () => Promise<void>;
  loadSampleDataIntoDatabase: () => void;
  // Tenant & Payment Actions
  verifyPayment: (paymentId: string, status: PaymentStatus, note?: string) => void;
  submitPaymentProof: (paymentId: string, proofUrl: string, fileName: string, txnRef: string, mode?: string) => void;
  createManualPayment: (payment: Omit<Payment, 'payment_id'>) => void;
  addTenant: (user: User, bedId: string, deposit: number) => void;
  checkoutTenant: (userId: string) => void;
  removeTenant: (userId: string) => void;
  allocateBed: (stayId: string, newBedId: string) => void;
  updateBedStatus: (bedId: string, status: OccupancyStatus) => void;
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'request_id' | 'reported_date' | 'status'>) => void;
  updateMaintenanceStatus: (requestId: string, status: MaintenanceRequest['status'], resolutionNote?: string) => void;
  sendBillingAlert: (userId: string) => { message: string; copyText: string };
  // Room & Bed CRUD
  addRoom: (room: Omit<Room, 'room_id'>) => void;
  updateRoom: (roomId: string, updates: Partial<Omit<Room, 'room_id'>>) => void;
  deleteRoom: (roomId: string) => boolean;
  addBed: (bed: Omit<Bed, 'bed_id'>) => void;
  updateBed: (bedId: string, updates: Partial<Omit<Bed, 'bed_id' | 'occupancy_status'>>) => void;
  deleteBed: (bedId: string) => boolean;
  // Workers
  addWorker: (worker: Omit<Worker, 'worker_id'>) => void;
  updateWorker: (workerId: string, updates: Partial<Omit<Worker, 'worker_id'>>) => void;
  removeWorker: (workerId: string) => void;
  markAttendance: (record: Omit<AttendanceRecord, 'record_id'>) => void;
  getWorkerAttendance: (workerId: string) => AttendanceRecord[];
  // ── YouPI-PG V2 Gateway Integration ───────────────────────────────────────
  youpiConfig: YoupiGatewayConfig;
  updateYoupiConfig: (updates: Partial<YoupiGatewayConfig>) => void;
  youpiSessions: YoupiSessionRecord[];
  youpiWebhooks: YoupiWebhookLog[];
  activeCheckoutSession: YoupiSessionRecord | null;
  setActiveCheckoutSession: (session: YoupiSessionRecord | null) => void;
  initiateYoupiPayment: (paymentId: string, method?: YoupiPaymentMethod) => Promise<YoupiSessionRecord>;
  authenticateYoupiCustomer: (sessionId: string, mobile: string, name?: string, email?: string) => void;
  switchYoupiMethod: (sessionId: string, method: YoupiPaymentMethod) => void;
  processYoupiOutcome: (
    sessionId: string,
    outcome: YoupiLifecycleStatus,
    details?: {
      utr?: string;
      source?: YoupiObserverSource;
      method?: YoupiPaymentMethod;
      notes?: string;
    }
  ) => void;
  reconcileBankStatementCsv: (csvText: string) => {
    error?: string;
    reconciledCount: number;
    conflictCount: number;
    unmatchedCount: number;
    totalLines: number;
    details: Array<{
      bookedOn: string;
      utr: string;
      amountRupees: string;
      outcome: 'RECONCILED' | 'CONFLICT' | 'UNMATCHED' | 'IGNORED';
      reason: string;
      orderId?: string;
      tenantName?: string;
    }>;
  };
  resetToDefaultData: () => void;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export const HostelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with clean empty arrays until hydrated from the backend SQLite/JSON database
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [stays, setStays] = useState<TenantStay[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [youpiConfig, setYoupiConfig] = useState<YoupiGatewayConfig>(DEFAULT_YOUPI_CONFIG);
  const [youpiSessions, setYoupiSessions] = useState<YoupiSessionRecord[]>([]);
  const [youpiWebhooks, setYoupiWebhooks] = useState<YoupiWebhookLog[]>([]);
  const [activeCheckoutSession, setActiveCheckoutSession] = useState<YoupiSessionRecord | null>(null);

  const [activeRole, setActiveRole] = useState<'ADMIN' | 'TENANT'>('ADMIN');
  const [activeTenantId, setActiveTenantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [dbStatus, setDbStatus] = useState<{ connected: boolean; engine: string; lastSynced: string | null }>({
    connected: false,
    engine: 'CONNECTING',
    lastSynced: null,
  });

  const isHydratedRef = useRef(false);
  const skipNextSyncRef = useRef(false);

  // ── 1. Hydrate from Backend Database on Boot ──────────────────────────────
  const refreshFromDatabase = async () => {
    try {
      const res = await fetch('/api/db/state');
      if (res.ok) {
        const data = await res.json();
        skipNextSyncRef.current = true;
        setUsers(data.users || []);
        setRooms(data.rooms || []);
        setBeds(data.beds || []);
        setStays(data.stays || []);
        setPayments(data.payments || []);
        setMaintenance(data.maintenance || []);
        setWorkers(data.workers || []);
        setAttendance(data.attendance || []);
        if (data.youpiConfig) setYoupiConfig(data.youpiConfig);
        setYoupiSessions(data.youpiSessions || []);
        setYoupiWebhooks(data.youpiWebhooks || []);
        if ((data.users || []).length > 0 && !activeTenantId) {
          setActiveTenantId(data.users[0].user_id);
        }
        isHydratedRef.current = true;
        setDbStatus({
          connected: true,
          engine: data.dbEngine || 'SQLITE_WAL',
          lastSynced: new Date().toLocaleTimeString(),
        });
      }
    } catch {
      isHydratedRef.current = true;
    }
  };

  useEffect(() => {
    refreshFromDatabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Auto-Sync Every State Mutation to Backend SQLite / Disk Database ───
  useEffect(() => {
    if (!isHydratedRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users,
          rooms,
          beds,
          stays,
          payments,
          maintenance,
          workers,
          attendance,
          youpiConfig,
          youpiSessions,
          youpiWebhooks,
        }),
      })
        .then((r) => {
          if (r.ok) {
            setDbStatus((prev) => ({
              ...prev,
              connected: true,
              lastSynced: new Date().toLocaleTimeString(),
            }));
          }
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [users, rooms, beds, stays, payments, maintenance, workers, attendance, youpiConfig, youpiSessions, youpiWebhooks]);

  const wipeDatabaseToCleanSlate = async () => {
    try {
      await fetch('/api/db/wipe', { method: 'POST' });
    } catch {}
    setUsers([]);
    setRooms([]);
    setBeds([]);
    setStays([]);
    setPayments([]);
    setMaintenance([]);
    setWorkers([]);
    setAttendance([]);
    setYoupiSessions([]);
    setYoupiWebhooks([]);
    setActiveCheckoutSession(null);
    setSearchQuery('');
    setActiveTenantId('');
  };

  const loadSampleDataIntoDatabase = () => {
    setUsers(INITIAL_USERS);
    setRooms(INITIAL_ROOMS);
    setBeds(INITIAL_BEDS);
    setStays(INITIAL_STAYS);
    setPayments(INITIAL_PAYMENTS);
    setMaintenance(INITIAL_MAINTENANCE);
    setYoupiSessions(INITIAL_YOUPI_SESSIONS);
    setYoupiWebhooks(INITIAL_YOUPI_WEBHOOKS);
    setActiveTenantId(INITIAL_USERS[0]?.user_id || '');
  };

  const today = () => new Date().toISOString().split('T')[0];

  // Keep activeCheckoutSession synchronized when youpiSessions updates
  useEffect(() => {
    if (activeCheckoutSession) {
      const updated = youpiSessions.find((s) => s.id === activeCheckoutSession.id);
      if (updated && updated !== activeCheckoutSession) {
        setActiveCheckoutSession(updated);
      }
    }
  }, [youpiSessions, activeCheckoutSession]);

  // Listen to browser CustomEvents emitted by official /youpi.js script
  useEffect(() => {
    const onYoupiSuccess = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const orderId = detail.order_id;
      const target = youpiSessions.find((s) => s.orderId === orderId);
      if (target) {
        const status: YoupiLifecycleStatus =
          detail.status === 'RECONCILED'
            ? 'RECONCILED'
            : detail.status === 'OBSERVED_SUCCESS'
            ? 'OBSERVED_SUCCESS'
            : 'SUCCESS';
        processYoupiOutcome(target.id, status, {
          utr: detail.utr,
          method: detail.payment_mode || 'UPI',
        });
      }
    };

    const onYoupiObserved = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const target = youpiSessions.find((s) => s.orderId === detail.order_id);
      if (target) {
        processYoupiOutcome(target.id, 'OBSERVED_SUCCESS', {
          utr: detail.utr,
          source: 'ANDROID_OBSERVER',
        });
      }
    };

    const onYoupiSuspicious = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const target = youpiSessions.find((s) => s.orderId === detail.order_id);
      if (target) {
        processYoupiOutcome(target.id, 'MANUAL_REVIEW', {
          notes: 'Flagged by YouPI-PG security review.',
        });
      }
    };

    window.addEventListener('youpi:payment:success', onYoupiSuccess);
    window.addEventListener('youpi:payment:observed', onYoupiObserved);
    window.addEventListener('youpi:payment:suspicious', onYoupiSuspicious);
    return () => {
      window.removeEventListener('youpi:payment:success', onYoupiSuccess);
      window.removeEventListener('youpi:payment:observed', onYoupiObserved);
      window.removeEventListener('youpi:payment:suspicious', onYoupiSuspicious);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youpiSessions, youpiConfig]);

  // ── Relational join ───────────────────────────────────────────────────────
  const getTenantDetailsById = (userId: string): TenantStayDetails | null => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return null;
    const stay = stays.find((s) => s.user_id === userId && s.end_date === null) || stays.find((s) => s.user_id === userId) || {
      stay_id: `stay-fallback-${userId}`,
      user_id: userId,
      bed_id: 'unknown',
      start_date: user.joining_date || today(),
      end_date: null,
      deposit_paid: 0,
    };
    const bed = beds.find((b) => b.bed_id === stay.bed_id) ?? { bed_id: 'unknown', room_id: 'unknown', bed_label: 'Unassigned', monthly_room_rent: 0, monthly_ac_rent: 0, occupancy_status: 'VACANT' as OccupancyStatus };
    const room = rooms.find((r) => r.room_id === bed.room_id) ?? { room_id: 'unknown', room_number: 'N/A', floor: 0, is_ac: false, capacity: 0 };
    const userPayments = payments.filter((p) => p.user_id === userId);
    const calculated = computeStayDuration(stay.start_date);
    const totalPaid = userPayments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.total_dues, 0);
    const totalPending = userPayments.filter((p) => p.status === 'PENDING' || p.status === 'UNDER_REVIEW').reduce((s, p) => s + p.total_dues, 0);
    return { user, stay, bed, room, calculatedDuration: calculated.text, totalPaid, totalPending, payments: userPayments };
  };

  const getAllTenantsDetails = (): TenantStayDetails[] =>
    users.map((u) => getTenantDetailsById(u.user_id)).filter((d): d is TenantStayDetails => d !== null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const all = getAllTenantsDetails();
    if (!q) return all;
    return all.filter((item) =>
      item.user.name.toLowerCase().includes(q) ||
      item.user.user_id.toLowerCase().includes(q) ||
      item.room.room_number.toLowerCase().includes(q) ||
      item.user.phone.toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, users, stays, beds, rooms, payments]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeTenantDetails = useMemo(() => getTenantDetailsById(activeTenantId), [activeTenantId, users, stays, beds, rooms, payments]);

  // ── Payment actions ───────────────────────────────────────────────────────
  const verifyPayment = (paymentId: string, status: PaymentStatus, note?: string) =>
    setPayments((prev) => prev.map((p) => p.payment_id === paymentId ? {
      ...p,
      status,
      verified_by: 'Hostel Manager (Admin)',
      verification_date: today(),
      settlement_state: status === 'PAID' && p.youpi_status ? 'RECONCILED' : p.settlement_state,
      youpi_status: status === 'PAID' && p.youpi_status ? 'RECONCILED' : p.youpi_status,
      notes: note ?? (status === 'PAID' ? 'Verified by Admin.' : 'Payment rejected. Please re-upload.'),
    } : p));

  const submitPaymentProof = (paymentId: string, proofUrl: string, fileName: string, txnRef: string, mode = 'UPI') =>
    setPayments((prev) => prev.map((p) => p.payment_id === paymentId ? { ...p, status: 'UNDER_REVIEW' as PaymentStatus, payment_date: today(), proof_image_url: proofUrl, proof_file_name: fileName, transaction_ref: txnRef, payment_mode: mode as Payment['payment_mode'], notes: 'Submitted by tenant. Awaiting admin review.' } : p));

  const createManualPayment = (data: Omit<Payment, 'payment_id'>) =>
    setPayments((prev) => [{ ...data, payment_id: `pay-custom-${Date.now()}` }, ...prev]);

  // ── YouPI-PG V2 Gateway Actions ───────────────────────────────────────────
  const updateYoupiConfig = (updates: Partial<YoupiGatewayConfig>) =>
    setYoupiConfig((prev) => ({ ...prev, ...updates }));

  const initiateYoupiPayment = async (
    paymentId: string,
    method: YoupiPaymentMethod = 'UPI'
  ): Promise<YoupiSessionRecord> => {
    const payment = payments.find((p) => p.payment_id === paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    const details = getTenantDetailsById(payment.user_id);
    const tenantName = details?.user.name || 'Tenant';
    const roomNumber = details?.room.room_number || 'N/A';
    const cleanPhone = (details?.user.phone || '').replace(/\D/g, '').slice(-10) || '9000000000';
    const email = details?.user.email || `${cleanPhone}@customer.youpi.local`;

    const amountPaise = toPaise(payment.total_dues);
    const amountStr = toRupeesString(amountPaise);
    const orderId = payment.youpi_order_id || `PG-ORD-${payment.user_id.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-5)}`;
    const upiUri = buildUpiUri({
      payeeVpa: youpiConfig.payeeVpa,
      payeeName: youpiConfig.merchantName,
      amountPaise,
      transactionRef: orderId,
    });

    const activeOnVpa = youpiSessions.filter(
      (s) =>
        s.payeeVpa === youpiConfig.payeeVpa &&
        s.hostelPaymentId !== paymentId &&
        (s.status === 'ACTIVE' || s.status === 'PROCESSING') &&
        new Date(s.expiresAt).getTime() > Date.now()
    );
    const queuePosition = method === 'UPI' ? activeOnVpa.length : 0;

    let gatewayPaymentId = `ypg-sess-${Date.now()}`;
    let checkoutUrl = `${youpiConfig.portalUrl}/checkout/${gatewayPaymentId}`;

    if (youpiConfig.mode !== 'EMBEDDED_LOCAL') {
      try {
        const targetApi = youpiConfig.mode === 'LIVE_SERVER' ? youpiConfig.apiUrl : '';
        const res = await fetch(`${targetApi}/api/v1/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Id': youpiConfig.merchantId,
            'X-Merchant-Key': youpiConfig.webhookSecret,
          },
          body: JSON.stringify({
            orderId,
            amount: amountStr,
            currency: 'INR',
            method,
            customer: {
              fullName: tenantName,
              phoneNumber: cleanPhone,
              email,
            },
            metadata: {
              hostelPaymentId: payment.payment_id,
              userId: payment.user_id,
              roomNumber,
              billingMonth: payment.billing_month,
              roomAmount: payment.room_amount,
              acAmount: payment.ac_amount,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentId) gatewayPaymentId = data.paymentId;
          if (data.checkoutUrl) checkoutUrl = data.checkoutUrl;
        }
      } catch {}
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const initialStatus: YoupiLifecycleStatus =
      method === 'CASH_COUNTER' || method === 'CARD_COUNTER'
        ? 'ACTIVE'
        : !youpiConfig.requireWhatsappOtp
        ? queuePosition > 0
          ? 'QUEUED'
          : 'ACTIVE'
        : 'INITIATED';

    const sessionRecord: YoupiSessionRecord = {
      id: gatewayPaymentId,
      hostelPaymentId: payment.payment_id,
      userId: payment.user_id,
      tenantName,
      roomNumber,
      billingMonth: payment.billing_month,
      orderId,
      amount: amountStr,
      amountPaise,
      currency: 'INR',
      method,
      status: initialStatus,
      settlementState:
        method === 'CASH_COUNTER' || method === 'CARD_COUNTER'
          ? 'NOT_BANK_SETTLEMENT'
          : 'NOT_RECONCILED',
      queuePosition,
      payeeVpa: youpiConfig.payeeVpa,
      payeeName: youpiConfig.merchantName,
      upiUri,
      customerMobile: cleanPhone,
      customerEmail: email,
      customerVerified: !youpiConfig.requireWhatsappOtp,
      checkoutUrl,
      createdAt: now.toISOString(),
      expiresAt,
    };

    setYoupiSessions((prev) => [
      sessionRecord,
      ...prev.filter((s) => s.id !== sessionRecord.id),
    ]);

    setPayments((prev) =>
      prev.map((p) =>
        p.payment_id === paymentId
          ? {
              ...p,
              youpi_payment_id: sessionRecord.id,
              youpi_order_id: sessionRecord.orderId,
              youpi_status: sessionRecord.status,
              amount_paise: sessionRecord.amountPaise,
            }
          : p
      )
    );

    setActiveCheckoutSession(sessionRecord);

    if (youpiConfig.mode === 'LIVE_SERVER' && typeof (window as any).Youpi?.pay === 'function') {
      try {
        (window as any).Youpi.pay({
          checkoutUrl: sessionRecord.checkoutUrl,
          order_id: sessionRecord.orderId,
          amount: sessionRecord.amount,
          currency: 'INR',
          name: youpiConfig.merchantName,
          description: `Hostel Rent (${payment.billing_month}) - Room ${roomNumber}`,
          customer: {
            name: tenantName,
            email,
            phone: cleanPhone,
          },
        });
      } catch {}
    }

    return sessionRecord;
  };

  const authenticateYoupiCustomer = (
    sessionId: string,
    mobile: string,
    name?: string,
    email?: string
  ) => {
    setYoupiSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const busy = prev.some(
          (other) =>
            other.id !== sessionId &&
            other.payeeVpa === s.payeeVpa &&
            (other.status === 'ACTIVE' || other.status === 'PROCESSING') &&
            new Date(other.expiresAt).getTime() > Date.now()
        );
        const nextStatus: YoupiLifecycleStatus =
          s.method === 'UPI' && busy ? 'QUEUED' : 'ACTIVE';
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        return {
          ...s,
          customerMobile: mobile.replace(/\D/g, '').slice(-10),
          tenantName: name || s.tenantName,
          customerEmail: email || s.customerEmail,
          customerVerified: true,
          status: nextStatus,
          queuePosition: nextStatus === 'QUEUED' ? 1 : 0,
          expiresAt,
        };
      })
    );
  };

  const switchYoupiMethod = (sessionId: string, method: YoupiPaymentMethod) => {
    setYoupiSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const settlementState: YoupiSettlementState =
          method === 'UPI' ? 'NOT_RECONCILED' : 'NOT_BANK_SETTLEMENT';
        return {
          ...s,
          method,
          settlementState,
          status: s.customerVerified ? 'ACTIVE' : s.status,
          queuePosition: 0,
        };
      })
    );
  };

  const processYoupiOutcome = (
    sessionId: string,
    outcome: YoupiLifecycleStatus,
    details?: {
      utr?: string;
      source?: YoupiObserverSource;
      method?: YoupiPaymentMethod;
      notes?: string;
    }
  ) => {
    const targetSession = youpiSessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    const nowIso = new Date().toISOString();
    const timestamp = Date.now();
    const utr =
      details?.utr ||
      targetSession.utr ||
      (outcome === 'OBSERVED_SUCCESS' || outcome === 'RECONCILED'
        ? `${Math.floor(100000000000 + Math.random() * 899999999999)}`
        : `CNTR-${String(timestamp).slice(-8)}`);
    const effectiveMethod = details?.method || targetSession.method;
    const source: YoupiObserverSource =
      details?.source ||
      (outcome === 'RECONCILED'
        ? 'BANK_STATEMENT_CSV'
        : effectiveMethod === 'CASH_COUNTER' || effectiveMethod === 'CARD_COUNTER'
        ? 'MANUAL_COUNTER'
        : 'ANDROID_OBSERVER');

    const settlementState: YoupiSettlementState =
      outcome === 'RECONCILED'
        ? 'RECONCILED'
        : outcome === 'OBSERVED_SUCCESS'
        ? 'NOT_RECONCILED'
        : outcome === 'MANUAL_REVIEW'
        ? 'MANUAL_REVIEW'
        : 'NOT_BANK_SETTLEMENT';

    setYoupiSessions((prev) => {
      const updatedList = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: outcome,
              settlementState,
              method: effectiveMethod,
              utr,
              verificationSource: source,
              completedAt: nowIso,
            }
          : s
      );
      const queuedIdx = updatedList.findIndex(
        (s) => s.payeeVpa === targetSession.payeeVpa && s.status === 'QUEUED'
      );
      if (queuedIdx !== -1) {
        updatedList[queuedIdx] = {
          ...updatedList[queuedIdx],
          status: 'ACTIVE',
          queuePosition: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
      }
      return updatedList;
    });

    const deliveryId = `deliv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payloadObj = {
      event: outcome,
      paymentId: targetSession.id,
      orderId: targetSession.orderId,
      amount: targetSession.amount,
      amountPaise: targetSession.amountPaise,
      currency: 'INR',
      method: effectiveMethod,
      settlementState,
      utr,
      verificationSource: source,
      deliveryId,
      timestamp,
      completedAt: nowIso,
      metadata: {
        hostelPaymentId: targetSession.hostelPaymentId,
        userId: targetSession.userId,
        roomNumber: targetSession.roomNumber,
        billingMonth: targetSession.billingMonth,
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const sigHex = computeHmacSha256Sync(rawPayload, youpiConfig.webhookSecret);
    const sigV2Hex = computeHmacSha256Sync(`${timestamp}.${rawPayload}`, youpiConfig.webhookSecret);
    const signature = `sha256=${sigHex}`;
    const signatureV2 = `sha256=${sigV2Hex}`;
    const isVerified = verifyWebhookSignature(rawPayload, youpiConfig.webhookSecret, signature);

    const webhookLog: YoupiWebhookLog = {
      deliveryId,
      timestamp,
      event: outcome,
      paymentId: targetSession.id,
      orderId: targetSession.orderId,
      hostelPaymentId: targetSession.hostelPaymentId,
      amount: targetSession.amount,
      amountPaise: targetSession.amountPaise,
      currency: 'INR',
      method: effectiveMethod,
      settlementState,
      utr,
      signature,
      signatureV2,
      verified: isVerified,
      rawPayload,
    };

    setYoupiWebhooks((prev) => [webhookLog, ...prev]);

    fetch('/api/youpi/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Event': outcome,
        'X-Gateway-Signature': signature,
        'X-Gateway-Signature-V2': signatureV2,
        'X-Gateway-Delivery-Id': deliveryId,
        'X-Gateway-Timestamp': String(timestamp),
      },
      body: rawPayload,
    }).catch(() => {});

    setPayments((prev) =>
      prev.map((p) => {
        if (p.payment_id !== targetSession.hostelPaymentId) return p;

        let newPaymentStatus: PaymentStatus = p.status;
        let verifiedBy = p.verified_by;
        let noteText = details?.notes || p.notes;

        if (outcome === 'RECONCILED') {
          newPaymentStatus = 'PAID';
          verifiedBy = 'YouPI-PG Statement Reconciler (HMAC Verified)';
          noteText =
            details?.notes ||
            `Reconciled via Bank Statement CSV (UTR: ${utr}, Amount: ₹${targetSession.amount}, VPA: ${targetSession.payeeVpa}).`;
        } else if (outcome === 'OBSERVED_SUCCESS') {
          if (youpiConfig.autoFulfillOnObserver) {
            newPaymentStatus = 'PAID';
            verifiedBy = `YouPI-PG Observer (${source})`;
            noteText =
              details?.notes ||
              `UPI alert matched via ${source} (UTR: ${utr}). Auto-approved per gateway policy.`;
          } else {
            newPaymentStatus = 'UNDER_REVIEW';
            noteText =
              details?.notes ||
              `YouPI-PG Observer matched bank alert (OBSERVED_SUCCESS · NOT_RECONCILED, UTR: ${utr}). Import Bank Statement CSV in YouPI Gateway tab to mark RECONCILED.`;
          }
        } else if (outcome === 'SUCCESS') {
          newPaymentStatus = 'PAID';
          verifiedBy = 'Hostel Cashier / Counter Desk (YouPI-PG)';
          noteText =
            details?.notes ||
            `Confirmed at PG Office Counter (${effectiveMethod}, Ref: ${utr}).`;
        } else if (outcome === 'MANUAL_REVIEW') {
          newPaymentStatus = 'UNDER_REVIEW';
          noteText =
            details?.notes ||
            `Held by YouPI-PG for Manual Security Review (Ref: ${utr}). Do not fulfill until reconciled.`;
        } else if (outcome === 'FAILED') {
          newPaymentStatus = 'PENDING';
          noteText = details?.notes || 'YouPI-PG verification window elapsed without matching bank alert.';
        }

        return {
          ...p,
          status: newPaymentStatus,
          payment_date: today(),
          transaction_ref: utr,
          payment_mode:
            effectiveMethod === 'UPI' ? 'YouPI PG (UPI)' : 'YouPI PG (Counter)',
          verified_by: verifiedBy,
          verification_date: newPaymentStatus === 'PAID' ? today() : p.verification_date,
          notes: noteText,
          youpi_payment_id: targetSession.id,
          youpi_order_id: targetSession.orderId,
          youpi_status: outcome,
          settlement_state: settlementState,
          verification_source: source,
          amount_paise: targetSession.amountPaise,
          hmac_signature: signature,
        };
      })
    );
  };

  const reconcileBankStatementCsv = (csvText: string) => {
    const parsed = parseStatementCsv(csvText);
    if (parsed.error) {
      return {
        error: parsed.error,
        reconciledCount: 0,
        conflictCount: 0,
        unmatchedCount: 0,
        totalLines: 0,
        details: [],
      };
    }

    let reconciledCount = 0;
    let conflictCount = 0;
    let unmatchedCount = 0;
    const details: Array<{
      bookedOn: string;
      utr: string;
      amountRupees: string;
      outcome: 'RECONCILED' | 'CONFLICT' | 'UNMATCHED' | 'IGNORED';
      reason: string;
      orderId?: string;
      tenantName?: string;
    }> = [];

    parsed.lines.forEach((line) => {
      const amountRupees = toRupeesString(line.amountPaise);
      if (line.direction !== 'CREDIT') {
        details.push({
          bookedOn: line.bookedOn,
          utr: line.utr || 'N/A',
          amountRupees,
          outcome: 'IGNORED',
          reason: 'DEBIT row ignored',
        });
        return;
      }

      if (!line.utr) {
        conflictCount++;
        details.push({
          bookedOn: line.bookedOn,
          utr: 'MISSING/AMBIGUOUS',
          amountRupees,
          outcome: 'CONFLICT',
          reason: line.referenceCount > 1 ? 'Multiple 12-digit UTRs in narration' : 'Missing 12-digit UTR reference',
        });
        return;
      }

      const matchingSessions = youpiSessions.filter(
        (s) =>
          s.method === 'UPI' &&
          (s.utr === line.utr ||
            (s.amountPaise === line.amountPaise && line.narration.includes(s.orderId)) ||
            (s.amountPaise === line.amountPaise &&
              (s.status === 'OBSERVED_SUCCESS' || s.status === 'MANUAL_REVIEW')))
      );

      if (matchingSessions.length === 1) {
        const matched = matchingSessions[0];
        if (matched.amountPaise !== line.amountPaise) {
          conflictCount++;
          processYoupiOutcome(matched.id, 'MANUAL_REVIEW', {
            utr: line.utr,
            source: 'BANK_STATEMENT_CSV',
            notes: `Amount conflict in statement CSV: expected ₹${matched.amount}, statement showed ₹${amountRupees}.`,
          });
          details.push({
            bookedOn: line.bookedOn,
            utr: line.utr,
            amountRupees,
            outcome: 'CONFLICT',
            reason: `Amount mismatch vs session ${matched.orderId} (₹${matched.amount})`,
            orderId: matched.orderId,
            tenantName: matched.tenantName,
          });
          return;
        }

        reconciledCount++;
        processYoupiOutcome(matched.id, 'RECONCILED', {
          utr: line.utr,
          source: 'BANK_STATEMENT_CSV',
          notes: `Statement-reconciled on ${line.bookedOn} (UTR: ${line.utr}, Amount: ₹${amountRupees}).`,
        });
        details.push({
          bookedOn: line.bookedOn,
          utr: line.utr,
          amountRupees,
          outcome: 'RECONCILED',
          reason: 'Matched VPA + integer paise + 12-digit UTR',
          orderId: matched.orderId,
          tenantName: matched.tenantName,
        });
      } else if (matchingSessions.length > 1) {
        conflictCount++;
        details.push({
          bookedOn: line.bookedOn,
          utr: line.utr,
          amountRupees,
          outcome: 'CONFLICT',
          reason: 'Multiple candidate sessions matched',
        });
      } else {
        unmatchedCount++;
        details.push({
          bookedOn: line.bookedOn,
          utr: line.utr,
          amountRupees,
          outcome: 'UNMATCHED',
          reason: 'No observed UPI session matched this UTR',
        });
      }
    });

    return {
      reconciledCount,
      conflictCount,
      unmatchedCount,
      totalLines: parsed.lines.length,
      details,
    };
  };

  // ── Tenant actions ────────────────────────────────────────────────────────
  const addTenant = (newUser: User, bedId: string, deposit: number) => {
    setUsers((prev) => [...prev, newUser]);
    setStays((prev) => [...prev, { stay_id: `stay-${Date.now()}`, user_id: newUser.user_id, bed_id: bedId, start_date: newUser.joining_date, end_date: null, deposit_paid: deposit }]);
    setBeds((prev) => prev.map((b) => b.bed_id === bedId ? { ...b, occupancy_status: 'OCCUPIED' } : b));
    const bed = beds.find((b) => b.bed_id === bedId);
    if (bed) {
      const now = new Date();
      const billingMonth = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const totalDues = bed.monthly_room_rent + bed.monthly_ac_rent;
      setPayments((prev) => [...prev, { payment_id: `pay-${newUser.user_id}-01`, user_id: newUser.user_id, billing_month: `${billingMonth} (Upcoming)`, room_amount: bed.monthly_room_rent, ac_amount: bed.monthly_ac_rent, total_dues: totalDues, amount_paise: totalDues * 100, status: 'PENDING' }]);
    }
    if (!activeTenantId) {
      setActiveTenantId(newUser.user_id);
    }
  };

  const checkoutTenant = (userId: string) => {
    const activeStay = stays.find((s) => s.user_id === userId && s.end_date === null);
    if (activeStay) {
      setStays((prev) => prev.map((s) => s.stay_id === activeStay.stay_id ? { ...s, end_date: today() } : s));
      setBeds((prev) => prev.map((b) => b.bed_id === activeStay.bed_id ? { ...b, occupancy_status: 'VACANT' } : b));
    }
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, status: 'INACTIVE' } : u));
  };

  const removeTenant = (userId: string) => {
    const activeStay = stays.find((s) => s.user_id === userId && s.end_date === null);
    if (activeStay) setBeds((prev) => prev.map((b) => b.bed_id === activeStay.bed_id ? { ...b, occupancy_status: 'VACANT' } : b));
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    setStays((prev) => prev.filter((s) => s.user_id !== userId));
    setPayments((prev) => prev.filter((p) => p.user_id !== userId));
    setMaintenance((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const allocateBed = (stayId: string, newBedId: string) => {
    const stay = stays.find((s) => s.stay_id === stayId);
    if (!stay) return;
    setBeds((prev) => prev.map((b) => { if (b.bed_id === stay.bed_id) return { ...b, occupancy_status: 'VACANT' }; if (b.bed_id === newBedId) return { ...b, occupancy_status: 'OCCUPIED' }; return b; }));
    setStays((prev) => prev.map((s) => s.stay_id === stayId ? { ...s, bed_id: newBedId } : s));
  };

  const updateBedStatus = (bedId: string, status: OccupancyStatus) =>
    setBeds((prev) => prev.map((b) => b.bed_id === bedId ? { ...b, occupancy_status: status } : b));

  const addMaintenanceRequest = (req: Omit<MaintenanceRequest, 'request_id' | 'reported_date' | 'status'>) =>
    setMaintenance((prev) => [{ ...req, request_id: `maint-${Date.now()}`, reported_date: today(), status: 'OPEN' }, ...prev]);

  const updateMaintenanceStatus = (requestId: string, status: MaintenanceRequest['status'], resolutionNote?: string) =>
    setMaintenance((prev) => prev.map((m) => m.request_id === requestId ? { ...m, status, resolution_note: resolutionNote ?? m.resolution_note } : m));

  const sendBillingAlert = (userId: string) => {
    const details = getTenantDetailsById(userId);
    if (!details) return { message: '', copyText: '' };
    const pending = details.payments.filter((p) => p.status === 'PENDING');
    const total = pending.reduce((acc, p) => acc + p.total_dues, 0);
    const copyText = `Hello ${details.user.name} (Room ${details.room.room_number}), this is a reminder from ${youpiConfig.merchantName} regarding your pending rent of \u20B9${total.toLocaleString('en-IN')} (${pending.map((p) => p.billing_month).join(', ')}). Room Rent: \u20B9${details.bed.monthly_room_rent} + AC Rent: \u20B9${details.bed.monthly_ac_rent}. Pay instantly with 0% fee via YouPI-PG UPI (${youpiConfig.payeeVpa}) in your Tenant Portal before the 5th. Thank you!`;
    return { message: `Billing alert with YouPI-PG link sent to ${details.user.name} (${details.user.phone})`, copyText };
  };

  // ── Room & Bed CRUD ───────────────────────────────────────────────────────
  const addRoom = (roomData: Omit<Room, 'room_id'>) =>
    setRooms((prev) => [...prev, { ...roomData, room_id: `room-${Date.now()}` }]);

  const updateRoom = (roomId: string, updates: Partial<Omit<Room, 'room_id'>>) =>
    setRooms((prev) => prev.map((r) => r.room_id === roomId ? { ...r, ...updates } : r));

  const deleteRoom = (roomId: string): boolean => {
    const occupied = beds.some((b) => b.room_id === roomId && b.occupancy_status === 'OCCUPIED');
    if (occupied) return false;
    setBeds((prev) => prev.filter((b) => b.room_id !== roomId));
    setRooms((prev) => prev.filter((r) => r.room_id !== roomId));
    return true;
  };

  const addBed = (bedData: Omit<Bed, 'bed_id'>) =>
    setBeds((prev) => [...prev, { ...bedData, bed_id: `bed-${Date.now()}` }]);

  const updateBed = (bedId: string, updates: Partial<Omit<Bed, 'bed_id' | 'occupancy_status'>>) =>
    setBeds((prev) => prev.map((b) => b.bed_id === bedId ? { ...b, ...updates } : b));

  const deleteBed = (bedId: string): boolean => {
    const bed = beds.find((b) => b.bed_id === bedId);
    if (!bed || bed.occupancy_status === 'OCCUPIED') return false;
    setBeds((prev) => prev.filter((b) => b.bed_id !== bedId));
    return true;
  };

  // ── Workers ───────────────────────────────────────────────────────────────
  const addWorker = (workerData: Omit<Worker, 'worker_id'>) => {
    const year = new Date().getFullYear();
    const nums = workers.filter((w) => w.worker_id.startsWith(`WRK-${year}-`)).map((w) => parseInt(w.worker_id.split('-')[2] ?? '0', 10));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setWorkers((prev) => [...prev, { ...workerData, worker_id: `WRK-${year}-${String(next).padStart(3, '0')}` }]);
  };

  const updateWorker = (workerId: string, updates: Partial<Omit<Worker, 'worker_id'>>) =>
    setWorkers((prev) => prev.map((w) => w.worker_id === workerId ? { ...w, ...updates } : w));

  const removeWorker = (workerId: string) => {
    setWorkers((prev) => prev.filter((w) => w.worker_id !== workerId));
    setAttendance((prev) => prev.filter((a) => a.worker_id !== workerId));
  };

  const markAttendance = (record: Omit<AttendanceRecord, 'record_id'>) =>
    setAttendance((prev) => {
      const filtered = prev.filter((a) => !(a.worker_id === record.worker_id && a.date === record.date));
      return [...filtered, { ...record, record_id: `att-${Date.now()}` }];
    });

  const getWorkerAttendance = (workerId: string): AttendanceRecord[] =>
    attendance.filter((a) => a.worker_id === workerId).sort((a, b) => b.date.localeCompare(a.date));

  const resetToDefaultData = () => {
    wipeDatabaseToCleanSlate();
  };

  return (
    <HostelContext.Provider value={{
      users, rooms, beds, stays, payments, maintenance, workers, attendance,
      activeRole, setActiveRole, activeTenantId, setActiveTenantId, activeTenantDetails,
      searchQuery, setSearchQuery, searchResults, getTenantDetailsById, getAllTenantsDetails,
      dbStatus, refreshFromDatabase, wipeDatabaseToCleanSlate, loadSampleDataIntoDatabase,
      verifyPayment, submitPaymentProof, createManualPayment,
      addTenant, checkoutTenant, removeTenant, allocateBed, updateBedStatus,
      addMaintenanceRequest, updateMaintenanceStatus, sendBillingAlert,
      addRoom, updateRoom, deleteRoom, addBed, updateBed, deleteBed,
      addWorker, updateWorker, removeWorker, markAttendance, getWorkerAttendance,
      youpiConfig, updateYoupiConfig, youpiSessions, youpiWebhooks,
      activeCheckoutSession, setActiveCheckoutSession,
      initiateYoupiPayment, authenticateYoupiCustomer, switchYoupiMethod,
      processYoupiOutcome, reconcileBankStatementCsv,
      resetToDefaultData,
    }}>
      {children}
    </HostelContext.Provider>
  );
};

export const useHostel = (): HostelContextType => {
  const ctx = useContext(HostelContext);
  if (!ctx) throw new Error('useHostel must be used within a HostelProvider');
  return ctx;
};
