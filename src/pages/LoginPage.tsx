import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Eye,
  EyeOff,
  BedDouble,
  Wrench,
  ArrowRight,
  Lock,
  Database,
  CheckCircle2,
  QrCode,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'ADMIN' | 'TENANT', tenantId?: string) => void;
}

interface VacantBedOption {
  bed_id: string;
  bed_label: string;
  room_id: string;
  room_number: string;
  floor: number;
  is_ac: boolean;
  monthly_room_rent: number;
  monthly_ac_rent: number;
}

const SAVED_CREDS_KEY = 'pg_hostel_saved_credentials_v1';

const FEATURES = [
  {
    icon: QrCode,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'YouPI-PG V2 Direct UPI Settlement',
    desc: '0% fee dynamic vector QR payments routed directly to 9016053196@yespop.',
  },
  {
    icon: Database,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Persistent SQLite WAL Database',
    desc: 'All rooms, beds, residents, and payment ledgers stored securely in SQLite DB.',
  },
  {
    icon: BedDouble,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    title: 'Resident Self-Service & Auto-Login',
    desc: 'Your login stays saved automatically across visits, with instant password recovery.',
  },
  {
    icon: Wrench,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Maintenance & Staff Attendance',
    desc: 'Real-time facility ticket queue and daily staff attendance tracking.',
  },
];

