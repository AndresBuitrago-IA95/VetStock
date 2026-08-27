import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  Plus, 
  ShoppingCart, 
  PackagePlus, 
  AlertTriangle, 
  Clock, 
  Check, 
  ChevronDown,
  Building2,
  Sparkles,
  LogOut,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleLogo } from '../views/AdminLoginView';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    activeTab,
    setActiveTab,
    setIsProductModalOpen,
    setEditingProduct,
    clinicSettings,
    userProfile,
    adminUser,
    logoutAdmin,
    outOfStockProducts,
    lowStockProducts,
    expiringProducts,
    totalAlertsCount,
    setSelectedProductId,
    setIsDetailModalOpen,
    forceSyncFromServer,
    lastSyncTime,
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Panel Principal';
      case 'inventory':
        return 'Inventario de Productos';
      case 'sales':
        return 'Punto de Venta (POS)';
      case 'sales_history':
        return 'Historial de Ventas';
      case 'reports':
        return 'Informes y Métricas';
      case 'alerts':
        return 'Centro de Alertas';
      case 'admins':
        return 'Gestión de Administradores & Accesos';
      case 'settings':
        return 'Configuración General';
      default:
        return 'Inventario';
    }
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenAlertProduct = (productId: string) => {
    setSelectedProductId(productId);
    setIsDetailModalOpen(true);
    setIsNotificationsOpen(false);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    await forceSyncFromServer();
    setTimeout(() => setIsSyncing(false), 500);
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'No sincronizado';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <header 
      id="app-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 lg:px-8 py-3 flex items-center justify-between transition-all"
    >
      {/* Left section: Hamburger on mobile + Section title */}
      <div className="flex items-center gap-3">
        <button
          id="open-sidebar-mobile-btn"
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-400 hidden sm:inline flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 inline" /> {clinicSettings.name}
            </span>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <h1 className="text-base sm:text-lg font-extrabold text-stone-900">
              {getSectionTitle()}
            </h1>
          </div>
        </div>
      </div>

      {/* Right section: Action buttons + Sync + Notifications + User */}
      <div className="flex items-center gap-2.5">
        {/* Sync button - visible on all devices */}
        <button
          id="header-sync-btn"
          type="button"
          onClick={handleForceSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Última sincronización: ${formatLastSync(lastSyncTime)}`}
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Sincronizar</span>
        </button>

        {/* Quick action: New Product */}
        <button
          id="header-new-product-btn"
          type="button"
          onClick={handleOpenNewProduct}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl transition-all shadow-2xs"
        >
          <PackagePlus className="w-4 h-4 text-emerald-700" />
          <span>+ Registrar producto</span>
        </button>

        {/* Quick action: New Sale */}
        <button
          id="header-new-sale-btn"
          type="button"
          onClick={() => setActiveTab('sales')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-700/20"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden xs:inline">+ Nueva venta</span>
          <span className="xs:hidden">Vender</span>
        </button>

        {/* Notifications Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="notifications-bell-btn"
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isNotificationsOpen && (
            <div 
              id="notifications-dropdown"
              className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="p-3.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">Notificaciones y Alertas</h3>
                  <p className="text-xs text-stone-500">
                    {totalAlertsCount === 0
                      ? 'Inventario al día'
                      : `${totalAlertsCount} producto(s) requieren atención`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('alerts');
                    setIsNotificationsOpen(false);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  Ver todas
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 p-1">
                {totalAlertsCount === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs">
                    <Check className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                    No hay alertas pendientes. ¡Todo en orden!
                  </div>
                ) : (
                  <>
                    {outOfStockProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenAlertProduct(p.id)}
                        className="w-full p-2.5 hover:bg-rose-50/60 flex items-start gap-2.5 text-left rounded-xl transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-rose-600 font-medium">
                            Producto agotado (0 unidades)
                          </p>
                        </div>
                      </button>
                    ))}

                    {lowStockProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenAlertProduct(p.id)}
                        className="w-full p-2.5 hover:bg-amber-50/60 flex items-start gap-2.5 text-left rounded-xl transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-amber-800 font-medium">
                            Stock bajo: {p.stock} unid. (Mín: {p.minStock})
                          </p>
                        </div>
                      </button>
                    ))}

                    {expiringProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenAlertProduct(p.id)}
                        className="w-full p-2.5 hover:bg-purple-50/60 flex items-start gap-2.5 text-left rounded-xl transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-purple-800 font-medium">
                            Próximo a vencer ({p.expirationDate})
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Google Admin user profile menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="header-user-menu-btn"
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-stone-200 hover:opacity-90 transition-opacity"
          >
            <div className="relative">
              <img
                src={adminUser?.avatarUrl || userProfile.avatarUrl}
                alt={adminUser?.name || userProfile.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-600/20"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-2xs p-0.5 flex items-center justify-center">
                <GoogleLogo className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-stone-800 leading-tight truncate max-w-[120px]">
                {adminUser?.name || userProfile.name}
              </p>
              <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                Admin Google <ChevronDown className="w-3 h-3 text-stone-400" />
              </span>
            </div>
          </button>

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 p-2"
            >
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 mb-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <GoogleLogo className="w-4 h-4" />
                  <span className="text-[11px] font-bold text-stone-700">
                    Cuenta Google Vinculada
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-900 truncate">
                  {adminUser?.name || userProfile.name}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {adminUser?.email || userProfile.email}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> Administrador General
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Configuración de la Clínica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logoutAdmin();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión de Administrador
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
