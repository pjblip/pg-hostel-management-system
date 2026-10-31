import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import { MaintenanceRequest } from '../../types/hostel';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  MessageSquare 
} from 'lucide-react';

export const MaintenanceQueueView: React.FC = () => {
  const { maintenance, updateMaintenanceStatus, users } = useHostel();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeModalTicket, setActiveModalTicket] = useState<MaintenanceRequest | null>(null);
  const [resolutionText, setResolutionText] = useState<string>('');
  const [modalNewStatus, setModalNewStatus] = useState<MaintenanceRequest['status']>('RESOLVED');

  const filteredTickets = maintenance.filter((m) => {
    if (filterStatus === 'ALL') return true;
    return m.status === filterStatus;
  });

  const getUserName = (userId: string) => {
    const u = users.find((x) => x.user_id === userId);
    return u ? `${u.name} (${u.phone})` : userId;
  };

  const handleOpenUpdate = (ticket: MaintenanceRequest) => {
    setActiveModalTicket(ticket);
    setResolutionText(ticket.resolution_note || '');
    setModalNewStatus(ticket.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS');
  };

  const handleSaveTicket = () => {
    if (!activeModalTicket) return;
    updateMaintenanceStatus(activeModalTicket.request_id, modalNewStatus, resolutionText);
    setActiveModalTicket(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            Hostel Maintenance & Facility Tickets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time queue for AC repair, electrical, plumbing, and room issues
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Cards */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
            No maintenance tickets in this category.
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div
              key={t.request_id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      t.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    Room {t.room_number} · {t.category}
                  </span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400">{t.reported_date}</span>
                  {t.urgency === 'HIGH' && (
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 rounded font-semibold">
                      High Urgency
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  {t.description}
                </p>

                <div className="text-[11px] text-slate-400">
                  Reported by: <span className="text-slate-200">{getUserName(t.user_id)}</span>
                </div>

                {t.resolution_note && (
                  <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-emerald-400 font-mono">
                    Supervisor Note: {t.resolution_note}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => handleOpenUpdate(t)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Update Modal */}
      {activeModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Update Ticket: Room {activeModalTicket.room_number}
              </h3>
              <button
                onClick={() => setActiveModalTicket(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Status</label>
                <select
                  value={modalNewStatus}
                  onChange={(e) => setModalNewStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Supervisor Resolution Note</label>
                <textarea
                  rows={3}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="e.g. Electrician fixed relay; test run complete."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setActiveModalTicket(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTicket}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
