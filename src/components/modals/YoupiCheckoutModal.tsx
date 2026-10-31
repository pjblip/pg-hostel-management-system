import React, { useState, useEffect, useMemo } from 'react';
import { useHostel } from '../../context/HostelContext';
import { YoupiPaymentMethod } from '../../types/hostel';
import { formatINR } from '../../utils/dateDiff';
import { generateQrSvg, UPI_PROVIDERS } from '../../utils/youpiCore';
import {
  X,
  ShieldCheck,
  Smartphone,
  QrCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  CreditCard,
  Copy,
  Check,
  Zap,
  FileCheck2,
  Lock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const YoupiCheckoutModal: React.FC = () => {
  const {
    activeCheckoutSession,
    setActiveCheckoutSession,
    youpiConfig,
    payments,
    authenticateYoupiCustomer,
    switchYoupiMethod,
    processYoupiOutcome,
  } = useHostel();

  const [authStep, setAuthStep] = useState<'MOBILE' | 'OTP'>('MOBILE');
  const [mobileInput, setMobileInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [demoOtp] = useState('482910');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [isVerifying30s, setIsVerifying30s] = useState(false);
  const [verifySeconds, setVerifySeconds] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [customUtrInput, setCustomUtrInput] = useState('');
  const [showOrderBreakdown, setShowOrderBreakdown] = useState(false);

  const session = activeCheckoutSession;
  const linkedPayment = useMemo(
    () => payments.find((p) => p.payment_id === session?.hostelPaymentId) || null,
    [payments, session?.hostelPaymentId]
  );

  useEffect(() => {
    if (session) {
      setMobileInput(session.customerMobile || '9823045678');
      setAuthStep('MOBILE');
      setOtpInput('');
      setIsVerifying30s(false);
      setVerifySeconds(30);
      setCustomUtrInput(`${Math.floor(400000000000 + Math.random() * 599999999999)}`);
      const diff = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff || 300);
    }
  }, [session?.id]);

  // 5-Minute Active Window Countdown Timer
  useEffect(() => {
    if (!session || !session.customerVerified) return;
    const isTerminal = [
      'OBSERVED_SUCCESS',
      'RECONCILED',
      'MANUAL_REVIEW',
      'SUCCESS',
      'FAILED',
      'EXPIRED',
      'CANCELLED',
    ].includes(session.status);
    if (isTerminal) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          processYoupiOutcome(session.id, 'EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.customerVerified, session?.status]);

  // 30-Second Verification Window Countdown Timer
  useEffect(() => {
    if (!isVerifying30s || !session) return;
    const timer = setInterval(() => {
      setVerifySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsVerifying30s(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isVerifying30s, session]);

  const qrSvg = useMemo(() => {
    if (!session?.upiUri) return '';
    return generateQrSvg(session.upiUri, 210, 'M');
  }, [session?.upiUri]);

  if (!session) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileInput.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      showToast('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }
    setMobileInput(clean);
    setAuthStep('OTP');
    showToast(`WhatsApp Berry OTP dispatched to +91 ${clean}`);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim().length < 6) {
      showToast('Enter the 6-digit WhatsApp verification code.');
      return;
    }
    authenticateYoupiCustomer(session.id, mobileInput);
    showToast(`Verified via WhatsApp Berry Auth! Active UPI slot acquired.`);
  };

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(session.payeeVpa);
    setCopiedVpa(true);
    showToast(`Copied UPI ID: ${session.payeeVpa}`);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleUpiAppClick = (appName: string) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = session.upiUri;
    } else {
      navigator.clipboard.writeText(session.payeeVpa);
      showToast(`Copied VPA (${session.payeeVpa})! Scan QR or open ${appName} on your phone.`);
    }
  };

  const isTerminal = [
    'OBSERVED_SUCCESS',
    'RECONCILED',
    'MANUAL_REVIEW',
    'SUCCESS',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
  ].includes(session.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px] max-h-[94vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Banner */}
        {toastMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-full shadow-lg flex items-center gap-2 animate-in fade-in">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── LEFT COLUMN: YOUPI-PG MERCHANT BRANDING & ORDER SIDEBAR ── */}
        <div
          className="md:w-[310px] shrink-0 text-white p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, #1e1b4b 0%, #312e81 55%, #1e293b 100%)',
          }}
        >
          <div className="space-y-4 relative z-10">
            {/* Merchant Identity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center font-bold text-lg text-white shadow-inner">
                  {session.payeeName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white leading-snug">
                    {session.payeeName}
                  </h3>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    YouPI PG Verified Business
                  </div>
                </div>
              </div>

              {/* Mobile Close Button */}
              <button
                onClick={() => setActiveCheckoutSession(null)}
                className="md:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Summary Card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span>Total Amount Payable</span>
                <span className="font-mono text-[10px] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-400/20">
                  0% Gateway Fee
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono tracking-tight text-white">
                ₹{Number(session.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>

              {/* Segregated Fee Breakdown Toggle */}
              <button
                type="button"
                onClick={() => setShowOrderBreakdown((v) => !v)}
                className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200 hover:text-white transition-colors"
              >
                <span>
                  {session.billingMonth} · Room {session.roomNumber}
                </span>
                <span className="underline">{showOrderBreakdown ? 'Hide' : 'Details'}</span>
              </button>

              {showOrderBreakdown && linkedPayment && (
                <div className="pt-2 space-y-1 text-[11px] text-indigo-100 border-t border-white/10 font-mono">
                  <div className="flex justify-between">
                    <span>Standard Room Rent:</span>
                    <span>{formatINR(linkedPayment.room_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AC Utilities Rent:</span>
                    <span>{formatINR(linkedPayment.ac_amount)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300 text-[10px] pt-1">
                    <span>Integer Minor Units:</span>
                    <span>{session.amountPaise} paise</span>
                  </div>
                </div>
              )}
            </div>

            {/* Customer & Order Meta */}
            <div className="space-y-2 text-xs bg-slate-950/30 rounded-xl p-3.5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-indigo-200">Order ID</span>
                <span className="font-mono font-semibold text-white text-[11px]">
                  #{session.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200">Tenant</span>
                <span className="font-medium text-white truncate max-w-[160px]">
                  {session.tenantName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200">WhatsApp Auth</span>
                <span className="font-mono text-[11px] text-emerald-300">
                  {session.customerVerified ? `✓ +91 ${session.customerMobile}` : 'Pending OTP'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-200">Slot Queue</span>
                <span className="font-mono text-[11px] text-sky-300">
                  {session.queuePosition === 0 ? 'Active Slot #1' : `Queued #${session.queuePosition}`}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-white/10 space-y-2 text-[11px] text-indigo-200 relative z-10 mt-4">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Secured by YouPI PG V2</span>
            </div>
            <p className="text-[10px] text-indigo-300/90 leading-relaxed">
              Direct-to-Bank P2P UPI Settlement · Single-Slot FIFO Queue · HMAC-SHA256 Signed Webhooks
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE CHECKOUT WORKSPACE ── */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
          {/* Top Bar */}
          <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                {!session.customerVerified
                  ? 'Step 1 · WhatsApp Berry Pre-Checkout Auth'
                  : isTerminal
                  ? 'Payment Session Status'
                  : 'Step 2 · Payment Options'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Server Is Working
              </span>
            </div>

            <button
              onClick={() => setActiveCheckoutSession(null)}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close Checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Workspace Body */}
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-5">
            {/* ── VIEW 1: WHATSAPP BERRY PRE-CHECKOUT OTP GATE ── */}
            {!session.customerVerified && !isTerminal ? (
              <div className="max-w-md mx-auto w-full my-auto space-y-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {authStep === 'MOBILE' ? 'Sign in with WhatsApp to Pay' : 'Verify 6-Digit WhatsApp OTP'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {authStep === 'MOBILE'
                        ? 'YouPI PG verifies tenant identity before reserving a live UPI slot.'
                        : `Enter the 6-digit code sent to WhatsApp +91 ${mobileInput}`}
                    </p>
                  </div>
                </div>

                {authStep === 'MOBILE' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        10-Digit Mobile Number (WhatsApp)
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-xs font-mono font-semibold">
                          +91
                        </span>
                        <input
                          type="text"
                          value={mobileInput}
                          onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9823045678"
                          className="flex-1 rounded-r-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          required
                        />
                      </div>
                    </div>

                    {/* Quick 1-click saved tenant account selector */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between">
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">{session.tenantName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          +91 {session.customerMobile} · {session.customerEmail}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          authenticateYoupiCustomer(session.id, session.customerMobile);
                          showToast(`Signed in as ${session.tenantName}`);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        1-Tap Instant Login →
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>Send WhatsApp Berry OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        6-Digit WhatsApp OTP Code
                      </label>
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="482910"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        required
                      />
                    </div>

                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-emerald-800">
                        Demo Berry OTP: <strong className="font-mono">{demoOtp}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpInput(demoOtp);
                          authenticateYoupiCustomer(session.id, mobileInput);
                          showToast('WhatsApp OTP verified! UPI QR slot activated.');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px]"
                      >
                        Auto-Fill & Verify
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthStep('MOBILE')}
                        className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
                      >
                        Verify OTP & Unlock UPI QR
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : isTerminal ? (
              /* ── VIEW 2: TERMINAL PAYMENT OUTCOME SCREEN ── */
              <div className="max-w-lg mx-auto w-full my-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
                <div
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center border ${
                    session.status === 'RECONCILED' || session.status === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : session.status === 'OBSERVED_SUCCESS'
                      ? 'bg-sky-50 border-sky-200 text-sky-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}
                >
                  {session.status === 'RECONCILED' || session.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : session.status === 'OBSERVED_SUCCESS' ? (
                    <FileCheck2 className="w-8 h-8" />
                  ) : (
                    <AlertTriangle className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1.5 ${
                      session.status === 'RECONCILED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : session.status === 'OBSERVED_SUCCESS'
                        ? 'bg-sky-100 text-sky-800 border-sky-300'
                        : session.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {session.status} · {session.settlementState}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {session.status === 'RECONCILED'
                      ? 'Payment Reconciled & Rent Marked PAID!'
                      : session.status === 'OBSERVED_SUCCESS'
                      ? 'UPI Alert Observed by YouPI-PG!'
                      : session.status === 'SUCCESS'
                      ? 'Counter Payment Confirmed!'
                      : session.status === 'MANUAL_REVIEW'
                      ? 'Payment Held for Manual Review'
                      : `Session ${session.status}`}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                    {session.status === 'RECONCILED'
                      ? 'Matched against bank statement CSV on receiving VPA, integer paise amount, and 12-digit UTR. Official rent receipt is now available.'
                      : session.status === 'OBSERVED_SUCCESS'
                      ? youpiConfig.autoFulfillOnObserver
                        ? 'Bank SMS/Gmail alert matched and auto-approved per gateway policy!'
                        : 'A bank SMS/Gmail alert matched this UPI session (settlementState: NOT_RECONCILED). Per YouPI-PG V2 security rules, import the bank statement CSV in Admin → YouPI Gateway (or click Reconcile below) to finalize.'
                      : session.status === 'SUCCESS'
                      ? 'Recorded via PG Office Counter desk.'
                      : 'Flagged for admin verification before fulfillment.'}
                  </p>
                </div>

                {/* Transaction Metadata Receipt Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-left space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID:</span>
                    <span className="font-semibold text-slate-900">{session.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{session.amount} ({session.amountPaise} paise)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method / Source:</span>
                    <span className="text-slate-800">
                      {session.method} · {session.verificationSource || 'GATEWAY'}
                    </span>
                  </div>
                  {session.utr && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank UTR / Ref:</span>
                      <span className="font-bold text-indigo-700">{session.utr}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action if OBSERVED_SUCCESS */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {session.status === 'OBSERVED_SUCCESS' && (
                    <button
                      type="button"
                      onClick={() =>
                        processYoupiOutcome(session.id, 'RECONCILED', {
                          utr: session.utr,
                          source: 'BANK_STATEMENT_CSV',
                        })
                      }
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      Simulate Statement CSV Match (Mark RECONCILED)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveCheckoutSession(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Return to Hostel Portal
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW 3: ACTIVE PAYMENT WORKSPACE (UPI QR / COUNTER CASH / POS CARD) ── */
              <div className="space-y-4">
                {/* Payment Method Tabs */}
                <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-xl">
                  {(
                    [
                      { id: 'UPI', label: 'UPI QR (0% Fee)', icon: QrCode },
                      { id: 'CASH_COUNTER', label: 'Cash at Office Counter', icon: Banknote },
                      { id: 'CARD_COUNTER', label: 'Card at POS Desk', icon: CreditCard },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchYoupiMethod(session.id, id as YoupiPaymentMethod)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        session.method === id
                          ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Method A: Dynamic ISO Vector UPI QR */}
                {session.method === 'UPI' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Scan & Pay via Any UPI App
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Dynamic ISO/IEC 18004 Vector SVG QR · Exact Paise Lock ({session.amountPaise}p)
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formatTimer(remainingSeconds)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                      {/* QR Code Box */}
                      <div className="sm:col-span-5 flex flex-col items-center">
                        <div
                          className="w-48 h-48 p-2 bg-white border-2 border-indigo-600/20 rounded-2xl shadow-md flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {session.payeeVpa}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyVpa}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Copy VPA"
                          >
                            {copiedVpa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* UPI Apps & Instructions */}
                      <div className="sm:col-span-7 space-y-3.5">
                        <div className="text-xs font-semibold text-slate-700">
                          1-Tap UPI Intent / Supported Apps
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {UPI_PROVIDERS.map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => handleUpiAppClick(app.name)}
                              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors text-left"
                            >
                              <img
                                src={app.iconUrl}
                                alt={app.shortName}
                                className="w-5 h-5 object-contain rounded shrink-0"
                              />
                              <span className="text-[11px] font-semibold text-slate-800 truncate">
                                {app.shortName}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                          <div>1. Scan QR or click a UPI app above to pay <strong>₹{session.amount}</strong>.</div>
                          <div>2. Android SMS & Gmail Observers detect your 12-digit UTR automatically.</div>
                          <div>3. Or click below once paid to start the 30-second verification window.</div>
                        </div>

                        {!isVerifying30s ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsVerifying30s(true);
                              setVerifySeconds(30);
                            }}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Payment Done — Check My Payment</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-900">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                              <span>
                                Polling SMS & Gmail Observers... (<strong>{verifySeconds}s</strong>)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                processYoupiOutcome(session.id, 'OBSERVED_SUCCESS', {
                                  utr: customUtrInput || '429104829104',
                                  source: 'ANDROID_OBSERVER',
                                })
                              }
                              className="px-2.5 py-1 bg-indigo-600 text-white rounded font-semibold text-[11px]"
                            >
                              Simulate Match Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Method B & C: Cash at Office Counter / Card at POS Counter */}
                {(session.method === 'CASH_COUNTER' || session.method === 'CARD_COUNTER') && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                      {session.method === 'CASH_COUNTER' ? (
                        <Banknote className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span>
                        {session.method === 'CASH_COUNTER'
                          ? 'Pay Cash at PG Warden / Office Desk'
                          : 'Swipe / Tap Card at PG Office POS Terminal'}
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto">
                      <div className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">
                        Amount Payable at Hostel Desk
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-emerald-800 mt-0.5">
                        ₹{session.amount}
                      </div>
                      <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center justify-center gap-2 text-xs">
                        <span className="text-emerald-700 font-semibold">Cashier Order ID:</span>
                        <span className="font-mono font-bold bg-white px-2.5 py-0.5 rounded border border-emerald-300 text-slate-900">
                          #{session.orderId}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Present Order ID <strong>#{session.orderId}</strong> to the Hostel Manager at the office desk. Once approved on the Admin Cashier Dock, your rent receipt is issued immediately.
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          processYoupiOutcome(session.id, 'SUCCESS', {
                            method: session.method,
                            source: 'MANUAL_COUNTER',
                            utr: `COUNTER-${session.orderId.slice(-6)}`,
                          })
                        }
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simulate Warden / Cashier Counter Approval (Instant PAID)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── INTERACTIVE YOUPI-PG OBSERVER & WEBHOOK SIMULATOR BAR ── */}
            {!isTerminal && (
              <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>YouPI-PG V2 Developer & Observer Test Simulator</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">12-Digit UTR:</span>
                    <input
                      type="text"
                      value={customUtrInput}
                      onChange={(e) => setCustomUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 font-mono text-[11px] text-emerald-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      processYoupiOutcome(session.id, 'OBSERVED_SUCCESS', {
                        utr: customUtrInput || '630491827104',
                        source: 'ANDROID_OBSERVER',
                      })
                    }
                    className="py-1.5 px-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>1. SMS Alert (OBSERVED)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      processYoupiOutcome(session.id, 'RECONCILED', {
                        utr: customUtrInput || '630491827104',
                        source: 'BANK_STATEMENT_CSV',
                      })
                    }
                    className="py-1.5 px-2.5 bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>2. Statement Reconcile (PAID)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      processYoupiOutcome(session.id, 'MANUAL_REVIEW', {
                        utr: customUtrInput || '630491827104',
                        source: 'GMAIL',
                        notes: 'Ambiguous observation held for manual review.',
                      })
                    }
                    className="py-1.5 px-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>3. Flag Manual Review</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
