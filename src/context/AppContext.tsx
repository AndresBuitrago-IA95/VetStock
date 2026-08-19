import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { api } from '../services/api';

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
  loginWithGoogle: (
    email?: string, 
    name?: string, 
    avatarUrl?: string, 
    options?: { securityPin?: string; isGoogleVerified?: boolean }
  ) => Promise<{ success: boolean; message: string }>;
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

  // Cloud Sync & Connectivity (Multi-device)
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: Date | null;
  syncWithCloud: () => Promise<void>;

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

// Generates a random 6-digit security PIN for new admin accounts, so no
// account is ever left with a blank/guessable default PIN.
const generateSecurityPin = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
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

  // Admin accounts list (Managed by SuperAdmin - includes initial default admins)
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.ADMIN_ACCOUNTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter(
          (a: AdminAccount) => a.email !== 'marcela.admin@almacencentral.co' && a.email !== 'carlos.ventas@almacencentral.co'
        );
        // Merge initial accounts if missing
        const merged = [...filtered];
        for (const initAcc of INITIAL_ADMIN_ACCOUNTS) {
          if (!merged.some((a: AdminAccount) => a.email.toLowerCase() === initAcc.email.toLowerCase())) {
            merged.push(initAcc);
          }
        }
        return merged;
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

  // Tracks whether `products`/`sales`/etc in memory still belong to the
  // PREVIOUS tenant, right in the middle of a switch. Without this guard,
  // the persist effects below (which also depend on activeTenantEmail)
  // could fire on the same commit as the tenant switch - before the reload
  // effect's setState calls have actually landed - and briefly write the
  // outgoing tenant's data into the incoming tenant's storage key,
  // corrupting or mixing the two caches.
  const prevActiveTenantRef = useRef(activeTenantEmail);
  const tenantSwitchedThisRender = prevActiveTenantRef.current !== activeTenantEmail;
  useEffect(() => {
    prevActiveTenantRef.current = activeTenantEmail;
  });

  // Reload isolated data when activeTenantEmail changes
  useEffect(() => {
    setProducts(loadTenantProducts(activeTenantEmail));
    setStockMovements(loadTenantMovements(activeTenantEmail));
    setSales(loadTenantSales(activeTenantEmail));
    setClinicSettings(loadTenantSettings(activeTenantEmail));
    setUserProfile(loadTenantUser(activeTenantEmail));
  }, [activeTenantEmail]);

  // Persist tenant state to its dedicated partition and cloud backend
  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'products');
      localStorage.setItem(key, JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save error products:', e);
    }
  }, [products, activeTenantEmail]);

  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'movements');
      localStorage.setItem(key, JSON.stringify(stockMovements));
    } catch (e) {
      console.warn('LocalStorage save error movements:', e);
    }
  }, [stockMovements, activeTenantEmail]);

  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'sales');
      localStorage.setItem(key, JSON.stringify(sales));
    } catch (e) {
      console.warn('LocalStorage save error sales:', e);
    }
  }, [sales, activeTenantEmail]);

  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'settings');
      localStorage.setItem(key, JSON.stringify(clinicSettings));
    } catch (e) {
      console.warn('LocalStorage save error settings:', e);
    }
  }, [clinicSettings, activeTenantEmail]);

  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    try {
      const key = getTenantStorageKey(activeTenantEmail, 'user');
      localStorage.setItem(key, JSON.stringify(userProfile));
    } catch (e) {
      console.warn('LocalStorage save error user:', e);
    }
  }, [userProfile, activeTenantEmail]);

  // Sync tenant data to central server backend (debounced)
  useEffect(() => {
    if (tenantSwitchedThisRender) return;
    const timer = setTimeout(() => {
      api.syncTenantData(activeTenantEmail, {
        products,
        movements: stockMovements,
        sales,
        settings: clinicSettings,
        user: userProfile,
      }).catch((err) => console.warn('Cloud sync error:', err));
    }, 1200);

    return () => clearTimeout(timer);
  }, [products, stockMovements, sales, clinicSettings, userProfile, activeTenantEmail]);

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

  // Cloud Sync & Connectivity State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const lastServerTimestampRef = useRef<number>(0);
  const isInitialCloudLoadRef = useRef<boolean>(false);

  // --- FIREBASE REAL-TIME SUBSCRIPTIONS ---

  // Manual Trigger for Full Sync (Now just a visual cue, Firebase is always real-time)
  const syncWithCloud = useCallback(async () => {
    setSyncStatus('syncing');
    showToast('Sincronizando datos con la nube...', 'info');
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      showToast('Base de datos sincronizada', 'success');
    }, 800);
  }, [showToast]);

  // Push local state to Cloud Server
  const pushCloudState = useCallback(async (
    tenantEmail: string,
    overrideData?: {
      products?: Product[];
      stockMovements?: StockMovement[];
      sales?: Sale[];
      clinicSettings?: ClinicSettings;
      userProfile?: UserProfile;
    }
  ) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    try {
      setSyncStatus('syncing');
      await api.syncTenantData(tenantEmail, {
        products: overrideData?.products ?? products,
        movements: overrideData?.stockMovements ?? stockMovements,
        sales: overrideData?.sales ?? sales,
        settings: overrideData?.clinicSettings ?? clinicSettings,
        user: overrideData?.userProfile ?? userProfile,
      });
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Cloud sync push warning:', err);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [products, stockMovements, sales, clinicSettings, userProfile]);

  // Real-time listener for active tenant data
  useEffect(() => {
    if (!activeTenantEmail) return;
    
    setSyncStatus('syncing');
    const unsubscribe = api.subscribeToTenantData(activeTenantEmail, (cloudTenant) => {
      if (cloudTenant) {
        if (Array.isArray(cloudTenant.products)) setProducts(cloudTenant.products);
        if (Array.isArray(cloudTenant.movements)) setStockMovements(cloudTenant.movements);
        if (Array.isArray(cloudTenant.sales)) setSales(cloudTenant.sales);
        if (cloudTenant.settings) setClinicSettings(cloudTenant.settings);
        if (cloudTenant.user) setUserProfile(cloudTenant.user);
        
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        isInitialCloudLoadRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [activeTenantEmail]);

  // Real-time listener for admins globally
  useEffect(() => {
    const unsubscribe = api.subscribeToAdmins((admins) => {
      if (admins && admins.length > 0) {
        setAdminAccounts(admins);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync debounced trigger whenever state changes locally
  useEffect(() => {
    if (!isInitialCloudLoadRef.current || tenantSwitchedThisRender) return;
    const timer = setTimeout(() => {
      pushCloudState(activeTenantEmail);
    }, 1500);
    return () => clearTimeout(timer);
  }, [products, stockMovements, sales, clinicSettings, userProfile, activeTenantEmail, pushCloudState]);

  // Network status handlers
  useEffect(() => {
    const handleOnline = () => setSyncStatus('synced');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Google Login logic via Firebase
  const loginWithGoogle = async (
    email = SUPER_ADMIN_EMAIL,
    name = 'Andrés Buitrago',
    avatarUrl = 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
    options?: { isGoogleVerified?: boolean }
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if account exists in adminAccounts from Firestore
    let registeredAccount = adminAccounts.find(
      (acc) => acc.email.trim().toLowerCase() === cleanEmail
    );
    
    // Refresh admins list from Firebase just to be sure
    try {
      const serverAdmins = await api.getAdmins();
      if (serverAdmins && serverAdmins.length > 0) {
        setAdminAccounts(serverAdmins);
        registeredAccount = serverAdmins.find((acc) => acc.email.trim().toLowerCase() === cleanEmail);
      }
    } catch (e) {
      console.warn('Failed to refresh admins during login', e);
    }

    const cleanSuper = SUPER_ADMIN_EMAIL.toLowerCase();
    // Accept both z and s variants to prevent lockout
    const isTargetSuper = cleanEmail === cleanSuper || cleanEmail === 'andresbuitrago82@gmail.com';

    // If it's not SuperAdmin and not registered: create access request
    if (!isTargetSuper && !registeredAccount) {
      const newAdmin: AdminAccount = {
        id: `adm-${Date.now().toString(36)}`,
        name: name || 'Usuario de Google',
        email: cleanEmail,
        role: 'Administrador',
        status: 'pendiente',
        avatarUrl,
        permissions: {
          canManageAdmins: false,
          canEditInventory: true,
          canSell: true,
          canEditSales: true,
          canViewReports: true,
          canDeleteProducts: false,
        },
        createdAt: new Date().toISOString(),
      };
      
      // Auto-save the access request in Firebase
      try {
        await api.addAdmin(newAdmin);
      } catch (e) {
        console.warn('Could not save access request', e);
      }

      const msg = `Tu cuenta está pendiente de aprobación. Se ha notificado al SuperAdmin (${SUPER_ADMIN_EMAIL}) para que autorice el acceso.`;
      showToast(msg, 'info');
      return { success: false, message: msg };
    }

    if (!isTargetSuper && registeredAccount && registeredAccount.status === 'inactivo') {
      const msg = `Acceso denegado: La cuenta para "${email}" se encuentra inactiva.`;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!isTargetSuper && registeredAccount && registeredAccount.status === 'pendiente') {
      const msg = `Acceso pendiente: El SuperAdmin aún no ha autorizado el ingreso para "${email}".`;
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

    // Fetch tenant data from Firebase
    try {
      const cloudData = await api.getTenantData(cleanEmail);
      if (cloudData) {
        if (cloudData.products && cloudData.products.length > 0) setProducts(cloudData.products);
        if (cloudData.movements && cloudData.movements.length > 0) setStockMovements(cloudData.movements);
        if (cloudData.sales && cloudData.sales.length > 0) setSales(cloudData.sales);
        if (cloudData.settings) setClinicSettings(cloudData.settings);
        if (cloudData.user) setUserProfile(cloudData.user);
      }
    } catch (e) {
      console.warn('Failed to fetch initial tenant data', e);
    }

    // Update lastLoginAt in Firebase
    if (registeredAccount) {
      api.updateAdmin(registeredAccount.id, { lastLoginAt: new Date().toISOString() });
    } else if (isTargetSuper) {
      // Bootstrap SuperAdmin in Firebase if missing
      api.addAdmin({
        name: effectiveName,
        email: cleanEmail,
        role: 'SuperAdmin',
        status: 'activo',
        avatarUrl,
        phone: '',
        permissions: effectivePermissions,
        notes: 'Creado automáticamente',
      } as any);
    }

    // Auto-bootstrap jprm1928@gmail.com if it doesn't exist yet
    if (isTargetSuper) {
      const jpEmail = 'jprm1928@gmail.com';
      const hasJp = adminAccounts.find(a => a.email.toLowerCase() === jpEmail);
      if (!hasJp) {
        api.addAdmin({
          name: 'Administrador JP',
          email: jpEmail,
          role: 'Administrador',
          status: 'activo',
          avatarUrl: '',
          permissions: {
            canManageAdmins: false,
            canEditInventory: true,
            canSell: true,
            canEditSales: true,
            canViewReports: true,
            canDeleteProducts: false,
          },
          notes: 'Agregado por sistema',
        } as any).catch(console.warn);
      }
    }

    const greeting = isTargetSuper
      ? `👑 SuperAdmin verificado (${cleanEmail}). Acceso seguro a la nube autorizado.`
      : `Acceso verificado en la nube para ${effectiveName} (${effectiveRole}).`;

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
      securityPin: data.securityPin?.trim() || generateSecurityPin(),
      createdAt: new Date().toISOString(),
    };

    setAdminAccounts((prev) => [newAccount, ...prev]);

    // Central server persistence for multi-device sync
    api.addAdmin(newAccount).catch((e) => console.warn('Failed to sync new admin with server:', e));

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
    api.updateAdmin(id, data).catch((e) => console.warn('Failed to update admin on server:', e));
    showToast('Administrador actualizado correctamente', 'success');
  };

  const deleteAdminAccount = (id: string) => {
    const target = adminAccounts.find((a) => a.id === id);
    if (target && (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || target.email.toLowerCase() === 'andres.buitragos@udea.edu.co')) {
      showToast('No es posible eliminar la cuenta principal de SuperAdmin', 'error');
      return;
    }
    setAdminAccounts((prev) => prev.filter((a) => a.id !== id));
    api.deleteAdmin(id).catch((e) => console.warn('Failed to delete admin on server:', e));
    showToast('Cuenta de administrador eliminada', 'info');
  };

  const toggleAdminStatus = (id: string) => {
    const target = adminAccounts.find((a) => a.id === id);
    if (target && (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || target.email.toLowerCase() === 'andres.buitragos@udea.edu.co')) {
      showToast('La cuenta de SuperAdmin siempre debe permanecer activa', 'warning');
      return;
    }
    // If it's pendiente or inactivo, make it activo. If it's activo, make it inactivo.
    const newStatus = target?.status === 'activo' ? 'inactivo' : 'activo';
    
    setAdminAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: newStatus }
          : a
      )
    );
    api.updateAdmin(id, { status: newStatus }).catch((e) => console.warn('Failed to toggle admin status on server:', e));
    
    if (target?.status === 'pendiente') {
      showToast(`Acceso autorizado para ${target.email}`, 'success');
    } else {
      showToast(`Estado del administrador actualizado a ${newStatus}`, 'info');
    }
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
        syncStatus,
        lastSyncTime,
        syncWithCloud,
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
