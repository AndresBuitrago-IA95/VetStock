import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Receipt, 
  Sparkles,
  AlertCircle,
  Package,
  History
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, SaleItem, PaymentMethod } from '../types';
import { formatCOP, CATEGORY_COLORS } from '../utils/formatters';
import { ReceiptModal } from '../components/ReceiptModal';

export const SalesView: React.FC = () => {
  const { 
    products, 
    recordSale, 
    setActiveTab, 
    lastSaleReceipt, 
    setLastSaleReceipt,
    showToast,
    adminUser,
    userProfile
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');

  // Filter available products
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm)) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Categories list for chips
  const categories = useMemo(() => {
    const present = Array.from(new Set(products.map((p) => p.category)));
    return ['Todas', ...present];
  }, [products]);

  // Add item to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" está agotado en inventario`, 'error');
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.productId === product.id);
      if (existingIndex !== -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= product.stock) {
          showToast(`No puedes agregar más de ${product.stock} unidades de este producto`, 'warning');
          return prevCart;
        }
        const updated = [...prevCart];
        const newQty = currentQty + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: newQty * product.salePrice,
        };
        return updated;
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          category: product.category,
          photoUrl: product.photoUrl,
          quantity: 1,
          unitPrice: product.salePrice,
          unitCost: product.purchasePrice,
          subtotal: product.salePrice,
        };
        return [...prevCart, newItem];
      }
    });
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > product.stock) {
              showToast(`Stock máximo alcanzado (${product.stock} unidades)`, 'warning');
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.productId !== productId));
  };

  // Clear entire cart
  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('¿Deseas vaciar el carrito de venta?')) {
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerId('');
      setNotes('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  const numDiscount = Number(discount) || 0;
  const total = Math.max(0, subtotal - numDiscount);

  // Submit sale
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('El carrito está vacío. Agrega al menos un producto para registrar la venta.', 'warning');
      return;
    }

    // Verify stock availability
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || prod.stock < item.quantity) {
        showToast(`Stock insuficiente para "${item.productName}". Disponible: ${prod?.stock || 0}`, 'error');
        return;
      }
    }

    // Record sale
    recordSale({
      items: cart,
      totalUnits,
      subtotal,
      discount: numDiscount,
      total,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerId: customerId.trim() || undefined,
      user: adminUser?.name || userProfile.name || 'Administrador',
      status: 'completada',
      notes: notes.trim() || undefined,
    });

    // Reset cart
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setCustomerId('');
    setNotes('');
  };

  return (
    <div id="sales-pos-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Navigation to History */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              Nueva Venta (POS)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Registra ventas directas con descuento automático de inventario
            </p>
          </div>
        </div>

        <button
          id="btn-view-sales-history"
          type="button"
          onClick={() => setActiveTab('sales_history')}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <History className="w-4 h-4 text-stone-500" />
          Ver Historial de Ventas
        </button>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Product Catalog & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-xs flex items-center gap-3">
            <Search className="w-5 h-5 text-stone-400 shrink-0 ml-1" />
            <input
              id="pos-search-input"
              type="text"
              placeholder="Buscar producto por nombre, marca o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-stone-800 placeholder-stone-400 font-medium"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-stone-400 hover:text-stone-600 font-bold px-2"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid for POS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
            {availableProducts.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-stone-400 text-xs bg-white rounded-2xl border border-stone-200">
                No se encontraron productos disponibles para venta con los criterios actuales.
              </div>
            ) : (
              availableProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const inCart = cart.find((item) => item.productId === prod.id);

                return (
                  <div
                    key={prod.id}
                    id={`pos-card-${prod.id}`}
                    onClick={() => !isOutOfStock && handleAddToCart(prod)}
                    className={`bg-white rounded-2xl p-3 border transition-all flex gap-3 select-none ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-stone-200 bg-stone-50/50'
                        : inCart
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs cursor-pointer ring-1 ring-emerald-600/20'
                        : 'border-stone-200/80 hover:border-emerald-300 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100 relative">
                      <img
                        src={prod.photoUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                      {inCart && (
                        <div className="absolute inset-0 bg-emerald-700/80 text-white flex items-center justify-center text-xs font-black">
                          {inCart.quantity}x
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 truncate">
                            {prod.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : prod.stock <= prod.minStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {isOutOfStock ? 'Agotado' : `${prod.stock} disp.`}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900 text-xs mt-0.5 line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 truncate">
                          {prod.brand || 'Genérico'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-extrabold text-sm text-stone-900">
                          {formatCOP(prod.salePrice)}
                        </span>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-5 sticky top-20">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-stone-900 text-base">Carrito de Venta</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                {totalUnits}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                id="btn-clear-cart"
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-500 hover:text-rose-700 font-semibold hover:underline"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                <ShoppingCart className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                El carrito está vacío. Selecciona productos de la lista para agregarlos a la venta.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-stone-800 text-xs truncate">
                      {item.productName}
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      {formatCOP(item.unitPrice)} c/u
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Item Subtotal & Remove */}
                  <div className="text-right shrink-0">
                    <span className="font-bold text-stone-900 text-xs block">
                      {formatCOP(item.subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.productId)}
                      className="text-[10px] text-rose-500 hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer info (Optional) */}
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                Cliente / Comprador (Opcional)
              </label>
              <input
                id="input-pos-customer-name"
                type="text"
                placeholder="Ej: Carolina Restrepo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 font-medium"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tarjeta')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'tarjeta'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'transferencia'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-purple-700" />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Discount input */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                Descuento en pesos (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-400 text-xs">$</span>
                <input
                  id="input-pos-discount"
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Subtotal & Total Breakdown */}
          <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCOP(subtotal)}</span>
            </div>
            {numDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Descuento:</span>
                <span>-{formatCOP(numDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
              <span className="text-sm font-bold text-stone-900">Total a Pagar:</span>
              <span className="text-2xl font-extrabold text-emerald-800">
                {formatCOP(total)}
              </span>
            </div>
          </div>

          {/* Checkout Action Button */}
          <button
            id="btn-register-sale"
            type="button"
            disabled={cart.length === 0}
            onClick={handleCompleteSale}
            className={`w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all ${
              cart.length === 0
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white shadow-emerald-700/30'
            }`}
          >
            <Check className="w-5 h-5" />
            ✓ Registrar Venta
          </button>
        </div>
      </div>

      {/* Sale Receipt Modal (opens immediately on sale) */}
      {lastSaleReceipt && (
        <ReceiptModal
          sale={lastSaleReceipt}
          onClose={() => setLastSaleReceipt(null)}
        />
      )}
    </div>
  );
};
