import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Layers, 
  Download, 
  Calendar, 
  Award, 
  PieChart, 
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Receipt
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCOP, getProductStatus } from '../utils/formatters';

type ReportPeriod = 'hoy' | 'esta_semana' | 'este_mes' | 'ultimos_3_meses' | 'todos';

export const ReportsView: React.FC = () => {
  const { sales, products, clinicSettings } = useApp();
  const [period, setPeriod] = useState<ReportPeriod>('este_mes');

  // Filter sales based on selected period
  const filteredSales = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOf3Months = new Date(today.getFullYear(), today.getMonth() - 3, 1);

    return sales.filter((s) => {
      const saleDate = new Date(s.date);
      if (period === 'hoy') return s.date.startsWith(todayStr);
      if (period === 'esta_semana') return saleDate >= startOfWeek;
      if (period === 'este_mes') return saleDate >= startOfMonth;
      if (period === 'ultimos_3_meses') return saleDate >= startOf3Months;
      return true;
    });
  }, [sales, period]);

  // Financial calculations
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalUnitsSold = filteredSales.reduce((acc, s) => acc + s.totalUnits, 0);
  const totalCostOfSoldItems = filteredSales.reduce((acc, s) => {
    const saleCost = s.items.reduce((itemAcc, item) => itemAcc + (item.unitCost * item.quantity), 0);
    return acc + saleCost;
  }, 0);
  const estimatedProfit = Math.max(0, totalSalesRevenue - totalCostOfSoldItems);
  const averageTicket = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;
  const profitMarginPercent = totalSalesRevenue > 0 ? ((estimatedProfit / totalSalesRevenue) * 100).toFixed(1) : '0.0';

  // Top selling products computation
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; category: string; photoUrl: string }>();

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const current = map.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          revenue: 0,
          category: item.category,
          photoUrl: item.photoUrl,
        };
        current.quantity += item.quantity;
        current.revenue += item.subtotal;
        map.set(item.productId, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSales]);

  // Inventory valuation & distribution calculations
  const totalProductsCount = products.length;
  const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock, 0);
  const inventoryCostValue = products.reduce((acc, p) => acc + (p.purchasePrice * p.stock), 0);
  const inventoryRetailValue = products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
  const potentialInventoryProfit = Math.max(0, inventoryRetailValue - inventoryCostValue);

  // Status breakdown
  const normalStockCount = products.filter((p) => getProductStatus(p, clinicSettings.expiringDaysThreshold) === 'disponible').length;
  const lowStockCount = products.filter((p) => getProductStatus(p, clinicSettings.expiringDaysThreshold) === 'stock_bajo').length;
  const outOfStockCount = products.filter((p) => getProductStatus(p, clinicSettings.expiringDaysThreshold) === 'agotado').length;
  const expiringCount = products.filter((p) => getProductStatus(p, clinicSettings.expiringDaysThreshold) === 'proximo_a_vencer').length;

  // Export executive report to CSV
  const handleExportReportCSV = () => {
    const summaryData = [
      ['INFORME EJECUTIVO DE VENTAS E INVENTARIO - STOCKPRO'],
      ['Empresa / Negocio', clinicSettings.name],
      ['NIT', clinicSettings.nit],
      ['Fecha de Generación', new Date().toLocaleString('es-CO')],
      ['Período Seleccionado', period.toUpperCase()],
      [],
      ['MÉTRICAS CLAVE DEL PERÍODO'],
      ['Ventas Totales (COP)', totalSalesRevenue],
      ['Unidades Vendidas', totalUnitsSold],
      ['Costo Total de Mercancía Vendida (COP)', totalCostOfSoldItems],
      ['Ganancia Neta Estimada (COP)', estimatedProfit],
      ['Margen de Ganancia (%)', `${profitMarginPercent}%`],
      ['Ticket Promedio por Venta (COP)', Math.round(averageTicket)],
      ['Total de Transacciones', filteredSales.length],
      [],
      ['VALORACIÓN DEL INVENTARIO ACTUAL'],
      ['Productos Registrados', totalProductsCount],
      ['Unidades en Existencia', totalUnitsInStock],
      ['Valor de Compra / Costo (COP)', inventoryCostValue],
      ['Valor Potencial de Venta (COP)', inventoryRetailValue],
      ['Ganancia Potencial en Inventario (COP)', potentialInventoryProfit],
      [],
      ['RANKING PRODUCTOS MÁS VENDIDOS EN EL PERÍODO'],
      ['Posición', 'Producto', 'Categoría', 'Unidades Vendidas', 'Ingresos Totales (COP)'],
      ...topProducts.map((p, idx) => [idx + 1, `"${p.name}"`, `"${p.category}"`, p.quantity, p.revenue]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + summaryData.map((row) => row.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `informe_stockpro_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Period Filter & Export */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Informes y Análisis
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Métricas financieras, rendimiento de ventas y balance de existencias
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            {(['hoy', 'esta_semana', 'este_mes', 'ultimos_3_meses', 'todos'] as ReportPeriod[]).map((p) => {
              const labels: Record<ReportPeriod, string> = {
                hoy: 'Hoy',
                esta_semana: 'Esta semana',
                este_mes: 'Este mes',
                ultimos_3_meses: 'Últimos 3 meses',
                todos: 'Histórico',
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    period === p ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <button
            id="btn-export-report-main"
            type="button"
            onClick={handleExportReportCSV}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            Exportar informe CSV
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Ventas totales */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Ventas totales
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight block mt-2">
            {formatCOP(totalSalesRevenue)}
          </span>
          <span className="text-xs text-emerald-800 font-semibold mt-1 block">
            {filteredSales.length} transacciones registradas
          </span>
        </div>

        {/* Productos vendidos */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Productos vendidos
            </span>
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight block mt-2">
            {totalUnitsSold} <span className="text-sm font-normal text-stone-500">unidades</span>
          </span>
          <span className="text-xs text-stone-500 font-medium mt-1 block">
            Despachadas en el período
          </span>
        </div>

        {/* Ganancia estimada */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Ganancia estimada
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-800 tracking-tight block mt-2">
            {formatCOP(estimatedProfit)}
          </span>
          <span className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <Percent className="w-3 h-3" /> Margen neto: {profitMarginPercent}%
          </span>
        </div>

        {/* Ticket promedio */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Ticket promedio
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight block mt-2">
            {formatCOP(averageTicket)}
          </span>
          <span className="text-xs text-stone-500 font-medium mt-1 block">
            Promedio por compra
          </span>
        </div>
      </div>

      {/* Grid: Productos Más Vendidos + Informe de Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SECCIÓN: Productos más vendidos (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Productos más vendidos
                  </h3>
                  <p className="text-xs text-stone-500">Ranking por unidades despachadas</p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400 uppercase">Top Ventas</span>
            </div>

            <div className="divide-y divide-stone-100 mt-2">
              {topProducts.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No hay ventas registradas en el período seleccionado.
                </div>
              ) : (
                topProducts.slice(0, 6).map((item, idx) => {
                  const maxQty = topProducts[0]?.quantity || 1;
                  const barWidth = Math.max(10, (item.quantity / maxQty) * 100);

                  return (
                    <div key={idx} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-stone-200 text-stone-700' : idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-stone-800 truncate text-sm">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-stone-900 text-sm">
                            {item.quantity} unidades
                          </span>
                          <span className="text-[11px] text-stone-400 block">
                            {formatCOP(item.revenue)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Visualizer */}
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-emerald-700' : 'bg-emerald-600/80'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN: Informe de Inventario y Valoración (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Informe de Inventario
              </h3>
              <p className="text-xs text-stone-500">Valoración financiera y estado de existencias</p>
            </div>
          </div>

          {/* Key Inventory Values */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-stone-500 block">Productos registrados:</span>
                <strong className="text-stone-900 text-sm">{totalProductsCount} referencias</strong>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block">Unidades físicas:</span>
                <strong className="text-emerald-800 text-sm">{totalUnitsInStock} unidades</strong>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">Valor de compra (Costo actual):</span>
                <span className="font-bold text-stone-900">{formatCOP(inventoryCostValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Valor potencial de venta:</span>
                <span className="font-bold text-emerald-800">{formatCOP(inventoryRetailValue)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                <span className="text-stone-800">Ganancia potencial estimada:</span>
                <span className="text-emerald-800">{formatCOP(potentialInventoryProfit)}</span>
              </div>
            </div>
          </div>

          {/* Health Breakdown Chips */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
              Estado de las existencias
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
                <span>🟢 Stock normal</span>
                <strong className="font-bold">{normalStockCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-between">
                <span>🟠 Stock bajo</span>
                <strong className="font-bold">{lowStockCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-between">
                <span>🔴 Agotados</span>
                <strong className="font-bold">{outOfStockCount}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-200 text-stone-800 border border-stone-300 flex items-center justify-between">
                <span>⏰ Por vencer</span>
                <strong className="font-bold">{expiringCount}</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
