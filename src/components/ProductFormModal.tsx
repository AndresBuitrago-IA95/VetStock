import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Check, Package, DollarSign, Tag, Calendar, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Category, Product } from '../types';
import { PhotoCaptureModal } from './PhotoCaptureModal';

const CATEGORIES: Category[] = [
  'Alimentos y Bebidas',
  'Higiene y Aseo',
  'Salud y Farmacia',
  'Herramientas',
  'Tecnología y Accesorios',
  'Hogar y Oficina',
  'Cuidado Personal',
  'Medicamentos',
  'Antiparasitarios',
  'Alimentos',
  'Higiene',
  'Accesorios',
  'Suplementos',
  'Otros',
];

export const ProductFormModal: React.FC = () => {
  const {
    isProductModalOpen,
    setIsProductModalOpen,
    editingProduct,
    setEditingProduct,
    addProduct,
    updateProduct,
    clinicSettings,
  } = useApp();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('Alimentos y Bebidas');
  const [presentation, setPresentation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [minStock, setMinStock] = useState<number | ''>(clinicSettings.defaultMinStock || 5);
  const [expirationDate, setExpirationDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setBrand(editingProduct.brand || '');
      setCategory(editingProduct.category);
      setPresentation(editingProduct.presentation || '');
      setBarcode(editingProduct.barcode || '');
      setDescription(editingProduct.description || '');
      setPurchasePrice(editingProduct.purchasePrice);
      setSalePrice(editingProduct.salePrice);
      setStock(editingProduct.stock);
      setMinStock(editingProduct.minStock);
      setExpirationDate(editingProduct.expirationDate || '');
      setSupplier(editingProduct.supplier || '');
      setPhotoUrl(editingProduct.photoUrl || '');
    } else {
      setName('');
      setBrand('');
      setCategory('Alimentos y Bebidas');
      setPresentation('');
      setBarcode('');
      setDescription('');
      setPurchasePrice('');
      setSalePrice('');
      setStock('');
      setMinStock(clinicSettings.defaultMinStock || 5);
      setExpirationDate('');
      setSupplier('');
      setPhotoUrl('');
    }
    setErrors({});
  }, [editingProduct, isProductModalOpen, clinicSettings]);

  if (!isProductModalOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'El nombre del producto es obligatorio';
    if (!category) newErrors.category = 'Selecciona una categoría';
    if (purchasePrice === '' || Number(purchasePrice) < 0) newErrors.purchasePrice = 'Ingresa un precio de compra válido';
    if (salePrice === '' || Number(salePrice) < 0) newErrors.salePrice = 'Ingresa un precio de venta válido';
    if (stock === '' || Number(stock) < 0) newErrors.stock = 'Ingresa la cantidad en existencia';
    if (minStock === '' || Number(minStock) < 0) newErrors.minStock = 'Ingresa el stock mínimo';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      presentation: presentation.trim(),
      barcode: barcode.trim(),
      description: description.trim(),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      stock: Number(stock),
      minStock: Number(minStock),
      expirationDate,
      supplier: supplier.trim(),
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400',
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
    } else {
      addProduct(payload);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleClose = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Quick margin calculation
  const marginPercentage = (purchasePrice && salePrice && Number(purchasePrice) > 0)
    ? (((Number(salePrice) - Number(purchasePrice)) / Number(purchasePrice)) * 100).toFixed(1)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
        <div 
          id="product-form-modal"
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-stone-200 my-auto animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h2>
                <p className="text-xs text-stone-500">
                  {editingProduct
                    ? 'Modifica los datos del producto seleccionado'
                    : 'Ingresa los datos del producto para el catálogo de inventario'}
                </p>
              </div>
            </div>
            <button
              id="close-product-form-btn"
              onClick={handleClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Form Body */}
          <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
            
            {/* 1. SECCIÓN FOTOGRAFÍA DEL PRODUCTO (Requisito estricto: área grande con botones de tomar y subir) */}
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-stone-200/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
                    Fotografía del Producto
                  </h3>
                </div>
                <span className="text-xs text-stone-400">
                  (Cámara o archivo • Sin análisis de IA)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Photo Preview Canvas */}
                <div className="sm:col-span-4 flex justify-center">
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-stone-200 border-2 border-dashed border-stone-300 flex items-center justify-center group shadow-xs">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 text-stone-400">
                        <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-[11px] font-medium block">Sin fotografía</span>
                      </div>
                    )}
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Quitar imagen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo Actions */}
                <div className="sm:col-span-8 space-y-2.5">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Puedes tomar la foto directamente con la cámara del celular/computador o cargar una imagen desde tus archivos.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      id="btn-take-photo"
                      type="button"
                      onClick={() => setIsPhotoPickerOpen(true)}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Tomar fotografía
                    </button>
                    <button
                      id="btn-upload-photo"
                      type="button"
                      onClick={() => setIsPhotoPickerOpen(true)}
                      className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Subir fotografía
                    </button>
                  </div>
                  {photoUrl && (
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Fotografía asignada correctamente
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. DATOS PRINCIPALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nombre del producto <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="Ej: Bravecto 10–20 kg, Royal Canin Adult..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 ${
                    errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Marca / Laboratorio
                </label>
                <input
                  id="input-product-brand"
                  type="text"
                  placeholder="Ej: MSD, Zoetis, Royal Canin, Virbac..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Categoría <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-product-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Presentación
                </label>
                <input
                  id="input-product-presentation"
                  type="text"
                  placeholder="Ej: Caja x 1 tab, Frasco 250ml, Bulto 15kg..."
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Código de barras / SKU
                </label>
                <input
                  id="input-product-barcode"
                  type="text"
                  placeholder="Ej: 7701234567890"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>

            {/* 3. PRECIOS Y COSTOS (COP) */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Precios y Margen (Pesos Colombianos - COP)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Precio de compra (Costo) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                    <input
                      id="input-product-purchase-price"
                      type="number"
                      min="0"
                      step="500"
                      required
                      placeholder="68.000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                  </div>
                  {errors.purchasePrice && <p className="text-xs text-rose-500 mt-1">{errors.purchasePrice}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Precio de venta al público <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                    <input
                      id="input-product-sale-price"
                      type="number"
                      min="0"
                      step="500"
                      required
                      placeholder="89.000"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                  </div>
                  {errors.salePrice && <p className="text-xs text-rose-500 mt-1">{errors.salePrice}</p>}
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs flex flex-col justify-center h-10.5">
                    <span className="text-stone-500">Margen estimado:</span>
                    <span className="font-bold text-emerald-800">
                      {marginPercentage ? `+${marginPercentage}% de ganancia` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. INVENTARIO Y STOCK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Cantidad actual (Stock) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-product-stock"
                  type="number"
                  min="0"
                  required
                  placeholder="10"
                  value={stock}
                  onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
                {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Stock mínimo (Alerta) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-product-min-stock"
                  type="number"
                  min="0"
                  required
                  placeholder="5"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
                {errors.minStock && <p className="text-xs text-rose-500 mt-1">{errors.minStock}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Fecha de vencimiento
                </label>
                <div className="relative">
                  <input
                    id="input-product-expiration"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* 5. PROVEEDOR Y DESCRIPCIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Proveedor / Distribuidor
                </label>
                <input
                  id="input-product-supplier"
                  type="text"
                  placeholder="Ej: Distribuidora Nacional Andina S.A.S."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Descripción o especificaciones
                </label>
                <textarea
                  id="input-product-description"
                  rows={2}
                  placeholder="Especificaciones, características o notas del producto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                id="cancel-product-btn"
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                id="save-product-btn"
                type="submit"
                className="px-6 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                {editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera / Upload Submodal */}
      {isPhotoPickerOpen && (
        <PhotoCaptureModal
          currentPhotoUrl={photoUrl}
          onPhotoSelected={(url) => setPhotoUrl(url)}
          onClose={() => setIsPhotoPickerOpen(false)}
        />
      )}
    </>
  );
};
