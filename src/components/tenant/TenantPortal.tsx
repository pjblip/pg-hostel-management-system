import React, { useState, useRef } from 'react';
import { useHostel } from '../../context/HostelContext';
import { Payment, MaintenanceRequest } from '../../types/hostel';
import { formatINR, formatReadableDate } from '../../utils/dateDiff';
import { ReceiptInvoiceModal } from '../modals/ReceiptInvoiceModal';
import { PaymentProofModal } from '../modals/PaymentProofModal';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Receipt,
  Wrench,
  ShieldCheck,
  QrCode,
  Zap,
  Banknote,
  CreditCard,
  Eye,
  Info,
  FileCheck2,
} from 'lucide-react';

interface TenantPortalProps {
  onLogout?: () => void;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({ onLogout }) => {
  const {
    activeTenantDetails,
    submitPaymentProof,
    addMaintenanceRequest,
    maintenance,
    verifyPayment,
    initiateYoupiPayment,
    youpiConfig,
  } = useHostel();

  const [selectedProofPayment, setSelectedProofPayment] = useState<Payment | null>(null);
  const [selectedInvoicePayment, setSelectedInvoicePayment] = useState<Payment | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);

  // Payment method tab inside Step 3 card: 'YOUPI' (Default Instant Gateway) or 'UPLOAD' (Manual Screenshot)
  const [payTab, setPayTab] = useState<'YOUPI' | 'UPLOAD'>('YOUPI');

