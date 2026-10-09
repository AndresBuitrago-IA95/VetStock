"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Product = {
  id: string;
  name: string;
  description?: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  expirationDate?: string;
  image?: string;
};

type SaleItem = {
  productId: string;
  product: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  total: number;
};

type SalePaymentMethod = 'efectivo' | 'transferencia' | 'credito';

type SalePayment = {
  id: string;
  amount: number;
  date: string;
  method: Exclude<SalePaymentMethod, 'credito'>;
};

type Sale = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  client: string;
  buyerDocument?: string;
  paymentMethod?: SalePaymentMethod;
  cashReceived?: number;
  changeGiven?: number;
  installmentCount?: number;
  installmentAmount?: number;
  payments?: SalePayment[];
  items?: SaleItem[];
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
  saleId?: string;
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

const POLL_INTERVAL_MS = 2500;

const defaultData: AppState = {
  updatedAt: 1,
  superAdmin: {
    id: 'superadmin-1',
    name: 'Super Admin',
    email: 'admin@vetstock.com',
    password: '',
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
  description: '',
  category: '',
  stock: '0',
  minStock: '0',
  cost: '0',
  price: '0',
  expirationDate: '',
  image: '',
};

const tabs: TabKey[] = ['Dashboard', 'Inventario', 'Ventas'];

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
  const response = await fetch('/api/state', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({})) as AppState & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo cargar el estado de Neon.');
  }
  if (!payload || !Array.isArray(payload.clinics)) {
    throw new Error('Neon devolvió un estado con formato inválido.');
  }
  return payload;
}

async function syncStateToServer(data: AppState): Promise<AppState> {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({})) as AppState & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'No se pudieron guardar los cambios en Neon.');
  }
  return payload;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(value);
}

function getLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function getSalePaidAmount(sale: Sale) {
  if (sale.payments) return sale.payments.reduce((total, payment) => total + payment.amount, 0);
  return sale.paymentMethod === 'credito' ? 0 : sale.total;
}

function getSaleBalance(sale: Sale) {
  return Math.max(0, sale.total - getSalePaidAmount(sale));
}

