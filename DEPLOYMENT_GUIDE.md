# Live Production Database & Website Deployment Guide

Your **PG Hostel Management System + YouPI-PG V2** has been upgraded from a local demo into a **genuine, database-backed production web application** with **zero hardcoded demo credentials**.

---

## 1. What Was Built For You

1. **Real Persistent Backend Database (`server/db.mjs` + `database/schema.sql`)**:
   - **SQLite WAL Engine (`data/hostel_production.sqlite`)** on Node 22+ with automatic **ACID JSON Database fallback (`data/hostel_production.json`)** on Node 18/20.
   - Full relational SQL schema (`database/schema.sql`) ready for **SQLite**, **PostgreSQL (Supabase / Neon)**, or **MySQL** with 12 tables:
     - `admins` (PBKDF2-SHA512 salted password hashes)
     - `users` (Tenants with hashed self-service login passwords)
     - `rooms`, `beds`, `tenant_stays`, `payments`, `maintenance_requests`, `workers`, `attendance_records`
     - `youpi_config`, `youpi_sessions`, `youpi_webhooks`
2. **Genuine Authentication (No Demo Credentials)**:
   - **First-Time Owner Setup Wizard**: The very first time you open the site, it prompts you to create your **Owner Admin Username & Password**, **Hostel Name**, and **Receiving UPI ID (`8866368929@naviaxis`)**.
   - **Clean Production Slate**: Starts with **0 fake tenants and 0 fake rooms** so only your genuine hostel rooms, beds, and tenants are stored.
   - **Real Tenant Self-Service Login**: When you enroll a tenant via **+ New Tenant**, you set their **Tenant Portal Password** (defaults to their 10-digit mobile number). Tenants log in using their **Tenant ID (`PG-2026-001`)**, **10-digit Mobile Number**, or **Email** + Password, and can **only** view their own room, rent receipts, and YouPI QR checkout.
3. **Unified Production Server (`server.mjs` + `server/api-router.mjs`)**:
   - Serves both the REST Database/Auth API (`/api/auth/*`, `/api/db/*`, `/api/v1/payments`, `/api/youpi/*`) and the compiled frontend (`dist/`) on a single port (`PORT=3000`).

---

## 2. Running Locally With the Real Database

1. Open a terminal in the project folder and install dependencies (if not already installed):
   ```bash
   npm install
   ```
2. For development with live reload + real database persistence:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
3. For production mode locally:
   ```bash
   npm run build
   npm start
   ```
4. **First-Time Owner Setup**:
   - Fill out the **First-Time Production Owner Setup** screen on `http://localhost:3000`.
   - Keep **"Start with 100% Clean Database"** selected.
   - Once logged in as Admin:
     1. Go to **Rooms & Beds** -> click **+ Add Room** and add your real rooms and beds.
     2. Click **+ New Tenant** in the top bar -> enroll your real student/tenant and note their **Tenant ID** and **Portal Password**.
     3. Share the website URL + their Tenant ID/Mobile & Password with the student so they can log in from their phone and pay rent directly to `8866368929@naviaxis`.

---

## 3. How to Make It a Live Website (3 Easy Options)

### Option A: Deploy on Render.com (Recommended — 1-Click Blueprint)
1. Create a free GitHub repository and push this project folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Production Hostel Management System with Database"
   ```
   *(Note: `.gitignore` excludes `node_modules` and local `data/` files).*
2. Log in to [Render.com](https://render.com) -> click **New +** -> **Blueprint** (or **Web Service**).
3. Connect your GitHub repository:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Persistent Disk**: Mount path `/opt/render/project/src/data` (or `/app/data` if using Docker) so your SQLite database file persists across redeployments.
4. Render will give you a live HTTPS URL (e.g., `https://your-hostel-name.onrender.com`).

### Option B: Deploy on Railway.app (Instant Node/Docker Hosting + Volume)
1. Log in to [Railway.app](https://railway.app) and click **New Project** -> **Deploy from GitHub repo**.
2. Railway automatically detects the included `Dockerfile` (or `package.json` `build` + `start` scripts).
3. Right-click your service in Railway -> **Add Volume** -> mount it to `/app/data`.
4. Click **Settings -> Networking -> Generate Domain** to get your live public `.up.railway.app` website link.

### Option C: Import SQL Schema into Supabase / Neon PostgreSQL
If you also want to inspect or host your tables in **Supabase** or **Neon PostgreSQL**:
1. Open the file `database/schema.sql` included in this project.
2. Paste its contents into the **Supabase SQL Editor** and click **Run** — it creates all 12 tables and indexes (`admins`, `users`, `rooms`, `beds`, `tenant_stays`, `payments`, `maintenance_requests`, `workers`, `attendance_records`, `youpi_config`, `youpi_sessions`, `youpi_webhooks`).
3. You can also download a complete JSON backup of your live database anytime from the Admin navbar (**Backup** button -> `/api/db/export`).
