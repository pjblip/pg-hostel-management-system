import crypto from 'node:crypto';
import { HostelDatabase } from './db.mjs';

const activeSessions = new Map();
const webhookDeliveries = new Set();

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(JSON.stringify(payload));
}

export function createApiMiddleware() {
  return async (req, res, next) => {
    const url = (req.url || '').split('?')[0];
    const method = (req.method || 'GET').toUpperCase();

    try {
      // ── 1. AUTH & INITIAL SETUP STATUS: GET /api/auth/status ──────────────
      if (url === '/api/auth/status' && method === 'GET') {
        const state = HostelDatabase.getState();
        const isSetupComplete = HostelDatabase.isSetupComplete();
        const admin = state.admins?.[0] || null;
        const engineInfo = HostelDatabase.getEngineInfo();

        const roomsMap = new Map((state.rooms || []).map((r) => [r.room_id, r]));
        const vacantBeds = (state.beds || [])
          .filter((b) => b.occupancy_status === 'VACANT')
          .map((b) => {
            const rm = roomsMap.get(b.room_id);
            return {
              bed_id: b.bed_id,
              bed_label: b.bed_label,
              room_id: b.room_id,
              room_number: rm?.room_number || '101',
              floor: rm?.floor || 1,
              is_ac: Boolean(rm?.is_ac),
              monthly_room_rent: b.monthly_room_rent,
              monthly_ac_rent: b.monthly_ac_rent,
            };
          });

        sendJson(res, 200, {
          isSetupComplete,
          hostelName: admin?.hostel_name || state.youpiConfig?.merchantName || 'Royal Heights PG Hostel',
          payeeVpa: state.youpiConfig?.payeeVpa || '9016053196@yespop',
          dbEngine: engineInfo.engine,
          dbPath: engineInfo.dbPath,
          vacantBeds,
          counts: {
            users: (state.users || []).length,
            rooms: (state.rooms || []).length,
            beds: (state.beds || []).length,
            payments: (state.payments || []).length,
          },
        });
        return;
      }

      // ── 2. FIRST-TIME HOSTEL OWNER SETUP: POST /api/auth/setup ────────────
      if (url === '/api/auth/setup' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.username || !body.password || String(body.password).length < 4) {
          sendJson(res, 400, {
            error: 'Username and a password of at least 4 characters are required.',
          });
          return;
        }

        const admin = HostelDatabase.createInitialAdmin({
          username: body.username,
          email: body.email || `${body.username}@hostel.local`,
          fullName: body.fullName || body.username,
          password: body.password,
          hostelName: body.hostelName || 'PG Hostel',
          phone: body.phone || '',
          payeeVpa: body.payeeVpa || '9016053196@yespop',
        });

        if (body.startClean === true && (HostelDatabase.getState().users || []).length === 0) {
          HostelDatabase.wipeAllTenantAndRoomData();
        }

        const token = `sess_adm_${crypto.randomBytes(24).toString('hex')}`;
        activeSessions.set(token, { role: 'ADMIN', adminId: admin.admin_id, username: admin.username });

        const currentState = HostelDatabase.getState();
        const safeUsers = (currentState.users || []).map(({ password_hash, ...rest }) => rest);

        sendJson(res, 201, {
          token,
          role: 'ADMIN',
          user: {
            id: admin.admin_id,
            name: admin.full_name,
            username: admin.username,
            email: admin.email,
            hostelName: admin.hostel_name,
          },
          state: { ...currentState, users: safeUsers, admins: undefined },
        });
        return;
      }

      // ── 2B. SELF-SERVICE PG RESIDENT REGISTRATION: POST /api/auth/register-tenant
      if (url === '/api/auth/register-tenant' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.name || !body.phone || !body.password) {
          sendJson(res, 400, {
            error: 'Full Name, 10-digit Mobile Number, and Password are required to register.',
          });
          return;
        }
        try {
          const newUser = HostelDatabase.registerTenant({
            name: body.name,
            phone: body.phone,
            email: body.email,
            password: body.password,
            workplaceOrCollege: body.workplaceOrCollege,
            emergencyContact: body.emergencyContact,
            bloodGroup: body.bloodGroup,
            selectedBedId: body.selectedBedId,
            roomNumber: body.roomNumber,
            floor: body.floor,
            isAc: body.isAc,
            bedLabel: body.bedLabel,
            monthlyRoomRent: body.monthlyRoomRent,
            monthlyAcRent: body.monthlyAcRent,
            depositPaid: body.depositPaid,
          });

          const token = `sess_tnt_${crypto.randomBytes(24).toString('hex')}`;
          activeSessions.set(token, { role: 'TENANT', userId: newUser.user_id, name: newUser.name });

          sendJson(res, 201, {
            token,
            role: 'TENANT',
            tenantId: newUser.user_id,
            user: {
              id: newUser.user_id,
              name: newUser.name,
              phone: newUser.phone,
              email: newUser.email,
            },
          });
        } catch (regErr) {
          sendJson(res, 400, { error: regErr.message || 'Could not register resident.' });
        }
        return;
      }

      // ── 2C. FORGOT PASSWORD / SELF-SERVICE RECOVERY: POST /api/auth/recover-password
      if (url === '/api/auth/recover-password' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const recovered = HostelDatabase.recoverCredentials({
            role: body.role === 'ADMIN' ? 'ADMIN' : 'TENANT',
            identifier: body.identifier,
            verificationValue: body.verificationValue,
            newPassword: body.newPassword,
          });
          sendJson(res, 200, {
            recovered: true,
            ...recovered,
          });
        } catch (recErr) {
          sendJson(res, 400, { error: recErr.message || 'Could not reset password.' });
        }
        return;
      }

      // ── 2D. ADMIN RESET TENANT PASSWORD: POST /api/auth/admin-reset-tenant-password
      if (url === '/api/auth/admin-reset-tenant-password' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const updated = HostelDatabase.adminResetTenantPassword(body.userId, body.newPassword);
          sendJson(res, 200, {
            updated: true,
            userId: updated.user_id,
            portalPasswordHint: updated.portal_password_hint,
          });
        } catch (err) {
          sendJson(res, 400, { error: err.message || 'Failed to update tenant password.' });
        }
        return;
      }

      // ── 3. GENUINE LOGIN (ADMIN & TENANT): POST /api/auth/login ───────────
      if (url === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const role = body.role === 'TENANT' ? 'TENANT' : 'ADMIN';
        const identifier = String(body.username || body.identifier || '').trim();
        const password = String(body.password || '');

        if (!identifier || !password) {
          sendJson(res, 400, { error: 'Please enter both your login ID/Mobile and password.' });
          return;
        }

        if (role === 'ADMIN') {
          const admin = HostelDatabase.verifyAdminCredentials(identifier, password);
          if (!admin) {
            sendJson(res, 401, { error: 'Invalid Admin username or password.' });
            return;
          }
          const token = `sess_adm_${crypto.randomBytes(24).toString('hex')}`;
          activeSessions.set(token, { role: 'ADMIN', adminId: admin.admin_id, username: admin.username });
          sendJson(res, 200, {
            token,
            role: 'ADMIN',
            user: {
              id: admin.admin_id,
              name: admin.full_name,
              username: admin.username,
              email: admin.email,
              hostelName: admin.hostel_name,
            },
          });
          return;
        } else {
          const tenant = HostelDatabase.verifyTenantCredentials(identifier, password);
          if (!tenant) {
            sendJson(res, 401, {
              error: 'Invalid Tenant ID / Mobile Number / Email or Password. Click "Forgot Login ID or Password?" below to reset it, or "New PG Resident Setup" to create an account.',
            });
            return;
          }
          const token = `sess_tnt_${crypto.randomBytes(24).toString('hex')}`;
          activeSessions.set(token, { role: 'TENANT', userId: tenant.user_id, name: tenant.name });
          sendJson(res, 200, {
            token,
            role: 'TENANT',
            tenantId: tenant.user_id,
            user: {
              id: tenant.user_id,
              name: tenant.name,
              phone: tenant.phone,
              email: tenant.email,
            },
          });
          return;
        }
      }

      // ── 4. PERSISTENT DATABASE READ: GET /api/db/state ────────────────────
      if (url === '/api/db/state' && method === 'GET') {
        const state = HostelDatabase.getState();
        const engineInfo = HostelDatabase.getEngineInfo();
        const safeUsers = (state.users || []).map(({ password_hash, ...rest }) => rest);
        sendJson(res, 200, {
          ...state,
          users: safeUsers,
          admins: undefined,
          isSetupComplete: HostelDatabase.isSetupComplete(),
          dbEngine: engineInfo.engine,
        });
        return;
      }

      // ── 5. PERSISTENT DATABASE WRITE / SYNC: POST /api/db/sync ────────────
      if (url === '/api/db/sync' && method === 'POST') {
        const body = await parseJsonBody(req);
        HostelDatabase.saveState(body);
        sendJson(res, 200, { saved: true, timestamp: new Date().toISOString() });
        return;
      }

      // ── 6. WIPE ALL DEMO / SAMPLE RECORDS: POST /api/db/wipe ──────────────
      if (url === '/api/db/wipe' && method === 'POST') {
        const cleaned = HostelDatabase.wipeAllTenantAndRoomData();
        const safeUsers = (cleaned.users || []).map(({ password_hash, ...rest }) => rest);
        sendJson(res, 200, { wiped: true, state: { ...cleaned, users: safeUsers, admins: undefined } });
        return;
      }

      // ── 7. DATABASE JSON BACKUP EXPORT: GET /api/db/export ────────────────
      if (url === '/api/db/export' && method === 'GET') {
        const state = HostelDatabase.getState();
        const safeUsers = (state.users || []).map(({ password_hash, ...rest }) => rest);
        const safeExport = { ...state, users: safeUsers, admins: undefined, exportedAt: new Date().toISOString() };
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="hostel_database_backup.json"',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(JSON.stringify(safeExport, null, 2));
        return;
      }

      // ── 8. YOUPI-PG V2 HEALTH & PAYMENT ENDPOINTS ─────────────────────────
      if (url === '/api/youpi/health' && method === 'GET') {
        const engineInfo = HostelDatabase.getEngineInfo();
        sendJson(res, 200, {
          status: 'UP',
          gateway: 'YouPI-PG V2 Production Database Engine',
          dbEngine: engineInfo.engine,
        });
        return;
      }

      if (url === '/api/v1/payments' && method === 'POST') {
        const body = await parseJsonBody(req);
        const paymentId = `ypg-sess-${crypto.randomUUID().slice(0, 12)}`;
        const orderId = body.orderId || `PG-ORD-${Date.now()}`;
        const amountNum = Number(body.amount || 0);
        const amountStr = amountNum.toFixed(2);
        const amountPaise = Math.round(amountNum * 100);

        const record = {
          paymentId,
          orderId,
          amount: amountStr,
          amountPaise: String(amountPaise),
          currency: body.currency || 'INR',
          method: body.method || 'UPI',
          status: 'INITIATED',
          queuePosition: 0,
          checkoutUrl: `${process.env.CHECKOUT_PORTAL_URL || 'http://localhost:7000'}/checkout/${paymentId}`,
          metadata: body.metadata || {},
          createdAt: new Date().toISOString(),
        };

        sendJson(res, 201, record);
        return;
      }

      if (url === '/api/youpi/webhook' && method === 'POST') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const sigHeader = String(req.headers['x-youpi-signature'] || '');
          const deliveryId = String(req.headers['x-youpi-delivery'] || `dlv-${Date.now()}`);

          if (webhookDeliveries.has(deliveryId)) {
            sendJson(res, 200, { ok: true, idempotentDuplicate: true, deliveryId });
            return;
          }
          webhookDeliveries.add(deliveryId);

          const state = HostelDatabase.getState();
          const secret = state.youpiConfig?.webhookSecret || 'sec_youpi_royalheights_hmac_2026';
          const expectedHmac = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
          const verified = sigHeader === expectedHmac;

          sendJson(res, verified ? 200 : 401, {
            received: true,
            deliveryId,
            signatureVerified: verified,
          });
        });
        return;
      }

      next();
    } catch (err) {
      sendJson(res, 500, { error: err?.message || 'Internal Server Error' });
    }
  };
}
