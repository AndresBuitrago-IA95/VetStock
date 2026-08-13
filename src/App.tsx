import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { SalesView } from './views/SalesView';
import { SalesHistoryView } from './views/SalesHistoryView';
import { ReportsView } from './views/ReportsView';
import { AlertsView } from './views/AlertsView';
import { SettingsView } from './views/SettingsView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminManagementView } from './views/AdminManagementView';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StockEntryModal } from './components/StockEntryModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastNotification: React.FC = () => {
  const { toastMessage, toastType } = useApp();
  if (!toastMessage) return null;

  const bgStyles = {
    success: 'bg-emerald-900 text-emerald-50 border-emerald-800 shadow-lg shadow-emerald-950/20',
    error: 'bg-rose-900 text-rose-50 border-rose-800 shadow-lg shadow-rose-950/20',
    warning: 'bg-amber-900 text-amber-50 border-amber-800 shadow-lg shadow-amber-950/20',
    info: 'bg-stone-900 text-stone-100 border-stone-800 shadow-lg shadow-stone-950/20',
  }[toastType];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[toastType];

  return (
    <div className="fixed bottom-5 right-5 z-60 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 max-w-md ${bgStyles}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <p className="text-xs font-semibold leading-snug">{toastMessage}</p>
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab, isAuthenticated, isSuperAdmin, lastSaleReceipt, setLastSaleReceipt } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If not logged in as Admin, gate the entire system behind Google Admin Login
  if (!isAuthenticated) {
    return (
      <>
        <AdminLoginView />
        <ToastNotification />
      </>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-stone-50 font-sans text-stone-800">
      {/* Sidebar Navigation: on desktop, sits naturally as flex column without overlay */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-stone-50">
        {/* Top Header */}
        <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-stone-50">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'inventory' && <InventoryView />}
            {activeTab === 'sales' && <SalesView />}
            {activeTab === 'sales_history' && <SalesHistoryView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'alerts' && <AlertsView />}
            {activeTab === 'admins' && isSuperAdmin && <AdminManagementView />}
            {activeTab === 'admins' && !isSuperAdmin && <DashboardView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Business Modals */}
      <ProductFormModal />
      <ProductDetailModal />
      <StockEntryModal />
      {lastSaleReceipt && (
        <ReceiptModal
          sale={lastSaleReceipt}
          onClose={() => setLastSaleReceipt(null)}
        />
      )}
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

