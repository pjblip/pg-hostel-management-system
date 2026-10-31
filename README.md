# PG Hostel Management System + YouPI-PG V2 Payment Gateway

Complete **PG Hostel Management System (v2.1)** integrated with the **YouPI-PG V2 Self-Hosted 0% Fee UPI Payment Gateway**.

## What Was Integrated

1. **Tenant Self-Service Portal (`src/components/tenant/TenantPortal.tsx`)**
   - **Instant YouPI-PG V2 Checkout**: Tenants can pay segregated monthly dues (`Standard Room Rent` + `AC Utilities Rent`) in 1 click via **Dynamic UPI QR (`UPI`)**, **Cash at PG Office Counter (`CASH_COUNTER`)**, or **Card at Office POS (`CARD_COUNTER`)**.
   - **Live Settlement Badges**: Displays `RECONCILED`, `OBSERVED_SUCCESS`, and `MANUAL_REVIEW` badges alongside 12-digit bank UTR references and official printable receipts.
   - **Manual Screenshot Upload Fallback**: Retains the drag-and-drop receipt screenshot uploader for offline transfers. imported HDFC/ICICI/SBI bank statement CSV on VPA + integer paise + 12-digit UTR).
   - **Live Sessions & Cashier Counter Till**: Monitor active VPA slots, FIFO queue positions, and approve/reconcile sessions in 1 click.
   - **HMAC-SHA256 Signed Webhook Outbox Inspector**: Inspect `X-Gateway-Event`, `X-Gateway-Signature`, `X-Gateway-Signature-V2`, and `X-Gateway-Delivery-Id` verified via constant-time comparison.
   - **Gateway Configuration & Universal `/youpi.js` SDK**: Configure Hybrid/Live/Embedded mode, receiving UPI VPA, Merchant UUID, and Webhook Secret.

4. **Vite Backend Middleware & Full `youpi-gateway/` Suite (`vite.config.ts` & `youpi-gateway/`)**
   - `vite.config.ts` includes `youpiGatewayVitePlugin()` providing `/api/v1/payments`, `/api/youpi/webhook` (using `crypto.timingSafeEqual`), and `/api/youpi/health` out-of-the-box on port `3000`.
   - The full standalone YouPI-PG V2 microservice suite is also included under `./youpi-gateway/` pre-configured for **Royal Heights PG Hostel**.

---


2. **Interactive YouPI-PG V2 Checkout Modal (`src/components/modals/YoupiCheckoutModal.tsx`)**
   - **Step 1 — WhatsApp Berry Pre-Checkout OTP Gate**: Verifies tenant mobile number via 6-digit WhatsApp OTP (includes a 1-click demo OTP auto-fill button for rapid testing).
   - **Step 2 — Dynamic ISO/IEC 18004 Vector SVG QR & UPI Intents**: Renders genuine scannable UPI QR codes (`src/utils/youpiCore.ts` + `src/utils/qr-lib.js`) locked to integer paise (`amountPaise`) and active hostel VPA (`royalheightspg@okhdfcbank`), with 1-tap deep-links for Google Pay, PhonePe, Paytm, CRED, BHIM, and Amazon Pay.
   - **Step 3 — Built-in Developer & Observer Simulator Bar**: Test `OBSERVED_SUCCESS` (SMS/Gmail observer match), `RECONCILED` (Bank Statement CSV match), `SUCCESS` (Counter approval), and `MANUAL_REVIEW` directly inside the modal.

3. **Admin YouPI-PG Control & Statement Reconciliation Hub (`src/components/admin/YoupiGatewayPanel.tsx`)**
   - **Bank Statement CSV Reconciliation**: Implements the authoritative YouPI-PG V2 settlement rule (`OBSERVED_SUCCESS` with `settlementState: NOT_RECONCILED` moves to `RECONCILED` and marks rent `PAID` once matched against an
## Quick Start

### 1. Run the Hostel Management System (with Embedded YouPI-PG V2 Middleware)

```bash
npm install
npm run dev
```

Open **`http://localhost:3000`**:
- **Admin Login**: Username `admin` / Password `admin123` (Open the **YouPI Gateway** tab in the top navigation bar, or click **YouPI QR** on any tenant's pending rent in the **Tenant Ledger**).
- **Tenant Login**: Username `tenant` / Password `tenant123` (Click **Pay Due via YouPI PG** in the Tenant Portal).

### 2. (Optional) Run the Full Standalone YouPI-PG Microservices (Ports 6100 / 7000 / 6001 / 8090)

If you also want to run the standalone YouPI-PG multi-service supervisor (requires Node.js >= 22.13.0 for `node:sqlite`):

```bash
npm run youpi:dev
```

Then switch the integration mode to **External YouPI-PG Microservices (`LIVE_SERVER`)** inside **Admin → YouPI Gateway → Gateway Config & SDK**.
git init

  
First commit (respecting the existing .gitignore)

  
Push to https://github.com/pjblip/<repo-name>