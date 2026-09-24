"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  expirationDate?: string;
  image?: string;
};

type Sale = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  client: string;
};

type Purchase = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  supplier: string;
};

type Client = {
  id: string;
  name: string;
  petName: string;
  phone: string;
  totalBuys: number;
};

type Supplier = {
  id: string;
  name: string;
  phone: string;
  category: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string;
};

type CashEntry = {
  id: string;
  type: 'ingreso' | 'egreso';
  description: string;
  amount: number;
  date: string;
};

type Clinic = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  authorized: boolean;
  inventory: Product[];
  sales: Sale[];
  purchases: Purchase[];
  clients: Client[];
  suppliers: Supplier[];
  employees: Employee[];
  cashFlow: CashEntry[];
};

type SuperAdmin = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin';
};

type Session = {
  role: 'superadmin' | 'clinic';
  userId: string;
  clinicId?: string;
  name: string;
};

type AppState = {
  updatedAt?: number;
  superAdmin: SuperAdmin;
  clinics: Clinic[];
};

type TabKey = 'Dashboard' | 'Inventario' | 'Ventas';

type ToastNotification = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

const SESSION_COOKIE_NAME = 'vetstock-session';
const LOCAL_STORAGE_KEY = 'vetstock-app-state-v2';
const POLL_INTERVAL_MS = 2500;

const defaultData: AppState = {
  updatedAt: 1,
  superAdmin: {
    id: 'superadmin-1',
    name: 'Super Admin',
    email: 'admin@vetstock.com',
    password: 'admin123',
    role: 'superadmin',
  },
  clinics: [],
};

const emptyClinicForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
};

const emptyProductForm = {
  name: '',
  category: '',
  stock: '0',
  minStock: '0',
  cost: '0',
  price: '0',
  expirationDate: '',
  image: '',
};

const tabs: TabKey[] = ['Dashboard', 'Inventario', 'Ventas'];

function readSessionCookie(): Session | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  const value = sessionCookie.split('=')[1];
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as Session;
  } catch {
    return null;
  }
}

function writeSessionCookie(session: Session | null) {
  if (typeof document === 'undefined') return;

  if (session) {
    document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400; SameSite=Lax`;
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function readLocalStorageState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed && Array.isArray(parsed.clinics)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeLocalStorageState(data: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

function updateClinicInState(state: AppState, clinicId: string, updater: (clinic: Clinic) => Clinic): AppState {
  if (!state || !Array.isArray(state.clinics)) return state;

  const exists = state.clinics.some((c) => c.id === clinicId);
  if (!exists) {
    console.warn('Clinic not found in state when updating:', clinicId);
    return state;
  }

  return {
    ...state,
    clinics: state.clinics.map((clinic) => {
      if (clinic.id !== clinicId) return clinic;
      const safeClinic: Clinic = {
        ...clinic,
        inventory: Array.isArray(clinic.inventory) ? clinic.inventory : [],
        sales: Array.isArray(clinic.sales) ? clinic.sales : [],
        purchases: Array.isArray(clinic.purchases) ? clinic.purchases : [],
        clients: Array.isArray(clinic.clients) ? clinic.clients : [],
        suppliers: Array.isArray(clinic.suppliers) ? clinic.suppliers : [],
        employees: Array.isArray(clinic.employees) ? clinic.employees : [],
        cashFlow: Array.isArray(clinic.cashFlow) ? clinic.cashFlow : [],
      };
      return updater(safeClinic);
    }),
  };
}

async function loadAppState(): Promise<AppState> {
  const localData = readLocalStorageState();

  try {
    const response = await fetch(`/api/state?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const serverData = (await response.json()) as AppState;
      if (serverData && Array.isArray(serverData.clinics)) {
        // Recovery check: if server returned 0 clinics but local has clinics, recover local state to server
        if (serverData.clinics.length === 0 && localData && Array.isArray(localData.clinics) && localData.clinics.length > 0) {
          fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localData),
          }).catch(console.error);
          return localData;
        }

        writeLocalStorageState(serverData);
        return serverData;
      }
    }
  } catch (err) {
    console.warn('Network error loading server state:', err);
  }

  return localData || defaultData;
}

