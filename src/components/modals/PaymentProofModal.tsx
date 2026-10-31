import React, { useState } from 'react';
import { Payment, User, PaymentStatus } from '../../types/hostel';
import { formatINR } from '../../utils/dateDiff';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  FileText, 
  CreditCard, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';

interface PaymentProofModalProps {
  payment: Payment | null;
  tenant: User | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (paymentId: string, status: PaymentStatus, notes?: string) => void;
}

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  payment,
  tenant,
  isOpen,
  onClose,
  onVerify,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [verificationNote, setVerificationNote] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  if (!isOpen || !payment) return null;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const handleApprove = () => {
    onVerify(payment.payment_id, 'PAID', verificationNote || 'Approved by hostel owner.');
    onClose();
  };

  const handleReject = () => {
    if (!verificationNote.trim()) {
      alert('Please provide a reason for rejecting the receipt.');
      return;
    }
    onVerify(payment.payment_id, 'REJECTED', verificationNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Payment Proof Verification
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{tenant?.name || 'Tenant'}</span>
                <span aria-hidden="true">·</span>
                <span>{payment.billing_month}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-indigo-400 tabular-nums">
                  {formatINR(payment.total_dues)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: 2 Columns on desktop */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Image Preview Viewport */}
          <div className="lg:col-span-7 bg-slate-950 flex flex-col items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-slate-800 relative select-none overflow-hidden min-h-[360px]">
            {/* Image Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1 shadow-lg">
              <button
                onClick={handleZoomIn}
                title="Zoom in"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom out"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono transition-colors"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              {payment.proof_image_url && (
                <a
                  href={payment.proof_image_url}
                  download={payment.proof_file_name || 'receipt.jpg'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Download / View full image"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Proof Image Viewport */}
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              {payment.proof_image_url && !imageError ? (
                <img
                  src={payment.proof_image_url}
                  alt={`Payment proof for ${payment.billing_month}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="max-h-[460px] w-auto object-contain rounded-lg border border-slate-800 shadow-xl transition-transform duration-150 origin-center"
                />
              ) : (
                /* Fallback Container per Zero-Broken-Image Policy */
                <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900 border border-slate-800 rounded-xl max-w-sm">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    No Receipt Attached
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {payment.status === 'PENDING'
                      ? 'The tenant has not yet uploaded a transaction screenshot for this billing cycle.'
                      : 'Screenshot asset unavailable or verified via offline bank transfer.'}
                  </p>
                </div>
              )}
            </div>

            {/* File info pill */}
            {payment.proof_file_name && (
              <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 font-mono">
                {payment.proof_file_name}
              </div>
            )}
          </div>

          {/* Right Column: Breakdown & Verification Actions */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-slate-900/60 space-y-6">
            <div className="space-y-5">
              {/* Status Header */}
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Status
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      payment.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : payment.status === 'UNDER_REVIEW'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : payment.status === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {payment.status === 'PAID' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {payment.status === 'UNDER_REVIEW' && <AlertCircle className="w-3.5 h-3.5" />}
                    {payment.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                    {payment.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Cycle: {payment.billing_month}
                  </span>
                </div>
              </div>

              {/* Segregated Dues Breakdown Card */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-4 space-y-2.5">
                <div className="text-xs font-medium text-slate-300 border-b border-slate-700/60 pb-2">
                  Fee Segregation Breakdown
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Standard Room Rent</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {formatINR(payment.room_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">AC Utilities Rent</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {formatINR(payment.ac_amount)}
                  </span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex items-center justify-between text-sm font-semibold">
                  <span className="text-white">Total Dues</span>
                  <span className="font-mono text-indigo-400 tabular-nums">
                    {formatINR(payment.total_dues)}
                  </span>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="space-y-2 text-xs">
                {payment.transaction_ref && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Transaction Reference</span>
                    <span className="font-mono text-slate-200">{payment.transaction_ref}</span>
                  </div>
                )}
                {payment.payment_mode && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Payment Mode</span>
                    <span className="text-slate-200">{payment.payment_mode}</span>
                  </div>
                )}
                {payment.payment_date && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Payment Date</span>
                    <span className="text-slate-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {payment.payment_date}
                    </span>
                  </div>
                )}
                {payment.verified_by && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Verified By</span>
                    <span className="text-slate-200">{payment.verified_by}</span>
                  </div>
                )}
                {payment.notes && (
                  <div className="py-2">
                    <span className="text-slate-400 block mb-1">Notes:</span>
                    <p className="text-slate-300 italic bg-slate-950/40 p-2 rounded border border-slate-800/80">
                      "{payment.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Verification Feedback Input */}
              {payment.status !== 'PAID' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Verification Note / Audit Comment
                  </label>
                  <textarea
                    rows={2}
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="e.g. UTR matched with HDFC current account..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {payment.status !== 'PAID' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Payment
                  </button>
                  <button
                    onClick={() => {
                      if (!showRejectInput) {
                        setShowRejectInput(true);
                      } else {
                        handleReject();
                      }
                    }}
                    className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transaction verified & closed</span>
                  </div>
                  <button
                    onClick={() => onVerify(payment.payment_id, 'UNDER_REVIEW', 'Re-opened for audit')}
                    className="text-slate-400 hover:text-slate-200 underline text-xs"
                  >
                    Re-audit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
