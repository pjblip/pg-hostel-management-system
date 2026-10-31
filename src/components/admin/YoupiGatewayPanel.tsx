import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import { formatINR } from '../../utils/dateDiff';
import { generateSampleBankStatementCsv, verifyWebhookSignature } from '../../utils/youpiCore';
import {
  ShieldCheck,
  QrCode,
  FileSpreadsheet,
  Webhook,
  Settings,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Smartphone,
  Mail,
  MessageSquare,
  Play,
  Copy,
  Check,
  RefreshCw,
  Banknote,
  Lock,
  Sparkles,
} from 'lucide-react';

export const YoupiGatewayPanel: React.FC = () => {
  const {
    youpiConfig,
    updateYoupiConfig,
    youpiSessions,
    youpiWebhooks,
    reconcileBankStatementCsv,
    processYoupiOutcome,
    setActiveCheckoutSession,
  } = useHostel();

  const [activeSubTab, setActiveSubTab] = useState<
    'reconcile' | 'sessions' | 'webhooks' | 'config'
  >('reconcile');

  // Statement CSV state
  const [csvInput, setCsvInput] = useState<string>(() =>
    generateSampleBankStatementCsv(youpiSessions, youpiConfig.payeeVpa)
  );
  const [reconcileResult, setReconcileResult] = useState<ReturnType<
    typeof reconcileBankStatementCsv
  > | null>(null);

  // Config form state
  const [cfgSaved, setCfgSaved] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Metrics
  const reconciledSessions = youpiSessions.filter((s) => s.status === 'RECONCILED' || s.status === 'SUCCESS');
  const observedPendingSessions = youpiSessions.filter((s) => s.status === 'OBSERVED_SUCCESS');
  const manualReviewSessions = youpiSessions.filter((s) => s.status === 'MANUAL_REVIEW');
  const totalReconciledVolume = reconciledSessions.reduce(
    (sum, s) => sum + Math.round(s.amountPaise / 100),
    0
  );
  const totalObservedVolume = observedPendingSessions.reduce(
    (sum, s) => sum + Math.round(s.amountPaise / 100),
    0
  );

  const handleLoadSampleCsv = () => {
    const sample = generateSampleBankStatementCsv(youpiSessions, youpiConfig.payeeVpa);
    setCsvInput(sample);
    setReconcileResult(null);
  };

  const handleRunReconciliation = () => {
    const res = reconcileBankStatementCsv(csvInput);
    setReconcileResult(res);
  };

  const embedSnippet = `<!-- Official YOUPI PG V2 Universal One-Script Integration -->
<script
  src="${youpiConfig.portalUrl}/youpi.js"
  data-youpi-key="${youpiConfig.merchantId}"
  data-name="${youpiConfig.merchantName}"
  data-currency="INR">
</script>

<!-- Declarative Hostel Rent Payment Button -->
<button
  data-youpi-pay
  data-order-id="PG-ORD-2026-089"
  data-amount="9500.00"
  data-customer-name="Pushkar Joshi"
  data-customer-phone="9823045678">
  Pay Hostel Rent (₹9,500) via YouPI PG
</button>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            YouPI-PG V2 Sovereign Payment Gateway Engine
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            0% Fee Direct-to-Bank UPI Gateway & Statement Reconciliation Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Receiving VPA:{' '}
            <span className="font-mono text-emerald-400 font-semibold">
              {youpiConfig.payeeVpa}
            </span>{' '}
            · Single-Slot FIFO Queue · Tri-Channel Observation Mesh · HMAC-SHA256 Webhooks
          </p>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {(
            [
              { id: 'reconcile', label: 'Statement CSV Reconcile', icon: FileSpreadsheet },
              { id: 'sessions', label: `Sessions & Till (${youpiSessions.length})`, icon: QrCode },
              { id: 'webhooks', label: `Webhooks (${youpiWebhooks.length})`, icon: Webhook },
              { id: 'config', label: 'Gateway Config & SDK', icon: Settings },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reconciled & Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatINR(totalReconciledVolume)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {reconciledSessions.length} sessions (`RECONCILED` / `SUCCESS`)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Observed (Unreconciled)</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {formatINR(totalObservedVolume)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {observedPendingSessions.length} `OBSERVED_SUCCESS` awaiting CSV
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tri-Channel Observers</span>
            <Smartphone className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> APK Online
            </span>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
              <Mail className="w-3 h-3" /> Gmail OAuth
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Single-Slot FIFO VPA Queue: Ready
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Signed Webhook Outbox</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            {youpiWebhooks.length} Events
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {manualReviewSessions.length} held in `MANUAL_REVIEW`
          </p>
        </div>
      </div>

      {/* ── SUB-TAB 1: BANK STATEMENT CSV RECONCILIATION ── */}
      {activeSubTab === 'reconcile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Bank Statement CSV Import & Reconciliation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Matches `OBSERVED_SUCCESS` sessions on VPA + integer paise + 12-digit UTR to emit `RECONCILED`
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Sample Statement CSV
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Paste Operator-Downloaded Bank Statement CSV (HDFC / ICICI / SBI Format)
              </label>
              <textarea
                rows={7}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Required columns: <code className="text-slate-300">Date</code>,{' '}
                <code className="text-slate-300">Narration</code>,{' '}
                <code className="text-slate-300">Deposit Amt. / Credit</code>
              </span>
              <button
                type="button"
                onClick={handleRunReconciliation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Statement Reconciliation
              </button>
            </div>

            {reconcileResult && (
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in">
                {reconcileResult.error ? (
                  <div className="text-xs text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{reconcileResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-semibold text-white">
                        Reconciliation Summary ({reconcileResult.totalLines} rows processed)
                      </span>
                      <div className="flex gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Reconciled: {reconcileResult.reconciledCount}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Conflicts: {reconcileResult.conflictCount}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Unmatched: {reconcileResult.unmatchedCount}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {reconcileResult.details.map((d, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white">
                                UTR: {d.utr}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono text-emerald-400">₹{d.amountRupees}</span>
                              {d.tenantName && (
                                <span className="text-indigo-300 font-medium">
                                  ({d.tenantName} · {d.orderId})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{d.reason}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              d.outcome === 'RECONCILED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : d.outcome === 'CONFLICT'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {d.outcome}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Pending OBSERVED_SUCCESS Queue */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Sessions Awaiting Statement Reconciliation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Per YouPI-PG V2 contract, observer matches (`OBSERVED_SUCCESS`) have `settlementState: NOT_RECONCILED` until matched to a bank statement line.
              </p>
            </div>

            {observedPendingSessions.length === 0 && manualReviewSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                All observed UPI sessions are reconciled!
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...observedPendingSessions, ...manualReviewSessions].map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {s.tenantName}{' '}
                        <span className="text-slate-400 font-mono">(Room {s.roomNumber})</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {s.status} · {s.settlementState}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Order: {s.orderId}</span>
                      <span>UTR: {s.utr || 'Pending'}</span>
                      <span className="text-white font-bold">₹{s.amount}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          processYoupiOutcome(s.id, 'RECONCILED', {
                            utr: s.utr,
                            source: 'BANK_STATEMENT_CSV',
                          })
                        }
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Reconcile & Mark PAID
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: LIVE SESSIONS & CASHIER TILL DOCK ── */}
      {activeSubTab === 'sessions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                YouPI-PG Payment Sessions & Cashier Counter Till
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live view of all UPI QR, Counter Cash, and POS Card sessions across tenants
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID / Session</th>
                  <th className="py-3 px-4">Tenant & Cycle</th>
                  <th className="py-3 px-4 text-right">Amount (Paise)</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Gateway Status</th>
                  <th className="py-3 px-4">Settlement State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {youpiSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-white">{s.orderId}</div>
                      <div className="text-[10px] text-slate-500">{s.id}</div>
                      {s.utr && (
                        <div className="text-[10px] text-indigo-400">UTR: {s.utr}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">
                        {s.tenantName} (Room {s.roomNumber})
                      </div>
                      <div className="text-[11px] text-slate-400">{s.billingMonth}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-semibold text-white">₹{s.amount}</div>
                      <div className="text-[10px] text-slate-500">{s.amountPaise}p</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">{s.method}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'RECONCILED' || s.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : s.status === 'OBSERVED_SUCCESS'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : s.status === 'MANUAL_REVIEW'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {s.settlementState}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveCheckoutSession(s)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700"
                        >
                          Open Modal
                        </button>
                        {s.status !== 'RECONCILED' && s.status !== 'SUCCESS' && (
                          <button
                            onClick={() =>
                              processYoupiOutcome(
                                s.id,
                                s.method === 'UPI' ? 'RECONCILED' : 'SUCCESS',
                                {
                                  utr: s.utr || '928491823999',
                                  source:
                                    s.method === 'UPI'
                                      ? 'BANK_STATEMENT_CSV'
                                      : 'MANUAL_COUNTER',
                                }
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          >
                            {s.method === 'UPI' ? 'Reconcile' : 'Approve Counter'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: SIGNED WEBHOOK OUTBOX & HMAC INSPECTOR ── */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-400" />
              HMAC-SHA256 Signed Server-to-Server Webhook Outbox
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every state transition queues a durable webhook signed with{' '}
              <code className="text-indigo-300">HMAC-SHA256(webhookSecret, rawBody)</code> and{' '}
              <code className="text-indigo-300">X-Gateway-Signature-V2</code>.
            </p>
          </div>

          <div className="space-y-3">
            {youpiWebhooks.map((wh) => {
              const liveVerified = verifyWebhookSignature(
                wh.rawPayload,
                youpiConfig.webhookSecret,
                wh.signature
              );
              return (
                <div
                  key={wh.deliveryId}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        X-Gateway-Event: {wh.event}
                      </span>
                      <span className="font-mono text-slate-400">
                        Order: <strong className="text-white">{wh.orderId}</strong>
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        ₹{wh.amount} ({wh.amountPaise}p)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          liveVerified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {liveVerified ? 'HMAC-SHA256 Verified (timingSafeEqual)' : 'Signature Mismatch'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="truncate">
                      <span className="text-slate-500">X-Gateway-Delivery-Id:</span>{' '}
                      <span className="text-slate-200">{wh.deliveryId}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">X-Gateway-Timestamp:</span>{' '}
                      <span className="text-slate-200">{wh.timestamp}</span>
                    </div>
                    <div className="truncate md:col-span-2">
                      <span className="text-slate-500">X-Gateway-Signature:</span>{' '}
                      <span className="text-emerald-400">{wh.signature}</span>
                    </div>
                    <div className="truncate md:col-span-2">
                      <span className="text-slate-500">X-Gateway-Signature-V2:</span>{' '}
                      <span className="text-sky-400">{wh.signatureV2}</span>
                    </div>
                  </div>

                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(JSON.parse(wh.rawPayload), null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: GATEWAY CONFIGURATION & UNIVERSAL SDK EMBED ── */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                YouPI-PG V2 Merchant & Receiving VPA Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure receiving UPI ID, webhook HMAC secret, and observer fulfillment policy
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Integration Execution Mode
                </label>
                <select
                  value={youpiConfig.mode}
                  onChange={(e) =>
                    updateYoupiConfig({ mode: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="HYBRID_AUTO">
                    Hybrid Auto (Vite Middleware + Embedded YouPI-PG V2 Modal)
                  </option>
                  <option value="LIVE_SERVER">
                    External YouPI-PG Microservices (localhost:6100 API & :7000 Portal)
                  </option>
                  <option value="EMBEDDED_LOCAL">
                    Standalone Embedded Browser Engine
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Active Receiving UPI VPA
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.payeeVpa}
                    onChange={(e) => updateYoupiConfig({ payeeVpa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Payee / Hostel Display Name
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.merchantName}
                    onChange={(e) => updateYoupiConfig({ merchantName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Merchant UUID (`X-Merchant-Id`)
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.merchantId}
                    onChange={(e) => updateYoupiConfig({ merchantId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    HMAC Webhook Secret
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.webhookSecret}
                    onChange={(e) => updateYoupiConfig({ webhookSecret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-amber-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Payment API URL (Port 6100)
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.apiUrl}
                    onChange={(e) => updateYoupiConfig({ apiUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Checkout Portal URL (Port 7000)
                  </label>
                  <input
                    type="text"
                    value={youpiConfig.portalUrl}
                    onChange={(e) => updateYoupiConfig({ portalUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={youpiConfig.requireWhatsappOtp}
                    onChange={(e) =>
                      updateYoupiConfig({ requireWhatsappOtp: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-slate-200 font-medium">
                    Enforce WhatsApp Berry 6-Digit OTP before UPI Slot Activation
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={youpiConfig.autoFulfillOnObserver}
                    onChange={(e) =>
                      updateYoupiConfig({ autoFulfillOnObserver: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-slate-200 font-medium">
                    Auto-Mark Rent PAID on `OBSERVED_SUCCESS` (Skip mandatory Bank Statement CSV step)
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCfgSaved(true);
                    setTimeout(() => setCfgSaved(false), 2000);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {cfgSaved ? 'Configuration Saved!' : 'Save Gateway Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Universal One-Script Integration Preview */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Universal One-Script Integration (`youpi.js`)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bundled at <code className="text-indigo-300">/youpi.js</code> and pre-loaded in <code className="text-indigo-300">index.html</code>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied' : 'Copy Snippet'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-200 overflow-x-auto leading-relaxed">
              {embedSnippet}
            </pre>

            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Active Integration Endpoints
              </div>
              <div className="font-mono text-[11px] space-y-1 text-slate-400">
                <div>• POST <span className="text-slate-200">/api/v1/payments</span> — Create YouPI-PG session</div>
                <div>• GET <span className="text-slate-200">/checkout/:id/qr.svg</span> — Dynamic ISO 18004 Vector SVG QR</div>
                <div>• POST <span className="text-slate-200">/api/youpi/webhook</span> — HMAC-SHA256 Verified Webhook Receiver</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
