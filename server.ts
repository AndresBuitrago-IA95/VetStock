import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Body parsing with generous limit for product photos and backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database file path for persistent cross-device storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vetstock-db.json');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Initial DB template with defaults
const SUPER_ADMIN_EMAIL = 'andrezbuitrago82@gmail.com';

const INITIAL_ACCOUNTS = [
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

interface ServerDatabase {
  version: number;
  lastUpdated: number;
  adminAccounts: any[];
  tenants: Record<string, {
    products: any[];
    movements: any[];
    sales: any[];
    settings: any;
    user: any;
    lastUpdated?: number;
  }>;
}

const DEFAULT_DB: ServerDatabase = {
  version: 2,
  lastUpdated: Date.now(),
  adminAccounts: INITIAL_ACCOUNTS,
  tenants: {
    [SUPER_ADMIN_EMAIL.toLowerCase().trim()]: {
      products: [],
      movements: [],
      sales: [],
      settings: {
        name: 'Veterinaria & Almacén Central',
        address: 'Calle Principal # 10-20, Bogotá D.C., Colombia',
        phone: '+57 (601) 745-8920 / +57 310 892 3411',
        email: 'andrezbuitrago82@gmail.com',
        nit: '901.348.912-7',
        defaultMinStock: 5,
        expiringDaysThreshold: 30,
        currencySymbol: 'COP',
      },
      user: {
        name: 'Andrés Buitrago',
        email: 'andrezbuitrago82@gmail.com',
        role: 'SuperAdmin',
        avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
      },
      lastUpdated: Date.now(),
    },
  },
};

// Safe DB read
function readDatabase(): ServerDatabase {
  try {
    const fileToRead = fs.existsSync(DB_FILE) ? DB_FILE : (fs.existsSync(LEGACY_DB_FILE) ? LEGACY_DB_FILE : null);
    if (fileToRead) {
      const raw = fs.readFileSync(fileToRead, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!Array.isArray(parsed.adminAccounts)) {
          parsed.adminAccounts = INITIAL_ACCOUNTS;
        } else {
          // Ensure default accounts exist if missing
          for (const initAcc of INITIAL_ACCOUNTS) {
            if (!parsed.adminAccounts.some((a: any) => a.email?.toLowerCase() === initAcc.email.toLowerCase())) {
              parsed.adminAccounts.push(initAcc);
            }
          }
        }
        if (!parsed.tenants || typeof parsed.tenants !== 'object') {
          parsed.tenants = {};
        }
        return parsed as ServerDatabase;
      }
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return DEFAULT_DB;
}

// Safe DB write
function writeDatabase(db: ServerDatabase): boolean {
  try {
    db.lastUpdated = Date.now();
    const content = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, content, 'utf-8');
    try {
      fs.writeFileSync(LEGACY_DB_FILE, content, 'utf-8');
    } catch (_) {}
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Initialize database file if missing
if (!fs.existsSync(DB_FILE) && !fs.existsSync(LEGACY_DB_FILE)) {
  writeDatabase(DEFAULT_DB);
}

// ==================== REST API ROUTES FOR CROSS-DEVICE SYNC ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// 1. Get all admin accounts
app.get('/api/admins', (req, res) => {
  try {
    const db = readDatabase();
    res.json({ success: true, admins: db.adminAccounts || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Add a new admin account
app.post('/api/admins', (req, res) => {
  try {
    const db = readDatabase();
    const newAdmin = req.body;

    if (!newAdmin || !newAdmin.email) {
      return res.status(400).json({ success: false, message: 'Correo electrónico es requerido' });
    }

    const cleanEmail = newAdmin.email.trim().toLowerCase();
    const existingIndex = db.adminAccounts.findIndex(
      (a: any) => a.email.toLowerCase() === cleanEmail || (newAdmin.id && a.id === newAdmin.id)
    );

    const fullAdmin = {
      ...newAdmin,
      id: newAdmin.id || `adm-${Date.now().toString(36)}`,
      email: cleanEmail,
      createdAt: newAdmin.createdAt || new Date().toISOString(),
      status: newAdmin.status || 'activo',
    };

    if (existingIndex >= 0) {
      db.adminAccounts[existingIndex] = { ...db.adminAccounts[existingIndex], ...fullAdmin };
    } else {
      db.adminAccounts.push(fullAdmin);
    }

    writeDatabase(db);
    res.json({ success: true, admin: fullAdmin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update an existing admin account (e.g. PIN update, permissions, status)
app.put('/api/admins/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = readDatabase();

    const index = db.adminAccounts.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
    }

    db.adminAccounts[index] = { ...db.adminAccounts[index], ...updates };
    writeDatabase(db);

    res.json({ success: true, admin: db.adminAccounts[index] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Delete an admin account
app.delete('/api/admins/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();

    const target = db.adminAccounts.find((a: any) => a.id === id);
    if (target) {
      const cleanTarget = target.email?.toLowerCase();
      if (cleanTarget === SUPER_ADMIN_EMAIL.toLowerCase() || cleanTarget === 'andres.buitragos@udea.edu.co') {
        return res.status(403).json({ success: false, message: 'No es posible eliminar al SuperAdmin' });
      }
    }

    db.adminAccounts = db.adminAccounts.filter((a: any) => a.id !== id);
    writeDatabase(db);

    res.json({ success: true, message: 'Administrador eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Authenticate admin credentials with central backend
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, securityPin, isGoogleVerified } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Por favor ingresa un correo de Google válido.' });
    }

    const db = readDatabase();
    const admin = db.adminAccounts.find((a: any) => a.email.toLowerCase() === cleanEmail);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: `El correo '${cleanEmail}' no pertenece a la lista de administradores autorizados.`,
      });
    }

    if (admin.status === 'inactivo') {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta de administrador se encuentra desactivada.',
      });
    }

    if (!isGoogleVerified) {
      const expectedPin = admin.securityPin;
      if (!expectedPin) {
        return res.status(401).json({
          success: false,
          message: 'Esta cuenta no tiene un PIN de seguridad configurado.',
        });
      }

      if ((securityPin || '').trim() !== expectedPin.trim()) {
        return res.status(401).json({
          success: false,
          message: 'PIN de seguridad incorrecto para esta cuenta.',
        });
      }
    }

    admin.lastLoginAt = new Date().toISOString();
    writeDatabase(db);

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      admin,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Get tenant inventory, sales and settings
app.get('/api/tenant/:email', (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const db = readDatabase();
    const tenant = db.tenants[cleanEmail] || {
      products: [],
      movements: [],
      sales: [],
      settings: null,
      user: null,
    };
    res.json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Save / Sync tenant data from client
app.post('/api/tenant/:email', (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const { products, movements, sales, settings, user } = req.body;
    const db = readDatabase();

    if (!db.tenants[cleanEmail]) {
      db.tenants[cleanEmail] = {
        products: [],
        movements: [],
        sales: [],
        settings: null,
        user: null,
      };
    }

    if (Array.isArray(products)) db.tenants[cleanEmail].products = products;
    if (Array.isArray(movements)) db.tenants[cleanEmail].movements = movements;
    if (Array.isArray(sales)) db.tenants[cleanEmail].sales = sales;
    if (settings) db.tenants[cleanEmail].settings = settings;
    if (user) db.tenants[cleanEmail].user = user;

    db.tenants[cleanEmail].lastUpdated = Date.now();
    writeDatabase(db);

    res.json({ success: true, message: 'Datos sincronizados exitosamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Poll endpoint for real-time live updates across multiple devices
app.get('/api/sync/poll', (req, res) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      lastUpdated: db.lastUpdated || Date.now(),
      serverTime: Date.now(),
      adminsCount: db.adminAccounts.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== VITE MIDDLEWARE / STATIC ASSETS ====================

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
    console.log(`🚀 VetStock Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
