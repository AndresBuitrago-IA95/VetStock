import React, { useEffect } from 'react';
import { X, Printer, CheckCircle2, Download, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Sale } from '../types';
import { useApp } from '../context/AppContext';
import { formatCOP, formatDate } from '../utils/formatters';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { clinicSettings } = useApp();

  useEffect(() => {
    // Trigger festive confetti on new sale receipt
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#34d399', '#f59e0b'],
      });
    } catch {
      // Ignore if canvas-confetti fails in test/headless
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div 
        id="receipt-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base">Comprobante de Venta</h3>
          </div>
          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt */}
        <div className="p-6 overflow-y-auto space-y-4 text-stone-800 text-xs font-mono bg-white">
          {/* Clinic Branding */}
          <div className="text-center pb-3 border-b border-dashed border-stone-300">
            <div className="font-sans font-extrabold text-base text-stone-900 mb-0.5">
              {clinicSettings.name}
            </div>
            <p className="text-[11px] text-stone-500 font-sans">{clinicSettings.address}</p>
            <p className="text-[11px] text-stone-500 font-sans">Tel: {clinicSettings.phone}</p>
            <p className="text-[11px] text-stone-500 font-sans">NIT: {clinicSettings.nit}</p>
          </div>

          {/* Sale details */}
          <div className="space-y-1 py-1 border-b border-dashed border-stone-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Recibo #:</span>
              <span className="font-bold">{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Fecha:</span>
              <span>{formatDate(sale.date, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Atendido por:</span>
              <span>{sale.user}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span className="text-stone-500">Cliente:</span>
                <span className="font-semibold">{sale.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">Método de pago:</span>
              <span className="uppercase font-semibold text-emerald-800">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="py-2 space-y-2 border-b border-dashed border-stone-300">
            <div className="flex justify-between text-stone-500 text-[10px] uppercase font-semibold">
              <span>Cant. / Producto</span>
              <span>Subtotal</span>
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-sans font-medium text-stone-800 leading-tight">
                    {item.quantity}x {item.productName}
                  </p>
                  <span className="text-[10px] text-stone-500">
                    {formatCOP(item.unitPrice)} c/u
                  </span>
                </div>
                <span className="font-bold text-stone-900 shrink-0">
                  {formatCOP(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span>{formatCOP(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Descuento aplicado:</span>
                <span>-{formatCOP(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-2 border-t border-stone-900">
              <span>TOTAL PAGADO:</span>
              <span className="text-emerald-800 text-base">{formatCOP(sale.total)}</span>
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center pt-3 text-stone-500 text-[11px] font-sans">
            <p>¡Gracias por su compra en {clinicSettings.name}!</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Comprobante de venta para control y garantía.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
          <button
            id="close-receipt-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/60 rounded-xl"
          >
            Cerrar
          </button>
          <button
            id="print-receipt-btn"
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
};
