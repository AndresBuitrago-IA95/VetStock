import React from 'react';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  AlertTriangle, 
  Settings, 
  LogOut, 
  Boxes,
  X,
  History,
  ShieldCheck,
  Crown,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { GoogleLogo } from '../views/AdminLoginView';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    activeTab, 
    setActiveTab, 
    totalAlertsCount, 
    userProfile, 
    adminUser,
    isSuperAdmin,
    logoutAdmin,
    clinicSettings,
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home, badge: null },
    { id: 'inventory', label: 'Inventario', icon: Package, badge: null },
    { id: 'sales', label: 'Ventas (POS)', icon: ShoppingCart, badge: null },
    { id: 'sales_history', label: 'Historial de Ventas', icon: History, badge: null },
    { id: 'reports', label: 'Informes', icon: BarChart3, badge: null },
    { 
      id: 'alerts', 
      label: 'Alertas', 
      icon: AlertTriangle, 
      badge: totalAlertsCount > 0 ? totalAlertsCount : null 
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'admins',
            label: 'SuperAdmin & Accesos',
            icon: Crown,
            badge: 'Master',
            highlight: true,
          },
        ]
      : []),
    { id: 'settings', label: 'Configuración', icon: Settings, badge: null },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleLogout = () => {
    logoutAdmin();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: Static column in flex on lg+, fixed drawer on mobile */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-stone-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:translate-x-0 lg:z-auto shrink-0 h-dvh sticky top-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-stone-900 tracking-tight flex items-center gap-1.5">
                StockPro
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200/60">
                  PRO
                </span>
              </h1>
              <p className="text-[11px] text-stone-500 truncate max-w-[130px]" title={clinicSettings.name}>
                {clinicSettings.name}
              </p>
            </div>
          </div>
          <button
            id="close-sidebar-mobile-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Menú Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelectTab(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/20'
                    : item.highlight
                    ? 'text-amber-900 hover:bg-amber-50/80 bg-amber-50/40 border border-amber-200/60'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${
                      isActive 
                        ? 'text-white' 
                        : item.highlight 
                        ? 'text-amber-600' 
                        : 'text-stone-400 group-hover:text-stone-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 ${
                      isActive
                        ? 'bg-white text-emerald-800'
                        : item.highlight
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Google Admin Card & Logout */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-100/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={adminUser?.avatarUrl || userProfile.avatarUrl}
                  alt={adminUser?.name || userProfile.name}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-600/30"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-xs p-0.5 flex items-center justify-center">
                  <GoogleLogo className="w-3 h-3" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-stone-800 truncate max-w-[100px]" title={adminUser?.name || userProfile.name}>
                    {adminUser?.name || userProfile.name}
                  </p>
                  {isSuperAdmin && (
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-stone-500 truncate max-w-[110px] font-mono" title={adminUser?.email || userProfile.email}>
                  {adminUser?.email || userProfile.email}
                </p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium px-0.5">
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              <ShieldCheck className="w-3 h-3" /> {isSuperAdmin ? 'SuperAdmin' : adminUser?.role || 'Admin'}
            </span>
            <span className="font-semibold text-stone-500">COP ($)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