async function syncStateToServer(data: AppState): Promise<AppState> {
  writeLocalStorageState(data);

  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const serverResult = (await response.json()) as AppState;
      writeLocalStorageState(serverResult);
      return serverResult;
    }
  } catch (err) {
    console.warn('Server save failed, using local storage state:', err);
  }

  return data;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HomePage() {
  const [appData, setAppData] = useState<AppState>(defaultData);
  const [session, setSession] = useState<Session | null>(null);
  const [loginError, setLoginError] = useState('');
  const [clinicForm, setClinicForm] = useState({ ...emptyClinicForm, authorized: true });
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [superAdminPasswordForm, setSuperAdminPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [superAdminPasswordMessage, setSuperAdminPasswordMessage] = useState('');
  const [clinicPasswordForm, setClinicPasswordForm] = useState({ clinicId: '', newPassword: '', confirmPassword: '' });
  const [clinicPasswordMessage, setClinicPasswordMessage] = useState('');
  
  // Product state
  const [productForm, setProductForm] = useState(emptyProductForm);
  const productFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // WebRTC Camera Modal state (works on PC & Mobile)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Lock polling while client is mutating state
  const isSavingRef = useRef(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('Dashboard');
  const [saleForm, setSaleForm] = useState({ productId: '', quantity: '1', clientName: '' });
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const updateStateAndSync = async (nextState: AppState) => {
    const now = Date.now();
    const stampedState: AppState = {
      ...nextState,
      updatedAt: now,
    };

    isSavingRef.current = true;
    writeLocalStorageState(stampedState);
    setAppData(stampedState);

    try {
      const finalState = await syncStateToServer(stampedState);
      setAppData(finalState);
    } catch (err) {
      console.warn('Sync failed, keeping local state:', err);
    } finally {
      // Keep saving lock for 5 seconds to prevent race condition polling overwrites on high latency mobile network
      setTimeout(() => {
        isSavingRef.current = false;
      }, 5000);
    }
  };

  useEffect(() => {
    const syncInitial = async () => {
      const nextData = await loadAppState();
      setAppData(nextData);
      setSession(readSessionCookie());
    };

    syncInitial();

    const intervalId = window.setInterval(async () => {
      if (isSavingRef.current) return; // Skip polling if client is currently saving

      const nextData = await loadAppState();
      setAppData((previous) => {
        if (isSavingRef.current) return previous;
        const equal = JSON.stringify(previous) === JSON.stringify(nextData);
        return equal ? previous : nextData;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      stopCamera();
    };
  }, []);

  const currentClinic = useMemo(
    () => appData.clinics.find((clinic) => clinic.id === session?.clinicId) ?? null,
    [appData, session],
  );

  const totalInventoryValue = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.inventory.reduce((total, item) => total + item.stock * item.cost, 0);
  }, [currentClinic]);

  const lowStockItems = useMemo(() => {
    if (!currentClinic) return [];
    return currentClinic.inventory.filter((item) => item.stock <= item.minStock);
  }, [currentClinic]);

  const expiringSoonItems = useMemo(() => {
    if (!currentClinic) return [];
    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(today.getDate() + 30);

    return currentClinic.inventory.filter((item) => {
      if (!item.expirationDate) return false;
      const exp = new Date(item.expirationDate);
      return exp <= thirtyDays;
    });
  }, [currentClinic]);

  const totalMonthlySales = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.sales.reduce((total, item) => total + item.total, 0);
  }, [currentClinic]);

  const estimatedGrossProfit = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.sales.reduce((profit, sale) => {
      const product = currentClinic.inventory.find((p) => p.name.toLowerCase() === sale.product.toLowerCase());
      const unitCost = product ? product.cost : 0;
      const unitPrice = sale.total / (sale.qty || 1);
      return profit + (unitPrice - unitCost) * sale.qty;
    }, 0);
  }, [currentClinic]);

  const totalPurchases = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.purchases.reduce((total, item) => total + item.total, 0);
  }, [currentClinic]);

  const cashBalance = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.cashFlow.reduce((total, item) => {
      return item.type === 'ingreso' ? total + item.amount : total - item.amount;
    }, 0);
  }, [currentClinic]);

  // Inventory Categories List
  const availableCategories = useMemo(() => {
    if (!currentClinic) return [];
    const set = new Set<string>();
    currentClinic.inventory.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [currentClinic]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    if (!currentClinic) return [];
    return currentClinic.inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [currentClinic, searchQuery, categoryFilter]);

  // WebRTC Camera Helper Functions
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 640 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      setCameraFacingMode(mode);
      setIsCameraModalOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 150);
    } catch (err) {
      console.error('Camera access error:', err);
      if (mode === 'environment') {
        startCamera('user');
      } else {
        showToast('No se pudo acceder a la cámara. Usa la opción de subir archivo.', 'error');
      }
    }
  };

  const switchCameraFacingMode = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const capturePhotoFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      showToast('Esperando señal de la cámara...', 'info');
      return;
    }

    const maxDimension = 400;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
      setProductForm((current) => ({ ...current, image: compressedBase64 }));
      showToast('¡Foto capturada exitosamente! 📸', 'success');
    }

    stopCamera();
    setIsCameraModalOpen(false);
  };

  // ObjectURL Image Processing
  const handleProductImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const maxDimension = 400;
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.6);
        setProductForm((current) => ({ ...current, image: compressed }));
        showToast('Foto cargada y optimizada 🖼️', 'success');
      }
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      showToast('Error al leer la imagen seleccionada', 'error');
    };

    img.src = objectUrl;
    event.target.value = '';
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setLoginError(payload.error ?? 'Credenciales incorrectas o esta veterinaria no está autorizada.');
        return;
      }

      const payload = (await response.json()) as { user: Session };
      writeSessionCookie(payload.user);
      setSession(payload.user);
      setLoginError('');
      showToast(`¡Bienvenido, ${payload.user.name}! 🐾`, 'success');
    } catch {
      setLoginError('No se pudo iniciar sesión en este momento.');
    }
  };

  const resetClinicForm = () => {
    setClinicForm({ ...emptyClinicForm, authorized: true });
    setEditingClinicId(null);
  };

  const handleSaveClinic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = clinicForm.name.trim();
    const trimmedEmail = clinicForm.email.trim();
    const trimmedPassword = clinicForm.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      showToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    const exists = appData.clinics.some(
      (clinic) => clinic.email.toLowerCase() === trimmedEmail.toLowerCase() && clinic.id !== editingClinicId,
    );
    if (exists) {
      showToast('Ya existe una veterinaria registrada con ese email', 'error');
      return;
    }

    const nextClinics = editingClinicId
      ? appData.clinics.map((clinic) =>
          clinic.id === editingClinicId
            ? {
                ...clinic,
                name: trimmedName,
                email: trimmedEmail,
                password: trimmedPassword,
                phone: clinicForm.phone.trim() || 'Sin teléfono',
                authorized: clinicForm.authorized,
              }
            : clinic,
        )
      : [
          ...appData.clinics,
          {
            id: `clinic-${Date.now()}`,
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            phone: clinicForm.phone.trim() || 'Sin teléfono',
            authorized: clinicForm.authorized,
            inventory: [],
            sales: [],
            purchases: [],
            clients: [],
            suppliers: [],
            employees: [],
            cashFlow: [],
          } as Clinic,
        ];

    const nextState = { ...appData, clinics: nextClinics };
    await updateStateAndSync(nextState);
    showToast(editingClinicId ? 'Veterinaria actualizada' : 'Veterinaria guardada correctamente');
    resetClinicForm();
  };

  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setClinicForm({
      name: clinic.name,
      email: clinic.email,
      password: clinic.password,
      phone: clinic.phone,
      authorized: clinic.authorized,
    });
  };

  const handleDeleteClinic = async (clinicId: string) => {
    const target = appData.clinics.find((clinic) => clinic.id === clinicId);
    if (!target) return;

    const shouldDelete = window.confirm(`¿Deseas eliminar la veterinaria ${target.name}?`);
    if (!shouldDelete) return;

    const nextState = {
      ...appData,
      clinics: appData.clinics.filter((clinic) => clinic.id !== clinicId),
    };
    await updateStateAndSync(nextState);
    showToast('Veterinaria eliminada', 'info');
    if (editingClinicId === clinicId) {
      resetClinicForm();
    }
  };

  const handleUpdateSuperAdminPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = superAdminPasswordForm;
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < 6) {
      setSuperAdminPasswordMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSuperAdminPasswordMessage('La confirmación de la contraseña no coincide.');
      return;
    }
    if (appData.superAdmin.password !== currentPassword) {
      setSuperAdminPasswordMessage('La contraseña actual es incorrecta.');
      return;
    }

    const nextState = {
      ...appData,
      superAdmin: {
        ...appData.superAdmin,
        password: newPassword,
      },
    };

    await updateStateAndSync(nextState);
    setSuperAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSuperAdminPasswordMessage('');
    showToast('Contraseña de superadmin actualizada correctamente');
  };

  const handleUpdateClinicPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { clinicId, newPassword, confirmPassword } = clinicPasswordForm;
    if (!clinicId) {
      setClinicPasswordMessage('Selecciona una veterinaria para cambiar la contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      setClinicPasswordMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setClinicPasswordMessage('La confirmación no coincide.');
      return;
    }

    const nextState = {
      ...appData,
      clinics: appData.clinics.map((clinic) =>
        clinic.id === clinicId ? { ...clinic, password: newPassword } : clinic,
      ),
    };

    await updateStateAndSync(nextState);
    setClinicPasswordForm({ clinicId: '', newPassword: '', confirmPassword: '' });
    setClinicPasswordMessage('');
    showToast('Contraseña de veterinaria actualizada');
  };

  const updateProductFormField = (field: keyof typeof emptyProductForm, value: string) => {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentClinic) {
      showToast('No se encontró una sesión activa de veterinaria', 'error');
      return;
    }

    if (!productForm.name.trim()) {
      showToast('Por favor ingresa el nombre del producto', 'error');
      return;
    }

    const parsedStock = Number(productForm.stock);
    const parsedMinStock = Number(productForm.minStock);
    const parsedCost = Number(productForm.cost);
    const parsedPrice = Number(productForm.price);

    const item: Product = {
      id: editingProductId ?? `product-${Date.now()}`,
      name: productForm.name.trim(),
      category: productForm.category.trim() || 'General',
      stock: Number.isFinite(parsedStock) && !isNaN(parsedStock) ? Math.max(0, parsedStock) : 0,
      minStock: Number.isFinite(parsedMinStock) && !isNaN(parsedMinStock) ? Math.max(0, parsedMinStock) : 0,
      cost: Number.isFinite(parsedCost) && !isNaN(parsedCost) ? Math.max(0, parsedCost) : 0,
      price: Number.isFinite(parsedPrice) && !isNaN(parsedPrice) ? Math.max(0, parsedPrice) : 0,
      expirationDate: productForm.expirationDate || undefined,
      image: productForm.image || undefined,
    };

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => {
      const existingInventory = clinic.inventory || [];
      const updatedInventory = editingProductId
        ? existingInventory.map((product) => (product.id === editingProductId ? item : product))
        : [item, ...existingInventory];

      return {
        ...clinic,
        inventory: updatedInventory,
      };
    });

    await updateStateAndSync(nextState);

    showToast(editingProductId ? '¡Producto actualizado! 🐾' : '¡Producto guardado exitosamente! 🐾', 'success');
    setProductForm(emptyProductForm);
    setEditingProductId(null);
    setIsProductModalOpen(false);
  };

  const openNewProductModal = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      category: product.category,
      stock: String(product.stock),
      minStock: String(product.minStock),
      cost: String(product.cost),
      price: String(product.price),
      expirationDate: product.expirationDate ?? '',
      image: product.image ?? '',
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!currentClinic) return;

    const targetProduct = (currentClinic.inventory || []).find((p) => p.id === productId);
    const confirmMsg = targetProduct ? `¿Eliminar "${targetProduct.name}"?` : '¿Eliminar producto?';
    if (!window.confirm(confirmMsg)) return;

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => ({
      ...clinic,
      inventory: (clinic.inventory || []).filter((product) => product.id !== productId),
    }));

    await updateStateAndSync(nextState);
    showToast('Producto eliminado', 'info');

    if (editingProductId === productId) {
      setEditingProductId(null);
      setProductForm(emptyProductForm);
      setIsProductModalOpen(false);
    }
  };

  const handleAddSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentClinic) return;

    const selectedProduct = (currentClinic.inventory || []).find((item) => item.id === saleForm.productId);
    if (!selectedProduct) {
      showToast('Selecciona un producto válido', 'error');
      return;
    }

    const quantity = Number(saleForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    if (quantity > selectedProduct.stock) {
      showToast(`Stock insuficiente. Disponible: ${selectedProduct.stock}`, 'error');
      return;
    }

    const total = selectedProduct.price * quantity;

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => {
      const updatedInventory = (clinic.inventory || []).map((item) => {
        if (item.id !== selectedProduct.id) return item;
        return { ...item, stock: Math.max(0, item.stock - quantity) };
      });

      const newSale: Sale = {
        id: `sale-${Date.now()}`,
        product: selectedProduct.name,
        qty: quantity,
        total,
        date: new Date().toISOString().slice(0, 10),
        client: saleForm.clientName.trim() || 'Cliente general',
      };

      const newCashEntry: CashEntry = {
        id: `cash-${Date.now()}`,
        type: 'ingreso',
        description: `Venta de ${selectedProduct.name}`,
        amount: total,
        date: new Date().toISOString().slice(0, 10),
      };

      return {
        ...clinic,
        inventory: updatedInventory,
        sales: [newSale, ...(clinic.sales || [])],
        cashFlow: [newCashEntry, ...(clinic.cashFlow || [])],
      };
    });

    await updateStateAndSync(nextState);
    showToast(`¡Venta de ${selectedProduct.name} registrada! 🛒`, 'success');
    setSaleForm({ productId: '', quantity: '1', clientName: '' });
  };

  // Delete sale and restore inventory stock automatically
  const handleDeleteSale = async (saleId: string) => {
    if (!currentClinic) return;

    const targetSale = (currentClinic.sales || []).find((sale) => sale.id === saleId);
    if (!targetSale) return;

    const shouldDelete = window.confirm(
      `¿Deseas eliminar la venta de "${targetSale.product}" por ${formatCurrency(targetSale.total)}?\n\nEl stock de ${targetSale.qty} unidad(es) será devuelto automáticamente al inventario.`,
    );
    if (!shouldDelete) return;

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => {
      const updatedInventory = (clinic.inventory || []).map((item) => {
        if (item.name.toLowerCase() === targetSale.product.toLowerCase()) {
          return { ...item, stock: item.stock + targetSale.qty };
        }
        return item;
      });

      const updatedSales = (clinic.sales || []).filter((sale) => sale.id !== saleId);
      const updatedCashFlow = (clinic.cashFlow || []).filter(
        (cash) => !(cash.description === `Venta de ${targetSale.product}` && cash.amount === targetSale.total && cash.date === targetSale.date),
      );

      return {
        ...clinic,
        inventory: updatedInventory,
        sales: updatedSales,
        cashFlow: updatedCashFlow,
      };
    });

    await updateStateAndSync(nextState);
    showToast(`Venta eliminada y stock restaurado (+${targetSale.qty} ud) 🔄`, 'info');
  };

  // Export Inventory CSV
  const exportInventoryToCSV = () => {
    if (!currentClinic || !currentClinic.inventory.length) {
      showToast('No hay productos registrados para exportar', 'error');
      return;
    }

    const headers = ['ID', 'Nombre', 'Categoria', 'Stock', 'Stock Minimo', 'Costo (COP)', 'Precio (COP)', 'Fecha Vencimiento'];
    const rows = currentClinic.inventory.map((item) => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      item.stock,
      item.minStock,
      item.cost,
      item.price,
      item.expirationDate || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventario_${currentClinic.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventario exportado a CSV 📊', 'success');
  };

  // Export Sales CSV
  const exportSalesToCSV = () => {
    if (!currentClinic || !currentClinic.sales.length) {
      showToast('No hay ventas registradas para exportar', 'error');
      return;
    }

    const headers = ['ID Venta', 'Producto', 'Cantidad', 'Cliente', 'Total (COP)', 'Fecha'];
    const rows = currentClinic.sales.map((sale) => [
      sale.id,
      `"${sale.product.replace(/"/g, '""')}"`,
      sale.qty,
      `"${sale.client.replace(/"/g, '""')}"`,
      sale.total,
      sale.date,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ventas_${currentClinic.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Historial de ventas exportado a CSV 📊', 'success');
  };

  const signOut = () => {
    setSession(null);
    writeSessionCookie(null);
  };

  const renderProductForm = (inModal = false) => (
    <form className="stack-form" onSubmit={handleSaveProduct}>
      <label>
        <span>Nombre del producto *</span>
        <input
          value={productForm.name}
          onChange={(event) => updateProductFormField('name', event.target.value)}
          placeholder="Ej. Vacuna Rabia Canina 10ml"
          required
        />
      </label>

      <label>
        <span>Foto del producto</span>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => startCamera('environment')}
              style={{ flex: 1, minWidth: 130 }}
            >
              📷 Tomar foto (Cámara/Webcam)
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => productFileInputRef.current?.click()}
              style={{ flex: 1, minWidth: 120 }}
            >
              📁 Subir archivo
            </button>
          </div>
          <input
            ref={productFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProductImageChange}
            style={{ display: 'none' }}
          />
        </div>
      </label>

      {productForm.image ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <img
            src={productForm.image}
            alt="Preview del producto"
            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--line)' }}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={() => setProductForm((current) => ({ ...current, image: '' }))}
            style={{ width: 'fit-content' }}
          >
            Quitar foto
          </button>
        </div>
      ) : null}

      <label>
        <span>Categoría</span>
        <input
          value={productForm.category}
          onChange={(event) => updateProductFormField('category', event.target.value)}
          placeholder="Ej. Vacunas, Antibióticos, Alimentos"
        />
      </label>

      <div className="inline-inputs">
        <label>
          <span>Stock actual</span>
          <input
            type="number"
            min={0}
            value={productForm.stock}
            onChange={(event) => updateProductFormField('stock', event.target.value)}
          />
        </label>
        <label>
          <span>Stock mínimo</span>
          <input
            type="number"
            min={0}
            value={productForm.minStock}
            onChange={(event) => updateProductFormField('minStock', event.target.value)}
          />
        </label>
      </div>

      <div className="inline-inputs">
        <label>
          <span>Costo (COP)</span>
          <input
            type="number"
            min={0}
            value={productForm.cost}
            onChange={(event) => updateProductFormField('cost', event.target.value)}
          />
        </label>
        <label>
          <span>Precio venta (COP)</span>
          <input
            type="number"
            min={0}
            value={productForm.price}
            onChange={(event) => updateProductFormField('price', event.target.value)}
          />
        </label>
      </div>

      <label>
        <span>Fecha de vencimiento (Opcional)</span>
        <input
          type="date"
          value={productForm.expirationDate}
          onChange={(event) => updateProductFormField('expirationDate', event.target.value)}
        />
      </label>

      <div className="buttons-row" style={{ marginTop: 10 }}>
        <button className="primary-button" type="submit">
          {editingProductId ? 'Actualizar producto' : 'Guardar producto'}
        </button>
        {inModal || editingProductId ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setEditingProductId(null);
              setProductForm(emptyProductForm);
              setIsProductModalOpen(false);
            }}
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );

  if (!session) {
    return (
      <main className="auth-page">
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <div className="auth-card">
          <div className="brand-block">
            <div className="brand-mark">V</div>
            <div>
              <p className="label-muted">Sistema de gestión veterinaria</p>
              <h1>VetStock</h1>
            </div>
          </div>

          <h2>Iniciar sesión</h2>
          <p className="subtext">Accede como superadmin o como veterinaria autorizada.</p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input type="email" name="email" placeholder="admin@vetstock.com" required />
            </label>

            <label>
              <span>Contraseña</span>
              <input type="password" name="password" placeholder="••••••••" required />
            </label>

            {loginError ? <p className="error-message">{loginError}</p> : null}

            <button className="primary-button" type="submit">Entrar</button>
          </form>

        </div>
      </main>
    );
  }

  if (session.role === 'superadmin') {
    const revenue = appData.clinics.reduce((sum, clinic) => sum + clinic.sales.reduce((sub, sale) => sub + sale.total, 0), 0);

    return (
      <main className="app-shell">
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <header className="app-header">
          <div className="brand-logo-wrap">
            <div className="brand-logo">V</div>
            <div className="brand-copy">
              <p className="label-muted">Panel administrativo</p>
              <h1>Superadmin</h1>
            </div>
          </div>
          <button className="secondary-button" onClick={signOut} type="button">Cerrar sesión</button>
        </header>

        <section className="summary-grid">
          <article className="stat-card">
            <span>Total veterinarias</span>
            <strong>{appData.clinics.length}</strong>
          </article>
          <article className="stat-card">
            <span>Autorizadas</span>
            <strong>{appData.clinics.filter((clinic) => clinic.authorized).length}</strong>
          </article>
          <article className="stat-card">
            <span>Ventas activas</span>
            <strong>{formatCurrency(revenue)}</strong>
          </article>
        </section>

        <section className="admin-grid">
          <div className="panel">
            <h2>{editingClinicId ? 'Editar veterinaria' : 'Agregar veterinaria autorizada'}</h2>
            <form className="stack-form" onSubmit={handleSaveClinic}>
              <label>
                <span>Nombre</span>
                <input value={clinicForm.name} onChange={(event) => setClinicForm({ ...clinicForm, name: event.target.value })} placeholder="Veterinaria El Bosque" />
              </label>

              <label>
                <span>Email</span>
                <input type="email" value={clinicForm.email} onChange={(event) => setClinicForm({ ...clinicForm, email: event.target.value })} placeholder="vet@correo.com" />
              </label>

              <label>
                <span>Contraseña</span>
                <input type="password" value={clinicForm.password} onChange={(event) => setClinicForm({ ...clinicForm, password: event.target.value })} placeholder="••••••••" />
              </label>

              <label>
                <span>Teléfono</span>
                <input value={clinicForm.phone} onChange={(event) => setClinicForm({ ...clinicForm, phone: event.target.value })} placeholder="+57 300 123 4567" />
              </label>

              <label>
                <span>Estado</span>
                <select value={String(clinicForm.authorized)} onChange={(event) => setClinicForm({ ...clinicForm, authorized: event.target.value === 'true' })}>
                  <option value="true">Autorizada</option>
                  <option value="false">Pendiente</option>
                </select>
              </label>

              <div className="buttons-row">
                <button className="primary-button" type="submit">{editingClinicId ? 'Actualizar' : 'Guardar veterinaria'}</button>
                {editingClinicId ? (
                  <button type="button" className="secondary-button" onClick={resetClinicForm}>Cancelar</button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Veterinarias registradas</h2>
            <div className="clinic-list">
              {appData.clinics.map((clinic) => (
                <div key={clinic.id} className="clinic-item">
                  <div>
                    <strong>{clinic.name}</strong>
                    <p>{clinic.email}</p>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="tiny-button edit" onClick={() => handleEditClinic(clinic)}>Editar</button>
                    <button type="button" className="tiny-button delete" onClick={() => handleDeleteClinic(clinic.id)}>Eliminar</button>
                    <span className={`status-pill ${clinic.authorized ? 'active' : 'inactive'}`}>
                      {clinic.authorized ? 'Autorizada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel" style={{ marginTop: 22 }}>
          <h2>Cambiar mi contraseña</h2>
          <form className="stack-form" onSubmit={handleUpdateSuperAdminPassword}>
            <div className="inline-inputs">
              <label>
                <span>Contraseña actual</span>
                <input type="password" value={superAdminPasswordForm.currentPassword} onChange={(event) => setSuperAdminPasswordForm({ ...superAdminPasswordForm, currentPassword: event.target.value })} placeholder="••••••••" />
              </label>
              <label>
                <span>Nueva contraseña</span>
                <input type="password" value={superAdminPasswordForm.newPassword} onChange={(event) => setSuperAdminPasswordForm({ ...superAdminPasswordForm, newPassword: event.target.value })} placeholder="Mínimo 6 caracteres" />
              </label>
            </div>

            <label>
              <span>Confirmar nueva contraseña</span>
              <input type="password" value={superAdminPasswordForm.confirmPassword} onChange={(event) => setSuperAdminPasswordForm({ ...superAdminPasswordForm, confirmPassword: event.target.value })} placeholder="Repite la nueva contraseña" />
            </label>

            {superAdminPasswordMessage ? <p className="error-message">{superAdminPasswordMessage}</p> : null}

            <button className="primary-button" type="submit">Actualizar contraseña</button>
          </form>
        </section>

        <section className="panel" style={{ marginTop: 22 }}>
          <h2>Cambiar contraseña de una veterinaria</h2>
          <form className="stack-form" onSubmit={handleUpdateClinicPassword}>
            <label>
              <span>Veterinaria</span>
              <select value={clinicPasswordForm.clinicId} onChange={(event) => setClinicPasswordForm({ ...clinicPasswordForm, clinicId: event.target.value })}>
                <option value="">Selecciona una veterinaria</option>
                {appData.clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </label>

            <div className="inline-inputs">
              <label>
                <span>Nueva contraseña</span>
                <input type="password" value={clinicPasswordForm.newPassword} onChange={(event) => setClinicPasswordForm({ ...clinicPasswordForm, newPassword: event.target.value })} placeholder="Mínimo 6 caracteres" />
              </label>
              <label>
                <span>Confirmar</span>
                <input type="password" value={clinicPasswordForm.confirmPassword} onChange={(event) => setClinicPasswordForm({ ...clinicPasswordForm, confirmPassword: event.target.value })} placeholder="Repite la contraseña" />
              </label>
            </div>

            {clinicPasswordMessage ? <p className="error-message">{clinicPasswordMessage}</p> : null}

            <button className="primary-button" type="submit">Actualizar clave</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {/* Dynamic Toast Banner */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="brand-logo-wrap">
          <div className="brand-logo">V</div>
          <div className="brand-copy">
            <p className="label-muted">VetStock</p>
            <h1>{currentClinic?.name ?? 'Veterinaria'}</h1>
          </div>
        </div>
        <button className="secondary-button" onClick={signOut} type="button">Cerrar sesión</button>
      </header>

      <nav className="tab-nav" aria-label="Módulos de la aplicación">
        {tabs.map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      <section className="summary-grid">
        <article className="stat-card">
          <span>Productos</span>
          <strong>{currentClinic?.inventory.length ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Valor Inventario</span>
          <strong>{formatCurrency(totalInventoryValue)}</strong>
        </article>
        <article className="stat-card">
          <span>Ventas del mes</span>
          <strong>{formatCurrency(totalMonthlySales)}</strong>
        </article>
      </section>

      {activeTab === 'Dashboard' && (
        <section className="dashboard-layout">
          <div className="panel tall-panel dashboard-panel">
            <div className="dashboard-topline">
              <div>
                <p className="label-muted">Resumen operativo</p>
                <h2>Rendimiento general</h2>
              </div>
              <span className="tag-chip success">Activo</span>
            </div>

            <div className="kpi-grid">
              <div className="mini-metric accent-blue">
                <span>Ventas Totales</span>
                <strong>{formatCurrency(totalMonthlySales)}</strong>
                <small>Ingresos acumulados</small>
              </div>
              <div className="mini-metric accent-green">
                <span>Ganancia Est.</span>
                <strong>{formatCurrency(estimatedGrossProfit)}</strong>
                <small>Margen bruto estimado</small>
              </div>
              <div className="mini-metric accent-amber">
                <span>Saldo caja</span>
                <strong>{formatCurrency(cashBalance)}</strong>
                <small>{lowStockItems.length} bajos • {expiringSoonItems.length} vencimientos</small>
              </div>
            </div>

            <div className="chart-box">
              <div className="chart-header">
                <h3>Últimas ventas</h3>
                <span className="tag-chip neutral">Recientes</span>
              </div>
              <div className="bars">
                {currentClinic?.sales.slice(0, 5).map((sale, index) => (
                  <div key={sale.id} className="bar-column" style={{ height: `${Math.min(100, 36 + index * 16)}%` }}>
                    <span>{sale.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <h2>Alertas de Inventario</h2>
              <span className="tag-chip neutral">{lowStockItems.length + expiringSoonItems.length} avisos</span>
            </div>

            <div className="alert-list" style={{ marginTop: 12 }}>
              {expiringSoonItems.length > 0 && (
                expiringSoonItems.map((item) => (
                  <div key={`exp-${item.id}`} className="alert-item" style={{ background: '#fff5f5', borderColor: '#fca5a5' }}>
                    <strong style={{ color: '#b91c1c' }}>⏳ Próximo a vencer: {item.name}</strong>
                    <span>Vence el: {item.expirationDate} (Stock: {item.stock})</span>
                  </div>
                ))
              )}

              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div key={`stock-${item.id}`} className="alert-item">
                    <strong>⚠️ Stock bajo: {item.name}</strong>
                    <span>Stock actual: {item.stock} / mínimo {item.minStock}</span>
                  </div>
                ))
              ) : expiringSoonItems.length === 0 ? (
                <p className="muted-text">No hay alertas de stock ni vencimiento. 👍</p>
              ) : null}
            </div>

            <div className="sales-list-wrap">
              <div className="section-head compact">
                <h3>Últimos movimientos</h3>
              </div>
              <div className="sales-list">
                {currentClinic?.sales.slice(0, 4).map((sale) => (
                  <div key={sale.id} className="sales-item">
                    <div>
                      <strong>{sale.product}</strong>
                      <small>{sale.client}</small>
                    </div>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Inventario' && (
        <section className="clinic-grid">
          <div className="panel tall-panel">
            <div className="section-head" style={{ marginBottom: 16 }}>
              <h2>Inventario</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={exportInventoryToCSV}
                  style={{ width: 'auto', padding: '10px 14px', fontSize: '0.88rem' }}
                >
                  📊 Exportar CSV
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={openNewProductModal}
                  style={{ width: 'auto', padding: '10px 16px', fontSize: '0.88rem' }}
                >
                  + Nuevo producto
                </button>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="toolbar-wrap">
              <div className="search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar producto o categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {availableCategories.length > 0 && (
                <select
                  className="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Min</th>
                    <th>Precio</th>
                    <th>Costo</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length ? (
                    filteredInventory.map((item) => (
                      <tr key={item.id} className={item.stock <= item.minStock ? 'warning-row' : ''}>
                        <td>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10 }} />
                          ) : (
                            <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#edf3ff', color: '#2c6df4', fontWeight: 700 }}>
                              {item.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.category}</td>
                        <td>
                          <span className={`stock-badge ${item.stock === 0 ? 'out' : item.stock <= item.minStock ? 'low' : 'normal'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td>{item.minStock}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.cost)}</td>
                        <td>
                          {item.expirationDate ? (
                            <span style={{ fontSize: '0.85rem', color: new Date(item.expirationDate) <= new Date() ? '#dc2626' : 'var(--text)' }}>
                              {item.expirationDate}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="tiny-button edit" onClick={() => handleEditProduct(item)}>Editar</button>
                            <button type="button" className="tiny-button delete" onClick={() => handleDeleteProduct(item.id)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="empty-state">
                        {searchQuery || categoryFilter ? 'No se encontraron productos con esos filtros.' : 'Todavía no hay productos registrados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (<768px) */}
            <div className="mobile-card-grid">
              {filteredInventory.length ? (
                filteredInventory.map((item) => (
                  <div key={item.id} className="product-card">
                    <div className="product-card-top">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="product-card-img" />
                      ) : (
                        <div className="product-card-avatar">{item.name.slice(0, 1).toUpperCase()}</div>
                      )}
                      <div className="product-card-meta">
                        <h4 className="product-card-title">{item.name}</h4>
                        <div className="product-card-category">{item.category}</div>
                        {item.expirationDate && (
                          <small style={{ color: '#d97706', display: 'block', marginTop: 2 }}>
                            ⏳ Vence: {item.expirationDate}
                          </small>
                        )}
                      </div>
                      <span className={`stock-badge ${item.stock === 0 ? 'out' : item.stock <= item.minStock ? 'low' : 'normal'}`}>
                        {item.stock <= item.minStock ? '⚠️ ' : ''}{item.stock} en stock
                      </span>
                    </div>

                    <div className="product-card-metrics">
                      <div className="metric-pill">
                        <span>Precio</span>
                        <strong>{formatCurrency(item.price)}</strong>
                      </div>
                      <div className="metric-pill">
                        <span>Costo</span>
                        <strong>{formatCurrency(item.cost)}</strong>
                      </div>
                      <div className="metric-pill">
                        <span>Mínimo</span>
                        <strong>{item.minStock}</strong>
                      </div>
                    </div>

                    <div className="product-card-actions">
                      <button type="button" className="secondary-button" onClick={() => handleEditProduct(item)}>
                        ✏️ Editar
                      </button>
                      <button type="button" className="secondary-button" style={{ color: '#b91c1c' }} onClick={() => handleDeleteProduct(item.id)}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  {searchQuery || categoryFilter ? 'No se encontraron productos con esos filtros.' : 'Todavía no hay productos registrados.'}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Form Panel */}
          <div className="panel desktop-form-panel">
            <h2>{editingProductId ? 'Editar producto' : 'Agregar producto'}</h2>
            {renderProductForm(false)}
          </div>
        </section>
      )}

      {activeTab === 'Ventas' && (
        <section className="clinic-grid">
          <div className="panel tall-panel">
            <div className="section-head" style={{ marginBottom: 16 }}>
              <h2>Ventas registradas</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={exportSalesToCSV}
                style={{ width: 'auto', padding: '10px 14px', fontSize: '0.88rem' }}
              >
                📊 Exportar Ventas CSV
              </button>
            </div>
            
            {/* Desktop Table View */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClinic?.sales.length ? (
                    currentClinic.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><strong>{sale.product}</strong></td>
                        <td>{sale.qty}</td>
                        <td>{sale.client}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{sale.date}</td>
                        <td>
                          <button
                            type="button"
                            className="tiny-button delete"
                            onClick={() => handleDeleteSale(sale.id)}
                            title="Eliminar venta y devolver stock"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-state">Todavía no hay ventas registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Sales List */}
            <div className="mobile-card-grid">
              {currentClinic?.sales.length ? (
                currentClinic.sales.map((sale) => (
                  <div key={sale.id} className="product-card">
                    <div className="product-card-top">
                      <div className="product-card-avatar" style={{ background: '#e0f2fe', color: '#0369a1' }}>🛒</div>
                      <div className="product-card-meta">
                        <h4 className="product-card-title">{sale.product}</h4>
                        <div className="product-card-category">Cliente: {sale.client} • {sale.date}</div>
                      </div>
                      <strong>{formatCurrency(sale.total)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Cantidad: <strong>{sale.qty} ud(s)</strong>
                      </span>
                      <button
                        type="button"
                        className="tiny-button delete"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        🗑️ Eliminar venta
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Todavía no hay ventas registradas.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Registrar venta</h2>
            <form className="stack-form" onSubmit={handleAddSale}>
              <label>
                <span>Producto *</span>
                <select
                  value={saleForm.productId}
                  onChange={(event) => setSaleForm({ ...saleForm, productId: event.target.value })}
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {currentClinic?.inventory.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.stock === 0}>
                      {item.name} ({item.stock} en stock) - {formatCurrency(item.price)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Cliente</span>
                <input
                  value={saleForm.clientName}
                  onChange={(event) => setSaleForm({ ...saleForm, clientName: event.target.value })}
                  placeholder="Ej. Juan Pérez (o dejar Cliente General)"
                />
              </label>

              <label>
                <span>Cantidad</span>
                <input
                  type="number"
                  min={1}
                  value={saleForm.quantity}
                  onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })}
                  required
                />
              </label>

              <button className="primary-button" type="submit">Registrar venta</button>
            </form>
          </div>
        </section>
      )}

      {/* Floating Action Button for Mobile (+ Nuevo producto) */}
      {activeTab === 'Inventario' && (
        <button
          type="button"
          className="mobile-fab-btn"
          onClick={openNewProductModal}
          aria-label="Agregar producto"
        >
          <span>➕</span> Nuevo Producto
        </button>
      )}

      {/* Mobile Form Drawer / Modal Overlay */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProductId ? 'Editar producto' : 'Agregar nuevo producto'}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsProductModalOpen(false)}
              >
                ✕
              </button>
            </div>
            {renderProductForm(true)}
          </div>
        </div>
      )}

      {/* WebRTC Live Camera Modal (PC Webcam & Mobile) */}
      {isCameraModalOpen && (
        <div
          className="camera-modal-overlay"
          onClick={() => {
            stopCamera();
            setIsCameraModalOpen(false);
          }}
        >
          <div className="camera-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <h3>📷 Tomar foto con cámara</h3>
              <button
                type="button"
                className="close-modal-btn"
                style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)' }}
                onClick={() => {
                  stopCamera();
                  setIsCameraModalOpen(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="camera-preview-box">
              <video ref={videoRef} className="camera-preview-video" autoPlay playsInline muted />
            </div>

            <div className="camera-controls">
              <button type="button" className="primary-button" onClick={capturePhotoFromCamera}>
                📸 Capturar Foto
              </button>
              <button type="button" className="secondary-button" onClick={switchCameraFacingMode}>
                🔄 Cambiar Cámara
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
