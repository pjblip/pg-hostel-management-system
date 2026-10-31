import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import { Room, Bed, OccupancyStatus } from '../../types/hostel';
import { formatINR } from '../../utils/dateDiff';
import {
  BedDouble, Wind, CheckCircle2, ArrowRightLeft, X, AlertCircle,
  PlusCircle, Pencil, Trash2, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────
const emptyRoom = (): Omit<Room, 'room_id'> => ({
  room_number: '', floor: 1, is_ac: false, capacity: 2,
});
const emptyBed = (roomId: string): Omit<Bed, 'bed_id'> => ({
  room_id: roomId, bed_label: '', monthly_room_rent: 0, monthly_ac_rent: 0, occupancy_status: 'VACANT',
});

export const RoomAllocationView: React.FC = () => {
  const {
    rooms, beds, stays, users,
    updateBedStatus, allocateBed,
    addRoom, updateRoom, deleteRoom,
    addBed, updateBed, deleteBed,
  } = useHostel();

  // ── filter + realloc state ─────────────────────────────────────────────
  const [selectedFloor, setSelectedFloor]     = useState<number | 'ALL'>('ALL');
  const [editingBedId,  setEditingBedId]       = useState<string | null>(null);
  const [newStatus,     setNewStatus]          = useState<OccupancyStatus>('VACANT');
  const [reallocBedId,  setReallocBedId]       = useState<string | null>(null);
  const [reallocTarget, setReallocTarget]      = useState<string>('');

  // ── room modal state ───────────────────────────────────────────────────
  const [roomModal, setRoomModal]   = useState<'add' | 'edit' | null>(null);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [roomForm,  setRoomForm]    = useState<Omit<Room, 'room_id'>>(emptyRoom());
  const [roomErr,   setRoomErr]     = useState('');
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  // ── bed modal state ────────────────────────────────────────────────────
  const [bedModal,     setBedModal]    = useState<'add' | 'edit' | null>(null);
  const [bedParentId,  setBedParentId] = useState<string>('');
  const [editBedId,    setEditBedId]   = useState<string | null>(null);
  const [bedForm,      setBedForm]     = useState<Omit<Bed, 'bed_id'>>(emptyBed(''));
  const [bedErr,       setBedErr]      = useState('');
  const [deleteBedId,  setDeleteBedId] = useState<string | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  // ── derived ────────────────────────────────────────────────────────────
  const floors = [...new Set(rooms.map((r) => r.floor))].sort();
  const filteredRooms = selectedFloor === 'ALL' ? rooms : rooms.filter((r) => r.floor === selectedFloor);
  const bedsForRoom   = (roomId: string) => beds.filter((b) => b.room_id === roomId);
  const occupantForBed = (bedId: string) => {
    const stay = stays.find((s) => s.bed_id === bedId && s.end_date === null);
    return stay ? users.find((u) => u.user_id === stay.user_id) ?? null : null;
  };
  const stayForBed = (bedId: string) => stays.find((s) => s.bed_id === bedId && s.end_date === null) ?? null;

  // ── summary stats ──────────────────────────────────────────────────────
  const totalBeds    = beds.length;
  const occupiedBeds = beds.filter((b) => b.occupancy_status === 'OCCUPIED').length;
  const vacantBeds   = beds.filter((b) => b.occupancy_status === 'VACANT').length;
  const reservedBeds = beds.filter((b) => b.occupancy_status === 'RESERVED').length;
  const maintBeds    = beds.filter((b) => b.occupancy_status === 'MAINTENANCE').length;

  // ── Room CRUD handlers ─────────────────────────────────────────────────
  const openAddRoom = () => {
    setRoomForm(emptyRoom()); setRoomErr(''); setEditRoomId(null); setRoomModal('add');
  };
  const openEditRoom = (r: Room) => {
    setRoomForm({ room_number: r.room_number, floor: r.floor, is_ac: r.is_ac, capacity: r.capacity });
    setEditRoomId(r.room_id); setRoomErr(''); setRoomModal('edit');
  };
  const submitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.room_number.trim()) { setRoomErr('Room number is required'); return; }
    const normalizedRoom = {
      ...roomForm,
      floor: Number(roomForm.floor) || 1,
      capacity: Number(roomForm.capacity) || 1,
    };
    if (roomModal === 'edit' && editRoomId) updateRoom(editRoomId, normalizedRoom);
    else addRoom(normalizedRoom);
    setRoomModal(null);
  };
  const confirmDeleteRoom = (roomId: string) => {
    const ok = deleteRoom(roomId);
    if (!ok) alert('Cannot delete a room that has occupied beds. Please checkout or reassign tenants first.');
    setDeleteRoomId(null);
  };

  // ── Bed CRUD handlers ──────────────────────────────────────────────────
  const openAddBed = (roomId: string) => {
    setBedForm(emptyBed(roomId)); setBedErr(''); setEditBedId(null); setBedParentId(roomId); setBedModal('add');
  };
  const openEditBed = (b: Bed) => {
    setBedForm({ room_id: b.room_id, bed_label: b.bed_label, monthly_room_rent: b.monthly_room_rent, monthly_ac_rent: b.monthly_ac_rent, occupancy_status: b.occupancy_status });
    setEditBedId(b.bed_id); setBedErr(''); setBedModal('edit');
  };
  const submitBed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForm.bed_label.trim()) { setBedErr('Bed label is required'); return; }
    const normalizedBed = {
      ...bedForm,
      monthly_room_rent: Number(bedForm.monthly_room_rent) || 0,
      monthly_ac_rent: Number(bedForm.monthly_ac_rent) || 0,
    };
    if (bedModal === 'edit' && editBedId) updateBed(editBedId, normalizedBed);
    else addBed(normalizedBed);
    setBedModal(null);
  };
  const confirmDeleteBed = (bedId: string) => {
    const ok = deleteBed(bedId);
    if (!ok) alert('Cannot delete an occupied bed. Checkout the tenant first.');
    setDeleteBedId(null);
  };

  // ── Reallocation ───────────────────────────────────────────────────────
  const openRealloc = (bedId: string) => { setReallocBedId(bedId); setReallocTarget(''); };
  const confirmRealloc = () => {
    const stay = stayForBed(reallocBedId!);
    if (stay) allocateBed(stay.stay_id, reallocTarget);
    setReallocBedId(null);
  };
  const vacantForRealloc = beds.filter((b) => b.occupancy_status === 'VACANT' && b.bed_id !== reallocBedId);

  const fieldCls = (err?: boolean) =>
    `w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 transition-colors ${
      err ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-indigo-500'
    }`;

  return (
    <div className="space-y-6">
      {/* Header + Add Room CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-indigo-400" />
            Room &amp; Bed Allocation Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create rooms, add or remove beds, set rents, and manage tenant assignments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Floor filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setSelectedFloor('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedFloor === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({rooms.length})
            </button>
            {floors.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  selectedFloor === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Floor {f}
              </button>
            ))}
          </div>

          <button
            onClick={openAddRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Room
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Beds',  value: totalBeds,    color: 'text-white',       bg: 'border-slate-800' },
          { label: 'Occupied',    value: occupiedBeds, color: 'text-indigo-400',  bg: 'border-indigo-500/20' },
          { label: 'Vacant',      value: vacantBeds,   color: 'text-emerald-400', bg: 'border-emerald-500/20' },
          { label: 'Reserved',    value: reservedBeds, color: 'text-amber-400',   bg: 'border-amber-500/20' },
          { label: 'Maintenance', value: maintBeds,    color: 'text-rose-400',    bg: 'border-rose-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`bg-slate-900 border ${bg} rounded-xl p-4`}>
            <span className="text-xs text-slate-400">{label}</span>
            <div className={`mt-1 text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Room cards */}
      {filteredRooms.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-12 text-center">
          <BedDouble className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No rooms created yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Click "Add Room" above to create your first room</p>
          <button onClick={openAddRoom} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" /> Add Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const roomBeds  = bedsForRoom(room.room_id);
            const occupied  = roomBeds.filter((b) => b.occupancy_status === 'OCCUPIED').length;
            const isExpanded = expandedRoomId === room.room_id;

            return (
              <div key={room.room_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                {/* Room header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs font-mono shrink-0">
                      {room.room_number}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        Room {room.room_number}
                        {room.is_ac && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                            <Wind className="w-2.5 h-2.5" /> AC
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Floor {room.floor} · Cap {room.capacity} · {roomBeds.length} bed{roomBeds.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded mr-1 ${
                      occupied === roomBeds.length && roomBeds.length > 0
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {occupied}/{roomBeds.length}
                    </span>
                    <button onClick={() => openEditRoom(room)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Edit Room">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteRoomId(room.room_id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Delete Room">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setExpandedRoomId(isExpanded ? null : room.room_id)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Manage Beds">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Beds list */}
                <div className="p-4 space-y-3 flex-1">
                  {roomBeds.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No beds in this room yet.
                    </div>
                  ) : roomBeds.map((bed) => {
                    const occupant  = occupantForBed(bed.bed_id);
                    const isEditing = editingBedId === bed.bed_id;

                    return (
                      <div key={bed.bed_id} className={`p-3.5 rounded-lg border transition-all ${
                        bed.occupancy_status === 'OCCUPIED'    ? 'bg-slate-950/60 border-slate-800' :
                        bed.occupancy_status === 'VACANT'      ? 'bg-emerald-950/20 border-emerald-500/30' :
                        bed.occupancy_status === 'RESERVED'    ? 'bg-amber-950/20 border-amber-500/30' :
                                                                  'bg-rose-950/20 border-rose-500/30'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BedDouble className={`w-4 h-4 shrink-0 ${
                              bed.occupancy_status === 'OCCUPIED'    ? 'text-indigo-400' :
                              bed.occupancy_status === 'VACANT'      ? 'text-emerald-400' :
                              bed.occupancy_status === 'RESERVED'    ? 'text-amber-400' : 'text-rose-400'
                            }`} />
                            <span className="text-xs font-semibold text-white truncate">{bed.bed_label}</span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">({bed.bed_id})</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              bed.occupancy_status === 'OCCUPIED'   ? 'bg-slate-800 text-slate-300' :
                              bed.occupancy_status === 'VACANT'     ? 'bg-emerald-500/20 text-emerald-400' :
                              bed.occupancy_status === 'RESERVED'   ? 'bg-amber-500/20 text-amber-400' :
                                                                      'bg-rose-500/20 text-rose-400'
                            }`}>{bed.occupancy_status}</span>
                            {bed.occupancy_status !== 'OCCUPIED' && (
                              <>
                                <button onClick={() => openEditBed(bed)} className="p-1 text-slate-500 hover:text-indigo-400 transition-colors" title="Edit bed">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => setDeleteBedId(bed.bed_id)} className="p-1 text-slate-500 hover:text-rose-400 transition-colors" title="Delete bed">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 text-[11px] text-slate-400 flex justify-between">
                          <span>Room: {formatINR(bed.monthly_room_rent)}{bed.monthly_ac_rent > 0 ? ` + AC: ${formatINR(bed.monthly_ac_rent)}` : ''}</span>
                          <span className="font-mono text-slate-300">{formatINR(bed.monthly_room_rent + bed.monthly_ac_rent)}/mo</span>
                        </div>

                        {occupant ? (
                          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                            <div>
                              <span className="text-slate-400">Tenant: </span>
                              <span className="font-medium text-white">{occupant.name}</span>
                              <span className="text-slate-500 font-mono ml-1">({occupant.user_id})</span>
                            </div>
                            <button onClick={() => openRealloc(bed.bed_id)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                              <ArrowRightLeft className="w-3 h-3" /> Reassign
                            </button>
                          </div>
                        ) : (
                          !isEditing && (
                            <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-emerald-400 font-medium">Ready for allocation</span>
                              <button onClick={() => { setEditingBedId(bed.bed_id); setNewStatus(bed.occupancy_status); }}
                                className="text-slate-400 hover:text-white underline text-[10px] transition-colors">
                                Change Status
                              </button>
                            </div>
                          )
                        )}

                        {isEditing && (
                          <div className="mt-2 pt-2 border-t border-slate-700 space-y-2 animate-in fade-in">
                            <div className="flex items-center gap-1.5">
                              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as OccupancyStatus)}
                                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded p-1 flex-1">
                                <option value="VACANT">VACANT</option>
                                <option value="RESERVED">RESERVED</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                              </select>
                              <button onClick={() => { updateBedStatus(bed.bed_id, newStatus); setEditingBedId(null); }}
                                className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-semibold">Save</button>
                              <button onClick={() => setEditingBedId(null)}
                                className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px]">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add bed button */}
                  {isExpanded && (
                    <button onClick={() => openAddBed(room.room_id)}
                      className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-lg text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Bed to Room {room.room_number}
                    </button>
                  )}
                  {!isExpanded && (
                    <button onClick={() => { setExpandedRoomId(room.room_id); }}
                      className="w-full py-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5">
                      <Settings2 className="w-3 h-3" />
                      Manage beds
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Room add/edit modal */}
      {roomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-indigo-400" />
                {roomModal === 'edit' ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button onClick={() => setRoomModal(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitRoom} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Room Number *</label>
                  <input value={roomForm.room_number} onChange={(e) => setRoomForm((p) => ({ ...p, room_number: e.target.value }))}
                    placeholder="e.g. 101" className={fieldCls(!!roomErr && !roomForm.room_number)} />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Floor</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="1"
                    value={roomForm.floor === 0 ? '' : roomForm.floor}
                    onChange={(e) => setRoomForm((p) => ({ ...p, floor: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 }))}
                    className={fieldCls()}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Capacity (beds)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="2"
                    value={roomForm.capacity === 0 ? '' : roomForm.capacity}
                    onChange={(e) => setRoomForm((p) => ({ ...p, capacity: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 }))}
                    className={fieldCls()}
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id="is_ac" checked={roomForm.is_ac}
                    onChange={(e) => setRoomForm((p) => ({ ...p, is_ac: e.target.checked }))}
                    className="w-4 h-4 rounded accent-sky-500" />
                  <label htmlFor="is_ac" className="text-slate-300 font-medium flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-sky-400" /> Air Conditioned
                  </label>
                </div>
              </div>
              {roomErr && <p className="text-rose-400 text-[10px]">{roomErr}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setRoomModal(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                  {roomModal === 'edit' ? 'Save Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed add/edit modal */}
      {bedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-emerald-400" />
                {bedModal === 'edit' ? 'Edit Bed' : `Add Bed to Room ${rooms.find((r) => r.room_id === bedParentId)?.room_number ?? ''}`}
              </h3>
              <button onClick={() => setBedModal(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitBed} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Bed Label *</label>
                <input value={bedForm.bed_label} onChange={(e) => setBedForm((p) => ({ ...p, bed_label: e.target.value }))}
                  placeholder="e.g. Bed A, Bunk Top, Single 1" className={fieldCls(!!bedErr && !bedForm.bed_label)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Room Rent (₹/mo)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 8000"
                    value={bedForm.monthly_room_rent === 0 ? '' : bedForm.monthly_room_rent}
                    onChange={(e) =>
                      setBedForm((p) => ({
                        ...p,
                        monthly_room_rent: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className={`${fieldCls()} font-mono`}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">AC Rent (₹/mo)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0 (if non-AC)"
                    value={bedForm.monthly_ac_rent === 0 ? '' : bedForm.monthly_ac_rent}
                    onChange={(e) =>
                      setBedForm((p) => ({
                        ...p,
                        monthly_ac_rent: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className={`${fieldCls()} font-mono`}
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Leave blank or 0 if non-AC</p>
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 flex justify-between text-[11px]">
                <span className="text-slate-400">Total monthly rent</span>
                <span className="font-mono font-semibold text-white">{formatINR(Number(bedForm.monthly_room_rent || 0) + Number(bedForm.monthly_ac_rent || 0))}/mo</span>
              </div>
              {bedErr && <p className="text-rose-400 text-[10px]">{bedErr}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setBedModal(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                  {bedModal === 'edit' ? 'Save Bed' : 'Add Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete room confirm */}
      {deleteRoomId && (() => {
        const room = rooms.find((r) => r.room_id === deleteRoomId);
        const hasOccupied = beds.some((b) => b.room_id === deleteRoomId && b.occupancy_status === 'OCCUPIED');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Delete Room {room?.room_number}?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">All beds in this room will also be removed.</p>
                </div>
              </div>
              {hasOccupied && (
                <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  This room has occupied beds. Checkout tenants first before deleting.
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => setDeleteRoomId(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => confirmDeleteRoom(deleteRoomId)} disabled={hasOccupied}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Room
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete bed confirm */}
      {deleteBedId && (() => {
        const bed = beds.find((b) => b.bed_id === deleteBedId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Delete {bed?.bed_label}?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This bed will be permanently removed.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => setDeleteBedId(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={() => confirmDeleteBed(deleteBedId)}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Bed
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Re-allocation modal */}
      {reallocBedId && (() => {
        const srcBed  = beds.find((b) => b.bed_id === reallocBedId);
        const srcRoom = rooms.find((r) => r.room_id === srcBed?.room_id);
        const occupant = occupantForBed(reallocBedId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Reassign Tenant to New Bed</h3>
                </div>
                <button onClick={() => setReallocBedId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Current Assignment</div>
                <div className="text-white font-medium">{occupant?.name} <span className="text-slate-400 font-mono">({occupant?.user_id})</span></div>
                <div className="text-slate-400">Room {srcRoom?.room_number} · {srcBed?.bed_label} — {formatINR((srcBed?.monthly_room_rent ?? 0) + (srcBed?.monthly_ac_rent ?? 0))}/mo</div>
              </div>
              <div className="text-xs space-y-1.5">
                <label className="text-slate-300 font-medium block">Select New Vacant Bed</label>
                {vacantForRealloc.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-amber-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" /> No vacant beds available.
                  </div>
                ) : (
                  <select value={reallocTarget} onChange={(e) => setReallocTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">-- Select vacant bed --</option>
                    {vacantForRealloc.map((b) => {
                      const r = rooms.find((x) => x.room_id === b.room_id);
                      return <option key={b.bed_id} value={b.bed_id}>Room {r?.room_number} · {b.bed_label} — {formatINR(b.monthly_room_rent + b.monthly_ac_rent)}/mo</option>;
                    })}
                  </select>
                )}
              </div>
              {reallocTarget && (() => {
                const tb = beds.find((b) => b.bed_id === reallocTarget);
                const tr = rooms.find((r) => r.room_id === tb?.room_id);
                const oldRent = (srcBed?.monthly_room_rent ?? 0) + (srcBed?.monthly_ac_rent ?? 0);
                const newRent = (tb?.monthly_room_rent ?? 0) + (tb?.monthly_ac_rent ?? 0);
                const diff = newRent - oldRent;
                return (
                  <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-3 text-xs space-y-1">
                    <div className="text-indigo-300 text-[10px] uppercase tracking-wider font-semibold mb-1">Rent Change Preview</div>
                    <div className="flex justify-between"><span className="text-slate-400">Current</span><span className="font-mono text-slate-200">{formatINR(oldRent)}/mo</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">New (Room {tr?.room_number} · {tb?.bed_label})</span><span className="font-mono text-white">{formatINR(newRent)}/mo</span></div>
                    <div className={`flex justify-between font-semibold border-t border-indigo-800/30 pt-1 mt-1 ${diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span>Difference</span>
                      <span className="font-mono">{diff > 0 ? '+' : ''}{formatINR(diff)}/mo</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => setReallocBedId(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={confirmRealloc} disabled={!reallocTarget}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Reassignment
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
