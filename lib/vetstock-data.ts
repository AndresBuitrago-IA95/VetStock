import fs from 'fs';
import path from 'path';

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
};

export type Sale = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  client: string;
};

export type Purchase = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  supplier: string;
};

export type Client = {
  id: string;
  name: string;
  petName: string;
  phone: string;
  totalBuys: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  category: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string;
};

export type CashEntry = {
  id: string;
  type: 'ingreso' | 'egreso';
  description: string;
  amount: number;
  date: string;
};

export type Clinic = {
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

export type SuperAdmin = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin';
};

export type Session = {
  role: 'superadmin' | 'clinic';
  userId: string;
  clinicId?: string;
  name: string;
};

export type AppState = {
  updatedAt?: number;
  superAdmin: SuperAdmin;
  clinics: Clinic[];
};

export const defaultAppState: AppState = {
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

let memoryCache: AppState | null = null;

export function getAppStateFilePath() {
  return path.join(process.cwd(), 'data', 'app-state.json');
}

export function readAppStateFile(): AppState {
  const filePath = getAppStateFilePath();

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const initial = memoryCache || defaultAppState;
      writeAppStateFile(initial);
      return initial;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      if (memoryCache) return memoryCache;
      return defaultAppState;
    }

    const parsed = JSON.parse(content) as AppState;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.clinics)) {
      if (!parsed.updatedAt) parsed.updatedAt = Date.now();
      memoryCache = parsed;
      return parsed;
    }

    if (memoryCache) return memoryCache;
    return defaultAppState;
  } catch (err) {
    console.warn('Error reading app state file:', err);
    if (memoryCache) return memoryCache;
    return defaultAppState;
  }
}

export function writeAppStateFile(data: AppState): AppState {
  const filePath = getAppStateFilePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const stampedData: AppState = {
    ...data,
    updatedAt: Date.now(),
  };

  memoryCache = stampedData;

  const tempFilePath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  try {
    fs.writeFileSync(tempFilePath, JSON.stringify(stampedData, null, 2), 'utf8');
    fs.renameSync(tempFilePath, filePath);
  } catch (err) {
    console.error('Atomic file write error:', err);
    try {
      fs.writeFileSync(filePath, JSON.stringify(stampedData, null, 2), 'utf8');
    } catch {
      // Memory cache is preserved even if disk write fails
    }
  }

  return stampedData;
}


export function authenticateUser(email: string, password: string, data: AppState): Session | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (
    data.superAdmin.email.toLowerCase() === normalizedEmail &&
    data.superAdmin.password === normalizedPassword
  ) {
    return {
      role: 'superadmin',
      userId: data.superAdmin.id,
      name: data.superAdmin.name,
    };
  }

  const clinic = data.clinics.find(
    (item) =>
      item.authorized &&
      item.email.toLowerCase() === normalizedEmail &&
      item.password === normalizedPassword,
  );

  if (!clinic) return null;

  return {
    role: 'clinic',
    userId: clinic.id,
    clinicId: clinic.id,
    name: clinic.name,
  };
}

export function getSessionFromCookieValue(value: string | undefined): Session | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Session;
    if (!parsed || !parsed.userId || !parsed.role || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}
