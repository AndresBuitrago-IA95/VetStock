import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Central persistent data file
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vetstock-db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  status: 'activo' | 'inactivo';
  phone?: string;
  securityPin?: string;
  permissions: {
    canManageAdmins: boolean;
    canEditInventory: boolean;
    canSell: boolean;
    canEditSales: boolean;
    canViewReports: boolean;
    canDeleteProducts: boolean;
  };
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

interface TenantData {
  products: any[];
  movements: any[];
  sales: any[];
  settings?: any;
  user?: any;
}

interface DatabaseStore {
  adminAccounts: AdminAccount[];
  tenants: Record<string, TenantData>;
}

const DEFAULT_SUPERADMINS: AdminAccount[] = [
  {
    id: 'adm-super',
    name: 'Andrés Buitrago',
    email: 'andrezbuitrago82@gmail.com',
    role: 'SuperAdmin',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
    status: 'activo',
    phone: '+57 310 892 3411',
    permissions: {
      canManageAdmins: true,
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: true,
    },
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-08-13T14:30:00Z',
    securityPin: '8282',
    notes: 'Propietario / SuperAdministrador del Sistema',
  },
  {
    id: 'adm-udea',
    name: 'Andrés Buitrago (UdeA)',
    email: 'andres.buitragos@udea.edu.co',
    role: 'SuperAdmin',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
    status: 'activo',
    phone: '+57 310 892 3411',
    permissions: {
      canManageAdmins: true,
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: true,
    },
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-08-13T14:30:00Z',
    securityPin: '8282',
    notes: 'SuperAdministrador Institucional',
  },
  {
    id: 'adm-juan-pablo',
    name: 'Juan Pablo Restrepo Murillo',
    email: 'jprm1928@gmail.com',
    role: 'Administrador',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
    status: 'activo',
    phone: '+57 300 000 0000',
    permissions: {
      canManageAdmins: false,
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: true,
    },
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-08-13T14:30:00Z',
    securityPin: '8282',
    notes: 'Administrador Autorizado',
  },
];

function readDB(): DatabaseStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.adminAccounts || !Array.isArray(parsed.adminAccounts)) {
        parsed.adminAccounts = [...DEFAULT_SUPERADMINS];
      }
      // Ensure superadmins are always included
      for (const superAdm of DEFAULT_SUPERADMINS) {
        if (!parsed.adminAccounts.some((a: AdminAccount) => a.email.toLowerCase() === superAdm.email.toLowerCase())) {
          parsed.adminAccounts.unshift(superAdm);
        }
      }
      if (!parsed.tenants) {
        parsed.tenants = {};
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  const initialDB: DatabaseStore = {
    adminAccounts: [...DEFAULT_SUPERADMINS],
    tenants: {},
  };
  saveDB(initialDB);
  return initialDB;
}

function saveDB(data: DatabaseStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// ----------------- API ROUTES -----------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Get all admin accounts
app.get('/api/admins', (req, res) => {
  const db = readDB();
  res.json({ success: true, admins: db.adminAccounts });
});

// 3. Add a new admin account
app.post('/api/admins', (req, res) => {
  const db = readDB();
  const data = req.body;
  const cleanEmail = (data.email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'El correo electrónico es requerido' });
  }

  const existingIndex = db.adminAccounts.findIndex(
    (a) => a.email.trim().toLowerCase() === cleanEmail
  );

  if (existingIndex !== -1) {
    return res.status(409).json({
      success: false,
      message: `Ya existe un administrador con el correo ${cleanEmail}`,
      admin: db.adminAccounts[existingIndex],
    });
  }

  const newAdmin: AdminAccount = {
    id: data.id || `adm-${Date.now()}`,
    name: data.name?.trim() || 'Nuevo Administrador',
    email: cleanEmail,
    role: data.role || 'Administrador',
    avatarUrl: data.avatarUrl || 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
    status: data.status || 'activo',
    phone: data.phone || '',
    securityPin: data.securityPin || String(Math.floor(100000 + Math.random() * 900000)),
    permissions: data.permissions || {
      canManageAdmins: false,
      canEditInventory: true,
      canSell: true,
      canEditSales: true,
      canViewReports: true,
      canDeleteProducts: false,
    },
    createdAt: new Date().toISOString(),
    notes: data.notes || '',
  };

  db.adminAccounts.push(newAdmin);
  saveDB(db);

  res.json({ success: true, message: 'Administrador agregado exitosamente', admin: newAdmin });
});

