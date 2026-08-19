import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  User, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Tag, 
  FileText, 
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';
import { Sale, SaleItem, PaymentMethod } from '../types';
import { formatCOP } from '../utils/formatters';

interface SaleEditModalProps {
  sale: Sale;
  onClose: () => void;
  onSave: (saleId: string, updatedData: Partial<Sale>) => void;
}

export const SaleEditModal: React.FC<SaleEditModalProps> = ({
  sale,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [customerId, setCustomerId] = useState(sale.customerId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod || 'efectivo');
  const [discount, setDiscount] = useState<number | ''>(sale.discount || 0);
  const [notes, setNotes] = useState(sale.notes || '');
  const [date, setDate] = useState(sale.date ? sale.date.split('T')[0] : '');
  const [items, setItems] = useState<SaleItem[]>(sale.items);

  // Update item quantity inside the sale
  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) => {
      const updated = [...prev];
      const it = updated[index];
      const q = Math.max(1, newQty);
      updated[index] = {
        ...it,
        quantity: q,
        subtotal: q * it.unitPrice,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('La venta debe tener al menos un producto. Si deseas eliminar la venta completa, usa el botón "Eliminar / Anular Venta".');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const numDiscount = discount === '' ? 0 : Number(discount);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = Math.max(0, subtotal - numDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDate = date 
      ? new Date(`${date}T${sale.date.includes('T') ? sale.date.split('T')[1] : '12:00:00Z'}`).toISOString()
      : sale.date;

    onSave(sale.id, {
      customerName: customerName.trim() || undefined,
      customerId: customerId.trim() || undefined,
      paymentMethod,
      discount: numDiscount,
      notes: notes.trim() || undefined,
      date: updatedDate,
      items,
      subtotal,
      totalUnits,
      total,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200">
                {sale.id}
              </span>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Corregir Transacción
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-stone-900 mt-1">
              Editar Datos de la Venta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Customer & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Carolina Restrepo"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Fecha de la Venta
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Medio de Pago
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'efectivo'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-700" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('tarjeta')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'tarjeta'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-700" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transferencia')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'transferencia'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Smartphone className="w-5 h-5 text-purple-700" />
                <span>Transferencia</span>
              </button>
            </div>
          </div>

          {/* Sold Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-stone-400" />
                Productos Facturados ({items.length})
              </label>
              <span className="text-[11px] text-stone-400 font-medium">
                Ajusta cantidades o elimina líneas
              </span>
            </div>

            <div className="space-y-2 border border-stone-200 rounded-2xl p-3 bg-stone-50/60 max-h-56 overflow-y-auto">
              {items.map((item, idx) => (
                <div 
                  key={`${item.productId}-${idx}`}
                  className="bg-white p-3 rounded-xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900 truncate">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Unitario: {formatCOP(item.unitPrice)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal & Delete line */}
                  <div className="text-right shrink-0 min-w-20">
                    <span className="font-extrabold text-stone-900 block">
                      {formatCOP(item.subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                Descuento Aplicado (COP)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                Observaciones / Motivo de corrección
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Corrección de medio de pago / cambio de cliente"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500">
                Subtotal: <span className="font-semibold text-stone-700">{formatCOP(subtotal)}</span> • {totalUnits} unidades
              </p>
              {numDiscount > 0 && (
                <p className="text-xs text-rose-600 font-semibold">
                  Descuento: -{formatCOP(numDiscount)}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 font-bold uppercase block">Total Corregido:</span>
              <span className="text-xl font-extrabold text-emerald-900">
                {formatCOP(total)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios de la Venta
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
