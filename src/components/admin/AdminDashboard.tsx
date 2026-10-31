import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import { Payment, TenantStayDetails } from '../../types/hostel';
import { formatINR, formatReadableDate } from '../../utils/dateDiff';
import { PaymentProofModal } from '../modals/PaymentProofModal';
import { ReceiptInvoiceModal } from '../modals/ReceiptInvoiceModal';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  Eye, 
  PlusCircle, 
  Copy, 
  Check, 
  Users, 
  BedDouble, 
  TrendingUp,
  Receipt,
  LogOut,
  Trash2,
  X,
  QrCode,
  FileCheck2,
  ShieldCheck,
  Database,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    getAllTenantsDetails,
    verifyPayment,
    createManualPayment,
    sendBillingAlert,
    checkoutTenant,
    removeTenant,
    rooms,
    beds,
    payments,
    initiateYoupiPayment,
    youpiConfig,
    dbStatus,
    loadSampleDataIntoDatabase,
    refreshFromDatabase,
  } = useHostel();

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Modals state
  const [activeProofPayment, setActiveProofPayment] = useState<Payment | null>(null);
  const [activeInvoicePayment, setActiveInvoicePayment] = useState<Payment | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  
  // Manual payment modal state
  const [showManualPayModal, setShowManualPayModal] = useState<boolean>(false);
  const [manualMonth, setManualMonth] = useState<string>('October 2026');
  const [manualRoomAmt, setManualRoomAmt] = useState<number>(8000);
  const [manualAcAmt, setManualAcAmt] = useState<number>(1500);
  const [manualTxnRef, setManualTxnRef] = useState<string>('');
  const [manualMode, setManualMode] = useState<'UPI' | 'Net Banking' | 'Cash'>('UPI');

  // Admin Password Reset for Tenant state
  const [showResetPassModal, setShowResetPassModal] = useState<boolean>(false);
  const [newTenantPass, setNewTenantPass] = useState<string>('');
  const [resetPassSaved, setResetPassSaved] = useState<boolean>(false);

  // Billing alert notification state
  const [alertNotice, setAlertNotice] = useState<{ message: string; copyText: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCreds, setCopiedCreds] = useState<boolean>(false);

  // Checkout confirmation
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  // Delete (permanent remove) confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Compute metrics across entire hostel
  const allTenants = getAllTenantsDetails();
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.occupancy_status === 'OCCUPIED').length;
  const vacantBeds = beds.filter((b) => b.occupancy_status === 'VACANT').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const currentMonthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const totalCollectedThisMonth = payments
    .filter((p) => (p.billing_month.includes(currentMonthLabel) || p.billing_month.includes('September')) && p.status === 'PAID')
    .reduce((sum, p) => sum + p.total_dues, 0);

  const totalPendingHostelDues = payments
    .filter((p) => p.status === 'PENDING' || p.status === 'UNDER_REVIEW')
    .reduce((sum, p) => sum + p.total_dues, 0);

  const selectedTenant: TenantStayDetails | undefined = 
    allTenants.find((t) => t.user.user_id === selectedTenantId) || allTenants[0];

  const handleOpenProof = (payment: Payment) => {
    setActiveProofPayment(payment);
    setIsProofModalOpen(true);
  };

  const handleOpenInvoice = (payment: Payment) => {
    setActiveInvoicePayment(payment);
    setIsInvoiceModalOpen(true);
  };

  const handleSendReminder = (userId: string) => {
    const alertResult = sendBillingAlert(userId);
    setAlertNotice(alertResult);
    setCopied(false);
  };

  const handleCopyAlert = () => {
    if (alertNotice) {
      navigator.clipboard.writeText(alertNotice.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyTenantLogin = (t: TenantStayDetails) => {
    const pwd = t.user.portal_password_hint || t.user.phone.replace(/\D/g, '').slice(-10);
    const text = `Hostel Tenant Portal Login:\nName: ${t.user.name}\nTenant ID: ${t.user.user_id}\nMobile: ${t.user.phone}\nPassword: ${pwd}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !newTenantPass.trim() || newTenantPass.trim().length < 4) return;
    try {
      const res = await fetch('/api/auth/admin-reset-tenant-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedTenant.user.user_id,
          newPassword: newTenantPass.trim(),
        }),
      });
      if (res.ok) {
        await refreshFromDatabase();
        setResetPassSaved(true);
        setTimeout(() => {
          setResetPassSaved(false);
          setShowResetPassModal(false);
          setNewTenantPass('');
        }, 1200);
      }
    } catch {}
  };

  const handleCheckout = () => {
    if (!selectedTenant) return;
    checkoutTenant(selectedTenant.user.user_id);
    setShowCheckoutConfirm(false);
    const remaining = getAllTenantsDetails().filter(
      (t) => t.user.user_id !== selectedTenant.user.user_id && t.user.status === 'ACTIVE'
    );
    if (remaining.length > 0) setSelectedTenantId(remaining[0].user.user_id);
  };

  const handleDeleteTenant = () => {
    if (!selectedTenant) return;
    const userId = selectedTenant.user.user_id;
    removeTenant(userId);
    setShowDeleteConfirm(false);
    setAlertNotice(null);
    const remaining = getAllTenantsDetails().filter((t) => t.user.user_id !== userId);
    if (remaining.length > 0) setSelectedTenantId(remaining[0].user.user_id);
    else setSelectedTenantId('');
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    const today = new Date().toISOString().split('T')[0];
    const rmAmt = Number(manualRoomAmt) || 0;
    const acAmt = Number(manualAcAmt) || 0;
    createManualPayment({
      user_id: selectedTenant.user.user_id,
      billing_month: manualMonth,
      room_amount: rmAmt,
      ac_amount: acAmt,
      total_dues: rmAmt + acAmt,
      amount_paise: (rmAmt + acAmt) * 100,
      status: 'PAID',
      payment_date: today,
      transaction_ref: manualTxnRef || `DIR-${Date.now().toString().slice(-6)}`,
      payment_mode: manualMode,
      verified_by: 'Hostel Manager (Admin)',
      verification_date: today,
      notes: 'Recorded manually via Admin Dashboard ledger entry.',
    });
    setShowManualPayModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Collected (Current Cycle)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
            {formatINR(totalCollectedThisMonth)}
          </div>
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>YouPI-PG VPA: {youpiConfig.payeeVpa}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pending Dues</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400 tabular-nums tracking-tight">
            {formatINR(totalPendingHostelDues)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Upcoming + observed awaiting statement CSV
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Bed Occupancy</span>
            <BedDouble className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
            {occupiedBeds} / {totalBeds} ({occupancyRate}%)
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {vacantBeds} vacant bed slots available
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Registered Students</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
            {allTenants.length} Tenants
          </div>
          <p className="mt-1 text-xs text-slate-400">
            All active lease agreements
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Tenant Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Tenant Lookup
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name or ID (e.g. PG-2026-001)..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {allTenants.length === 0
                    ? 'No tenants enrolled yet. Create rooms & enroll your first genuine tenant.'
                    : `No tenant found matching "${searchQuery}"`}
                </div>
              ) : (
                searchResults.map((t) => {
                  const isSelected = selectedTenant?.user.user_id === t.user.user_id;
                  const hasPending = t.payments.some((p) => p.status === 'PENDING');
                  const hasReview = t.payments.some((p) => p.status === 'UNDER_REVIEW');

                  return (
                    <button
                      key={t.user.user_id}
                      onClick={() => setSelectedTenantId(t.user.user_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {t.user.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            ({t.user.user_id})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          Room {t.room.room_number} · {t.bed.bed_label} {t.room.is_ac ? '(AC)' : ''}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        {hasReview ? (
                          <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Review / Observed
                          </span>
                        ) : hasPending ? (
                          <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            Due
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Clear
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Section 4 & 5 Modules (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTenant ? (
            <>
              {/* Section 4: Admin Search & Student History Module Result Banner */}
              <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      Section 4 · Search & Student History Module
                    </div>
                    
                    <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
                      <span>"{selectedTenant.user.name}"</span>
                      <span className="text-xs font-mono text-indigo-300 font-normal bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded">
                        ID: {selectedTenant.user.user_id}
                      </span>
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-300">
                      <div>
                        Joined: <strong className="text-white">{formatReadableDate(selectedTenant.user.joining_date)}</strong>
                      </div>
                      <span className="text-slate-600 hidden sm:inline">|</span>
                      <div>
                        Calculated Duration: <strong className="text-emerald-400 font-medium">{selectedTenant.calculatedDuration}</strong>
                      </div>
                      <span className="text-slate-600 hidden sm:inline">|</span>
                      <div>
                        Assigned: <strong className="text-white">Room {selectedTenant.room.room_number} · {selectedTenant.bed.bed_label}{selectedTenant.room.is_ac ? ' (AC)' : ''}</strong>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Phone: <span className="font-mono text-slate-300">{selectedTenant.user.phone}</span></span>
                      <span>Email: <span className="text-slate-300">{selectedTenant.user.email}</span></span>
                      {selectedTenant.user.workplace_or_college && (
                        <span>Org: <span className="text-slate-300">{selectedTenant.user.workplace_or_college}</span></span>
                      )}
                    </div>

                    {/* Tenant Self-Service Login Credentials Badge */}
                    <div className="mt-3 inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Tenant Portal Login: <strong className="font-mono text-white">{selectedTenant.user.user_id}</strong> (or Mobile) · Password:{' '}
                        <strong className="font-mono text-emerald-300">
                          {selectedTenant.user.portal_password_hint || selectedTenant.user.phone.replace(/\D/g, '').slice(-10)}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTenantLogin(selectedTenant)}
                        className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        {copiedCreds ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedCreds ? 'Copied' : 'Copy Login'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTenantPass(selectedTenant.user.portal_password_hint || '');
                          setShowResetPassModal(true);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium transition-colors"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleSendReminder(selectedTenant.user.user_id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-400" />
                      Send Billing Alert
                    </button>
                    <button
                      onClick={() => setShowManualPayModal(true)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Record Payment
                    </button>
                    {selectedTenant.user.status === 'ACTIVE' && (
                      <button
                        onClick={() => setShowCheckoutConfirm(true)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Checkout Tenant
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Tenant
                    </button>
                  </div>
                </div>

                {alertNotice && (
                  <div className="mt-4 p-3 bg-indigo-950/70 border border-indigo-500/40 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <div className="text-indigo-200 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {alertNotice.message}
                      </div>
                      <p className="text-slate-300 font-mono text-[11px] truncate max-w-xl">
                        "{alertNotice.copyText}"
                      </p>
                    </div>
                    <button
                      onClick={handleCopyAlert}
                      className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy Message'}
                    </button>
                  </div>
                )}
              </div>

              {/* Section 5: Payment History, YouPI-PG Settlement & Screenshot Proof Tracking Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Section 5 · Payment History, YouPI-PG Settlement & Proof Tracking
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Segregated standard room rent, AC utilities ledger, and YouPI-PG V2 reconciliation state
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Deposit Paid: <strong className="font-mono text-slate-200">{formatINR(selectedTenant.stay.deposit_paid)}</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-5 whitespace-nowrap">Billing Month</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Room Rent</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">AC Rent</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Total Dues</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status & Gateway</th>
                        <th className="py-3 px-5 text-right whitespace-nowrap">Proof / YouPI Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {selectedTenant.payments.map((payment) => {
                        const hasProof = !!payment.proof_image_url;

                        return (
                          <tr 
                            key={payment.payment_id}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-5 font-medium text-white whitespace-nowrap">
                              {payment.billing_month}
                              {payment.transaction_ref && (
                                <div className="text-[11px] font-mono text-slate-400">
                                  UTR/Ref: {payment.transaction_ref}
                                </div>
                              )}
                              {payment.youpi_order_id && (
                                <div className="text-[10px] font-mono text-indigo-400">
                                  {payment.youpi_order_id}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                              {formatINR(payment.room_amount)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                              {formatINR(payment.ac_amount)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-white whitespace-nowrap">
                              {formatINR(payment.total_dues)}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    payment.status === 'PAID'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : payment.status === 'UNDER_REVIEW'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : payment.status === 'REJECTED'
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {payment.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                                  {payment.status === 'UNDER_REVIEW' && <Clock className="w-3 h-3" />}
                                  {payment.status === 'REJECTED' && <AlertTriangle className="w-3 h-3" />}
                                  {payment.status}
                                </span>

                                {payment.youpi_status && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-400">
                                    <FileCheck2 className="w-3 h-3" />
                                    {payment.youpi_status} ({payment.settlement_state})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {hasProof && (
                                  <button
                                    onClick={() => handleOpenProof(payment)}
                                    className="inline-flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline"
                                    title="Open responsive proof preview modal"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{payment.proof_file_name || 'receipt.jpg'}</span>
                                  </button>
                                )}

                                {payment.status === 'PENDING' && (
                                  <button
                                    onClick={() => initiateYoupiPayment(payment.payment_id, 'UPI')}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    YouPI QR
                                  </button>
                                )}

                                {payment.status === 'UNDER_REVIEW' && (
                                  <button
                                    onClick={() => verifyPayment(payment.payment_id, 'PAID', 'Reconciled and approved by Admin.')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                                  >
                                    Approve / Reconcile
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenInvoice(payment)}
                                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/70 rounded"
                                  title="View printable invoice"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    YouPI-PG V2 Contract: UPI QR · Single-Slot FIFO Queue · Bank Statement CSV Reconciliation
                  </span>
                  <span className="font-mono">
                    Total Lifetime Paid: {formatINR(selectedTenant.totalPaid)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-8 space-y-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Clean Production Database Active ({dbStatus.engine})
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5">
                    Ready for Genuine Hostel Operations
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Your database is 100% free of demo credentials and fake tenants. Every room, bed, tenant, and payment you create is automatically saved to your persistent database (<span className="font-mono text-slate-300">data/hostel_production.sqlite</span>).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="text-xs font-bold text-indigo-400">Step 1 · Add Rooms & Beds</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Open the <strong className="text-slate-200">Rooms & Beds</strong> tab above and click <strong className="text-slate-200">+ Add Room</strong> to configure your real room numbers, bed counts, and AC/Non-AC rent. ({rooms.length} rooms currently configured)
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-400">Step 2 · Enroll Genuine Tenants</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click <strong className="text-slate-200">+ New Tenant</strong> in the top navbar (or let students register via <strong className="text-slate-200">New PG Resident Setup</strong> on the login page).
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="text-xs font-bold text-amber-400">Step 3 · Collect Real UPI Rent</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    All rent QR codes are wired to <strong className="font-mono text-slate-200">{youpiConfig.payeeVpa}</strong>. Configure or update your bank VPA anytime in the <strong className="text-slate-200">YouPI Gateway</strong> tab.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Want to preview how the dashboard looks with sample rooms & tenants first? You can wipe it back to zero anytime using the DB Reset button in the top bar.
                </span>
                <button
                  type="button"
                  onClick={loadSampleDataIntoDatabase}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Load Sample Data (Optional)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Reset Tenant Password Modal */}
      {showResetPassModal && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password for {selectedTenant.user.name}
              </h3>
              <button
                onClick={() => setShowResetPassModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">
                  New Portal Password for <span className="font-mono text-indigo-300">{selectedTenant.user.user_id}</span>
                </label>
                <input
                  type="text"
                  value={newTenantPass}
                  onChange={(e) => setNewTenantPass(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              {resetPassSaved && (
                <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Password updated in database!
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {showCheckoutConfirm && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Confirm Tenant Checkout</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action will vacate the bed and mark the stay as closed.</p>
              </div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
              <div className="text-white font-medium">{selectedTenant.user.name} <span className="text-slate-400 font-mono">({selectedTenant.user.user_id})</span></div>
              <div className="text-slate-400">Room {selectedTenant.room.room_number} · {selectedTenant.bed.bed_label}</div>
              {selectedTenant.totalPending > 0 && (
                <div className="text-amber-400 font-medium mt-1">⚠ Pending dues: {formatINR(selectedTenant.totalPending)} — ensure settlement before checkout.</div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setShowCheckoutConfirm(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleCheckout} className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                Confirm Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Tenant Removal Confirmation Modal */}
      {showDeleteConfirm && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-slate-900 border border-rose-600/40 rounded-xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-600/10 border border-rose-600/20 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Permanently Remove Tenant?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  This will delete the tenant profile, all stay records, every payment entry,
                  and all maintenance tickets. <strong className="text-rose-300">This cannot be undone.</strong>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTenant}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Remove Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 Responsive Admin Popup Modal for Screenshot Preview */}
      <PaymentProofModal
        payment={activeProofPayment}
        tenant={selectedTenant?.user || null}
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        onVerify={verifyPayment}
      />

      {/* Printable Invoice / Receipt Modal */}
      <ReceiptInvoiceModal
        payment={activeInvoicePayment}
        user={selectedTenant?.user || null}
        room={selectedTenant?.room || null}
        bed={selectedTenant?.bed || null}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Manual Payment Entry Modal */}
      {showManualPayModal && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Record Payment for {selectedTenant.user.name}
              </h3>
              <button
                onClick={() => setShowManualPayModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Billing Month</label>
                <input
                  type="text"
                  value={manualMonth}
                  onChange={(e) => setManualMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Room Rent (₹)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={manualRoomAmt === 0 ? '' : manualRoomAmt}
                    onChange={(e) =>
                      setManualRoomAmt(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">AC Rent (₹)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={manualAcAmt === 0 ? '' : manualAcAmt}
                    onChange={(e) =>
                      setManualAcAmt(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Payment Mode</label>
                <select
                  value={manualMode}
                  onChange={(e) => setManualMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Net Banking">Net Banking / NEFT / IMPS</option>
                  <option value="Cash">Cash at Office</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Transaction Ref / Receipt #</label>
                <input
                  type="text"
                  value={manualTxnRef}
                  onChange={(e) => setManualTxnRef(e.target.value)}
                  placeholder="e.g. UPI/9284918239 or Cash Voucher #12"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualPayModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
