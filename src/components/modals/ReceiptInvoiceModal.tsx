import React from 'react';
import { Payment, User, Room, Bed } from '../../types/hostel';
import { formatINR, formatReadableDate } from '../../utils/dateDiff';
import { X, Printer, Building2, CheckCircle2, Download, ShieldCheck } from 'lucide-react';

interface ReceiptInvoiceModalProps {
  payment: Payment | null;
  user: User | null;
  room: Room | null;
  bed: Bed | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptInvoiceModal: React.FC<ReceiptInvoiceModalProps> = ({
  payment,
  user,
  room,
  bed,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment || !user) return null;

  const handlePrint = () => window.print();

  const handleDownloadText = () => {
    const lines = [
      'ROYAL HEIGHTS PG HOSTEL',
      'Plot 42, Tech Corridor Rd, Pune, MH 411057',
      'support@royalheightspg.in | +91 98220 99887',
      '─'.repeat(52),
      `Receipt #       : ${payment.payment_id}`,
      `YouPI Order ID  : ${payment.youpi_order_id ?? 'N/A'}`,
      `Date            : ${payment.payment_date ?? 'Pending'}`,
      `Tenant          : ${user.name} (${user.user_id})`,
      `Room            : ${room?.room_number ?? 'N/A'} · ${bed?.bed_label ?? 'N/A'}`,
      `Period          : ${payment.billing_month}`,
      '─'.repeat(52),
      `Standard Room Rent : ${formatINR(payment.room_amount)}`,
      ...(payment.ac_amount > 0
        ? [`AC Utilities Rent  : ${formatINR(payment.ac_amount)}`]
        : []),
      '─'.repeat(52),
      `TOTAL DUE          : ${formatINR(payment.total_dues)} (${payment.amount_paise ?? payment.total_dues * 100} paise)`,
      '─'.repeat(52),
      `Payment Mode    : ${payment.payment_mode ?? 'N/A'}`,
      `Txn Ref / UTR   : ${payment.transaction_ref ?? 'N/A'}`,
      `YouPI Status    : ${payment.youpi_status ?? payment.status} (${payment.settlement_state ?? 'STANDARD'})`,
      `Status          : ${payment.status}`,
      '',
      'Verified & Recorded via YouPI-PG V2 — Royal Heights PG Hostel',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${payment.payment_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 print:hidden-overlay">
      <div
        className="relative w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-100 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Official Rent Receipt</span>
            <span
              className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                payment.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {payment.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadText}
              title="Download as text file"
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              .txt
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="printable-receipt"
          className="p-8 overflow-y-auto font-sans bg-white text-slate-900 space-y-6 flex-1"
        >
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-950">
                  ROYAL HEIGHTS PG HOSTEL
                </h1>
              </div>
              <p className="text-xs text-slate-500">Premium Student & Executive Accommodations</p>
              <p className="text-xs text-slate-500">Plot 42, Tech Corridor Rd, Pune, MH 411057</p>
              <p className="text-xs text-slate-500">
                +91 98220 99887 · support@royalheightspg.in
              </p>
            </div>
            <div className="text-right space-y-1.5">
              <span
                className={`inline-block px-3 py-1 text-xs font-bold rounded border ${
                  payment.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {payment.status === 'PAID' ? '✓ PAYMENT RECEIVED' : 'PROVISIONAL INVOICE'}
              </span>
              <div className="text-xs text-slate-600 space-y-0.5">
                <div>
                  Receipt #:{' '}
                  <strong className="font-mono text-slate-800">{payment.payment_id}</strong>
                </div>
                {payment.youpi_order_id && (
                  <div>
                    YouPI Order:{' '}
                    <strong className="font-mono text-indigo-700">{payment.youpi_order_id}</strong>
                  </div>
                )}
                <div>
                  Issued:{' '}
                  {payment.payment_date
                    ? formatReadableDate(payment.payment_date)
                    : new Date().toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Tenant Details
              </span>
              <div className="font-bold text-slate-900 text-sm">{user.name}</div>
              <div className="text-slate-600">
                ID: <span className="font-mono">{user.user_id}</span>
              </div>
              <div className="text-slate-600">Phone: {user.phone}</div>
              <div className="text-slate-600 break-all">Email: {user.email}</div>
              {user.workplace_or_college && (
                <div className="text-slate-600">Org: {user.workplace_or_college}</div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Stay & Allocation
              </span>
              <div className="font-bold text-slate-900 text-sm">
                Room {room?.room_number} ({bed?.bed_label})
              </div>
              <div className="text-slate-600">
                Floor {room?.floor} · {room?.is_ac ? 'Air Conditioned (AC)' : 'Standard Non-AC'}
              </div>
              <div className="text-slate-600">
                Billing Cycle: <strong className="text-slate-800">{payment.billing_month}</strong>
              </div>
              <div className="text-slate-600">
                Joined: {formatReadableDate(user.joining_date)}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-[55%]">Description</th>
                  <th className="py-2.5 px-4">Billing Period</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">Standard Room Rent</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Accommodation · Housekeeping · Security · Water · Wi-Fi
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{payment.billing_month}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatINR(payment.room_amount)}
                  </td>
                </tr>
                {payment.ac_amount > 0 && (
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        AC Utilities & Maintenance Rent
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Dedicated split-AC electricity quota & compressor maintenance
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{payment.billing_month}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {formatINR(payment.ac_amount)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td
                    colSpan={2}
                    className="py-3 px-4 text-sm font-bold text-slate-900"
                  >
                    Total Amount {payment.status === 'PAID' ? 'Paid' : 'Due'}
                  </td>
                  <td className="py-3 px-4 text-right text-base font-bold font-mono text-indigo-700 tabular-nums">
                    {formatINR(payment.total_dues)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2 border-t border-dashed border-slate-200">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div>
                Payment Mode: <strong className="text-slate-800">{payment.payment_mode ?? 'N/A'}</strong>
              </div>
              <div>
                Transaction Ref / UTR:{' '}
                <span className="font-mono text-slate-800">{payment.transaction_ref ?? 'N/A'}</span>
              </div>
              {payment.youpi_status && (
                <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    YouPI-PG Settlement: {payment.youpi_status} ({payment.settlement_state})
                  </span>
                </div>
              )}
              {payment.verified_by && (
                <div>
                  Verified by: <strong className="text-slate-800">{payment.verified_by}</strong>
                  {payment.verification_date && (
                    <span className="text-slate-500"> on {formatReadableDate(payment.verification_date)}</span>
                  )}
                </div>
              )}
              {payment.notes && (
                <div className="italic text-slate-500 max-w-xs">"{payment.notes}"</div>
              )}
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mt-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified & Recorded in Relational Ledger
              </div>
            </div>

            <div className="text-center shrink-0">
              <div className="w-36 h-12 border-b-2 border-slate-300 flex items-end justify-center pb-1">
                <span className="text-[10px] text-slate-300 italic">Signature</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-slate-700">PG Management Office</div>
              <div className="text-[10px] text-slate-400">Royal Heights PG Hostel</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 text-center">
            This is a computer-generated receipt powered by YouPI-PG V2 Sovereign UPI Infrastructure.
            Rent is due by the 5th of every calendar month.
          </div>
        </div>
      </div>
    </div>
  );
};
