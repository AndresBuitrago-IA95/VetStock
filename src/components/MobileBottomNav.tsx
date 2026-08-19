import React from 'react';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  History, 
  Menu,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

interface MobileBottomNavProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onToggleSidebar, 
  isSidebarOpen 
}) => {
  const { activeTab, setActiveTab, totalAlertsCount, isSuperAdmin } = useApp();

  const tabs: { id: ActiveTab | 'menu'; label: string; icon: React.FC<{ className?: string }>; badge?: number | string | null }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'sales', label: 'POS Venta', icon: ShoppingCart },
    { id: 'sales_history', label: 'Historial', icon: History },
    { 
      id: 'menu', 
      label: 'Menú', 
      icon: Menu, 
      badge: totalAlertsCount > 0 ? totalAlertsCount : (isSuperAdmin ? '👑' : null) 
    },
  ];

  return (
    <nav 
      id="mobile-bottom-nav"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-2 pt-1 pb-safe flex items-center justify-around shadow-lg"
    >
      {tabs.map((tab) => {
        const isMenu = tab.id === 'menu';
        const isActive = isMenu ? isSidebarOpen : activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            id={`mobile-tab-${tab.id}`}
            type="button"
            onClick={() => {
              if (isMenu) {
                onToggleSidebar();
              } else {
                setActiveTab(tab.id as ActiveTab);
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 relative rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
              isActive 
                ? 'text-emerald-700 font-bold' 
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <div className="relative">
              <Icon 
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-emerald-700' : 'text-stone-500'
                }`} 
              />
              {tab.badge !== undefined && tab.badge !== null && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-[14px] bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-full">
              {tab.label}
            </span>
            {isActive && !isMenu && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
