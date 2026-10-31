import React, { useState } from 'react';
import { useHostel } from '../../context/HostelContext';
import {
  Building2,
  UserCheck,
  ShieldCheck,
  Wrench,
  BedDouble,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  QrCode,
  Download,
  Trash2,
} from 'lucide-react';

export type AdminNavTab = 'dashboard' | 'youpi' | 'rooms' | 'maintenance' | 'staff';

interface NavbarProps {
  currentTab: AdminNavTab;
  setCurrentTab: (tab: AdminNavTab) => void;
  onOpenNewTenant: () => void;
  onLogout: () => void;
  loginRole: 'ADMIN' | 'TENANT';
}

const NAV_TABS: Array<{ id: AdminNavTab; label: string; icon: any; badge?: string }> = [
  { id: 'dashboard',   label: 'Tenant Ledger', icon: LayoutDashboard },
  { id: 'youpi',       label: 'YouPI Gateway', icon: QrCode, badge: 'V2' },
  { id: 'rooms',       label: 'Rooms & Beds',  icon: BedDouble },
  { id: 'maintenance', label: 'Maintenance',   icon: Wrench },
  { id: 'staff',       label: 'Staff',         icon: Users },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewTenant,
  onLogout,
  loginRole,
}) => {
  const {
    activeTenantDetails,
    youpiConfig,
    dbStatus,
    wipeDatabaseToCleanSlate,
  } = useHostel();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTabClick = (tab: AdminNavTab) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  const handleWipeData = () => {
    if (
      confirm(
        'Are you sure you want to wipe all rooms, beds, tenants, and payment records to start with a 100% clean database? (Your Admin account and YouPI UPI ID will be preserved).'
      )
    ) {
      wipeDatabaseToCleanSlate();
      setMobileOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Zone 1: Logo & Hostel Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white hidden sm:block">
                {youpiConfig.merchantName || 'PG Hostel Management'}
              </span>
              <span className="text-sm font-semibold tracking-tight text-white sm:hidden">
                PG HMS
              </span>
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>DB: {dbStatus.engine}</span>
              </div>
            </div>
          </div>

          {/* Zone 2: Admin nav tabs (SQL Schema tab removed per user request) */}
          {loginRole === 'ADMIN' && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_TABS.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === id
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {/* Zone 3: Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              loginRole === 'ADMIN'
                ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300'
            }`}>
              {loginRole === 'ADMIN'
                ? <><ShieldCheck className="w-3.5 h-3.5" /> Admin</>
                : <><UserCheck className="w-3.5 h-3.5" /> {activeTenantDetails?.user.name || 'Resident'}</>
              }
            </div>

            {loginRole === 'ADMIN' && (
              <button
                onClick={onOpenNewTenant}
                className="hidden sm:flex px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors items-center gap-1.5 whitespace-nowrap"
              >
                + New Tenant
              </button>
            )}

            {loginRole === 'ADMIN' && (
              <a
                href="/api/db/export"
                download="hostel_database_backup.json"
                title="Download full database backup JSON"
                className="hidden sm:flex p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {loginRole === 'ADMIN' && (
              <button
                onClick={handleWipeData}
                title="Wipe all sample/existing records to start fresh"
                className="hidden sm:flex p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onLogout}
              title="Sign out"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent hover:border-rose-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:block">Sign Out</span>
            </button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors sm:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 space-y-4 sm:hidden animate-in slide-in-from-top-2 duration-200">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold w-fit ${
            loginRole === 'ADMIN'
              ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
              : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {loginRole === 'ADMIN'
              ? <><ShieldCheck className="w-3.5 h-3.5" /> Signed in as Admin</>
              : <><UserCheck className="w-3.5 h-3.5" /> {activeTenantDetails?.user.name || 'Signed in as Resident'}</>
            }
          </div>

          {loginRole === 'ADMIN' && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Navigation</div>
              <div className="grid grid-cols-2 gap-2">
                {NAV_TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleTabClick(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      currentTab === id
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-800">
            {loginRole === 'ADMIN' && (
              <button
                onClick={() => { onOpenNewTenant(); setMobileOpen(false); }}
                className="flex-1 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                + New Tenant
              </button>
            )}
            {loginRole === 'ADMIN' && (
              <button
                onClick={handleWipeData}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 bg-slate-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe DB
              </button>
            )}
            <button
              onClick={() => { onLogout(); setMobileOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 bg-slate-800 rounded-lg transition-colors ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
