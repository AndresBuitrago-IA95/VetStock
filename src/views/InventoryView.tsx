import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Download, 
  Package, 
  Barcode, 
  ArrowUpDown,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, Category, ProductStatus } from '../types';
import { 
  formatCOP, 
  formatDate, 
  getProductStatus, 
  getStatusBadge, 
  getDaysUntilExpiration, 
  CATEGORY_COLORS 
} from '../utils/formatters';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

const CATEGORIES_FILTER: (Category | 'Todas')[] = [
  'Todas',
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

const STATUS_FILTER: { label: string; value: ProductStatus | 'todos' }[] = [
  { label: 'Todos los estados', value: 'todos' },
  { label: '🟢 Disponible', value: 'disponible' },
  { label: '🟠 Stock bajo', value: 'stock_bajo' },
  { label: '🔴 Agotado', value: 'agotado' },
  { label: '⏰ Próximo a vencer', value: 'proximo_a_vencer' },
];

export const InventoryView: React.FC = () => {
  const {
    products,
    setIsProductModalOpen,
    setEditingProduct,
    setSelectedProductId,
    setIsDetailModalOpen,
    setActiveStockProduct,
    setIsStockEntryModalOpen,
    deleteProduct,
    clinicSettings,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todas'>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | 'todos'>('todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('Todas');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'exp'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['Todas', ...Array.from(set)];
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search term (name, brand, barcode, description)
        const matchSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.barcode && p.barcode.includes(searchTerm)) ||
          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

        // Category filter
        const matchCategory = selectedCategory === 'Todas' || p.category === selectedCategory;

        // Brand filter
        const matchBrand = selectedBrand === 'Todas' || p.brand === selectedBrand;

        // Status filter
        const currentStatus = getProductStatus(p, clinicSettings.expiringDaysThreshold);
        const matchStatus = selectedStatus === 'todos' || currentStatus === selectedStatus;

        return matchSearch && matchCategory && matchBrand && matchStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortBy === 'stock') {
          cmp = a.stock - b.stock;
        } else if (sortBy === 'price') {
          cmp = a.salePrice - b.salePrice;
        } else if (sortBy === 'exp') {
          cmp = (a.expirationDate || '9999').localeCompare(b.expirationDate || '9999');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [products, searchTerm, selectedCategory, selectedBrand, selectedStatus, sortBy, sortOrder, clinicSettings]);

  const handleOpenNew = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenDetail = (product: Product) => {
    setSelectedProductId(product.id);
    setIsDetailModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleQuickStock = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setActiveStockProduct(product);
    setIsStockEntryModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nombre',
      'Marca',
      'Categoria',
      'Presentacion',
      'Codigo_Barras',
      'Precio_Compra_COP',
      'Precio_Venta_COP',
      'Stock_Actual',
      'Stock_Minimo',
      'Vencimiento',
      'Proveedor',
      'Estado',
    ];

    const rows = filteredProducts.map((p) => {
      const status = getProductStatus(p, clinicSettings.expiringDaysThreshold);
      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${(p.presentation || '').replace(/"/g, '""')}"`,
        `"${p.barcode || ''}"`,
        p.purchasePrice,
        p.salePrice,
        p.stock,
        p.minStock,
        `"${p.expirationDate || ''}"`,
        `"${(p.supplier || '').replace(/"/g, '""')}"`,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_vetstock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="inventory-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Main Action */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Inventario
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Administra los productos, precios, existencias y fechas de vencimiento
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-export-inventory-csv"
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Descargar tabla en formato Excel/CSV"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            id="btn-new-product-main"
            type="button"
            onClick={handleOpenNew}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-700/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="search-inventory-input"
              type="text"
              placeholder="Buscar por nombre, código de barras o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category | 'Todas')}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              {CATEGORIES_FILTER.map((cat) => (
                <option key={cat} value={cat}>
                  Categoría: {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="sm:col-span-2">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ProductStatus | 'todos')}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              {STATUS_FILTER.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand filter */}
          <div className="sm:col-span-2">
            <select
              id="filter-brand-select"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 truncate"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  Marca: {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Chips and View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2 text-stone-500 font-medium">
            <span>Mostrando: <strong className="text-stone-900 font-bold">{filteredProducts.length}</strong> de {products.length} productos</span>
            {(selectedCategory !== 'Todas' || selectedStatus !== 'todos' || selectedBrand !== 'Todas' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSelectedStatus('todos');
                  setSelectedBrand('Todas');
                  setSearchTerm('');
                }}
                className="text-emerald-700 hover:underline font-semibold ml-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Vista en tabla"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW (Requisito estricto con todas las columnas) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="inventory-table" className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-600 border-b border-stone-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Foto</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-stone-900" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1.5">
                      Nombre / Marca
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Categoría</th>
                  <th className="py-3.5 px-3">P. Compra</th>
                  <th className="py-3.5 px-3 cursor-pointer hover:text-stone-900" onClick={() => { setSortBy('price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1.5">
                      P. Venta
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 cursor-pointer hover:text-stone-900" onClick={() => { setSortBy('stock'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1.5">
                      Stock
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Mínimo</th>
                  <th className="py-3.5 px-3 cursor-pointer hover:text-stone-900" onClick={() => { setSortBy('exp'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1.5">
                      Vencimiento
                      <ArrowUpDown className="w-3 h-3 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                          <Package className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-stone-800">
                          {products.length === 0 ? 'Inventario vacío y listo para operar' : 'No se encontraron productos coincidentes'}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {products.length === 0 
                            ? 'Tu base de datos está limpia. Comienza registrando tu primer producto o medicamento con sus precios y stock.' 
                            : 'Intenta ajustar el término de búsqueda o limpiar los filtros seleccionados.'}
                        </p>
                        {products.length === 0 && (
                          <button
                            type="button"
                            onClick={handleOpenNew}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Registrar Primer Producto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const status = getProductStatus(prod, clinicSettings.expiringDaysThreshold);
                    const badge = getStatusBadge(status);
                    const daysUntilExp = getDaysUntilExpiration(prod.expirationDate);

                    return (
                      <tr
                        key={prod.id}
                        onClick={() => handleOpenDetail(prod)}
                        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Foto */}
                        <td className="py-3 px-4">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                            <img
                              src={prod.photoUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>

                        {/* Nombre y Marca */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {prod.brand || 'Genérico'} {prod.presentation ? `• ${prod.presentation}` : ''}
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${CATEGORY_COLORS[prod.category] || 'bg-stone-100'}`}>
                            {prod.category}
                          </span>
                        </td>

                        {/* Precio de Compra */}
                        <td className="py-3 px-3 text-stone-600 font-medium whitespace-nowrap">
                          {formatCOP(prod.purchasePrice)}
                        </td>

                        {/* Precio de Venta */}
                        <td className="py-3 px-3 font-bold text-emerald-800 whitespace-nowrap">
                          {formatCOP(prod.salePrice)}
                        </td>

                        {/* Cantidad / Stock */}
                        <td className="py-3 px-3 font-extrabold text-sm whitespace-nowrap">
                          <span className={prod.stock <= prod.minStock ? 'text-amber-800 font-bold' : 'text-stone-800'}>
                            {prod.stock}
                          </span>
                        </td>

                        {/* Stock Mínimo */}
                        <td className="py-3 px-3 text-stone-500 whitespace-nowrap">
                          {prod.minStock}
                        </td>

                        {/* Vencimiento */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-stone-700 font-medium">
                            {prod.expirationDate ? formatDate(prod.expirationDate) : '—'}
                          </div>
                          {daysUntilExp !== null && daysUntilExp <= 60 && (
                            <div className="text-[10px] font-bold text-purple-800">
                              {daysUntilExp <= 0 ? 'Vencido' : `En ${daysUntilExp} d`}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 w-fit ${badge.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`quick-stock-btn-${prod.id}`}
                              type="button"
                              onClick={(e) => handleQuickStock(e, prod)}
                              title="Registrar entrada de stock"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              id={`edit-prod-btn-${prod.id}`}
                              type="button"
                              onClick={(e) => handleOpenEdit(e, prod)}
                              title="Editar producto"
                              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-prod-btn-${prod.id}`}
                              type="button"
                              onClick={(e) => handleDelete(e, prod)}
                              title="Eliminar producto"
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((prod) => {
            const status = getProductStatus(prod, clinicSettings.expiringDaysThreshold);
            const badge = getStatusBadge(status);
            return (
              <div
                key={prod.id}
                onClick={() => handleOpenDetail(prod)}
                className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 mb-3 border border-stone-100">
                    <img src={prod.photoUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs shadow-xs ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {prod.category}
                  </span>
                  <h3 className="font-bold text-stone-900 text-sm mt-0.5 line-clamp-2 leading-snug">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {prod.brand || 'Genérico'} {prod.presentation ? `• ${prod.presentation}` : ''}
                  </p>

                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase block">Precio</span>
                      <span className="font-extrabold text-emerald-800 text-sm">{formatCOP(prod.salePrice)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 text-[10px] uppercase block">Stock</span>
                      <span className={`font-extrabold text-sm ${prod.stock <= prod.minStock ? 'text-amber-800' : 'text-stone-900'}`}>
                        {prod.stock} <span className="text-xs font-normal text-stone-500">/ mín {prod.minStock}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400">
                    {prod.expirationDate ? `Vence: ${formatDate(prod.expirationDate)}` : 'Sin vencimiento'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleQuickStock(e, prod)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Entrada de stock"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(e, prod)}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, prod)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(productToDelete)}
          itemName={productToDelete.name}
          itemDetails={`Marca: ${productToDelete.brand || 'N/A'} • Categoría: ${productToDelete.category} • Existencia: ${productToDelete.stock} unidades • Precio: ${formatCOP(productToDelete.salePrice)}`}
          onConfirm={handleConfirmDelete}
          onClose={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
};
