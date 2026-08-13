import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Receipt, 
  Calendar, 
  Download, 
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  RotateCcw,
  User,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { formatCOP, formatDate } from '../utils/formatters';
import { ReceiptModal } from '../components/ReceiptModal';
import { SaleEditModal } from '../components/SaleEditModal';

type DateFilter = 'hoy' | 'esta_semana' | 'este_mes' | 'todos';

export const SalesHistoryView: React.FC = () => {
  const { sales, setActiveTab, updateSale, deleteSale } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('todos');
  
  // Modals state
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);

  const filteredSales = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Compute start of week
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // Compute start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return sales.filter((s) => {
      // Search
      const matchSearch =
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.items.some((it) => it.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Date
      const saleDate = new Date(s.date);
      let matchDate = true;
      if (dateFilter === 'hoy') {
        matchDate = s.date.startsWith(todayStr);
      } else if (dateFilter === 'esta_semana') {
        matchDate = saleDate >= startOfWeek;
      } else if (dateFilter === 'este_mes') {
        matchDate = saleDate >= startOfMonth;
      }

      return matchSearch && matchDate;
    });
  }, [sales, searchTerm, dateFilter]);

  const totalFilteredSum = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalUnitsSold = filteredSales.reduce((acc, s) => acc + s.totalUnits, 0);

  // Export Sales to CSV
  const handleExportCSV = () => {
    const headers = ['ID_Venta', 'Fecha', 'Cliente', 'Productos', 'Total_Unidades', 'Subtotal_COP', 'Descuento_COP', 'Total_COP', 'Metodo_Pago', 'Usuario', 'Estado', 'Notas'];
    const rows = filteredSales.map((s) => [
      `"${s.id}"`,
      `"${s.date}"`,
      `"${(s.customerName || 'Cliente mostrador').replace(/"/g, '""')}"`,
      `"${s.items.map((i) => `${i.quantity}x ${i.productName}`).join('; ').replace(/"/g, '""')}"`,
      s.totalUnits,
      s.subtotal,
      s.discount,
      s.total,
      `"${s.paymentMethod}"`,
      `"${s.user}"`,
      `"${s.status}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_stockpro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDelete = () => {
    if (!saleToDelete) return;
    deleteSale(saleToDelete.id, restoreStockOnDelete);
    setSaleToDelete(null);
  };

  return (
    <div id="sales-history-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Historial de Ventas
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Registro detallado de transacciones con opciones de corrección, anulación e impresión de recibos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-700/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nueva venta
          </button>
        </div>
      </div>

      {/* KPI Cards Summary for selected filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Total Facturado en Período
          </span>
          <span className="text-xl font-extrabold text-emerald-800 mt-1 block">
            {formatCOP(totalFilteredSum)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Ventas Registradas
          </span>
          <span className="text-xl font-extrabold text-stone-900 mt-1 block">
            {filteredSales.length} transacci{filteredSales.length === 1 ? 'ón' : 'ones'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Unidades Totales Vendidas
          </span>
          <span className="text-xl font-extrabold text-stone-800 mt-1 block">
            {totalUnitsSold} unidades
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="search-sales-input"
              type="text"
              placeholder="Buscar por ID de venta, cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          {/* Quick Date Range Filters */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setDateFilter('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'todos' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDateFilter('hoy')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'hoy' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('esta_semana')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'esta_semana' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Esta semana
            </button>
            <button
              onClick={() => setDateFilter('este_mes')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'este_mes' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Este mes
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="sales-history-table" className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 text-stone-600 border-b border-stone-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">ID Venta</th>
                <th className="py-3.5 px-3">Fecha y Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Productos Facturados</th>
                <th className="py-3.5 px-3">Cant.</th>
                <th className="py-3.5 px-3">Pago</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-3">Vendedor</th>
                <th className="py-3.5 px-3">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-400 text-xs">
                    No se encontraron registros de ventas en este período.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-stone-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {sale.id}
                    </td>

                    <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                      {formatDate(sale.date, true)}
                    </td>

                    <td className="py-3 px-4 text-stone-800 font-medium">
                      {sale.customerName || <span className="text-stone-400 italic">Cliente mostrador</span>}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-stone-800 font-medium line-clamp-1">
                        {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {sale.items.length} {sale.items.length === 1 ? 'ítem distinto' : 'ítems distintos'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-stone-700 whitespace-nowrap">
                      {sale.totalUnits}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        sale.paymentMethod === 'transferencia'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : sale.paymentMethod === 'tarjeta'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-extrabold text-emerald-800 whitespace-nowrap text-sm">
                      {formatCOP(sale.total)}
                    </td>

                    <td className="py-3 px-3 text-stone-500 whitespace-nowrap">
                      {sale.user ? sale.user.split(' ')[0] : 'Admin'}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Completada
                      </span>
                    </td>

                    {/* Actions Column: Receipt, Edit, Delete */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptSale(sale)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ver o imprimir recibo"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="hidden xl:inline">Recibo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingSale(sale)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Corregir venta (cliente, pago, cantidades)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSaleToDelete(sale);
                            setRestoreStockOnDelete(true);
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar o anular venta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for viewing past sale receipt */}
      {selectedReceiptSale && (
        <ReceiptModal
          sale={selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Modal for editing a sale */}
      {editingSale && (
        <SaleEditModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={updateSale}
        />
      )}

      {/* Modal for deleting/cancelling a sale */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  Anular / Eliminar Venta
                </h3>
                <p className="font-mono text-xs text-stone-500 font-bold">
                  {saleToDelete.id} • {formatCOP(saleToDelete.total)}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ¿Deseas eliminar permanentemente esta venta del historial financiero?
            </p>

            {/* Checkbox to return stock */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 block">
                    Devolver productos al stock del inventario
                  </span>
                  <span className="text-stone-500 text-[11px] block mt-0.5">
                    Se sumarán automáticamente +{saleToDelete.totalUnits} unidades a las existencias y se registrará el ajuste compensatorio.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Eliminar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
