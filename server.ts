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
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Initial DB template
interface ServerDatabase {
  version: number;
  lastUpdated: number;
  adminAccounts: any[];
  tenants: Record<string, {
    products: any[];
    stockMovements: any[];
    sales: any[];
    clinicSettings: any;
    userProfile: any;
    lastUpdated: number;
  }>;
}

const SUPER_ADMIN_EMAIL = 'andrezbuitrago82@gmail.com';

const DEFAULT_DB: ServerDatabase = {
  version: 1,
  lastUpdated: Date.now(),
  adminAccounts: [
    {
      id: 'super-admin-01',
      name: 'Andrés Buitrago',
      email: SUPER_ADMIN_EMAIL,
      role: 'SuperAdmin',
      status: 'activo',
      avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
      createdAt: new Date().toISOString(),
      securityPin: '8282',
      notes: 'SuperAdmin Propietario del Sistema',
    }
  ],
  tenants: {
    [SUPER_ADMIN_EMAIL.toLowerCase().trim()]: {
      products: [],
      stockMovements: [],
      sales: [],
      clinicSettings: {
        name: 'Veterinaria & Almacén Central',
        nit: '901.847.293-1',
        phone: '+57 312 456 7890',
        email: SUPER_ADMIN_EMAIL,
        address: 'Cra. 43A # 18 Sur - 45, Medellín',
        invoicePrefix: 'VET',
        taxRate: 0,
        currencySymbol: '$',
        defaultMinStock: 5,
        expiringDaysThreshold: 45,
        invoiceFooterNotes: 'Gracias por confiar en nuestros productos y servicios.',
      },
      userProfile: {
        name: 'Andrés Buitrago',
        email: SUPER_ADMIN_EMAIL,
        role: 'SuperAdmin',
        avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocISz19Wc=s96-c',
      },
      lastUpdated: Date.now(),
    }
  }
};

// Safe DB read
function readDatabase(): ServerDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.tenants) {
        return parsed;
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
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Initialize database file if missing
if (!fs.existsSync(DB_FILE)) {
  writeDatabase(DEFAULT_DB);
}

// ==================== SYNC API ROUTES ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Full state sync or tenant-specific state sync
app.get('/api/sync/state', (req, res) => {
  try {
    const tenantEmail = ((req.query.tenant as string) || SUPER_ADMIN_EMAIL).toLowerCase().trim();
    const db = readDatabase();

    const tenantData = db.tenants[tenantEmail] || {
      products: [],
      stockMovements: [],
      sales: [],
      clinicSettings: {
        name: tenantEmail === SUPER_ADMIN_EMAIL ? 'Veterinaria & Almacén Central' : 'Almacén de Inventario',
        nit: '900.000.000-1',
        phone: '+57 300 000 0000',
        email: tenantEmail,
        address: 'Colombia',
        invoicePrefix: 'FAC',
        taxRate: 0,
        currencySymbol: '$',
        defaultMinStock: 5,
        expiringDaysThreshold: 45,
        invoiceFooterNotes: 'Gracias por su compra.',
      },
      userProfile: {
        name: 'Administrador',
        email: tenantEmail,
        role: tenantEmail === SUPER_ADMIN_EMAIL ? 'SuperAdmin' : 'Administrador',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      },
      lastUpdated: Date.now(),
    };

    res.json({
      success: true,
      serverTime: Date.now(),
      lastUpdated: db.lastUpdated,
      adminAccounts: db.adminAccounts || [],
      tenant: tenantData,
    });
  } catch (error: any) {
    console.error('Error in GET /api/sync/state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Poll endpoint: allows fast light check if newer data is available on other devices
app.get('/api/sync/poll', (req, res) => {
  try {
    const tenantEmail = ((req.query.tenant as string) || SUPER_ADMIN_EMAIL).toLowerCase().trim();
    const clientTimestamp = Number(req.query.since || 0);
    const db = readDatabase();

    const tenant = db.tenants[tenantEmail];
    const tenantUpdated = tenant ? tenant.lastUpdated : 0;
    const globalUpdated = db.lastUpdated || 0;

    const hasNewData = tenantUpdated > clientTimestamp || globalUpdated > clientTimestamp;

    res.json({
      success: true,
      hasNewData,
      serverTime: Date.now(),
      globalLastUpdated: globalUpdated,
      tenantLastUpdated: tenantUpdated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save / Push full tenant state from any device
app.post('/api/sync/state', (req, res) => {
  try {
    const { tenantEmail, products, stockMovements, sales, clinicSettings, userProfile, adminAccounts } = req.body;
    const cleanEmail = (tenantEmail || SUPER_ADMIN_EMAIL).toLowerCase().trim();
    const db = readDatabase();
    const now = Date.now();

    // Update tenant data
    db.tenants[cleanEmail] = {
      products: Array.isArray(products) ? products : (db.tenants[cleanEmail]?.products || []),
      stockMovements: Array.isArray(stockMovements) ? stockMovements : (db.tenants[cleanEmail]?.stockMovements || []),
      sales: Array.isArray(sales) ? sales : (db.tenants[cleanEmail]?.sales || []),
      clinicSettings: clinicSettings || db.tenants[cleanEmail]?.clinicSettings || DEFAULT_DB.tenants[SUPER_ADMIN_EMAIL].clinicSettings,
      userProfile: userProfile || db.tenants[cleanEmail]?.userProfile || DEFAULT_DB.tenants[SUPER_ADMIN_EMAIL].userProfile,
      lastUpdated: now,
    };

    // If admin accounts are provided (e.g., from SuperAdmin)
    if (Array.isArray(adminAccounts) && adminAccounts.length > 0) {
      db.adminAccounts = adminAccounts;
    }

    db.lastUpdated = now;
    writeDatabase(db);

    res.json({
      success: true,
      serverTime: now,
      lastUpdated: now,
      message: 'Estado sincronizado exitosamente en la nube.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/sync/state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seed or reset demo data on server
app.post('/api/sync/seed-demo', (req, res) => {
  try {
    const { tenantEmail, demoProducts, demoMovements, demoSales } = req.body;
    const cleanEmail = (tenantEmail || SUPER_ADMIN_EMAIL).toLowerCase().trim();
    const db = readDatabase();
    const now = Date.now();

    if (!db.tenants[cleanEmail]) {
      db.tenants[cleanEmail] = { ...DEFAULT_DB.tenants[SUPER_ADMIN_EMAIL] };
    }

    db.tenants[cleanEmail].products = demoProducts || [];
    db.tenants[cleanEmail].stockMovements = demoMovements || [];
    db.tenants[cleanEmail].sales = demoSales || [];
    db.tenants[cleanEmail].lastUpdated = now;
    db.lastUpdated = now;

    writeDatabase(db);

    res.json({ success: true, serverTime: now });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
    console.log(`🚀 StockPro Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
