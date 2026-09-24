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
  superAdmin: SuperAdmin;
  clinics: Clinic[];
};

type TabKey = 'Dashboard' | 'Inventario' | 'Ventas' | 'Compras' | 'Clientes' | 'Proveedores' | 'Empleados' | 'Caja';

const SESSION_COOKIE_NAME = 'vetstock-session';
const POLL_INTERVAL_MS = 2000;

const defaultData: AppState = {
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

async function loadAppState(): Promise<AppState> {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) return defaultData;
    return (await response.json()) as AppState;
  } catch {
    return defaultData;
  }
}

async function saveAppState(data: AppState) {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('No se pudo guardar el estado');
  }

  return (await response.json()) as AppState;
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
  const [productForm, setProductForm] = useState(emptyProductForm);
  const productCameraInputRef = useRef<HTMLInputElement | null>(null);
  const productFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Dashboard');
  const [saleForm, setSaleForm] = useState({ productId: '', quantity: '1', clientName: '' });

  useEffect(() => {
    const syncState = async () => {
      const nextData = await loadAppState();
      setAppData(nextData);
      setSession(readSessionCookie());
    };

    syncState();

    const intervalId = window.setInterval(async () => {
      const nextData = await loadAppState();
      setAppData((previous) => {
        const equal = JSON.stringify(previous) === JSON.stringify(nextData);
        return equal ? previous : nextData;
      });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
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

  const totalMonthlySales = useMemo(() => {
    if (!currentClinic) return 0;
    return currentClinic.sales.reduce((total, item) => total + item.total, 0);
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
      return;
    }

    const exists = appData.clinics.some(
      (clinic) => clinic.email.toLowerCase() === trimmedEmail.toLowerCase() && clinic.id !== editingClinicId,
    );
    if (exists) return;

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
    setAppData(nextState);
    await saveAppState(nextState);
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
    setAppData(nextState);
    await saveAppState(nextState);

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

    setAppData(nextState);
    await saveAppState(nextState);
    setSuperAdminPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSuperAdminPasswordMessage('Contraseña actualizada correctamente.');
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

    setAppData(nextState);
    await saveAppState(nextState);
    setClinicPasswordForm({ clinicId: '', newPassword: '', confirmPassword: '' });
    setClinicPasswordMessage('Contraseña actualizada para la veterinaria.');
  };

  const handleProductImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setProductForm((current) => ({ ...current, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentClinic) return;

    const parsedStock = Number(productForm.stock);
    const parsedMinStock = Number(productForm.minStock);
    const parsedCost = Number(productForm.cost);
    const parsedPrice = Number(productForm.price);

    if (!productForm.name.trim()) return;

    const item: Product = {
      id: editingProductId ?? `product-${Date.now()}`,
      name: productForm.name.trim(),
      category: productForm.category.trim() || 'General',
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      minStock: Number.isFinite(parsedMinStock) ? parsedMinStock : 0,
      cost: Number.isFinite(parsedCost) ? parsedCost : 0,
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      image: productForm.image || undefined,
    };

    const updatedClinics = appData.clinics.map((clinic) => {
      if (clinic.id !== currentClinic.id) return clinic;

      if (editingProductId) {
        return {
          ...clinic,
          inventory: clinic.inventory.map((product) => (product.id === editingProductId ? item : product)),
        };
      }

      return { ...clinic, inventory: [...clinic.inventory, item] };
    });

    const nextState: AppState = { ...appData, clinics: updatedClinics };
    setAppData(nextState);
    await saveAppState(nextState);
    setProductForm(emptyProductForm);
    setEditingProductId(null);
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
      image: product.image ?? '',
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!currentClinic) return;

    const updatedClinics = appData.clinics.map((clinic) => {
      if (clinic.id !== currentClinic.id) return clinic;
      return { ...clinic, inventory: clinic.inventory.filter((product) => product.id !== productId) };
    });

    const nextState: AppState = { ...appData, clinics: updatedClinics };
    setAppData(nextState);
    await saveAppState(nextState);

    if (editingProductId === productId) {
      setEditingProductId(null);
      setProductForm(emptyProductForm);
    }
  };

  const handleAddSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentClinic) return;

    const selectedProduct = currentClinic.inventory.find((item) => item.id === saleForm.productId);
    if (!selectedProduct) return;

    const quantity = Number(saleForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const total = selectedProduct.price * quantity;
    const updatedInventory = currentClinic.inventory.map((item) => {
      if (item.id !== selectedProduct.id) return item;
      return { ...item, stock: Math.max(0, item.stock - quantity) };
    });

    const updatedClinics: Clinic[] = appData.clinics.map((clinic) => {
      if (clinic.id !== currentClinic.id) return clinic;
      return {
        ...clinic,
        inventory: updatedInventory,
        sales: [
          {
            id: `sale-${Date.now()}`,
            product: selectedProduct.name,
            qty: quantity,
            total,
            date: new Date().toISOString().slice(0, 10),
            client: saleForm.clientName.trim() || 'Cliente general',
          },
          ...clinic.sales,
        ],
        cashFlow: [
          {
            id: `cash-${Date.now()}`,
            type: 'ingreso' as const,
            description: `Venta de ${selectedProduct.name}`,
            amount: total,
            date: new Date().toISOString().slice(0, 10),
          },
          ...clinic.cashFlow,
        ],
      };
    });

    const nextState: AppState = { ...appData, clinics: updatedClinics };
    setAppData(nextState);
    await saveAppState(nextState);
    setSaleForm({ productId: '', quantity: '1', clientName: '' });
  };

  const signOut = () => {
    setSession(null);
    writeSessionCookie(null);
  };

  if (!session) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="brand-block">
            <div className="brand-mark">V</div>
            <div>
              <p className="label-muted">Sistema de gestión veterinary</p>
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

      <nav className="tab-nav" aria-label="Modulos de la aplicación">
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
          <span>Inventario</span>
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
                <span>Ventas</span>
                <strong>{formatCurrency(totalMonthlySales)}</strong>
                <small>+12.4% vs mes anterior</small>
              </div>
              <div className="mini-metric accent-green">
                <span>Compras</span>
                <strong>{formatCurrency(totalPurchases)}</strong>
                <small>Estables</small>
              </div>
              <div className="mini-metric accent-amber">
                <span>Saldo caja</span>
                <strong>{formatCurrency(cashBalance)}</strong>
                <small>{lowStockItems.length} productos con stock bajo</small>
              </div>
            </div>

            <div className="chart-box">
              <div className="chart-header">
                <h3>Últimas ventas</h3>
                <span className="tag-chip neutral">Este mes</span>
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
              <h2>Alertas</h2>
              <span className="tag-chip neutral">{lowStockItems.length} pendientes</span>
            </div>
            <div className="alert-list">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div key={item.id} className="alert-item">
                    <strong>{item.name}</strong>
                    <span>Stock bajo: {item.stock} / mínimo {item.minStock}</span>
                  </div>
                ))
              ) : (
                <p className="muted-text">No hay alertas de stock bajo.</p>
              )}
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
            <h2>Inventario</h2>
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
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClinic?.inventory.length ? (
                    currentClinic.inventory.map((item) => (
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
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td>{item.stock}</td>
                        <td>{item.minStock}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.cost)}</td>
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
                      <td colSpan={8} className="empty-state">Todavía no hay productos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>{editingProductId ? 'Editar producto' : 'Agregar producto'}</h2>
            <form className="stack-form" onSubmit={handleSaveProduct}>
              <label>
                <span>Nombre</span>
                <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Vitaminas para perros" />
              </label>
              <label>
                <span>Foto del producto</span>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" className="secondary-button" onClick={() => productCameraInputRef.current?.click()}>
                      Tomar foto
                    </button>
                    <button type="button" className="secondary-button" onClick={() => productFileInputRef.current?.click()}>
                      Subir archivo
                    </button>
                  </div>
                  <input ref={productCameraInputRef} type="file" accept="image/*" capture="user" onChange={handleProductImageChange} style={{ display: 'none' }} />
                  <input ref={productFileInputRef} type="file" accept="image/*" onChange={handleProductImageChange} style={{ display: 'none' }} />
                </div>
              </label>
              <small className="muted-text">La cámara aparece en dispositivos móviles; en desktop se usa la opción de archivo.</small>
              {productForm.image ? (
                <div>
                  <img src={productForm.image} alt="Preview del producto" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(118,147,204,0.2)' }} />
                </div>
              ) : null}
              <label>
                <span>Categoría</span>
                <input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Medicamentos" />
              </label>
              <div className="inline-inputs">
                <label>
                  <span>Stock</span>
                  <input type="number" min={0} value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} />
                </label>
                <label>
                  <span>Mínimo</span>
                  <input type="number" min={0} value={productForm.minStock} onChange={(event) => setProductForm({ ...productForm, minStock: event.target.value })} />
                </label>
              </div>
              <div className="inline-inputs">
                <label>
                  <span>Costo</span>
                  <input type="number" min={0} value={productForm.cost} onChange={(event) => setProductForm({ ...productForm, cost: event.target.value })} />
                </label>
                <label>
                  <span>Precio</span>
                  <input type="number" min={0} value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} />
                </label>
              </div>
              <div className="inline-inputs buttons-row">
                <button className="primary-button" type="submit">{editingProductId ? 'Actualizar' : 'Guardar producto'}</button>
                {editingProductId ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm(emptyProductForm);
                    }}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </section>
      )}

      {activeTab === 'Ventas' && (
        <section className="clinic-grid">
          <div className="panel tall-panel">
            <h2>Ventas</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClinic?.sales.length ? (
                    currentClinic.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>{sale.product}</td>
                        <td>{sale.qty}</td>
                        <td>{sale.client}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{sale.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-state">Todavía no hay ventas registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Registrar venta</h2>
            <form className="stack-form" onSubmit={handleAddSale}>
              <label>
                <span>Producto</span>
                <select value={saleForm.productId} onChange={(event) => setSaleForm({ ...saleForm, productId: event.target.value })}>
                  <option value="">Selecciona un producto</option>
                  {currentClinic?.inventory.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Cliente</span>
                <input value={saleForm.clientName} onChange={(event) => setSaleForm({ ...saleForm, clientName: event.target.value })} placeholder="Cliente general" />
              </label>

              <label>
                <span>Cantidad</span>
                <input type="number" min={1} value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} />
              </label>

              <button className="primary-button" type="submit">Guardar venta</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
