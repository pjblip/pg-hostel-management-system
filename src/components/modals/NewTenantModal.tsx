import React, { useState, useMemo } from 'react';
import { useHostel } from '../../context/HostelContext';
import { User } from '../../types/hostel';
import { formatINR } from '../../utils/dateDiff';
import { X, UserPlus, BedDouble, AlertCircle, CheckCircle2, Wind, KeyRound } from 'lucide-react';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTenantModal: React.FC<NewTenantModalProps> = ({ isOpen, onClose }) => {
  const { beds, rooms, users, addTenant } = useHostel();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [workplace, setWorkplace] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [deposit, setDeposit] = useState(15000);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const vacantBeds = beds.filter((b) => b.occupancy_status === 'VACANT');

  // Auto-generate next sequential PG ID
  const nextId = useMemo(() => {
    const year = new Date().getFullYear();
    const yearIds = users
      .map((u) => u.user_id)
      .filter((id) => id.startsWith(`PG-${year}-`))
      .map((id) => parseInt(id.split('-')[2], 10))
      .filter((n) => !isNaN(n));
    const max = yearIds.length > 0 ? Math.max(...yearIds) : 0;
    return `PG-${year}-${String(max + 1).padStart(3, '0')}`;
  }, [users]);

  const selectedBed = beds.find((b) => b.bed_id === selectedBedId);
  const selectedRoom = rooms.find((r) => r.room_id === selectedBed?.room_id);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (phone.replace(/\D/g, '').length < 10)
      e.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Enter a valid email address.';
    if (!joiningDate) e.joiningDate = 'Joining date is required.';
    if (!selectedBedId) e.bed = 'Please select a vacant bed.';
    if (deposit < 0) e.deposit = 'Deposit cannot be negative.';
    return e;
  };

  if (!isOpen) return null;

  const effectivePassword =
    portalPassword.trim() || phone.replace(/\D/g, '').slice(-10) || nextId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const newUser: User = {
      user_id: nextId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      joining_date: joiningDate,
      id_proof_url: '',
      status: 'ACTIVE',
      workplace_or_college: workplace.trim() || undefined,
      emergency_contact: emergencyContact.trim() || undefined,
      blood_group: bloodGroup || undefined,
      portal_password: effectivePassword,
      portal_password_hint: effectivePassword,
    };

    addTenant(newUser, selectedBedId, Number(deposit) || 0);
    setSubmitted(true);
  };

  const resetForm = () => {
    setName('');
    setPhone('+91 ');
    setEmail('');
    setPortalPassword('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setWorkplace('');
    setEmergencyContact('');
    setBloodGroup('');
    setSelectedBedId('');
    setDeposit(15000);
    setErrors({});
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const fieldClass = (key: string) =>
    `w-full bg-slate-950 border rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 transition-colors ${
      errors[key]
        ? 'border-rose-500 focus:ring-rose-500'
        : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Enroll New Tenant</h3>
              <p className="text-[11px] text-slate-400">
                Auto-assigned ID:{' '}
                <span className="font-mono text-indigo-300">{nextId}</span>
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Tenant Saved to Database!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Share these Tenant Portal login credentials with <strong>{name}</strong>:
              </p>
            </div>

            <div className="w-full max-w-sm bg-slate-950 border border-indigo-500/30 rounded-xl p-4 text-xs text-left font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Tenant Login ID:</span>
                <span className="text-indigo-300 font-bold">{nextId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Or Mobile / Email:</span>
                <span className="text-slate-200">{phone.trim()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Portal Password:</span>
                <span className="text-emerald-400 font-bold">{effectivePassword}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Personal & Portal Login Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                      placeholder="e.g. Rahul Deshmukh"
                      className={fieldClass('name')}
                    />
                    {errors.name && <p className="text-rose-400 mt-1 text-[10px]">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Phone Number *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: '' })); }}
                      placeholder="+91 98765 43210"
                      className={fieldClass('phone')}
                    />
                    {errors.phone && <p className="text-rose-400 mt-1 text-[10px]">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                      placeholder="rahul@example.com"
                      className={fieldClass('email')}
                    />
                    {errors.email && <p className="text-rose-400 mt-1 text-[10px]">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="text-emerald-300 font-medium flex items-center gap-1 mb-1">
                      <KeyRound className="w-3 h-3" />
                      Tenant Portal Password
                    </label>
                    <input
                      type="text"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="Leave blank to use 10-digit mobile"
                      className={`${fieldClass('portalPassword')} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">College / Company</label>
                    <input
                      type="text"
                      value={workplace}
                      onChange={(e) => setWorkplace(e.target.value)}
                      placeholder="e.g. Pune Tech University"
                      className={fieldClass('workplace')}
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="+91 94220 99887 (Father)"
                      className={fieldClass('emergencyContact')}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Stay & Allocation
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Joining / Start Date *</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => { setJoiningDate(e.target.value); setErrors((p) => ({ ...p, joiningDate: '' })); }}
                      className={fieldClass('joiningDate')}
                    />
                    {errors.joiningDate && <p className="text-rose-400 mt-1 text-[10px]">{errors.joiningDate}</p>}
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Security Deposit Paid (₹) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={deposit === 0 ? '' : deposit}
                      min={0}
                      onChange={(e) => {
                        setDeposit(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0);
                        setErrors((p) => ({ ...p, deposit: '' }));
                      }}
                      className={`${fieldClass('deposit')} font-mono`}
                    />
                    {errors.deposit && <p className="text-rose-400 mt-1 text-[10px]">{errors.deposit}</p>}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-slate-300 font-medium block mb-1">Select Vacant Bed Slot *</label>
                  {vacantBeds.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No vacant beds available. Add rooms and beds in the "Rooms & Beds" tab first!</span>
                    </div>
                  ) : (
                    <select
                      value={selectedBedId}
                      onChange={(e) => { setSelectedBedId(e.target.value); setErrors((p) => ({ ...p, bed: '' })); }}
                      className={fieldClass('bed')}
                    >
                      <option value="">-- Choose Vacant Bed --</option>
                      {vacantBeds.map((b) => {
                        const r = rooms.find((x) => x.room_id === b.room_id);
                        return (
                          <option key={b.bed_id} value={b.bed_id}>
                            Room {r?.room_number} · {b.bed_label}{r?.is_ac ? ' (AC)' : ''} — {formatINR(b.monthly_room_rent + b.monthly_ac_rent)}/mo
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {errors.bed && <p className="text-rose-400 mt-1 text-[10px]">{errors.bed}</p>}
                </div>

                {selectedBed && selectedRoom && (
                  <div className="mt-3 p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-lg space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                      Selected Bed Preview
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-200">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">Room {selectedRoom.room_number} · {selectedBed.bed_label}</span>
                        {selectedRoom.is_ac && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <Wind className="w-2.5 h-2.5" />
                            AC
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono text-white tabular-nums">
                        {formatINR(selectedBed.monthly_room_rent + selectedBed.monthly_ac_rent)}/mo
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-900/80">
              <p className="text-[11px] text-slate-500">
                * ID auto-assigned as <span className="font-mono text-indigo-300">{nextId}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vacantBeds.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Enroll Tenant &amp; Allocate Bed
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
