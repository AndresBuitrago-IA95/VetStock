import React from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  PackagePlus, 
  PlusCircle, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatCOP, formatDate, getDaysUntilExpiration } from '../utils/formatters';

export const AlertsView: React.FC = () => {
  const {
    outOfStockProducts,
    lowStockProducts,
    expiringProducts,
    setSelectedProductId,
    setIsDetailModalOpen,
    setActiveStockProduct,
    setIsStockEntryModalOpen,
    clinicSettings,
  } = useApp();

  const handleOpenProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setIsDetailModalOpen(true);
  };

  const handleStockEntry = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setActiveStockProduct(product);
    setIsStockEntryModalOpen(true);
  };

  return (
    <div id="alerts-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              Centro de Alertas
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Control de productos agotados, existencias mínimas y lotes próximos a caducar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200">
          <span>Regla de caducidad: <strong className="text-stone-900">{clinicSettings.expiringDaysThreshold} días</strong></span>
        </div>
      </div>

      {/* Group 1: 🔴 PRODUCTOS AGOTADOS */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              🔴
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Productos Agotados ({outOfStockProducts.length})
              </h3>
              <p className="text-xs text-rose-600 font-medium">Existencia cero en inventario</p>
            </div>
          </div>
        </div>

        {outOfStockProducts.length === 0 ? (
          <div className="py-6 text-center text-stone-400 text-xs flex items-center justify-center gap-2 bg-stone-50/50 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            No hay productos agotados actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outOfStockProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleOpenProduct(prod)}
                className="p-4 rounded-2xl border border-rose-200 bg-rose-50/20 hover:bg-rose-50/60 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={prod.photoUrl}
                    alt={prod.name}
                    className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-rose-200"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">
                      {prod.category}
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm truncate mt-0.5 group-hover:text-rose-700 transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-xs text-stone-500 truncate">
                      {prod.brand || 'Genérico'}
                    </p>
                    <p className="text-xs font-bold text-rose-600 mt-1">
                      0 unidades (Stock mín: {prod.minStock})
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-800">
                    {formatCOP(prod.salePrice)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleStockEntry(e, prod)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Ingresar stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group 2: 🟠 PRODUCTOS CON STOCK BAJO */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              🟠
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Productos con Stock Bajo ({lowStockProducts.length})
              </h3>
              <p className="text-xs text-amber-700 font-medium">Existencias iguales o menores al mínimo configurado</p>
            </div>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-6 text-center text-stone-400 text-xs flex items-center justify-center gap-2 bg-stone-50/50 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Todos los productos superan el stock mínimo configurado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleOpenProduct(prod)}
                className="p-4 rounded-2xl border border-amber-200 bg-amber-50/20 hover:bg-amber-50/60 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={prod.photoUrl}
                    alt={prod.name}
                    className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-amber-200"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">
                      {prod.category}
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm truncate mt-0.5 group-hover:text-amber-800 transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-xs text-stone-500 truncate">
                      {prod.brand || 'Genérico'}
                    </p>
                    <p className="text-xs font-bold text-amber-800 mt-1">
                      {prod.stock} unidades en stock (Mínimo: {prod.minStock})
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-800">
                    {formatCOP(prod.salePrice)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleStockEntry(e, prod)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Reponer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group 3: ⏰ PRODUCTOS PRÓXIMOS A VENCER */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-xs">
              ⏰
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Productos Próximos a Vencer ({expiringProducts.length})
              </h3>
              <p className="text-xs text-stone-600 font-medium">Lotes con fecha de caducidad en los próximos {clinicSettings.expiringDaysThreshold} días</p>
            </div>
          </div>
        </div>

        {expiringProducts.length === 0 ? (
          <div className="py-6 text-center text-stone-400 text-xs flex items-center justify-center gap-2 bg-stone-50/50 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            No hay productos que expiren pronto en inventario.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringProducts.map((prod) => {
              const days = getDaysUntilExpiration(prod.expirationDate);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProduct(prod)}
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/40 hover:bg-stone-100/60 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={prod.photoUrl}
                      alt={prod.name}
                      className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-stone-200"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-stone-800 uppercase">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm truncate mt-0.5 group-hover:text-emerald-700 transition-colors">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-stone-500 truncate">
                        {prod.stock} unidades en existencia
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <Calendar className="w-3.5 h-3.5 text-stone-600" />
                        <span>Vence: {formatDate(prod.expirationDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-stone-200 text-stone-900">
                      {days !== null && days <= 0 ? '¡Vencido!' : `Quedan ${days} días`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProduct(prod);
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                    >
                      Ver lote <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
