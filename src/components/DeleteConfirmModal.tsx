import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName: string;
  itemDetails?: string;
  confirmButtonText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = '¿Eliminar producto del inventario?',
  itemName,
  itemDetails,
  confirmButtonText = 'Sí, eliminar producto',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="delete-confirm-modal-card"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 p-6 space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-stone-900 leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            ¿Estás seguro de que deseas eliminar <span className="font-bold text-stone-900">"{itemName}"</span>? Esta acción quitará el producto del catálogo y no estará disponible para facturar en el punto de venta.
          </p>
          {itemDetails && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 font-medium">
              {itemDetails}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
          <button
            id="cancel-delete-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="confirm-delete-modal-btn"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
