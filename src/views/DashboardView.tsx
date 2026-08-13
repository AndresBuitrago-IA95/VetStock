import React from 'react';
import { 
  DollarSign, 
  Package, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Plus, 
  ShoppingCart, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCOP, formatDate, getProductStatus, getStatusBadge, getDaysUntilExpiration } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    products,
    sales,
    clinicSettings,
    userProfile,
    setActiveTab,
    setIsProductModalOpen,
    setEditingProduct,
    setSelectedProductId,
    setIsDetailModalOpen,
    lowStockProducts,
    outOfStockProducts,
    expiringProducts,
  } = useApp();

  // 1. Calculate today's sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  // 2. Products count & total inventory units
  const totalProductsCount = products.length;
  const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock, 0);

  // 3. Inventory valuation (Cost & Retail)
  const totalInventoryCost = products.reduce((acc, p) => acc + (p.purchasePrice * p.stock), 0);
  const totalInventoryRetail = products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);

  // 4. Calculate last 7 days sales data for chart
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const daySales = sales.filter((s) => s.date.startsWith(dayStr));
    const total = daySales.reduce((acc, s) => acc + s.total, 0);
    const dayName = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric' }).format(d);
    return {
      date: dayStr,
      label: dayName,
      total,
      count: daySales.length,
    };
  });

  const maxDailySale = Math.max(...last7DaysData.map((d) => d.total), 500000);

  const handleOpenProduct = (id: string) => {
    setSelectedProductId(id);
    setIsDetailModalOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  // Combine low stock + out of stock for low stock widget
  const priorityLowStock = [...outOfStockProducts, ...lowStockProducts].slice(0, 5);
  const priorityExpiring = expiringProducts.slice(0, 5);

  return (
    <div id="dashboard-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sistema listo • {clinicSettings.name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Buenos días, {userProfile.name.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-stone-500 mt-1 max-w-xl">
            Este es el resumen operativo y financiero del inventario y las ventas para el día de hoy.
          </p>
        </div>

        {/* Quick actions buttons in header banner */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            id="dash-quick-product-btn"
            type="button"
            onClick={handleNewProduct}
            className="px-4 py-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-xs sm:text-sm rounded-2xl shadow-2xs flex items-center gap-2 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            + Registrar producto
          </button>
          <button
            id="dash-quick-sale-btn"
            type="button"
            onClick={() => setActiveTab('sales')}
            className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-700/25 flex items-center gap-2 transition-all hover:scale-102"
          >
            <ShoppingCart className="w-4 h-4" />
            + Nueva venta
          </button>
        </div>
      </div>

      {/* 4 Estadísticas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* 1. Ventas de hoy */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Ventas de hoy
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight block">
              {formatCOP(todaySalesTotal)}
            </span>
            <span className="text-xs text-emerald-800 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {todaySales.length} transacci{todaySales.length === 1 ? 'ón' : 'ones'} hoy
            </span>
          </div>
        </div>

        {/* 2. Productos registrados */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Productos registrados
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight block">
              {totalProductsCount}
            </span>
            <span className="text-xs text-stone-500 font-medium mt-1 block">
              En catálogo activo
            </span>
          </div>
        </div>

        {/* 3. Unidades en inventario */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Unidades en inventario
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight block">
              {totalUnitsInStock.toLocaleString('es-CO')}
            </span>
            <span className="text-xs text-stone-500 font-medium mt-1 block">
              Existencias totales físicas
            </span>
          </div>
        </div>

        {/* 4. Valor del inventario */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Valor del inventario
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight block">
              {formatCOP(totalInventoryRetail)}
            </span>
            <span className="text-xs text-stone-500 font-medium mt-1 block">
              Costo: {formatCOP(totalInventoryCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas de los últimos 7 días */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">
              Ventas de los últimos 7 días
            </h3>
            <p className="text-xs text-stone-500">
              Evolución diaria de facturación en pesos colombianos (COP)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
            <span className="text-xs font-semibold text-stone-600">Ingresos diarios</span>
          </div>
        </div>

        {/* Custom Responsive SVG Bar Chart */}
        <div className="h-56 sm:h-64 w-full flex items-end justify-between gap-2 sm:gap-6 pt-4 pb-2 border-b border-stone-100">
          {last7DaysData.map((day, idx) => {
            const heightPercent = Math.max(8, (day.total / maxDailySale) * 100);
            const isToday = day.date === todayStr;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-stone-100 text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20">
                  {formatCOP(day.total)} ({day.count} ventas)
                </div>

                {/* Amount label */}
                <span className="text-[10px] sm:text-xs font-bold text-stone-500 mb-2 group-hover:text-emerald-700 transition-colors">
                  {day.total > 0 ? (day.total >= 1000000 ? `$${(day.total / 1000000).toFixed(1)}M` : `$${Math.round(day.total / 1000)}k`) : '$0'}
                </span>

                {/* Bar */}
                <div className="w-full max-w-[48px] bg-stone-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 ease-out group-hover:brightness-95 ${
                      isToday
                        ? 'bg-emerald-700 shadow-sm shadow-emerald-700/30'
                        : 'bg-emerald-600/80'
                    }`}
                  />
                </div>

                {/* Day Label */}
                <span className={`text-[11px] font-semibold mt-3 capitalize ${isToday ? 'text-emerald-800 font-extrabold' : 'text-stone-500'}`}>
                  {isToday ? 'Hoy' : day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid de 2 Secciones: Productos con Stock Bajo & Productos Próximos a Vencer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECCIÓN: Productos con stock bajo */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Productos con stock bajo
                </h3>
                <p className="text-xs text-stone-500">Requieren reposición inmediata</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 flex-1">
            {priorityLowStock.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
                No hay productos con existencias críticas en este momento.
              </div>
            ) : (
              priorityLowStock.map((prod) => {
                const status = getProductStatus(prod, clinicSettings.expiringDaysThreshold);
                const badge = getStatusBadge(status);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProduct(prod.id)}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50/80 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prod.photoUrl}
                        alt={prod.name}
                        className="w-11 h-11 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200/60"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-800 text-sm truncate">{prod.name}</h4>
                        <p className="text-xs text-stone-500">
                          {prod.stock} unidad{prod.stock === 1 ? '' : 'es'} • Stock mín: {prod.minStock}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECCIÓN: Productos próximos a vencer */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Productos próximos a vencer
                </h3>
                <p className="text-xs text-stone-500">Revisión de lotes y fechas de caducidad</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 flex-1">
            {priorityExpiring.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
                Ningún medicamento o insumo vence en los próximos {clinicSettings.expiringDaysThreshold} días.
              </div>
            ) : (
              priorityExpiring.map((prod) => {
                const days = getDaysUntilExpiration(prod.expirationDate);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProduct(prod.id)}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50/80 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prod.photoUrl}
                        alt={prod.name}
                        className="w-11 h-11 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200/60"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-800 text-sm truncate">{prod.name}</h4>
                        <p className="text-xs text-stone-500">
                          Vencimiento: <strong className="text-stone-700">{formatDate(prod.expirationDate)}</strong> ({prod.stock} unid.)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {days !== null && days <= 0 ? 'Vencido' : `Vence en ${days} días`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
