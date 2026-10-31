import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import { Worker, WorkerRole, AttendanceStatus } from '../../types/hostel';
import { formatINR, formatReadableDate } from '../../utils/dateDiff';
import {
  Users, UserPlus, Trash2, ChevronDown, ChevronUp,
  Calendar, X, Pencil,
} from 'lucide-react';

const ROLES: WorkerRole[] = ['Cleaner', 'Electrician', 'Plumber', 'Security', 'Cook', 'Manager', 'Other'];

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'PRESENT',  label: 'Present',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'ABSENT',   label: 'Absent',   color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'HALF_DAY', label: 'Half Day', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'LEAVE',    label: 'Leave',    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
];

const statusColor = (s: AttendanceStatus) =>
  ATTENDANCE_OPTIONS.find((o) => o.value === s)?.color ?? 'text-slate-400';

const emptyForm = (): Omit<Worker, 'worker_id'> => ({
  name: '', phone: '', role: 'Cleaner', salary: 0,
  joining_date: new Date().toISOString().split('T')[0],
  status: 'ACTIVE', notes: '',
});

export const StaffPanel: React.FC = () => {
  const { workers, addWorker, updateWorker, removeWorker, markAttendance, getWorkerAttendance } = useHostel();

  const [showAddForm, setShowAddForm]   = useState(false);
  const [editingId,  setEditingId]      = useState<string | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Worker, 'worker_id'>>(emptyForm());
  const [formErrors, setFormErrors]     = useState<Record<string, string>>({});

  // Attendance state
  const [attDate,   setAttDate]   = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('PRESENT');
  const [attNote,   setAttNote]   = useState('');

  const activeWorkers   = workers.filter((w) => w.status === 'ACTIVE');
  const inactiveWorkers = workers.filter((w) => w.status === 'INACTIVE');

  // ── form helpers ──────────────────────────────────────────────────────────
  const set = (k: keyof typeof form, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^\+?[\d\s\-]{8,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (form.salary < 0) e.salary = 'Salary cannot be negative';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    const payload = { ...form, salary: Number(form.salary) || 0 };
    if (editingId) {
      updateWorker(editingId, payload);
      setEditingId(null);
    } else {
      addWorker(payload);
    }
    setForm(emptyForm());
    setShowAddForm(false);
  };

  const startEdit = (w: Worker) => {
    setForm({ name: w.name, phone: w.phone, role: w.role, salary: w.salary, joining_date: w.joining_date, status: w.status, notes: w.notes ?? '' });
    setEditingId(w.worker_id);
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setForm(emptyForm()); setFormErrors({});
    setEditingId(null); setShowAddForm(false);
  };

  const handleMarkAttendance = (workerId: string) => {
    markAttendance({ worker_id: workerId, date: attDate, status: attStatus, note: attNote.trim() || undefined });
    setAttNote('');
  };

  const fieldCls = (k: string) =>
    `w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 transition-colors ${
      formErrors[k] ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'
    }`;

  // ── Today attendance summary ──────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = workers.reduce<Record<string, AttendanceStatus>>((acc, w) => {
    const rec = getWorkerAttendance(w.worker_id).find((a) => a.date === todayStr);
    if (rec) acc[w.worker_id] = rec.status;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Staff & Worker Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage hostel staff, track daily attendance, and record salaries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick stats */}
          <div className="flex gap-2 text-xs">
            <span className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-medium">
              {activeWorkers.length} Active
            </span>
            {inactiveWorkers.length > 0 && (
              <span className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg font-medium">
                {inactiveWorkers.length} Inactive
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setEditingId(null); setForm(emptyForm()); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit Staff Member' : 'Enroll New Staff Member'}
            </h3>
            <button onClick={cancelForm} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Full Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" className={fieldCls('name')} />
              {formErrors.name && <p className="text-rose-400 mt-1 text-[10px]">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Phone *</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" className={fieldCls('phone')} />
              {formErrors.phone && <p className="text-rose-400 mt-1 text-[10px]">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)} className={fieldCls('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Monthly Salary (₹)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 12000"
                value={form.salary === 0 ? '' : form.salary}
                onChange={(e) => set('salary', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                className={`${fieldCls('salary')} font-mono`}
              />
              {formErrors.salary && <p className="text-rose-400 mt-1 text-[10px]">{formErrors.salary}</p>}
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Joining Date</label>
              <input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} className={fieldCls('joining_date')} />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={fieldCls('status')}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive / Left</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-medium block mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Works evening shift, experienced plumber" className={fieldCls('notes')} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={cancelForm} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                {editingId ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today's attendance quick-mark bar */}
      {workers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Mark Today's Attendance
            </div>
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <select value={attStatus} onChange={(e) => setAttStatus(e.target.value as AttendanceStatus)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {ATTENDANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={attNote} onChange={(e) => setAttNote(e.target.value)} placeholder="Note (optional)"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32 hidden sm:block" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {activeWorkers.map((w) => {
              const rec = todayRecords[w.worker_id];
              return (
                <button key={w.worker_id} onClick={() => handleMarkAttendance(w.worker_id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:border-indigo-500/60 ${
                    rec ? statusColor(rec) : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}>
                  <span className="truncate">{w.name}</span>
                  <span className="text-[10px] shrink-0">{rec ?? '—'}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">Click a name to mark with selected status. Click again to change.</p>
        </div>
      )}

      {/* Worker Cards */}
      {workers.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No staff members added yet</p>
          <p className="text-xs text-slate-500 mt-1">Click "Add Staff" to enroll your first worker</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...activeWorkers, ...inactiveWorkers].map((w) => {
            const isExpanded = expandedId === w.worker_id;
            const history = getWorkerAttendance(w.worker_id).slice(0, 14);
            const thisMonth = history.filter((a) => a.date.startsWith(new Date().toISOString().slice(0, 7)));
            const presentDays = thisMonth.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;

            return (
              <div key={w.worker_id} className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${
                w.status === 'INACTIVE' ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700'
              }`}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    w.status === 'ACTIVE' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{w.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{w.worker_id}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        w.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>{w.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-medium text-sky-400">{w.role}</span>
                      <span>{w.phone}</span>
                      <span>Joined {formatReadableDate(w.joining_date)}</span>
                      <span className="font-mono text-slate-300">{formatINR(w.salary)}/mo</span>
                    </div>
                    {w.notes && <p className="text-[11px] text-slate-500 mt-0.5 italic truncate">{w.notes}</p>}
                  </div>

                  <div className="hidden sm:flex flex-col items-center px-3 border-l border-slate-800 shrink-0">
                    <span className="text-lg font-bold font-mono text-white tabular-nums">{presentDays}</span>
                    <span className="text-[10px] text-slate-500">days this mo.</span>
                  </div>

                  {todayRecords[w.worker_id] && (
                    <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${statusColor(todayRecords[w.worker_id])}`}>
                      Today: {todayRecords[w.worker_id]}
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(w)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(w.worker_id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : w.worker_id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-3 bg-slate-950/40">
                    <div className="text-xs font-semibold text-slate-300">Last 14 Attendance Records</div>
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No attendance recorded yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {history.map((a) => (
                          <div key={a.record_id} className={`p-2 rounded-lg border text-center text-[10px] font-medium ${statusColor(a.status)}`}>
                            <div className="font-mono">{a.date.slice(5)}</div>
                            <div className="mt-0.5">{a.status === 'PRESENT' ? '✓' : a.status === 'ABSENT' ? '✗' : a.status === 'HALF_DAY' ? '½' : 'L'}</div>
                            {a.note && <div className="text-[9px] opacity-70 mt-0.5 truncate">{a.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (() => {
        const w = workers.find((x) => x.worker_id === deleteConfirm);
        if (!w) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Remove Staff Member?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This will also delete all attendance records for this worker.</p>
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <div className="text-white font-medium">{w.name} <span className="text-slate-400 font-mono">({w.worker_id})</span></div>
                <div className="text-slate-400">{w.role} · {formatINR(w.salary)}/mo</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => { removeWorker(w.worker_id); setDeleteConfirm(null); }}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
