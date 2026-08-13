export type Category = 
  | 'Alimentos y Bebidas'
  | 'Higiene y Aseo'
  | 'Salud y Farmacia'
  | 'Herramientas'
  | 'Tecnología y Accesorios'
  | 'Hogar y Oficina'
  | 'Cuidado Personal'
  | 'Medicamentos'
  | 'Antiparasitarios'
  | 'Alimentos'
  | 'Higiene'
  | 'Accesorios'
  | 'Suplementos'
  | 'Otros';

export type ProductStatus = 'disponible' | 'stock_bajo' | 'agotado' | 'proximo_a_vencer';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  presentation: string;
  barcode: string;
  description: string;
  purchasePrice: number; // En COP
  salePrice: number;     // En COP
  stock: number;
  minStock: number;
  expirationDate: string; // YYYY-MM-DD
  supplier: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'entrada' | 'venta' | 'ajuste';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  date: string; // ISO string
  type: StockMovementType;
  quantity: number; // Positivo para entrada, negativo para venta
  reason: string;
  saleId?: string;
  user: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: Category;
  photoUrl: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'credito' | 'otro';

export interface Sale {
  id: string;
  date: string; // ISO string
  items: SaleItem[];
  totalUnits: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerId?: string;
  user: string;
  status: 'completada' | 'anulada';
  notes?: string;
}

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  nit: string;
  logoUrl?: string;
  defaultMinStock: number;
  expiringDaysThreshold: number;
  currencySymbol: string;
}

export type AdminRole = 'SuperAdmin' | 'Administrador' | 'Supervisor' | 'Cajero' | 'Auxiliar';

export interface AdminPermissions {
  canManageAdmins: boolean;
  canEditInventory: boolean;
  canSell: boolean;
  canEditSales: boolean;
  canViewReports: boolean;
  canDeleteProducts: boolean;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  status: 'activo' | 'inactivo';
  phone?: string;
  permissions: AdminPermissions;
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  avatarUrl: string;
  provider: 'google';
  loggedAt: string;
  permissions: AdminPermissions;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'inventory' 
  | 'sales' 
  | 'sales_history' 
  | 'reports' 
  | 'alerts' 
  | 'admins' 
  | 'settings';
