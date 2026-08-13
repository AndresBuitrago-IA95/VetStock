import { Product, ProductStatus } from '../types';

/**
 * Formats a number into Colombian Peso (COP) currency string
 * e.g., 1245000 -> "$ 1.245.000"
 */
export function formatCOP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
  
  // Format with space after $
  return formatted.replace('COP', '').trim();
}

/**
 * Calculate the status of a product based on current stock, min stock, and expiration date
 */
export function getProductStatus(product: Product, thresholdDays: number = 45): ProductStatus {
  if (product.stock <= 0) {
    return 'agotado';
  }

  if (product.expirationDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(product.expirationDate + 'T00:00:00');
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= thresholdDays) {
      return 'proximo_a_vencer';
    }
  }

  if (product.stock <= product.minStock) {
    return 'stock_bajo';
  }

  return 'disponible';
}

/**
 * Get days remaining until expiration
 */
export function getDaysUntilExpiration(expirationDateStr: string): number | null {
  if (!expirationDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDateStr + 'T00:00:00');
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats date into readable Spanish string
 */
export function formatDate(dateString: string, includeTime: boolean = false): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
    };
    return new Intl.DateTimeFormat('es-CO', options).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Status visual badge configurations
 */
export function getStatusBadge(status: ProductStatus) {
  switch (status) {
    case 'disponible':
      return {
        label: 'Disponible',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: '🟢',
      };
    case 'stock_bajo':
      return {
        label: 'Stock bajo',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        icon: '🟠',
      };
    case 'agotado':
      return {
        label: 'Agotado',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        icon: '🔴',
      };
    case 'proximo_a_vencer':
      return {
        label: 'Próximo a vencer',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-500',
        icon: '⏰',
      };
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  Medicamentos: 'bg-blue-50 text-blue-800 border-blue-200/80',
  Antiparasitarios: 'bg-teal-50 text-teal-800 border-teal-200/80',
  Alimentos: 'bg-amber-50 text-amber-800 border-amber-200/80',
  Higiene: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
  Accesorios: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
  Suplementos: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  Otros: 'bg-stone-100 text-stone-700 border-stone-200/80',
};