type PortalMode = 'TENANT_LOGIN' | 'TENANT_SIGNUP' | 'ADMIN';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showAdminSetupForm, setShowAdminSetupForm] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [hostelBrandName, setHostelBrandName] = useState('Royal Heights PG Hostel');
  const [dbEngineLabel, setDbEngineLabel] = useState('SQLITE_WAL');
  const [activePayeeVpa, setActivePayeeVpa] = useState('9016053196@yespop');
  const [vacantBeds, setVacantBeds] = useState<VacantBedOption[]>([]);

  const [portalMode, setPortalMode] = useState<PortalMode>('TENANT_LOGIN');

  // Login State (Pre-populated from saved credentials if available)
  const [username, setUsername] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) || '{}');
      return saved.tenantUsername || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) || '{}');
      return saved.tenantPassword || '';
    } catch {
      return '';
    }
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password / Account Recovery State
  const [recIdentifier, setRecIdentifier] = useState('');
  const [recVerifyValue, setRecVerifyValue] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recError, setRecError] = useState('');
  const [recLoading, setRecLoading] = useState(false);

  // Owner / UPI Settings Update State
  const [setupHostelName, setSetupHostelName] = useState('Royal Heights PG Hostel');
  const [setupFullName, setSetupFullName] = useState('Hostel Owner');
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupEmail, setSetupEmail] = useState('admin@royalheightspg.in');
  const [setupPhone, setSetupPhone] = useState('9016053196');
  const [setupPassword, setSetupPassword] = useState('admin123');
  const [setupPayeeVpa, setSetupPayeeVpa] = useState('9016053196@yespop');

  // New PG Resident Self-Registration State ("Live in PG Setup")
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regSelectedBedId, setRegSelectedBedId] = useState('CUSTOM');
  const [regRoomNumber, setRegRoomNumber] = useState('101');
  const [regBedLabel, setRegBedLabel] = useState('Bed A');
  const [regIsAc, setRegIsAc] = useState(true);
  const [regRoomRent, setRegRoomRent] = useState(8000);
  const [regAcRent, setRegAcRent] = useState(1500);
  const [regDeposit, setRegDeposit] = useState(15000);

  const loadStatus = () => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.hostelName) {
          setHostelBrandName(data.hostelName);
          setSetupHostelName(data.hostelName);
        }
        if (data.payeeVpa) {
          setActivePayeeVpa(data.payeeVpa);
          setSetupPayeeVpa(data.payeeVpa);
        }
        if (data.dbEngine) setDbEngineLabel(data.dbEngine);
        if (Array.isArray(data.vacantBeds)) {
          setVacantBeds(data.vacantBeds);
          if (data.vacantBeds.length > 0) {
            setRegSelectedBedId(data.vacantBeds[0].bed_id);
          } else {
            setRegSelectedBedId('CUSTOM');
          }
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleModeSwitch = (mode: PortalMode) => {
    setPortalMode(mode);
    setError('');
    setSuccessBanner('');
    setShowAdminSetupForm(false);
    setShowForgotModal(false);
    if (mode === 'ADMIN') {
      setUsername('admin');
      setPassword('');
    } else if (mode === 'TENANT_LOGIN') {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED_CREDS_KEY) || '{}');
        setUsername(saved.tenantUsername || '');
        setPassword(saved.tenantPassword || '');
      } catch {
        setUsername('');
        setPassword('');
      }
    }
  };

  // ── 1. Handle Owner / Admin Settings Update ────────────────────────────────
  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!setupHostelName.trim() || !setupUsername.trim() || !setupPassword.trim()) {
      setError('Please fill in Hostel Name, Admin Username, and Password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelName: setupHostelName.trim(),
          fullName: setupFullName.trim() || setupUsername.trim(),
          username: setupUsername.trim(),
          email: setupEmail.trim() || `${setupUsername.trim()}@hostel.in`,
          phone: setupPhone.trim(),
          password: setupPassword,
          payeeVpa: setupPayeeVpa.trim() || '9016053196@yespop',
          startClean: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Setup failed.');
        setIsLoading(false);
        return;
      }
      onLogin('ADMIN');
    } catch (err: any) {
      setError(err.message || 'Network error during setup.');
      setIsLoading(false);
    }
  };

  // ── 2. Handle New Resident Self-Registration (User Living in PG) ───────────
  const handleTenantSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = regPhone.replace(/\D/g, '');
    if (!regName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError('Please create a login password (at least 4 characters).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || `${digits.slice(-10)}@resident.hostel.in`,
          password: regPassword,
          workplaceOrCollege: regOrg.trim(),
          selectedBedId: regSelectedBedId !== 'CUSTOM' ? regSelectedBedId : undefined,
          roomNumber: regRoomNumber.trim() || '101',
          bedLabel: regBedLabel.trim() || 'Bed A',
          isAc: regIsAc,
          monthlyRoomRent: Number(regRoomRent) || 8000,
          monthlyAcRent: regIsAc ? Number(regAcRent) || 0 : 0,
          depositPaid: Number(regDeposit) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not complete resident registration.');
        setIsLoading(false);
        return;
      }
      try {
        localStorage.setItem(
          SAVED_CREDS_KEY,
          JSON.stringify({
            tenantUsername: regPhone.trim(),
            tenantPassword: regPassword,
          })
        );
      } catch {}
      onLogin('TENANT', data.tenantId);
    } catch (err: any) {
      setError(err.message || 'Network error while registering resident.');
      setIsLoading(false);
    }
  };

  // ── 3. Handle Login (Tenant Login OR Admin Login) ──────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessBanner('');
    if (!username.trim() || !password) {
      setError('Please enter your login ID/Mobile and password.');
      return;
    }
    const targetRole = portalMode === 'ADMIN' ? 'ADMIN' : 'TENANT';
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid login credentials.');
        setIsLoading(false);
        return;
      }
      if (targetRole === 'TENANT') {
        try {
          if (rememberMe) {
            localStorage.setItem(
              SAVED_CREDS_KEY,
              JSON.stringify({
                tenantUsername: username.trim(),
                tenantPassword: password,
              })
            );
          } else {
            localStorage.removeItem(SAVED_CREDS_KEY);
          }
        } catch {}
      }
      onLogin(targetRole, data.tenantId);
    } catch {
      setError('Unable to reach authentication server.');
      setIsLoading(false);
    }
  };

  // ── 4. Handle Forgot Password / Account Recovery ───────────────────────────
  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError('');
    const targetRole = portalMode === 'ADMIN' ? 'ADMIN' : 'TENANT';
    if (!recIdentifier.trim() || !recNewPassword || recNewPassword.length < 4) {
      setRecError('Please enter your Mobile/Email/ID and a new password (min 4 chars).');
      return;
    }
    setRecLoading(true);
    try {
      const res = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          identifier: recIdentifier.trim(),
          verificationValue: recVerifyValue.trim(),
          newPassword: recNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecError(data.error || 'Could not verify account details.');
        setRecLoading(false);
        return;
      }
      setRecLoading(false);
      setShowForgotModal(false);
      setUsername(data.loginId || recIdentifier.trim());
      setPassword(recNewPassword);
      setSuccessBanner(
        targetRole === 'ADMIN'
          ? `Admin password reset! Your username is "${data.loginId}". Click Sign In below.`
          : `Password reset for ${data.name}! Your Tenant ID is ${data.loginId} (or use Mobile ${data.phone}). Click Sign In below.`
      );
      setRecIdentifier('');
      setRecVerifyValue('');
      setRecNewPassword('');
    } catch {
      setRecError('Network error while resetting password.');
      setRecLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col antialiased">
      {/* Top brand bar */}
      <header className="w-full border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              {hostelBrandName}
            </span>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              Production Edition
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1 rounded-lg">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>UPI: {activePayeeVpa}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>DB: {dbEngineLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Feature highlights (5 cols) */}
          <div className="lg:col-span-5 space-y-6 hidden lg:block pt-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 font-medium mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live Production Database & YouPI-PG V2
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
                {hostelBrandName}
                <br />
                <span className="text-indigo-400">Resident & Owner Portal</span>
              </h1>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Students and residents living in the PG can set up their profile or sign in to pay monthly rent directly to <strong className="text-emerald-300 font-mono">{activePayeeVpa}</strong>, download rent receipts, and raise maintenance requests.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border ${f.bg} bg-opacity-50`}
                >
                  <div className={`w-8 h-8 rounded-lg border ${f.bg} flex items-center justify-center shrink-0`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Unified 3-Tab Portal Card (7 cols) */}
          <div className="lg:col-span-7 w-full">
            {checkingSetup ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-sm text-slate-400">
                Connecting to Hostel Database...
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* ── ALWAYS-VISIBLE 3-WAY ROLE SWITCHER TABS ── */}
                <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('TENANT_LOGIN')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3.5 px-2 text-xs font-semibold transition-all border-b-2 ${
                      portalMode === 'TENANT_LOGIN'
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>Resident Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('TENANT_SIGNUP')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3.5 px-2 text-xs font-semibold transition-all border-b-2 ${
                      portalMode === 'TENANT_SIGNUP'
                        ? 'text-sky-300 bg-sky-500/10 border-sky-500'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>New PG Resident Setup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('ADMIN')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3.5 px-2 text-xs font-semibold transition-all border-b-2 ${
                      portalMode === 'ADMIN'
                        ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Admin / Owner</span>
                  </button>
                </div>

                {/* ── FORGOT LOGIN ID / PASSWORD RECOVERY PANEL ── */}
                {showForgotModal ? (
                  <div className="p-7 space-y-4 animate-in fade-in duration-150">
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4" />
                          {portalMode === 'ADMIN'
                            ? 'Recover Admin Account & Reset Password'
                            : 'Recover Resident Login ID & Reset Password'}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {portalMode === 'ADMIN'
                            ? 'Verify your registered Receiving Bank UPI ID (e.g. 9016053196@yespop) or Owner Phone to set a new Admin password.'
                            : 'Enter your registered Mobile Number, Email, or Name to recover your Tenant ID and set a new password immediately.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotModal(false);
                          setRecError('');
                        }}
                        className="text-xs text-slate-400 hover:text-white underline shrink-0"
                      >
                        Back to Login
                      </button>
                    </div>

                    <form onSubmit={handleRecoverPassword} className="space-y-3.5 text-xs">
                      <div>
                        <label className="text-slate-300 font-medium block mb-1">
                          {portalMode === 'ADMIN'
                            ? 'Admin Username *'
                            : 'Your Registered Mobile Number, Email, or Full Name *'}
                        </label>
                        <input
                          type="text"
                          value={recIdentifier}
                          onChange={(e) => setRecIdentifier(e.target.value)}
                          placeholder={
                            portalMode === 'ADMIN'
                              ? 'admin'
                              : 'e.g. 9876543210 or yourname@gmail.com'
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-medium block mb-1">
                          {portalMode === 'ADMIN'
                            ? 'Verify Registered Bank UPI ID or Owner Phone *'
                            : 'Verify Your Room Number, Email, or Full Name *'}
                        </label>
                        <input
                          type="text"
                          value={recVerifyValue}
                          onChange={(e) => setRecVerifyValue(e.target.value)}
                          placeholder={
                            portalMode === 'ADMIN'
                              ? 'e.g. 9016053196@yespop'
                              : 'e.g. 101 or your email/name'
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-emerald-300 font-semibold block mb-1">
                          Enter New Password (min 4 characters) *
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={recNewPassword}
                          onChange={(e) => setRecNewPassword(e.target.value)}
                          placeholder="Create your new password"
                          className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      {recError && (
                        <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>{recError}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotModal(false);
                            setRecError('');
                          }}
                          className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={recLoading}
                          className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 flex items-center justify-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>
                            {recLoading
                              ? 'Resetting Password...'
                              : 'Reset Password & Recover My Login ID'}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    {/* ── TAB 1: TENANT / PG RESIDENT LOGIN ── */}
                    {portalMode === 'TENANT_LOGIN' && (
                      <div className="p-7 space-y-5">
                        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4" />
                              PG Resident / Student Login
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                              Sign in with your <strong>10-digit Mobile Number</strong>, <strong>Tenant ID</strong> (e.g. <span className="font-mono">PG-2026-001</span>), or <strong>Email</strong>. Your session stays logged in automatically for next time.
                            </p>
                          </div>
                        </div>

                        {successBanner && (
                          <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>{successBanner}</span>
                          </div>
                        )}

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                              Mobile Number, Tenant ID, or Email
                            </label>
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => {
                                setUsername(e.target.value);
                                setError('');
                              }}
                              placeholder="e.g. 9876543210 or PG-2026-001"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-medium text-slate-300">
                                Resident Password
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setRecIdentifier(username);
                                  setShowForgotModal(true);
                                  setError('');
                                }}
                                className="text-xs text-amber-400 hover:text-amber-300 font-medium underline"
                              >
                                Forgot Login ID or Password?
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  setError('');
                                }}
                                placeholder="Enter your password"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-emerald-500"
                              />
                              <span>Keep me signed in &amp; save my login for next time</span>
                            </label>
                          </div>

                          {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                          >
                            <span>{isLoading ? 'Verifying Resident Account...' : 'Sign In to My PG Resident Portal'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>

                        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                          <span className="text-slate-400">
                            Living in this PG and haven't set up your account yet?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleModeSwitch('TENANT_SIGNUP')}
                            className="px-3.5 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            New PG Resident Setup
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── TAB 2: NEW PG RESIDENT SELF-SETUP (FOR USERS LIVING IN PG) ── */}
                    {portalMode === 'TENANT_SIGNUP' && (
                      <div className="p-7 space-y-4">
                        <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/40">
                          <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            New PG Resident Account Setup (For Users Living in PG)
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Enter your details, room number, and create your password below. Your login will be saved automatically so it opens directly next time.
                          </p>
                        </div>

                        <form onSubmit={handleTenantSignup} className="space-y-3.5 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-300 font-medium block mb-1">
                                Your Full Name *
                              </label>
                              <input
                                type="text"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                placeholder="e.g. Aarav Patel"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-slate-300 font-medium block mb-1">
                                10-Digit Mobile Number (Login ID) *
                              </label>
                              <input
                                type="tel"
                                value={regPhone}
                                onChange={(e) => setRegPhone(e.target.value)}
                                placeholder="e.g. 9876543210"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-slate-300 font-medium block mb-1">
                                Email Address *
                              </label>
                              <input
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                placeholder="yourname@gmail.com"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-sky-300 font-semibold block mb-1">
                                Create Login Password *
                              </label>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                placeholder="Create password (min 4 chars)"
                                className="w-full bg-slate-950 border border-sky-500/40 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                required
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-slate-300 font-medium block mb-1">
                                College / Company Name (Optional)
                              </label>
                              <input
                                type="text"
                                value={regOrg}
                                onChange={(e) => setRegOrg(e.target.value)}
                                placeholder="e.g. Nirma University / TCS / Infosys"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                              />
                            </div>

                            {/* Room & Bed Selection */}
                            <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                              <label className="text-emerald-300 font-semibold block mb-1">
                                Your PG Room & Bed Allocation *
                              </label>
                              {vacantBeds.length > 0 && (
                                <select
                                  value={regSelectedBedId}
                                  onChange={(e) => setRegSelectedBedId(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 mb-2.5"
                                >
                                  {vacantBeds.map((vb) => (
                                    <option key={vb.bed_id} value={vb.bed_id}>
                                      Room {vb.room_number} · {vb.bed_label} ({vb.is_ac ? 'AC' : 'Non-AC'}) — ₹
                                      {(vb.monthly_room_rent + vb.monthly_ac_rent).toLocaleString('en-IN')}/month
                                    </option>
                                  ))}
                                  <option value="CUSTOM">+ Enter My Room & Bed Number Manually</option>
                                </select>
                              )}

                              {(vacantBeds.length === 0 || regSelectedBedId === 'CUSTOM') && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                                  <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Room No *</label>
                                    <input
                                      type="text"
                                      value={regRoomNumber}
                                      onChange={(e) => setRegRoomNumber(e.target.value)}
                                      placeholder="e.g. 101"
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Bed No *</label>
                                    <input
                                      type="text"
                                      value={regBedLabel}
                                      onChange={(e) => setRegBedLabel(e.target.value)}
                                      placeholder="e.g. Bed A"
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Room Rent (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="8000"
                                      value={regRoomRent === 0 ? '' : regRoomRent}
                                      onChange={(e) =>
                                        setRegRoomRent(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">AC Charge (₹)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="0 (if non-AC)"
                                      value={!regIsAc || regAcRent === 0 ? '' : regAcRent}
                                      onChange={(e) => {
                                        const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                                        setRegAcRent(v);
                                        setRegIsAc(v > 0);
                                      }}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>
                              {isLoading
                                ? 'Creating Your PG Resident Account...'
                                : 'Complete Resident Setup & Open My PG Portal'}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    )}

                    {/* ── TAB 3: ADMIN / OWNER LOGIN OR SETTINGS ── */}
                    {portalMode === 'ADMIN' && (
                      <div className="p-7 space-y-5">
                        {!showAdminSetupForm ? (
                          <>
                            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4" />
                                  Hostel Owner / Admin Login
                                </div>
                                <p className="text-[11px] text-slate-300 mt-1">
                                  Admin Username: <strong className="font-mono text-white">admin</strong> · Password: <strong className="font-mono text-white">admin123</strong> · Active UPI VPA: <strong className="font-mono text-emerald-300">{activePayeeVpa}</strong>
                                </p>
                              </div>
                            </div>

                            {successBanner && (
                              <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                                <span>{successBanner}</span>
                              </div>
                            )}

                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                  Admin Username
                                </label>
                                <input
                                  type="text"
                                  value={username}
                                  onChange={(e) => {
                                    setUsername(e.target.value);
                                    setError('');
                                  }}
                                  placeholder="admin"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                  required
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-medium text-slate-300">
                                    Admin Password
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecIdentifier(username || 'admin');
                                      setShowForgotModal(true);
                                      setError('');
                                    }}
                                    className="text-xs text-amber-400 hover:text-amber-300 font-medium underline"
                                  >
                                    Forgot Admin Password?
                                  </button>
                                </div>
                                <div className="relative">
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                      setPassword(e.target.value);
                                      setError('');
                                    }}
                                    placeholder="admin123"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                  >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {error && (
                                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  <span>{error}</span>
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                              >
                                <span>{isLoading ? 'Signing in...' : 'Sign In to Admin Dashboard'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </form>

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                              <span>Want to change Admin password or UPI ID ({activePayeeVpa})?</span>
                              <button
                                type="button"
                                onClick={() => setShowAdminSetupForm(true)}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                              >
                                Edit Owner & UPI Settings
                              </button>
                            </div>
                          </>
                        ) : (
                          /* ── OWNER ACCOUNT & BANK UPI SETTINGS FORM ── */
                          <div className="space-y-4">
                            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start justify-between gap-3">
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Owner & Bank UPI Configuration
                                </div>
                                <h2 className="text-sm font-bold text-white">
                                  Update Owner Account & Receiving UPI ID
                                </h2>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAdminSetupForm(false)}
                                className="text-xs text-indigo-300 hover:text-white underline shrink-0"
                              >
                                Back to Admin Login
                              </button>
                            </div>

                            <form onSubmit={handleFirstTimeSetup} className="space-y-3.5 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="text-slate-300 font-medium block mb-1">
                                    Your PG / Hostel Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={setupHostelName}
                                    onChange={(e) => setSetupHostelName(e.target.value)}
                                    placeholder="e.g. Royal Heights PG Hostel"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="text-emerald-300 font-semibold block mb-1">
                                    Your Receiving Bank UPI ID (VPA) for Rent Collection *
                                  </label>
                                  <input
                                    type="text"
                                    value={setupPayeeVpa}
                                    onChange={(e) => setSetupPayeeVpa(e.target.value)}
                                    placeholder="9016053196@yespop"
                                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="text-slate-300 font-medium block mb-1">
                                    Admin Login Username *
                                  </label>
                                  <input
                                    type="text"
                                    value={setupUsername}
                                    onChange={(e) => setSetupUsername(e.target.value)}
                                    placeholder="admin"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="text-slate-300 font-medium block mb-1">
                                    Admin Password *
                                  </label>
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={setupPassword}
                                    onChange={(e) => setSetupPassword(e.target.value)}
                                    placeholder="admin123"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                                    required
                                  />
                                </div>
                              </div>

                              {error && (
                                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  <span>{error}</span>
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>
                                  {isLoading
                                    ? 'Saving Owner Settings...'
                                    : 'Save Owner Settings & Sign In as Admin'}
                                </span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
