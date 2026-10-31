import React, { useState, useEffect } from 'react';
import { HostelProvider, useHostel } from './context/HostelContext';
import { Navbar, AdminNavTab } from './components/layout/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { YoupiGatewayPanel } from './components/admin/YoupiGatewayPanel';
import { RoomAllocationView } from './components/admin/RoomAllocationView';
import { MaintenanceQueueView } from './components/admin/MaintenanceQueueView';
import { StaffPanel } from './components/admin/StaffPanel';
import { TenantPortal } from './components/tenant/TenantPortal';
import { NewTenantModal } from './components/modals/NewTenantModal';
import { YoupiCheckoutModal } from './components/modals/YoupiCheckoutModal';
import { LoginPage } from './pages/LoginPage';

const SESSION_STORAGE_KEY = 'pg_hostel_active_session_v1';

interface SavedSession {
  isLoggedIn: boolean;
  role: 'ADMIN' | 'TENANT';
  tenantId?: string;
  savedAt: string;
}

const MainLayout: React.FC = () => {
  const { activeRole, setActiveRole, setActiveTenantId, refreshFromDatabase, users } = useHostel();
  const [currentTab, setCurrentTab] = useState<AdminNavTab>('dashboard');
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return false;
      const parsed: SavedSession = JSON.parse(raw);
      return Boolean(parsed.isLoggedIn);
    } catch {
      return false;
    }
  });
  const [loginRole, setLoginRole] = useState<'ADMIN' | 'TENANT'>(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return 'TENANT';
      const parsed: SavedSession = JSON.parse(raw);
      return parsed.role === 'ADMIN' ? 'ADMIN' : 'TENANT';
    } catch {
      return 'TENANT';
    }
  });

  // Restore saved session on boot so returning users stay logged in automatically
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedSession = JSON.parse(raw);
      if (parsed.isLoggedIn) {
        setLoginRole(parsed.role);
        setActiveRole(parsed.role);
        if (parsed.role === 'TENANT' && parsed.tenantId) {
          setActiveTenantId(parsed.tenantId);
        }
        setIsLoggedIn(true);
      }
    } catch {
      // Ignore malformed storage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If logged in as TENANT and users list finishes loading, verify the tenant still exists
  useEffect(() => {
    if (!isLoggedIn || loginRole !== 'TENANT') return;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedSession = JSON.parse(raw);
      if (parsed.tenantId && users.length > 0) {
        const exists = users.some((u) => u.user_id === parsed.tenantId);
        if (exists) {
          setActiveTenantId(parsed.tenantId);
        }
      }
    } catch {}
  }, [isLoggedIn, loginRole, users, setActiveTenantId]);

  const handleLogin = async (role: 'ADMIN' | 'TENANT', tenantId?: string) => {
    await refreshFromDatabase();
    setLoginRole(role);
    setActiveRole(role);
    if (role === 'TENANT' && tenantId) {
      setActiveTenantId(tenantId);
    }
    setIsLoggedIn(true);
    try {
      const sessionPayload: SavedSession = {
        isLoggedIn: true,
        role,
        tenantId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
    } catch {}
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentTab('dashboard');
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewTenant={() => setIsNewTenantModalOpen(true)}
        onLogout={handleLogout}
        loginRole={loginRole}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeRole === 'ADMIN' ? (
          <div>
            {currentTab === 'dashboard' && <AdminDashboard />}
            {currentTab === 'youpi' && <YoupiGatewayPanel />}
            {currentTab === 'rooms' && <RoomAllocationView />}
            {currentTab === 'maintenance' && <MaintenanceQueueView />}
            {currentTab === 'staff' && <StaffPanel />}
          </div>
        ) : (
          <TenantPortal onLogout={handleLogout} />
        )}
      </main>

      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">PG Hostel Management System</span>
            <span>·</span>
            <span>Live Database & YouPI-PG V2</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>0% Fee Direct UPI Rent Collection · Resident & Owner Portal</span>
          </div>
        </div>
      </footer>

      <NewTenantModal
        isOpen={isNewTenantModalOpen}
        onClose={() => setIsNewTenantModalOpen(false)}
      />

      <YoupiCheckoutModal />
    </div>
  );
};

export default function App() {
  return (
    <HostelProvider>
      <MainLayout />
    </HostelProvider>
  );
}
