// Vercel Serverless Function for VetStock API
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.json({ limit: '50mb' }));

// Path to data directory (Vercel uses /tmp for writable storage)
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vetstock-db.json');

// Ensure data directory exists
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
  lastModified?: string;
}

interface DatabaseStore {
  adminAccounts: AdminAccount[];
  tenants: Record<string, TenantData>;
}

const DEFAULT_SUPERADMINS = [
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
];

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.adminAccounts || !Array.isArray(parsed.adminAccounts)) {
        parsed.adminAccounts = [...DEFAULT_SUPERADMINS];
      }
      for (const superAdm of DEFAULT_SUPERADMINS) {
        if (!parsed.adminAccounts.some((a) => a.email.toLowerCase() === superAdm.email.toLowerCase())) {
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

  const initialDB = {
    adminAccounts: [...DEFAULT_SUPERADMINS],
    tenants: {},
  };
  saveDB(initialDB);
  return initialDB;
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all admin accounts
app.get('/api/admins', (req, res) => {
  const db = readDB();
  res.json({ success: true, admins: db.adminAccounts });
});

// Add admin
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

  const newAdmin = {
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

// Update admin
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

// Delete admin
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

// Login
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
      message: `Acceso denegado: El correo "${email}" no está registrado como administrador autorizado.`,
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
        message: 'Esta cuenta aún no tiene un PIN configurado.',
      });
    }

    if (!securityPin || securityPin.trim() !== expectedPin.trim()) {
      return res.status(401).json({
        success: false,
        message: `PIN o Clave de Seguridad incorrecta para la cuenta "${cleanEmail}".`,
      });
    }
  }

  account.lastLoginAt = new Date().toISOString();
  saveDB(db);

  res.json({
    success: true,
    message: `¡Bienvenido ${account.name}! Acceso autorizado correctamente.`,
    admin: account,
  });
});

// Get tenant data
app.get('/api/tenant/:email', (req, res) => {
  const db = readDB();
  const cleanEmail = req.params.email.trim().toLowerCase();
  const tenant = db.tenants[cleanEmail] || {
    products: [],
    movements: [],
    sales: [],
    settings: null,
    user: null,
    lastModified: new Date().toISOString(),
  };
  res.json({ success: true, data: tenant });
});

// Sync tenant data
app.post('/api/tenant/:email', (req, res) => {
  const db = readDB();
  const cleanEmail = req.params.email.trim().toLowerCase();
  const { products, movements, sales, settings, user, lastModified } = req.body;

  db.tenants[cleanEmail] = {
    products: products || [],
    movements: movements || [],
    sales: sales || [],
    settings: settings || null,
    user: user || null,
    lastModified: lastModified || new Date().toISOString(),
  };

  saveDB(db);
  res.json({ success: true, message: 'Datos sincronizados en la nube correctamente', lastModified: db.tenants[cleanEmail].lastModified });
});

// Export the Express app as a Vercel serverless function
export default app;