  // Upload Form State (Step 3: Screenshot Upload)
  const [targetPaymentId, setTargetPaymentId] = useState<string>('');
  const [txnRef, setTxnRef] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maintenance Form State
  const [maintCategory, setMaintCategory] = useState<MaintenanceRequest['category']>('AC Repair');
  const [maintUrgency, setMaintUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [maintDescription, setMaintDescription] = useState<string>('');
  const [maintSuccessMsg, setMaintSuccessMsg] = useState<string>('');

  if (!activeTenantDetails) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-4">
        <p className="text-sm text-slate-300 font-medium">
          Your resident profile is loading or is no longer active in the database.
        </p>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Back to Login / Set Up Resident Account
          </button>
        )}
      </div>
    );
  }

  const { user, room, bed, calculatedDuration, payments } = activeTenantDetails;

  // Pending payments that can accept payment
  const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'REJECTED');
  const upcomingCycle = pendingPayments[0] || payments[payments.length - 1];

  // Set default target payment ID if not set
  const currentTargetId = targetPaymentId || upcomingCycle?.payment_id || '';
  const selectedPaymentObj = payments.find((p) => p.payment_id === currentTargetId) || upcomingCycle;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid JPEG or PNG image file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) {
      alert('Please select or drag a transaction screenshot.');
      return;
    }
    if (!txnRef.trim()) {
      alert('Please enter your transaction reference / UTR number.');
      return;
    }

    submitPaymentProof(
      currentTargetId,
      previewUrl,
      fileName || 'payment_proof.png',
      txnRef.trim(),
      paymentMode
    );

    setUploadSuccessMsg('Payment proof uploaded! The hostel owner has been notified for verification.');
    setPreviewUrl(null);
    setFileName('');
    setTxnRef('');
    setTimeout(() => setUploadSuccessMsg(''), 6000);
  };

  const handleCreateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintDescription.trim()) return;

    addMaintenanceRequest({
      user_id: user.user_id,
      room_number: room.room_number,
      category: maintCategory,
      description: maintDescription.trim(),
      urgency: maintUrgency,
    });

    setMaintSuccessMsg('Maintenance request registered! The facility supervisor has been notified.');
    setMaintDescription('');
    setTimeout(() => setMaintSuccessMsg(''), 5000);
  };

  const tenantMaintenance = maintenance.filter((m) => m.user_id === user.user_id);

  return (
    <div className="space-y-6">
      {/* Tenant Welcome & Stay Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">
                Tenant Self-Service Portal
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-mono text-slate-400">ID: {user.user_id}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Room {room.room_number} · {bed.bed_label} {room.is_ac ? '(Air Conditioned)' : '(Standard)'} · Floor {room.floor}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block font-medium">
                Stay Tenure
              </span>
              <span className="text-sm font-bold text-emerald-400">
                {calculatedDuration}
              </span>
            </div>

            <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block font-medium">
                Joined Date
              </span>
              <span className="text-sm font-medium text-slate-200">
                {formatReadableDate(user.joining_date)}
              </span>
            </div>

            <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block font-medium">
                Monthly Dues
              </span>
              <span className="text-sm font-bold font-mono text-indigo-400 tabular-nums">
                {formatINR(bed.monthly_room_rent + bed.monthly_ac_rent)}
              </span>
            </div>

            {pendingPayments.length > 0 && (
              <button
                type="button"
                onClick={() => initiateYoupiPayment(pendingPayments[0].payment_id, 'UPI')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Pay Due ({formatINR(pendingPayments[0].total_dues)}) via YouPI PG</span>
              </button>
            )}
          </div>
        </div>

        {/* Breakdown Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span>
              Standard Room Rent: <strong className="font-mono text-white">{formatINR(bed.monthly_room_rent)}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              AC Utilities Rent: <strong className="font-mono text-white">{formatINR(bed.monthly_ac_rent)}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Security Deposit Held: <strong className="font-mono text-white">{formatINR(activeTenantDetails.stay.deposit_paid)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>0% Fee Instant UPI powered by YouPI-PG V2 ({youpiConfig.payeeVpa})</span>
          </div>
        </div>
      </div>

      {/* Main Grid: YouPI-PG Checkout / Screenshot Upload & Dues Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Step 3 Payment Module (YouPI-PG V2 + Manual Screenshot Upload) (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">
                  Rent Payment & Verification
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pay instantly via YouPI-PG UPI QR or upload a transaction receipt
              </p>
            </div>
          </div>

          {/* Mode Switcher: YouPI-PG Instant vs Manual Upload */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setPayTab('YOUPI')}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                payTab === 'YOUPI'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>YouPI-PG Gateway</span>
            </button>
            <button
              type="button"
              onClick={() => setPayTab('UPLOAD')}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                payTab === 'UPLOAD'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Screenshot</span>
            </button>
          </div>

          {/* Billing Cycle Selector (Shared) */}
          <div className="text-xs">
            <label className="text-slate-300 font-medium block mb-1">
              Select Billing Cycle
            </label>
            <select
              value={currentTargetId}
              onChange={(e) => setTargetPaymentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {payments.map((p) => (
                <option key={p.payment_id} value={p.payment_id}>
                  {p.billing_month} — {formatINR(p.total_dues)} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {payTab === 'YOUPI' ? (
            /* ── TAB A: YOUPI-PG V2 INSTANT CHECKOUT LAUNCHER ── */
            <div className="space-y-4 text-xs">
              {selectedPaymentObj && (
                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold block">
                        YouPI-PG Segregated Invoice
                      </span>
                      <span className="text-sm font-bold text-white">
                        {selectedPaymentObj.billing_month}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      0% Gateway Fee
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Standard Room Rent:</span>
                      <span className="font-mono">{formatINR(selectedPaymentObj.room_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">AC Utilities Rent:</span>
                      <span className="font-mono">{formatINR(selectedPaymentObj.ac_amount)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                      <span>Total Payable:</span>
                      <span className="font-mono text-indigo-400">
                        {formatINR(selectedPaymentObj.total_dues)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Receiving VPA: {youpiConfig.payeeVpa}</span>
                    <span>{selectedPaymentObj.total_dues * 100} paise</span>
                  </div>
                </div>
              )}

              {/* Payment Modality Launch Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    selectedPaymentObj && initiateYoupiPayment(selectedPaymentObj.payment_id, 'UPI')
                  }
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    Pay {selectedPaymentObj ? formatINR(selectedPaymentObj.total_dues) : ''} via YouPI-PG UPI QR
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectedPaymentObj &&
                      initiateYoupiPayment(selectedPaymentObj.payment_id, 'CASH_COUNTER')
                    }
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cash at PG Office</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectedPaymentObj &&
                      initiateYoupiPayment(selectedPaymentObj.payment_id, 'CARD_COUNTER')
                    }
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                    <span>Card at Office POS</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  How YouPI-PG V2 Works
                </div>
                <div>• Authenticates your WhatsApp number via 6-digit Berry OTP</div>
                <div>• Generates an ISO/IEC 18004 Vector SVG QR for GPay, PhonePe, Paytm, CRED & BHIM</div>
                <div>• Auto-verifies via Android SMS / Gmail Observers & Bank Statement CSV</div>
              </div>
            </div>
          ) : (
            /* ── TAB B: MANUAL SCREENSHOT UPLOAD (ORIGINAL STEP 3) ── */
            <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Receipt File (JPEG / PNG)
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="space-y-2">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="max-h-36 mx-auto rounded border border-slate-800 object-contain shadow-md"
                      />
                      <span className="text-[11px] font-mono text-indigo-300 block truncate">
                        {fileName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(null);
                          setFileName('');
                        }}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Remove & Choose Another
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <UploadCloud className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="text-slate-200 font-medium text-xs">
                        Click to browse or drag & drop screenshot
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Supports JPEG, PNG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Net Banking">IMPS / NEFT Transfer</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Transaction Ref / UTR
                  </label>
                  <input
                    type="text"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    placeholder="e.g. UPI/9284918239"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <UploadCloud className="w-4 h-4" />
                Submit Screenshot for Verification
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Dues History & Receipt Download (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rent Dues & Receipts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Payment History & Official Receipts
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live YouPI-PG settlement status and downloadable rent invoices
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-3 text-right">Room</th>
                    <th className="py-3 px-3 text-right">AC</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3">Status / Gateway</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {payments.map((p) => (
                    <tr key={p.payment_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {p.billing_month}
                        {p.transaction_ref && (
                          <div className="text-[10px] font-mono text-slate-400">
                            UTR: {p.transaction_ref}
                          </div>
                        )}
                        {p.youpi_order_id && (
                          <div className="text-[10px] font-mono text-indigo-400">
                            {p.youpi_order_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatINR(p.room_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatINR(p.ac_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-white">
                        {formatINR(p.total_dues)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'UNDER_REVIEW'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : p.status === 'REJECTED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.youpi_status && (
                            <span className="text-[9px] font-mono text-sky-400 flex items-center gap-0.5">
                              <FileCheck2 className="w-2.5 h-2.5" />
                              {p.youpi_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(p.status === 'PENDING' || p.status === 'REJECTED') && (
                            <button
                              type="button"
                              onClick={() => initiateYoupiPayment(p.payment_id, 'UPI')}
                              className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <QrCode className="w-3 h-3" />
                              Pay via YouPI
                            </button>
                          )}
                          {p.proof_image_url && (
                            <button
                              onClick={() => {
                                setSelectedProofPayment(p);
                                setIsProofModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                              title="Preview uploaded screenshot"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedInvoicePayment(p);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 border border-slate-700 transition-colors"
                            title="Download official receipt invoice"
                          >
                            <Receipt className="w-3 h-3 text-indigo-400" />
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance Reporting Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Report Room Maintenance Issue
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Request facility inspection for Room {room.room_number}
                </p>
              </div>
            </div>

            {maintSuccessMsg && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{maintSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateMaintenance} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Category</label>
                  <select
                    value={maintCategory}
                    onChange={(e) => setMaintCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="AC Repair">AC Repair & Cooling</option>
                    <option value="Plumbing">Plumbing & Bathroom</option>
                    <option value="Electrical">Electrical & Power</option>
                    <option value="WiFi">WiFi & Internet</option>
                    <option value="Cleaning">Deep Cleaning</option>
                    <option value="Furniture">Furniture & Fixtures</option>
                    <option value="Other">Other / General</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Urgency</label>
                  <select
                    value={maintUrgency}
                    onChange={(e) => setMaintUrgency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="LOW">Low (Routine check)</option>
                    <option value="MEDIUM">Medium (Within 24 hrs)</option>
                    <option value="HIGH">High (Urgent action needed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Issue Description</label>
                <textarea
                  rows={2}
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  placeholder="Describe the problem (e.g. AC compressor humming loudly after 11 PM)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 placeholder-slate-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Submit Ticket
              </button>
            </form>

            {tenantMaintenance.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Your Active & Past Requests
                </span>
                <div className="space-y-1.5">
                  {tenantMaintenance.map((m) => (
                    <div
                      key={m.request_id}
                      className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{m.category}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">{m.reported_date}</span>
                        </div>
                        <p className="text-slate-400 mt-0.5 text-[11px]">{m.description}</p>
                        {m.resolution_note && (
                          <p className="text-emerald-400 text-[11px] mt-1 font-mono">
                            Admin note: {m.resolution_note}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ml-2 ${
                          m.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proof Modal */}
      <PaymentProofModal
        payment={selectedProofPayment}
        tenant={user}
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        onVerify={verifyPayment}
      />

      {/* Receipt Invoice Modal */}
      <ReceiptInvoiceModal
        payment={selectedInvoicePayment}
        user={user}
        room={room}
        bed={bed}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
};
