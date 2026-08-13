import React, { useState } from 'react';
import { PlusCircle, X, Check, PackageCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCOP } from '../utils/formatters';

export const StockEntryModal: React.FC = () => {
  const {
    isStockEntryModalOpen,
    setIsStockEntryModalOpen,
    activeStockProduct,
    setActiveStockProduct,
    addStockMovement,
  } = useApp();

  const [quantity, setQuantity] = useState<number | ''>(10);
  const [reason, setReason] = useState('Compra a proveedor / Reposición');
  const [supplierDoc, setSupplierDoc] = useState('');

  if (!isStockEntryModalOpen || !activeStockProduct) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) return;

    const fullReason = supplierDoc.trim()
      ? `${reason} (Factura/Doc: ${supplierDoc.trim()})`
      : reason;

    addStockMovement(activeStockProduct.id, Number(quantity), fullReason, 'entrada');
    setIsStockEntryModalOpen(false);
    setActiveStockProduct(null);
  };

  const handleClose = () => {
    setIsStockEntryModalOpen(false);
    setActiveStockProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div 
        id="stock-entry-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Registrar Entrada de Stock</h3>
              <p className="text-xs text-stone-500">Aumenta las existencias en inventario</p>
            </div>
          </div>
          <button
            id="close-stock-entry-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target product summary card */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <img
              src={activeStockProduct.photoUrl}
              alt={activeStockProduct.name}
              className="w-12 h-12 rounded-lg object-cover bg-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-stone-900 text-sm truncate">{activeStockProduct.name}</h4>
              <p className="text-xs text-stone-500">{activeStockProduct.brand || activeStockProduct.category}</p>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-stone-600">Stock actual: <strong className="text-stone-900">{activeStockProduct.stock}</strong></span>
                <span className="text-emerald-800 font-semibold">{formatCOP(activeStockProduct.purchasePrice)} c/u</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Cantidad de unidades a ingresar <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="input-stock-entry-qty"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-base font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-medium">unidades</span>
            </div>
            {Number(quantity) > 0 && (
              <p className="text-xs text-stone-500 mt-1">
                Nuevo stock total: <strong className="text-emerald-800">{activeStockProduct.stock + Number(quantity)} unidades</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Motivo o concepto
            </label>
            <select
              id="select-stock-entry-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="Compra a proveedor / Reposición">Compra a proveedor / Reposición</option>
              <option value="Devolución de cliente">Devolución de cliente</option>
              <option value="Ajuste positivo por conteo físico">Ajuste positivo por conteo físico</option>
              <option value="Donación o muestra médica">Donación o muestra médica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Número de factura / Orden / Referencia
            </label>
            <input
              id="input-stock-entry-doc"
              type="text"
              placeholder="Ej: Factura Proveedor #FP-9821"
              value={supplierDoc}
              onChange={(e) => setSupplierDoc(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              id="cancel-stock-entry-btn"
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              id="save-stock-entry-btn"
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Confirmar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