export default function HomePage() {
  const [appData, setAppData] = useState<AppState>(defaultData);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const hasPollErrorRef = useRef(false);
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
  const [saleLines, setSaleLines] = useState([{ productId: '', quantity: '1' }]);
  const [saleClientName, setSaleClientName] = useState('');
  const [saleBuyerDocument, setSaleBuyerDocument] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<SalePaymentMethod>('efectivo');
  const [saleCashReceived, setSaleCashReceived] = useState('');
  const [saleInstallmentCount, setSaleInstallmentCount] = useState('');
  const [saleInstallmentAmount, setSaleInstallmentAmount] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [paymentSaleId, setPaymentSaleId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDate);
  const [paymentMethod, setPaymentMethod] = useState<Exclude<SalePaymentMethod, 'credito'>>('efectivo');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [pendingSale, setPendingSale] = useState<{
    items: SaleItem[];
    total: number;
    productSummary: string;
    totalQuantity: number;
    client: string;
    buyerDocument: string;
    paymentMethod: SalePaymentMethod;
    cashReceived: number;
    changeGiven: number;
    installmentCount?: number;
    installmentAmount?: number;
  } | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const updateStateAndSync = async (nextState: AppState): Promise<boolean> => {
    const now = Date.now();
    const previousState = appData;
    const stampedState: AppState = {
      ...nextState,
      updatedAt: now,
    };

    isSavingRef.current = true;
    setAppData(stampedState);

    try {
      const finalState = await syncStateToServer(stampedState);
      setAppData(finalState);
      return true;
    } catch (err) {
      setAppData(previousState);
      const message = err instanceof Error ? err.message : 'No se pudieron guardar los cambios.';
      showToast(message, 'error');
      return false;
    } finally {
      // Keep saving lock for 5 seconds to prevent race condition polling overwrites on high latency mobile network
      setTimeout(() => {
        isSavingRef.current = false;
      }, 5000);
    }
  };

  useEffect(() => {
    const syncInitial = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (response.status === 401) return;
        const payload = await response.json() as { user?: Session; error?: string };
        if (!response.ok || !payload.user) {
          throw new Error(payload.error || 'No se pudo validar la sesión.');
        }
        sessionRef.current = payload.user;
        setSession(payload.user);
        setAppData(await loadAppState());
      } catch (error) {
        console.error('Initial Neon sync failed:', error);
        showToast(error instanceof Error ? error.message : 'No se pudo conectar con Neon.', 'error');
      }
    };

    syncInitial();

    const intervalId = window.setInterval(async () => {
      if (isSavingRef.current || !sessionRef.current) return;

      try {
        const nextData = await loadAppState();
        hasPollErrorRef.current = false;
        setAppData((previous) => {
          if (isSavingRef.current) return previous;
          const equal = JSON.stringify(previous) === JSON.stringify(nextData);
          return equal ? previous : nextData;
        });
      } catch (error) {
        console.error('Neon polling error:', error);
        if (!hasPollErrorRef.current) {
          showToast(error instanceof Error ? error.message : 'No se pudo sincronizar con Neon.', 'error');
          hasPollErrorRef.current = true;
        }
      }
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

  const saleSubtotal = useMemo(() => {
    if (!currentClinic) return 0;
    return saleLines.reduce((subtotal, line) => {
      const product = currentClinic.inventory.find((item) => item.id === line.productId);
      const quantity = Number(line.quantity);
      return product && Number.isFinite(quantity) && quantity > 0
        ? subtotal + product.price * quantity
        : subtotal;
    }, 0);
  }, [currentClinic, saleLines]);

  const estimatedGrossProfit = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.sales.reduce((profit, sale) => {
      if (sale.items?.length) {
        return profit + sale.items.reduce((saleProfit, item) => saleProfit + (item.unitPrice - item.unitCost) * item.qty, 0);
      }
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

  const matchingCategories = useMemo(() => {
    const query = productForm.category.trim().toLocaleLowerCase();
    return availableCategories.filter((category) => category.toLocaleLowerCase().includes(query));
  }, [availableCategories, productForm.category]);

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
        setLoginError(payload.error ?? 'Credenciales incorrectas o este negocio no está autorizado.');
        return;
      }

      const payload = (await response.json()) as { user: Session };
      sessionRef.current = payload.user;
      setSession(payload.user);
      try {
        setAppData(await loadAppState());
      } catch (error) {
        sessionRef.current = null;
        setSession(null);
        await fetch('/api/auth/logout', { method: 'POST' });
        setLoginError(error instanceof Error ? error.message : 'No se pudo cargar la información de Neon.');
        return;
      }
      setLoginError('');
      showToast(`¡Bienvenido, ${payload.user.name}!`, 'success');
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
      showToast('Ya existe un negocio registrado con ese email', 'error');
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
    if (!(await updateStateAndSync(nextState))) return;
    showToast(editingClinicId ? 'Negocio actualizado' : 'Negocio guardado correctamente');
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

    const shouldDelete = window.confirm(`¿Deseas eliminar el negocio ${target.name}?`);
    if (!shouldDelete) return;

    const nextState = {
      ...appData,
      clinics: appData.clinics.filter((clinic) => clinic.id !== clinicId),
    };
    if (!(await updateStateAndSync(nextState))) return;
    showToast('Negocio eliminado', 'info');
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

    if (!(await updateStateAndSync(nextState))) return;
    setSuperAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSuperAdminPasswordMessage('');
    showToast('Contraseña de superadmin actualizada correctamente');
  };

  const handleUpdateClinicPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { clinicId, newPassword, confirmPassword } = clinicPasswordForm;
    if (!clinicId) {
      setClinicPasswordMessage('Selecciona un negocio para cambiar la contraseña.');
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

    if (!(await updateStateAndSync(nextState))) return;
    setClinicPasswordForm({ clinicId: '', newPassword: '', confirmPassword: '' });
    setClinicPasswordMessage('');
    showToast('Contraseña del negocio actualizada');
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
      showToast('No se encontró una sesión activa del negocio', 'error');
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
      description: productForm.description.trim() || undefined,
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

    if (!(await updateStateAndSync(nextState))) return;

    showToast(editingProductId ? '¡Producto actualizado!' : '¡Producto guardado exitosamente!', 'success');
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
      description: product.description ?? '',
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

    if (!(await updateStateAndSync(nextState))) return;
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

    const itemsByProduct = new Map<string, SaleItem>();
    for (const line of saleLines) {
      const selectedProduct = currentClinic.inventory.find((item) => item.id === line.productId);
      const quantity = Number(line.quantity);
      if (!selectedProduct) {
        showToast('Selecciona un producto válido en cada renglón', 'error');
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        showToast('Cada cantidad debe ser mayor a 0', 'error');
        return;
      }

      const previous = itemsByProduct.get(selectedProduct.id);
      const combinedQuantity = (previous?.qty ?? 0) + quantity;
      if (combinedQuantity > selectedProduct.stock) {
        showToast(`Stock insuficiente para ${selectedProduct.name}. Disponible: ${selectedProduct.stock}`, 'error');
        return;
      }
      itemsByProduct.set(selectedProduct.id, {
        productId: selectedProduct.id,
        product: selectedProduct.name,
        qty: combinedQuantity,
        unitPrice: selectedProduct.price,
        unitCost: selectedProduct.cost,
        total: selectedProduct.price * combinedQuantity,
      });
    }

    const saleItems = Array.from(itemsByProduct.values());
    const total = saleItems.reduce((sum, item) => sum + item.total, 0);
    const productSummary = saleItems.map((item) => item.product).join(', ');
    const totalQuantity = saleItems.reduce((sum, item) => sum + item.qty, 0);
    const client = saleClientName.trim();
    const buyerDocument = saleBuyerDocument.trim();
    if (!client || !buyerDocument) {
      showToast('Ingresa el nombre y documento de quien compra', 'error');
      return;
    }

    const cashReceived = salePaymentMethod === 'efectivo' ? Number(saleCashReceived) : 0;
    const changeGiven = cashReceived - total;
    if (salePaymentMethod === 'efectivo' && (!Number.isFinite(cashReceived) || cashReceived < total)) {
      showToast('El efectivo recibido debe ser igual o mayor al total de la venta', 'error');
      return;
    }

    const installmentCount = Number(saleInstallmentCount);
    const installmentAmount = Number(saleInstallmentAmount);
    if (
      salePaymentMethod === 'credito' &&
      (!Number.isInteger(installmentCount) || installmentCount < 1 || !Number.isFinite(installmentAmount) || installmentAmount <= 0)
    ) {
      showToast('Ingresa un número de cuotas y un valor de cuota válidos', 'error');
      return;
    }

    setPendingSale({
      items: saleItems,
      total,
      productSummary,
      totalQuantity,
      client,
      buyerDocument,
      paymentMethod: salePaymentMethod,
      cashReceived,
      changeGiven,
      ...(salePaymentMethod === 'credito' ? { installmentCount, installmentAmount } : {}),
    });
  };

  const handleConfirmSale = async () => {
    if (!currentClinic || !pendingSale || isConfirmingSale) return;

    const {
      items: saleItems,
      total,
      productSummary,
      totalQuantity,
      client,
      buyerDocument,
      paymentMethod: method,
      cashReceived,
      changeGiven,
      installmentCount,
      installmentAmount,
    } = pendingSale;
    const stockConflict = saleItems.find((saleItem) => {
      const product = currentClinic.inventory.find((item) => item.id === saleItem.productId);
      return !product || product.stock < saleItem.qty;
    });
    if (stockConflict) {
      showToast(`El stock de ${stockConflict.product} cambió. Revisa la venta antes de confirmarla.`, 'error');
      setPendingSale(null);
      return;
    }

    const saleId = `sale-${Date.now()}`;
    const saleDate = getLocalDate();

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => {
      const quantitiesByProduct = new Map(saleItems.map((item) => [item.productId, item.qty] as const));
      const updatedInventory = (clinic.inventory || []).map((item) => ({
        ...item,
        stock: Math.max(0, item.stock - (quantitiesByProduct.get(item.id) ?? 0)),
      }));

      const newSale: Sale = {
        id: saleId,
        product: productSummary,
        qty: totalQuantity,
        total,
        date: saleDate,
        client,
        buyerDocument,
        paymentMethod: method,
        ...(method === 'efectivo' ? { cashReceived, changeGiven } : {}),
        ...(method === 'credito' ? { installmentCount, installmentAmount } : {}),
        payments: method === 'credito'
          ? []
          : [{ id: `payment-${saleId}`, amount: total, date: saleDate, method }],
        items: saleItems,
      };

      const newCashEntry: CashEntry | null = method === 'credito' ? null : {
        id: `cash-${saleId}`,
        type: 'ingreso',
        description: `Venta de ${productSummary}`,
        amount: total,
        date: saleDate,
        saleId,
      };

      return {
        ...clinic,
        inventory: updatedInventory,
        sales: [newSale, ...(clinic.sales || [])],
        cashFlow: newCashEntry ? [newCashEntry, ...(clinic.cashFlow || [])] : clinic.cashFlow || [],
      };
    });

    setIsConfirmingSale(true);
    try {
      if (!(await updateStateAndSync(nextState))) return;
      setPendingSale(null);
      showToast(`¡Venta de ${saleItems.length} producto(s) registrada!`, 'success');
      setSaleLines([{ productId: '', quantity: '1' }]);
      setSaleClientName('');
      setSaleBuyerDocument('');
      setSaleCashReceived('');
      setSaleInstallmentCount('');
      setSaleInstallmentAmount('');
    } finally {
      setIsConfirmingSale(false);
    }
  };

  const handleOpenPayment = (sale: Sale) => {
    setPaymentSaleId(sale.id);
    setPaymentAmount(String(getSaleBalance(sale)));
    setPaymentDate(getLocalDate());
    setPaymentMethod('efectivo');
  };

  const handleRegisterPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentClinic || !paymentSaleId || isRecordingPayment) return;

    const sale = currentClinic.sales.find((item) => item.id === paymentSaleId);
    const amount = Number(paymentAmount);
    if (!sale || sale.paymentMethod !== 'credito') {
      showToast('No se encontró la venta a crédito seleccionada', 'error');
      return;
    }
    const balance = getSaleBalance(sale);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      showToast(`El abono debe ser mayor a 0 y no superar el saldo de ${formatCurrency(balance)}`, 'error');
      return;
    }
    if (!paymentDate) {
      showToast('Selecciona la fecha del abono', 'error');
      return;
    }

    const payment: SalePayment = {
      id: `payment-${Date.now()}`,
      amount,
      date: paymentDate,
      method: paymentMethod,
    };
    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => ({
      ...clinic,
      sales: clinic.sales.map((item) =>
        item.id === sale.id
          ? { ...item, payments: [...(item.payments || []), payment] }
          : item,
      ),
      cashFlow: [
        {
          id: `cash-${payment.id}`,
          type: 'ingreso',
          description: `Abono a venta ${sale.id} - ${sale.client}`,
          amount,
          date: paymentDate,
          saleId: sale.id,
        },
        ...(clinic.cashFlow || []),
      ],
    }));

    setIsRecordingPayment(true);
    try {
      if (!(await updateStateAndSync(nextState))) return;
      setPaymentSaleId(null);
      showToast('Abono registrado y saldo actualizado', 'success');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Delete sale and restore inventory stock automatically
  const handleDeleteSale = async (saleId: string) => {
    if (!currentClinic) return;

    const targetSale = (currentClinic.sales || []).find((sale) => sale.id === saleId);
    if (!targetSale) return;

    const saleProductNames = targetSale.items?.map((item) => item.product).join(', ') || targetSale.product;
    const shouldDelete = window.confirm(
      `¿Deseas eliminar la venta de "${saleProductNames}" por ${formatCurrency(targetSale.total)}?\n\nEl stock será devuelto automáticamente al inventario.`,
    );
    if (!shouldDelete) return;

    const nextState = updateClinicInState(appData, currentClinic.id, (clinic) => {
      const restoredQuantities = targetSale.items?.length
        ? new Map(targetSale.items.map((item) => [item.productId, item.qty] as const))
        : null;
      const updatedInventory = (clinic.inventory || []).map((item) => {
        const restoredQuantity = restoredQuantities
          ? restoredQuantities.get(item.id) ?? 0
          : item.name.toLowerCase() === targetSale.product.toLowerCase() ? targetSale.qty : 0;
        return restoredQuantity ? { ...item, stock: item.stock + restoredQuantity } : item;
      });

      const updatedSales = (clinic.sales || []).filter((sale) => sale.id !== saleId);
      const updatedCashFlow = (clinic.cashFlow || []).filter(
        (cash) => !(cash.saleId === saleId || (!cash.saleId && cash.description === `Venta de ${targetSale.product}` && cash.amount === targetSale.total && cash.date === targetSale.date)),
      );

      return {
        ...clinic,
        inventory: updatedInventory,
        sales: updatedSales,
        cashFlow: updatedCashFlow,
      };
    });

    if (!(await updateStateAndSync(nextState))) return;
    showToast('Venta eliminada y stock restaurado', 'info');
  };

  // Export Inventory CSV
  const exportInventoryToCSV = () => {
    if (!currentClinic || !currentClinic.inventory.length) {
      showToast('No hay productos registrados para exportar', 'error');
      return;
    }

    const headers = ['ID', 'Nombre', 'Descripción', 'Categoria', 'Stock', 'Stock Minimo', 'Costo (COP)', 'Precio (COP)', 'Fecha Vencimiento'];
    const rows = currentClinic.inventory.map((item) => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.description ?? '').replace(/"/g, '""')}"`,
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

    const headers = ['ID Venta', 'Producto', 'Cantidad', 'Cliente', 'Documento', 'Método de pago', 'Total (COP)', 'Pagado (COP)', 'Saldo (COP)', 'Fecha'];
    const rows = currentClinic.sales.map((sale) => [
      sale.id,
      `"${sale.product.replace(/"/g, '""')}"`,
      sale.qty,
      `"${sale.client.replace(/"/g, '""')}"`,
      `"${(sale.buyerDocument || '').replace(/"/g, '""')}"`,
      sale.paymentMethod || 'No especificado',
      sale.total,
      getSalePaidAmount(sale),
      getSaleBalance(sale),
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
    sessionRef.current = null;
    setSession(null);
    setAppData(defaultData);
    fetch('/api/auth/logout', { method: 'POST' }).catch((error) => {
      console.error('Could not close the server session:', error);
      showToast('No se pudo cerrar la sesión en el servidor.', 'error');
    });
  };

  const renderProductForm = (inModal = false) => (
    <form className="stack-form" onSubmit={handleSaveProduct}>
      <label>
        <span>Nombre del producto *</span>
        <input
          value={productForm.name}
          onChange={(event) => updateProductFormField('name', event.target.value)}
          placeholder="Ej. Café molido 500 g"
          required
        />
      </label>

      <label>
        <span>Descripción</span>
        <textarea
          value={productForm.description}
          onChange={(event) => updateProductFormField('description', event.target.value)}
          placeholder="Detalles, presentación, referencia u otra información del producto"
          rows={3}
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
        <div className="category-picker">
          <div className={`category-picker-control ${isCategoryMenuOpen ? 'open' : ''}`}>
            <input
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isCategoryMenuOpen}
              aria-controls={inModal ? 'category-suggestions-modal' : 'category-suggestions-desktop'}
              value={productForm.category}
              onFocus={() => setIsCategoryMenuOpen(true)}
              onBlur={() => window.setTimeout(() => setIsCategoryMenuOpen(false), 120)}
              onChange={(event) => {
                updateProductFormField('category', event.target.value);
                setIsCategoryMenuOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsCategoryMenuOpen(false);
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  document.getElementById(`${inModal ? 'category-suggestions-modal' : 'category-suggestions-desktop'}-option-0`)?.focus();
                }
              }}
              placeholder="Escribe o elige una categoría guardada"
            />
            <button
              type="button"
              className="category-picker-toggle"
              aria-label={isCategoryMenuOpen ? 'Cerrar categorías' : 'Mostrar categorías'}
              aria-expanded={isCategoryMenuOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsCategoryMenuOpen((open) => !open)}
            >
              <span className="category-picker-toggle-icon">⌄</span>
            </button>
          </div>
          {isCategoryMenuOpen ? (
            <div
              className="category-suggestions"
              id={inModal ? 'category-suggestions-modal' : 'category-suggestions-desktop'}
              role="listbox"
              aria-label="Categorías sugeridas"
            >
              <div className="category-suggestions-heading">
                <span className="category-suggestions-heading-icon">✳</span>
                <span>{productForm.category.trim() ? 'Sugerencias que coinciden' : 'Categorías de tu inventario'}</span>
              </div>
              {matchingCategories.map((category, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={category === productForm.category}
                  id={`${inModal ? 'category-suggestions-modal' : 'category-suggestions-desktop'}-option-${index}`}
                  className="category-suggestion-option"
                  key={category}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    updateProductFormField('category', category);
                    setIsCategoryMenuOpen(false);
                  }}
                >
                  <span className="category-option-mark" aria-hidden="true">▦</span>
                  <span className="category-option-name">{category}</span>
                  <span className="category-option-check" aria-hidden="true">↗</span>
                </button>
              ))}
              {productForm.category.trim() && !availableCategories.some(
                (category) => category.toLocaleLowerCase() === productForm.category.trim().toLocaleLowerCase(),
              ) ? (
                <button
                  type="button"
                  className="category-suggestion-option category-create-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    updateProductFormField('category', productForm.category.trim());
                    setIsCategoryMenuOpen(false);
                  }}
                >
                  <span className="category-option-mark" aria-hidden="true">＋</span>
                  <span className="category-option-name">Usar “{productForm.category.trim()}” como nueva categoría</span>
                </button>
              ) : null}
              {!matchingCategories.length && !productForm.category.trim() ? (
                <p className="category-suggestions-empty">Las categorías se guardan al agregar productos al inventario.</p>
              ) : null}
            </div>
          ) : null}
        </div>
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
          <img className="brand-full-logo" src="/andestock-logo.png" alt="AndeStock · Gestión de Inventario en Andes, Antioquia" />

          <h2>Iniciar sesión</h2>
          <p className="subtext">Controla el inventario de tu negocio en un solo lugar.</p>

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
            <img className="brand-header-logo" src="/andestock-logo.png" alt="AndeStock" />
            <div className="brand-copy">
              <p className="label-muted">Gestión comercial local</p>
              <h1>Superadmin</h1>
            </div>
          </div>
          <button className="secondary-button" onClick={signOut} type="button">Cerrar sesión</button>
        </header>

        <section className="summary-grid">
          <article className="stat-card">
            <span>Total de negocios</span>
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
            <h2>{editingClinicId ? 'Editar negocio' : 'Agregar negocio autorizado'}</h2>
            <form className="stack-form" onSubmit={handleSaveClinic}>
              <label>
                <span>Nombre</span>
                <input value={clinicForm.name} onChange={(event) => setClinicForm({ ...clinicForm, name: event.target.value })} placeholder="Ej. Tienda El Bosque" />
              </label>

              <label>
                <span>Email</span>
                <input type="email" value={clinicForm.email} onChange={(event) => setClinicForm({ ...clinicForm, email: event.target.value })} placeholder="negocio@correo.com" />
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
                <button className="primary-button" type="submit">{editingClinicId ? 'Actualizar' : 'Guardar negocio'}</button>
                {editingClinicId ? (
                  <button type="button" className="secondary-button" onClick={resetClinicForm}>Cancelar</button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Negocios registrados</h2>
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
          <h2>Cambiar contraseña de un negocio</h2>
          <form className="stack-form" onSubmit={handleUpdateClinicPassword}>
            <label>
              <span>Negocio</span>
              <select value={clinicPasswordForm.clinicId} onChange={(event) => setClinicPasswordForm({ ...clinicPasswordForm, clinicId: event.target.value })}>
                <option value="">Selecciona un negocio</option>
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
        <img className="brand-header-logo" src="/andestock-logo.png" alt="AndeStock" />
          <div className="brand-copy">
          <p className="label-muted">Inventario del negocio</p>
            <h1>{currentClinic?.name ?? 'Negocio'}</h1>
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
              <div className="mini-metric accent-forest">
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
            <div className="table-wrap inventory-table">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Producto y descripción</th>
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
                            <span                             style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#edf4e8', color: 'var(--primary)', fontWeight: 700 }}>
                              {item.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                          {item.description ? <small className="product-description">{item.description}</small> : null}
                        </td>
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
            <div className="mobile-card-grid inventory-card-grid">
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
                        <span className="product-category-chip">{item.category}</span>
                        {item.description ? <p className="product-card-description">{item.description}</p> : null}
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
            <div className="table-wrap sales-table">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Cliente</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Pagado / saldo</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClinic?.sales.length ? (
                    currentClinic.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td><strong>{sale.items?.length ? sale.items.map((item) => `${item.product} × ${item.qty}`).join(', ') : sale.product}</strong></td>
                        <td>{sale.qty}</td>
                        <td>{sale.client}<br /><small>{sale.buyerDocument || 'Documento no registrado'}</small></td>
                        <td>{sale.paymentMethod || 'No especificado'}{sale.installmentCount ? <><br /><small>{sale.installmentCount} cuotas de {formatCurrency(sale.installmentAmount || 0)}</small></> : null}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>
                          <strong>{formatCurrency(getSalePaidAmount(sale))}</strong>
                          <br /><small>Saldo: {formatCurrency(getSaleBalance(sale))}</small>
                          {sale.payments?.length ? <div className="sale-payment-history">{sale.payments.map((payment) => <small key={payment.id}>{payment.date}: {formatCurrency(payment.amount)} ({payment.method})</small>)}</div> : null}
                          {sale.paymentMethod === 'credito' && getSaleBalance(sale) > 0 ? (
                            <button type="button" className="tiny-button sale-payment-button" onClick={() => handleOpenPayment(sale)}>Registrar abono</button>
                          ) : null}
                        </td>
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
                      <td colSpan={8} className="empty-state">Todavía no hay ventas registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Sales List */}
            <div className="mobile-card-grid sales-card-grid">
              {currentClinic?.sales.length ? (
                currentClinic.sales.map((sale) => (
                  <div key={sale.id} className="product-card sale-history-card">
                    <div className="product-card-top">
                      <div className="product-card-avatar sale-avatar">↗</div>
                      <div className="product-card-meta">
                        <h4 className="product-card-title">{sale.items?.length ? sale.items.map((item) => `${item.product} × ${item.qty}`).join(', ') : sale.product}</h4>
                        <div className="product-card-category">Cliente: {sale.client} • Documento: {sale.buyerDocument || 'No registrado'} • {sale.date}</div>
                      </div>
                      <strong className="sale-card-total">{formatCurrency(sale.total)}</strong>
                    </div>
                    <div className="sale-card-payment-info">
                      <span>Pago: <strong>{sale.paymentMethod || 'No especificado'}</strong></span>
                      <span>Pagado: <strong>{formatCurrency(getSalePaidAmount(sale))}</strong></span>
                      <span>Saldo: <strong>{formatCurrency(getSaleBalance(sale))}</strong></span>
                      {sale.installmentCount ? <span>Plan: {sale.installmentCount} cuotas de {formatCurrency(sale.installmentAmount || 0)}</span> : null}
                    </div>
                    {sale.payments?.length ? (
                      <div className="sale-payment-history">
                        {sale.payments.map((payment) => <small key={payment.id}>{payment.date}: {formatCurrency(payment.amount)} ({payment.method})</small>)}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Cantidad total: <strong>{sale.qty} ud(s)</strong>
                      </span>
                      {sale.paymentMethod === 'credito' && getSaleBalance(sale) > 0 ? (
                        <button type="button" className="tiny-button sale-payment-button" onClick={() => handleOpenPayment(sale)}>Registrar abono</button>
                      ) : null}
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
              <div className="sale-lines">
                <div className="section-head compact">
                  <h3>Productos</h3>
                  <button type="button" className="secondary-button sale-add-line" onClick={() => setSaleLines((lines) => [...lines, { productId: '', quantity: '1' }])}>
                    + Agregar producto
                  </button>
                </div>
                {saleLines.map((line, index) => (
                  <div className="sale-line" key={`sale-line-${index}`}>
                    <label>
                      <span>Producto {index + 1} *</span>
                      <select
                        value={line.productId}
                        onChange={(event) => setSaleLines((lines) => lines.map((item, lineIndex) => lineIndex === index ? { ...item, productId: event.target.value } : item))}
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
                      <span>Cantidad *</span>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onChange={(event) => setSaleLines((lines) => lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: event.target.value } : item))}
                        required
                      />
                    </label>
                    {saleLines.length > 1 ? (
                      <button type="button" className="tiny-button delete sale-remove-line" aria-label={`Quitar producto ${index + 1}`} onClick={() => setSaleLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index))}>
                        Quitar
                      </button>
                    ) : null}
                    <div className="sale-line-subtotal">
                      {(() => {
                        const product = currentClinic?.inventory.find((item) => item.id === line.productId);
                        const quantity = Number(line.quantity);
                        const lineSubtotal = product && Number.isFinite(quantity) && quantity > 0
                          ? product.price * quantity
                          : 0;
                        return <>Subtotal de línea: <strong>{formatCurrency(lineSubtotal)}</strong></>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sale-summary">
                <span>Subtotal</span>
                <strong>{formatCurrency(saleSubtotal)}</strong>
                <span>Total al confirmar</span>
                <strong>{formatCurrency(saleSubtotal)}</strong>
              </div>

              <label>
                <span>Nombre de quien compra *</span>
                <input
                  value={saleClientName}
                  onChange={(event) => setSaleClientName(event.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </label>

              <label>
                <span>Documento de quien compra *</span>
                <input
                  value={saleBuyerDocument}
                  onChange={(event) => setSaleBuyerDocument(event.target.value)}
                  placeholder="Cédula o documento"
                  maxLength={30}
                  required
                />
              </label>

              <label>
                <span>Método de pago *</span>
                <select value={salePaymentMethod} onChange={(event) => setSalePaymentMethod(event.target.value as SalePaymentMethod)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito</option>
                </select>
              </label>

              {salePaymentMethod === 'efectivo' ? (
                <>
                  <label>
                    <span>¿Cuánto paga en efectivo? *</span>
                    <input
                      type="number"
                      min={saleSubtotal}
                      step="any"
                      value={saleCashReceived}
                      onChange={(event) => setSaleCashReceived(event.target.value)}
                      required
                    />
                  </label>
                  {saleCashReceived && Number.isFinite(Number(saleCashReceived)) ? (
                    <div className="sale-payment-callout">
                      Devolver: <strong>{formatCurrency(Math.max(0, Number(saleCashReceived) - saleSubtotal))}</strong>
                    </div>
                  ) : null}
                </>
              ) : null}

              {salePaymentMethod === 'credito' ? (
                <div className="sale-payment-fields">
                  <label>
                    <span>Número de cuotas *</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={saleInstallmentCount}
                      onChange={(event) => setSaleInstallmentCount(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>Valor de cada cuota *</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={saleInstallmentAmount}
                      onChange={(event) => setSaleInstallmentAmount(event.target.value)}
                      required
                    />
                  </label>
                  <p className="sale-payment-note">El saldo inicial será {formatCurrency(saleSubtotal)}. Podrás registrar cada abono y consultar el saldo pendiente.</p>
                </div>
              ) : null}

              <button className="primary-button" type="submit">Confirmar venta · {formatCurrency(saleSubtotal)}</button>
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

      {pendingSale && (
        <div className="modal-overlay sale-confirm-overlay" onClick={() => setPendingSale(null)}>
          <section
            className="sale-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-confirm-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isConfirmingSale) setPendingSale(null);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sale-confirm-header">
              <div className="sale-confirm-icon" aria-hidden="true">✓</div>
              <div>
                <span className="modal-kicker">RESUMEN DE VENTA</span>
                <h2 id="sale-confirm-title">¿Confirmamos esta venta?</h2>
                <p>Revisa los productos y el total antes de registrarla.</p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                aria-label="Cerrar confirmación"
                disabled={isConfirmingSale}
                onClick={() => setPendingSale(null)}
              >
                ✕
              </button>
            </header>

            <div className="sale-confirm-body">
              <div className="sale-confirm-list">
                {pendingSale.items.map((item) => (
                  <article className="sale-confirm-item" key={item.productId}>
                    <div className="sale-confirm-item-icon" aria-hidden="true">▦</div>
                    <div className="sale-confirm-item-copy">
                      <strong>{item.product}</strong>
                      <span>{item.qty} {item.qty === 1 ? 'unidad' : 'unidades'} × {formatCurrency(item.unitPrice)}</span>
                    </div>
                    <strong className="sale-confirm-item-total">{formatCurrency(item.total)}</strong>
                  </article>
                ))}
              </div>

              <div className="sale-confirm-totals">
                <div>
                  <span>Productos</span>
                  <strong>{pendingSale.totalQuantity} {pendingSale.totalQuantity === 1 ? 'unidad' : 'unidades'}</strong>
                </div>
                <div>
                  <span>Cliente</span>
                  <strong>{pendingSale.client} · {pendingSale.buyerDocument}</strong>
                </div>
                <div>
                  <span>Método de pago</span>
                  <strong>{pendingSale.paymentMethod}</strong>
                </div>
                {pendingSale.paymentMethod === 'efectivo' ? (
                  <div>
                    <span>Efectivo recibido · devolver</span>
                    <strong>{formatCurrency(pendingSale.cashReceived)} · {formatCurrency(pendingSale.changeGiven)}</strong>
                  </div>
                ) : null}
                {pendingSale.paymentMethod === 'credito' ? (
                  <div>
                    <span>Plan de crédito</span>
                    <strong>{pendingSale.installmentCount} cuotas de {formatCurrency(pendingSale.installmentAmount || 0)}</strong>
                  </div>
                ) : null}
                {pendingSale.paymentMethod === 'credito' ? (
                  <div>
                    <span>Saldo inicial</span>
                    <strong>{formatCurrency(pendingSale.total)}</strong>
                  </div>
                ) : null}
                <div className="sale-confirm-grand-total">
                  <span>Total a cobrar</span>
                  <strong>{formatCurrency(pendingSale.total)}</strong>
                </div>
              </div>

              <div className="sale-confirm-actions">
                <button type="button" className="secondary-button" disabled={isConfirmingSale} onClick={() => setPendingSale(null)}>
                  Volver a editar
                </button>
                <button type="button" className="primary-button" disabled={isConfirmingSale} onClick={handleConfirmSale}>
                  {isConfirmingSale ? 'Registrando venta…' : 'Confirmar venta'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {paymentSaleId && currentClinic && (
        <div className="modal-overlay" onClick={() => !isRecordingPayment && setPaymentSaleId(null)}>
          <section className="modal-content sale-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <span className="modal-kicker">SEGUIMIENTO DE CRÉDITO</span>
                <h3 id="payment-modal-title">Registrar abono</h3>
              </div>
              <button type="button" className="close-modal-btn" aria-label="Cerrar" disabled={isRecordingPayment} onClick={() => setPaymentSaleId(null)}>✕</button>
            </header>
            {(() => {
              const sale = currentClinic.sales.find((item) => item.id === paymentSaleId);
              if (!sale) return <p className="sale-payment-note">No se encontró la venta seleccionada.</p>;
              const balance = getSaleBalance(sale);
              return (
                <form className="stack-form sale-payment-modal-form" onSubmit={handleRegisterPayment}>
                  <div className="sale-payment-callout">
                    <span>{sale.client} · {sale.buyerDocument || 'Documento no registrado'}</span>
                    <span>Saldo pendiente: <strong>{formatCurrency(balance)}</strong></span>
                  </div>
                  <label>
                    <span>Valor del abono *</span>
                    <input type="number" min="0.01" max={balance} step="any" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                  </label>
                  <label>
                    <span>Fecha del abono *</span>
                    <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
                  </label>
                  <label>
                    <span>Método del abono *</span>
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as Exclude<SalePaymentMethod, 'credito'>)}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </label>
                  <div className="sale-confirm-actions">
                    <button type="button" className="secondary-button" disabled={isRecordingPayment} onClick={() => setPaymentSaleId(null)}>Cancelar</button>
                    <button type="submit" className="primary-button" disabled={isRecordingPayment}>{isRecordingPayment ? 'Guardando abono…' : 'Guardar abono'}</button>
                  </div>
                </form>
              );
            })()}
          </section>
        </div>
      )}

      {/* Product editor modal */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content product-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header product-modal-header">
              <div>
                <span className="modal-kicker">CATÁLOGO DE ANDESSTOCK</span>
                <h3>{editingProductId ? 'Editar producto' : 'Nuevo producto'}</h3>
              </div>
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