// 4. Update an existing admin account
app.put('/api/admins/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const updates = req.body;

  const targetIndex = db.adminAccounts.findIndex((a) => a.id === id);
  if (targetIndex === -1) {
    return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
  }

  db.adminAccounts[targetIndex] = {
    ...db.adminAccounts[targetIndex],
    ...updates,
  };

  saveDB(db);
  res.json({ success: true, message: 'Administrador actualizado', admin: db.adminAccounts[targetIndex] });
});

// 5. Delete an admin account
app.delete('/api/admins/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;

  const target = db.adminAccounts.find((a) => a.id === id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
  }

  if (
    target.email.toLowerCase() === 'andrezbuitrago82@gmail.com' ||
    target.email.toLowerCase() === 'andres.buitragos@udea.edu.co'
  ) {
    return res.status(403).json({ success: false, message: 'No se puede eliminar la cuenta de un SuperAdmin principal' });
  }

  db.adminAccounts = db.adminAccounts.filter((a) => a.id !== id);
  saveDB(db);

  res.json({ success: true, message: 'Administrador eliminado' });
});

// 6. Central Login endpoint
app.post('/api/auth/login', (req, res) => {
  const db = readDB();
  const { email, securityPin, isGoogleVerified } = req.body;

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Por favor ingresa un correo de Google válido.' });
  }

  const account = db.adminAccounts.find((a) => a.email.trim().toLowerCase() === cleanEmail);

  if (!account) {
    return res.status(403).json({
      success: false,
      message: `Acceso denegado: El correo "${email}" no está registrado como administrador autorizado. Contacta al SuperAdmin para habilitar tu cuenta.`,
    });
  }

  if (account.status === 'inactivo') {
    return res.status(403).json({
      success: false,
      message: `Acceso restringido: La cuenta para "${email}" se encuentra suspendida o inactiva.`,
    });
  }

  if (!isGoogleVerified) {
    const expectedPin = account.securityPin;
    if (!expectedPin) {
      return res.status(400).json({
        success: false,
        message: 'Esta cuenta aún no tiene un PIN configurado. Contacta al SuperAdmin.',
      });
    }

    if (!securityPin || securityPin.trim() !== expectedPin.trim()) {
      return res.status(401).json({
        success: false,
        message: `PIN o Clave de Seguridad incorrecta para la cuenta "${cleanEmail}".`,
      });
    }
  }

  // Update last login
  account.lastLoginAt = new Date().toISOString();
  saveDB(db);

  res.json({
    success: true,
    message: `¡Bienvenido ${account.name}! Acceso autorizado correctamente.`,
    admin: account,
  });
});

// 7. Get Tenant Data (Products, Movements, Sales, Settings)
app.get('/api/tenant/:email', (req, res) => {
  const db = readDB();
  const cleanEmail = req.params.email.trim().toLowerCase();
  const tenant = db.tenants[cleanEmail] || {
    products: [],
    movements: [],
    sales: [],
    settings: null,
    user: null,
  };
  res.json({ success: true, data: tenant });
});

// 8. Save / Sync Tenant Data
app.post('/api/tenant/:email', (req, res) => {
  const db = readDB();
  const cleanEmail = req.params.email.trim().toLowerCase();
  const { products, movements, sales, settings, user } = req.body;

  db.tenants[cleanEmail] = {
    products: products || [],
    movements: movements || [],
    sales: sales || [],
    settings: settings || null,
    user: user || null,
  };

  saveDB(db);
  res.json({ success: true, message: 'Datos sincronizados en la nube correctamente' });
});

// ----------------- VITE MIDDLEWARE / STATIC SERVING -----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VetStock Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
