import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Calendar, 
  Barcode, 
  Truck, 
  Tag, 
  Layers, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCOP, formatDate, getProductStatus, getStatusBadge, getDaysUntilExpiration, CATEGORY_COLORS } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const ProductDetailModal: React.FC = () => {
  const {
    isDetailModalOpen,
    setIsDetailModalOpen,
    selectedProductId,
    setSelectedProductId,
    products,
    stockMovements,
    setEditingProduct,
    setIsProductModalOpen,
    setActiveStockProduct,
    setIsStockEntryModalOpen,
    deleteProduct,
    clinicSettings,
  } = useApp();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!isDetailModalOpen || !selectedProductId) return null;

  const product = products.find((p) => p.id === selectedProductId);
  if (!product) return null;

  const status = getProductStatus(product, clinicSettings.expiringDaysThreshold);
  const badge = getStatusBadge(status);
  const daysUntilExp = getDaysUntilExpiration(product.expirationDate);

  // Filter movements for this product
  const movements = stockMovements.filter((m) => m.productId === product.id);

  const handleEdit = () => {
    setIsDetailModalOpen(false);
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleStockEntry = () => {
    setActiveStockProduct(product);
    setIsStockEntryModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteProduct(product.id);
    setIsDetailModalOpen(false);
    setSelectedProductId(null);
  };

  const handleClose = () => {
    setIsDetailModalOpen(false);
    setSelectedProductId(null);
  };

  const profitMargin = product.purchasePrice > 0
    ? (((product.salePrice - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="product-detail-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-stone-200 my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badge.color}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
              {badge.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${CATEGORY_COLORS[product.category] || 'bg-stone-100'}`}>
              {product.category}
            </span>
          </div>
          <button
            id="close-product-detail-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          
          {/* Top section: Large image and key information */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            <div className="sm:col-span-5">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs">
                <img
                  src={product.photoUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="sm:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
                  {product.brand || 'Marca no especificada'}
                </span>
                <h2 className="text-2xl font-bold text-stone-900 mt-0.5 leading-tight">
                  {product.name}
                </h2>
                {product.presentation && (
                  <p className="text-xs text-stone-500 mt-1 font-medium">
                    Presentación: {product.presentation}
                  </p>
                )}
              </div>

              {/* Price & stock cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider block">
                    Precio de venta
                  </span>
                  <span className="text-xl font-extrabold text-emerald-800 block mt-0.5">
                    {formatCOP(product.salePrice)}
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Costo: {formatCOP(product.purchasePrice)} ({profitMargin}% margen)
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${product.stock <= product.minStock ? 'bg-amber-50/50 border-amber-200' : 'bg-stone-50 border-stone-200'}`}>
                  <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider block">
                    Stock en existencia
                  </span>
                  <span className={`text-xl font-extrabold block mt-0.5 ${product.stock <= product.minStock ? 'text-amber-800' : 'text-stone-900'}`}>
                    {product.stock} <span className="text-xs font-normal text-stone-500">unidades</span>
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Stock mínimo: {product.minStock} unidades
                  </span>
                </div>
              </div>

              {/* Attributes list */}
              <div className="space-y-2 text-xs text-stone-600 pt-1">
                {product.barcode && (
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-stone-400" />
                    <span>Código de barras: <strong className="font-mono text-stone-800">{product.barcode}</strong></span>
                  </div>
                )}
                {product.expirationDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <span>Vencimiento: <strong className="text-stone-800">{formatDate(product.expirationDate)}</strong></span>
                    {daysUntilExp !== null && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${daysUntilExp <= 30 ? 'bg-rose-100 text-rose-800' : daysUntilExp <= 60 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
                        {daysUntilExp <= 0 ? 'Vencido' : `Vence en ${daysUntilExp} días`}
                      </span>
                    )}
                  </div>
                )}
                {product.supplier && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-stone-400" />
                    <span>Proveedor: <strong className="text-stone-800">{product.supplier}</strong></span>
                  </div>
                )}
              </div>

              {product.description && (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 leading-relaxed border border-stone-200">
                  <p className="font-semibold text-stone-700 mb-1">Descripción:</p>
                  {product.description}
                </div>
              )}
            </div>
          </div>

          {/* Historial de movimientos (Requisito estricto) */}
          <div className="border-t border-stone-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
                  Historial de Movimientos de Inventario
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                {movements.length} registro{movements.length === 1 ? '' : 's'}
              </span>
            </div>

            {movements.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-4 bg-stone-50 rounded-xl">
                No hay movimientos registrados para este producto todavía.
              </p>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Cantidad</th>
                      <th className="py-2.5 px-3">Concepto / Motivo</th>
                      <th className="py-2.5 px-3">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {movements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                          {formatDate(mov.date, true)}
                        </td>
                        <td className="py-2.5 px-3">
                          {mov.type === 'entrada' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" /> Entrada
                            </span>
                          ) : mov.type === 'venta' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-300">
                              <ArrowUpRight className="w-3 h-3" /> Venta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                              Ajuste
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={mov.quantity > 0 ? 'text-emerald-700' : 'text-stone-800'}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} unidades
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">
                          {mov.reason}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500">
                          {mov.user}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action buttons (Requisito estricto: [Editar producto] [Registrar entrada] [Eliminar producto]) */}
          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <button
              id="delete-product-detail-btn"
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar producto
            </button>

            <div className="flex items-center gap-2.5">
              <button
                id="entry-product-detail-btn"
                type="button"
                onClick={handleStockEntry}
                className="px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar entrada
              </button>
              <button
                id="edit-product-detail-btn"
                type="button"
                onClick={handleEdit}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Editar producto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-app Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        itemName={product.name}
        itemDetails={`Categoría: ${product.category} • Existencia: ${product.stock} unidades • Precio: ${formatCOP(product.salePrice)}`}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
