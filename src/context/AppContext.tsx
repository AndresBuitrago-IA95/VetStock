import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Product, 
  StockMovement, 
  Sale, 
  ClinicSettings, 
  UserProfile, 
  AdminUser, 
  AdminAccount, 
  ActiveTab 
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_STOCK_MOVEMENTS, 
  INITIAL_SALES, 
  INITIAL_CLINIC_SETTINGS, 
  INITIAL_USER_PROFILE,
  INITIAL_ADMIN_ACCOUNTS,
  SUPER_ADMIN_EMAIL,
  DEMO_PRODUCTS,
  DEMO_STOCK_MOVEMENTS,
  DEMO_SALES
} from '../data/mockData';
import { getProductStatus } from '../utils/formatters';

export interface DatabaseStats {
  adminEmail: string;
  clinicName: string;
  productsCount: number;
  salesCount: number;
  movementsCount: number;
  totalRevenue: number;
  totalUnitsInStock: number;
}

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  clinicSettings: ClinicSettings;
  userProfile: UserProfile;
  adminUser: AdminUser | null;
  adminAccounts: AdminAccount[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  
  // Multi-tenant / Independent DB info
  activeTenantEmail: string;
  getAdminDatabaseStats: (email: string) => DatabaseStats;
  switchActiveDatabase: (adminEmail: string) => void;
  loadDemoData: () => void;
  clearActiveDatabase: () => void;
  importDatabaseBackup: (backupJson: any) => boolean;

  // Auth actions
  loginWithGoogle: (email?: string, name?: string, avatarUrl?: string) => { success: boolean; message: string };
  logoutAdmin: () => void;
  
  // SuperAdmin Account Management Actions
  addAdminAccount: (data: Omit<AdminAccount, 'id' | 'createdAt'>) => AdminAccount;
  updateAdminAccount: (id: string, data: Partial<AdminAccount>) => void;
  deleteAdminAccount: (id: string) => void;
  toggleAdminStatus: (id: string) => void;
  
  // Selected product & modals
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  isProductModalOpen: boolean;
  setIsProductModalOpen: (open: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (product: Product | null) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  isStockEntryModalOpen: boolean;
  setIsStockEntryModalOpen: (open: boolean) => void;
  activeStockProduct: Product | null;
  setActiveStockProduct: (product: Product | null) => void;
  lastSaleReceipt: Sale | null;
  setLastSaleReceipt: (sale: Sale | null) => void;

  // Inventory & Sales Actions
  addProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addStockMovement: (productId: string, quantity: number, reason: string, type?: 'entrada' | 'ajuste') => void;
  recordSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
  updateSale: (saleId: string, updatedData: Partial<Sale>) => void;
  deleteSale: (saleId: string, restoreStock?: boolean) => void;
  updateClinicSettings: (settings: Partial<ClinicSettings>) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  resetToMockData: () => void;
  
  // Computed alerts
  outOfStockProducts: Product[];
  lowStockProducts: Product[];
  expiringProducts: Product[];
  totalAlertsCount: number;

  // Toast notifications
  toastMessage: string | null;
  toastType: 'success' | 'info' | 'warning' | 'error';
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for generating storage keys per admin / veterinary tenant
export const getTenantStorageKey = (adminEmail: string, key: 'products' | 'movements' | 'sales' | 'settings' | 'user') => {
  const clean = (adminEmail || SUPER_ADMIN_EMAIL).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  return `stockpro_tenant_${clean}_${key}`;
};

const GLOBAL_STORAGE_KEYS = {
  ADMIN_AUTH: 'stockpro_admin_auth_v3',
  ADMIN_ACCOUNTS: 'stockpro_admin_accounts_v4',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Admin accounts list (Managed by SuperAdmin - starts only with SuperAdmin)
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.ADMIN_ACCOUNTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure super admin is always present and remove legacy test accounts
        const filtered = parsed.filter(
          (a: AdminAccount) => a.email !== 'marcela.admin@almacencentral.co' && a.email !== 'carlos.ventas@almacencentral.co'
        );
        const hasSuper = filtered.some((a: AdminAccount) => a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
        if (!hasSuper) {
          return [INITIAL_ADMIN_ACCOUNTS[0], ...filtered];
        }
        return filtered;
      }
      return INITIAL_ADMIN_ACCOUNTS;
    } catch {
      return INITIAL_ADMIN_ACCOUNTS;
    }
  });

  // Admin authentication state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.ADMIN_AUTH);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active database tenant (default to logged-in admin email or SuperAdmin)
  const [activeTenantEmail, setActiveTenantEmail] = useState<string>(() => {
    return adminUser?.email || SUPER_ADMIN_EMAIL;
  });

  // Keep activeTenantEmail in sync when admin logs in
  useEffect(() => {
    if (adminUser?.email) {
      setActiveTenantEmail(adminUser.email);
    }
  }, [adminUser?.email]);

  // Load isolated state for the current active tenant
  const loadTenantProducts = (email: string): Product[] => {
    try {
      const key = getTenantStorageKey(email, 'products');
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_PRODUCTS; // Clean empty array []
    } catch {
      return [];
    }
  };

  const loadTenantMovements = (email: string): StockMovement[] => {
    try {
      const key = getTenantStorageKey(email, 'movements');
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_STOCK_MOVEMENTS; // Clean empty array []
    } catch {
      return [];
    }
  };

  const loadTenantSales = (email: string): Sale[] => {
    try {
      const key = getTenantStorageKey(email, 'sales');
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_SALES; // Clean empty array []
    } catch {
      return [];
    }
  };

  const loadTenantSettings = (email: string): ClinicSettings => {
    try {
      const key = getTenantStorageKey(email, 'settings');
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      // Personalized veterinary default for this admin
      const matchedAccount = adminAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      const adminName = matchedAccount?.name || 'Principal';
      return {
        ...INITIAL_CLINIC_SETTINGS,
        name: email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() 
          ? 'Veterinaria & Almacén Central' 
          : `Veterinaria ${adminName}`,
        email: email,
      };
    } catch {
      return INITIAL_CLINIC_SETTINGS;
    }
  };

  const loadTenantUser = (email: string): UserProfile => {
    try {
      const key = getTenantStorageKey(email, 'user');
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      const matchedAccount = adminAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      return {
        name: matchedAccount?.name || 'Administrador',
        email: email,
        role: matchedAccount?.role || 'Administrador',
        avatarUrl: matchedAccount?.avatarUrl || INITIAL_USER_PROFILE.avatarUrl,
      };
    } catch {
      return INITIAL_USER_PROFILE;
    }
  };

  // State instances for active tenant
  const [products, setProducts] = useState<Product[]>(() => loadTenantProducts(activeTenantEmail));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadTenantMovements(activeTenantEmail));
  const [sales, setSales] = useState<Sale[]>(() => loadTenantSales(activeTenantEmail));
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(() => loadTenantSettings(activeTenantEmail));
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadTenantUser(activeTenantEmail));

  // Reload isolated data when activeTenantEmail changes
  useEffect(() => {
    setProducts(loadTenantProducts(activeTenantEmail));
    setStockMovements(loadTenantMovements(activeTenantEmail));
    setSales(loadTenantSales(activeTenantEmail));
    setClinicSettings(loadTenantSettings(activeTenantEmail));
    setUserProfile(loadTenantUser(activeTenantEmail));
  }, [activeTenantEmail]);

  // Persist tenant state to its dedicated partition
  useEffect(() => {
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'products');
      localStorage.setItem(key, JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save error products:', e);
    }
  }, [products, activeTenantEmail]);

  useEffect(() => {
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'movements');
      localStorage.setItem(key, JSON.stringify(stockMovements));
    } catch (e) {
      console.warn('LocalStorage save error movements:', e);
    }
  }, [stockMovements, activeTenantEmail]);

  useEffect(() => {
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'sales');
      localStorage.setItem(key, JSON.stringify(sales));
    } catch (e) {
      console.warn('LocalStorage save error sales:', e);
    }
  }, [sales, activeTenantEmail]);

  useEffect(() => {
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'settings');
      localStorage.setItem(key, JSON.stringify(clinicSettings));
    } catch (e) {
      console.warn('LocalStorage save error settings:', e);
    }
  }, [clinicSettings, activeTenantEmail]);

  useEffect(() => {
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'user');
      localStorage.setItem(key, JSON.stringify(userProfile));
    } catch (e) {
      console.warn('LocalStorage save error user:', e);
    }
  }, [userProfile, activeTenantEmail]);

  // Global persistence for admin accounts & auth
  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(adminAccounts));
    } catch (e) {
      console.warn('LocalStorage save error accounts:', e);
    }
  }, [adminAccounts]);

  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem(GLOBAL_STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(adminUser));
      } else {
        localStorage.removeItem(GLOBAL_STORAGE_KEYS.ADMIN_AUTH);
      }
    } catch (e) {
      console.warn('LocalStorage save error auth:', e);
    }
  }, [adminUser]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
  const [activeStockProduct, setActiveStockProduct] = useState<Product | null>(null);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<Sale | null>(null);

  const isSuperAdmin = adminUser?.isSuperAdmin ?? (adminUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

  // Function to inspect any admin's database stats
  const getAdminDatabaseStats = useCallback((email: string): DatabaseStats => {
    try {
      const pKey = getTenantStorageKey(email, 'products');
      const sKey = getTenantStorageKey(email, 'sales');
      const mKey = getTenantStorageKey(email, 'movements');
      const setKey = getTenantStorageKey(email, 'settings');

      const pData: Product[] = JSON.parse(localStorage.getItem(pKey) || '[]');
      const sData: Sale[] = JSON.parse(localStorage.getItem(sKey) || '[]');
      const mData: StockMovement[] = JSON.parse(localStorage.getItem(mKey) || '[]');
      const setData: ClinicSettings = JSON.parse(localStorage.getItem(setKey) || '{}');

      const totalRev = sData.reduce((acc, s) => acc + (s.status !== 'anulada' ? s.total : 0), 0);
      const totalUnits = pData.reduce((acc, p) => acc + p.stock, 0);

      return {
        adminEmail: email,
        clinicName: setData.name || 'Veterinaria / Negocio',
        productsCount: pData.length,
        salesCount: sData.length,
        movementsCount: mData.length,
        totalRevenue: totalRev,
        totalUnitsInStock: totalUnits,
      };
    } catch {
      return {
        adminEmail: email,
        clinicName: 'Veterinaria',
        productsCount: 0,
        salesCount: 0,
        movementsCount: 0,
        totalRevenue: 0,
        totalUnitsInStock: 0,
      };
    }
  }, []);

  // Switch active database view (for SuperAdmin to inspect or manage an admin's tenant)
  const switchActiveDatabase = useCallback((targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    setActiveTenantEmail(clean);
    showToast(`Base de datos cambiada a: ${clean}`, 'info');
  }, [showToast]);

  // Load Demo Data for active tenant on demand
  const loadDemoData = useCallback(() => {
    setProducts(DEMO_PRODUCTS);
    setStockMovements(DEMO_STOCK_MOVEMENTS);
    setSales(DEMO_SALES);
    showToast('Datos de ejemplo cargados en la base de datos actual', 'success');
  }, [showToast]);

  // Clear current active database to empty clean state
  const clearActiveDatabase = useCallback(() => {
    setProducts([]);
    setStockMovements([]);
    setSales([]);
    showToast('Base de datos vaciada: inventario y ventas en cero', 'info');
  }, [showToast]);

  // Import JSON backup into active tenant database
  const importDatabaseBackup = useCallback((backupJson: any): boolean => {
    try {
      if (!backupJson || typeof backupJson !== 'object') {
        showToast('El archivo no tiene un formato JSON de copia de seguridad válido', 'error');
        return false;
      }
      if (Array.isArray(backupJson.products)) {
        setProducts(backupJson.products);
      }
      if (Array.isArray(backupJson.stockMovements)) {
        setStockMovements(backupJson.stockMovements);
      }
      if (Array.isArray(backupJson.sales)) {
        setSales(backupJson.sales);
      }
      if (backupJson.clinicSettings && typeof backupJson.clinicSettings === 'object') {
        setClinicSettings(backupJson.clinicSettings);
      }
      showToast('Copia de seguridad restaurada exitosamente en la base de datos', 'success');
      return true;
    } catch (e) {
      console.error(e);
      showToast('Error al procesar la copia de seguridad', 'error');
      return false;
    }
  }, [showToast]);

  // Google Login logic with SuperAdmin & Admin validation
  const loginWithGoogle = (
    email = SUPER_ADMIN_EMAIL,
    name = 'Andrés Buitrago',
    avatarUrl = 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c'
  ): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanSuper = SUPER_ADMIN_EMAIL.toLowerCase();
    const isTargetSuper = cleanEmail === cleanSuper;

    // Check if account exists in adminAccounts
    const registeredAccount = adminAccounts.find(
      (acc) => acc.email.trim().toLowerCase() === cleanEmail
    );

    // If it's not SuperAdmin and not registered or inactive
    if (!isTargetSuper && !registeredAccount) {
      const msg = `Acceso denegado: El correo "${email}" no está autorizado. Contacta al SuperAdmin (${SUPER_ADMIN_EMAIL}) para registrar tu cuenta y asignar tu base de datos.`;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!isTargetSuper && registeredAccount && registeredAccount.status === 'inactivo') {
      const msg = `Acceso restringido: La cuenta para "${email}" se encuentra suspendida o inactiva. Contacta al SuperAdmin.`;
      showToast(msg, 'warning');
      return { success: false, message: msg };
    }

    const effectiveRole = isTargetSuper 
      ? 'SuperAdmin' 
      : (registeredAccount?.role || 'Administrador');

    const effectiveName = isTargetSuper 
      ? (name || 'Andrés Buitrago')
      : (registeredAccount?.name || name);

    const effectivePermissions = isTargetSuper
      ? {
          canManageAdmins: true,
          canEditInventory: true,
          canSell: true,
          canEditSales: true,
          canViewReports: true,
          canDeleteProducts: true,
        }
      : registeredAccount?.permissions || {
          canManageAdmins: false,
          canEditInventory: true,
          canSell: true,
          canEditSales: true,
          canViewReports: true,
          canDeleteProducts: false,
        };

    const admin: AdminUser = {
      id: registeredAccount?.id || (isTargetSuper ? 'adm-super' : `adm-${Date.now()}`),
      name: effectiveName,
      email: cleanEmail,
      role: effectiveRole,
      isSuperAdmin: isTargetSuper,
      avatarUrl: registeredAccount?.avatarUrl || avatarUrl,
      provider: 'google',
      loggedAt: new Date().toISOString(),
      permissions: effectivePermissions,
    };

    setAdminUser(admin);
    setActiveTenantEmail(cleanEmail);

    // Update lastLoginAt in accounts list
    setAdminAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === cleanEmail
          ? { ...acc, lastLoginAt: new Date().toISOString() }
          : acc
      )
    );

    const greeting = isTargetSuper
      ? `👑 Bienvenido SuperAdmin (${cleanEmail}). Acceso a tu base de datos principal y control global.`
      : `Bienvenido ${effectiveName}. Has ingresado a tu base de datos independiente (${effectiveRole}).`;

    showToast(greeting, 'success');
    return { success: true, message: greeting };
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    showToast('Sesión administrativa cerrada correctamente', 'info');
  };

  // SuperAdmin Account Management Actions
  const addAdminAccount = (data: Omit<AdminAccount, 'id' | 'createdAt'>): AdminAccount => {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = adminAccounts.find((a) => a.email.trim().toLowerCase() === cleanEmail);
    if (existing) {
      showToast(`Ya existe un administrador con el correo ${cleanEmail}`, 'warning');
      return existing;
    }

    const newAccount: AdminAccount = {
      ...data,
      id: `adm-${Date.now().toString(36)}`,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    };

    setAdminAccounts((prev) => [newAccount, ...prev]);

    // Initialize fresh empty isolated database for this new admin
    const pKey = getTenantStorageKey(cleanEmail, 'products');
    const mKey = getTenantStorageKey(cleanEmail, 'movements');
    const sKey = getTenantStorageKey(cleanEmail, 'sales');
    const setKey = getTenantStorageKey(cleanEmail, 'settings');
    const uKey = getTenantStorageKey(cleanEmail, 'user');

    if (!localStorage.getItem(pKey)) localStorage.setItem(pKey, JSON.stringify([]));
    if (!localStorage.getItem(mKey)) localStorage.setItem(mKey, JSON.stringify([]));
    if (!localStorage.getItem(sKey)) localStorage.setItem(sKey, JSON.stringify([]));
    if (!localStorage.getItem(setKey)) {
      localStorage.setItem(
        setKey,
        JSON.stringify({
          ...INITIAL_CLINIC_SETTINGS,
          name: `Veterinaria ${newAccount.name}`,
          email: cleanEmail,
        })
      );
    }
    if (!localStorage.getItem(uKey)) {
      localStorage.setItem(
        uKey,
        JSON.stringify({
          name: newAccount.name,
          email: cleanEmail,
          role: newAccount.role,
          avatarUrl: newAccount.avatarUrl || INITIAL_USER_PROFILE.avatarUrl,
        })
      );
    }

    showToast(`Nuevo administrador ${newAccount.name} registrado con su propia base de datos independiente`, 'success');
    return newAccount;
  };

  const updateAdminAccount = (id: string, data: Partial<AdminAccount>) => {
    setAdminAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
    showToast('Administrador actualizado correctamente', 'success');
  };

  const deleteAdminAccount = (id: string) => {
    const target = adminAccounts.find((a) => a.id === id);
    if (target && target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      showToast('No es posible eliminar la cuenta principal de SuperAdmin', 'error');
      return;
    }
    setAdminAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast('Cuenta de administrador eliminada', 'info');
  };

  const toggleAdminStatus = (id: string) => {
    const target = adminAccounts.find((a) => a.id === id);
    if (target && target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      showToast('La cuenta de SuperAdmin siempre debe permanecer activa', 'warning');
      return;
    }
    setAdminAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === 'activo' ? 'inactivo' : 'activo' }
          : a
      )
    );
    showToast('Estado del administrador actualizado', 'info');
  };

  // Add a new product
  const addProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const now = new Date().toISOString();
    const newId = `prod-${Date.now().toString(36)}`;
    const newProduct: Product = {
      ...data,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    setProducts((prev) => [newProduct, ...prev]);

    if (data.stock > 0) {
      const initMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: newId,
        productName: data.name,
        date: now,
        type: 'entrada',
        quantity: data.stock,
        reason: 'Inventario inicial al registrar producto',
        user: adminUser?.name || userProfile.name,
      };
      setStockMovements((prev) => [initMovement, ...prev]);
    }

    showToast('Producto registrado correctamente en el inventario', 'success');
    return newProduct;
  };

  // Update existing product
  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
    );
    showToast('Producto actualizado correctamente', 'success');
  };

  // Delete product
  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Producto eliminado del inventario', 'info');
  };

  // Add stock movement
  const addStockMovement = (
    productId: string,
    quantity: number,
    reason: string,
    type: 'entrada' | 'ajuste' = 'entrada'
  ) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const now = new Date().toISOString();
    const newStock = targetProduct.stock + quantity;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock), updatedAt: now } : p))
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId,
      productName: targetProduct.name,
      date: now,
      type,
      quantity,
      reason,
      user: adminUser?.name || userProfile.name,
    };

    setStockMovements((prev) => [movement, ...prev]);
    showToast(`Se registraron ${quantity > 0 ? '+' : ''}${quantity} unidades para ${targetProduct.name}`, 'success');
  };

  // Record a complete sale
  const recordSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
    const now = new Date().toISOString();
    const saleId = `VEN-${new Date().getFullYear()}-${String(sales.length + 101).padStart(4, '0')}`;
    
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      date: now,
      user: adminUser?.name || userProfile.name,
      status: 'completada',
    };

    const newMovements: StockMovement[] = [];

    setProducts((prevProducts) => {
      const updated = [...prevProducts];
      newSale.items.forEach((item) => {
        const prodIndex = updated.findIndex((p) => p.id === item.productId);
        if (prodIndex !== -1) {
          const currentProd = updated[prodIndex];
          const newQty = Math.max(0, currentProd.stock - item.quantity);
          updated[prodIndex] = {
            ...currentProd,
            stock: newQty,
            updatedAt: now,
          };

          newMovements.push({
            id: `mov-${Date.now()}-${item.productId}`,
            productId: item.productId,
            productName: item.productName,
            date: now,
            type: 'venta',
            quantity: -item.quantity,
            reason: `Venta POS #${saleId} a ${newSale.customerName || 'Cliente mostrador'}`,
            saleId: saleId,
            user: adminUser?.name || userProfile.name,
          });
        }
      });
      return updated;
    });

    setStockMovements((prev) => [...newMovements, ...prev]);
    setSales((prev) => [newSale, ...prev]);
    setLastSaleReceipt(newSale);

    showToast(`¡Venta #${saleId} registrada exitosamente!`, 'success');
    return newSale;
  };

  // Update/Correct an existing sale
  const updateSale = (saleId: string, updatedData: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          const merged = { ...s, ...updatedData };
          if (updatedData.items) {
            const subtotal = updatedData.items.reduce((acc, it) => acc + it.subtotal, 0);
            const totalUnits = updatedData.items.reduce((acc, it) => acc + it.quantity, 0);
            const discount = updatedData.discount ?? s.discount ?? 0;
            const total = Math.max(0, subtotal - discount);
            merged.subtotal = subtotal;
            merged.totalUnits = totalUnits;
            merged.total = total;
          }
          return merged;
        }
        return s;
      })
    );
    showToast(`Venta #${saleId} corregida y actualizada`, 'success');
  };

  // Delete/Cancel a sale with option to restore product stock
  const deleteSale = (saleId: string, restoreStock: boolean = true) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) return;

    const now = new Date().toISOString();

    if (restoreStock && targetSale.status !== 'anulada') {
      const compensatingMovements: StockMovement[] = [];

      setProducts((prevProducts) => {
        const updated = [...prevProducts];
        targetSale.items.forEach((item) => {
          const pIndex = updated.findIndex((p) => p.id === item.productId);
          if (pIndex !== -1) {
            const cur = updated[pIndex];
            const newStock = cur.stock + item.quantity;
            updated[pIndex] = {
              ...cur,
              stock: newStock,
              updatedAt: now,
            };

            compensatingMovements.push({
              id: `mov-${Date.now()}-${item.productId}-restored`,
              productId: item.productId,
              productName: item.productName,
              date: now,
              type: 'ajuste',
              quantity: item.quantity,
              reason: `Devolución de stock por anulación de venta #${saleId}`,
              saleId: saleId,
              user: adminUser?.name || userProfile.name,
            });
          }
        });
        return updated;
      });

      if (compensatingMovements.length > 0) {
        setStockMovements((prev) => [...compensatingMovements, ...prev]);
      }
    }

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    showToast(`Venta #${saleId} eliminada${restoreStock ? ' y stock devuelto al inventario' : ''}`, 'info');
  };

  const updateClinicSettings = (settings: Partial<ClinicSettings>) => {
    setClinicSettings((prev) => ({ ...prev, ...settings }));
    showToast('Configuración de la veterinaria / negocio actualizada', 'success');
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
    showToast('Perfil de usuario actualizado', 'success');
  };

  const resetToMockData = () => {
    setProducts(INITIAL_PRODUCTS);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setSales(INITIAL_SALES);
    setClinicSettings(INITIAL_CLINIC_SETTINGS);
    setUserProfile(INITIAL_USER_PROFILE);
    showToast('Base de datos inicializada limpia y lista para registrar productos', 'info');
  };

  // Computed alerts
  const outOfStockProducts = useMemo(() => products.filter((p) => p.stock <= 0), [products]);
  const lowStockProducts = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= p.minStock), [products]);
  const expiringProducts = useMemo(() => products.filter((p) => {
    const status = getProductStatus(p, clinicSettings.expiringDaysThreshold);
    return status === 'proximo_a_vencer';
  }), [products, clinicSettings.expiringDaysThreshold]);

  const totalAlertsCount = outOfStockProducts.length + lowStockProducts.length + expiringProducts.length;

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        products,
        stockMovements,
        sales,
        clinicSettings,
        userProfile,
        adminUser,
        adminAccounts,
        isAuthenticated: !!adminUser,
        isSuperAdmin,
        activeTenantEmail,
        getAdminDatabaseStats,
        switchActiveDatabase,
        loadDemoData,
        clearActiveDatabase,
        importDatabaseBackup,
        loginWithGoogle,
        logoutAdmin,
        addAdminAccount,
        updateAdminAccount,
        deleteAdminAccount,
        toggleAdminStatus,
        selectedProductId,
        setSelectedProductId,
        isProductModalOpen,
        setIsProductModalOpen,
        editingProduct,
        setEditingProduct,
        isDetailModalOpen,
        setIsDetailModalOpen,
        isStockEntryModalOpen,
        setIsStockEntryModalOpen,
        activeStockProduct,
        setActiveStockProduct,
        lastSaleReceipt,
        setLastSaleReceipt,
        addProduct,
        updateProduct,
        deleteProduct,
        addStockMovement,
        recordSale,
        updateSale,
        deleteSale,
        updateClinicSettings,
        updateUserProfile,
        resetToMockData,
        outOfStockProducts,
        lowStockProducts,
        expiringProducts,
        totalAlertsCount,
        toastMessage,
        toastType,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
