import { Redis } from '@upstash/redis';

export type Product = {
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

const REDIS_KEY = 'vetstock:appstate';

// In-memory cache: acts as a fast read layer and last-resort fallback
let memoryCache: AppState | null = null;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function readAppStateFile(): Promise<AppState> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const data = await redis.get<AppState>(REDIS_KEY);
      if (data && typeof data === 'object' && Array.isArray(data.clinics)) {
        memoryCache = data as AppState;
        return memoryCache;
      }
    } catch (err) {
      console.warn('Redis read error, falling back to memory cache:', err);
    }
  }

  if (memoryCache && Array.isArray(memoryCache.clinics)) {
    return memoryCache;
  }

  return defaultAppState;
}

export async function writeAppStateFile(data: AppState): Promise<AppState> {
  const stampedData: AppState = {
    ...data,
    updatedAt: Date.now(),
  };

  // Always update memory cache first so reads are consistent even if Redis is slow
  memoryCache = stampedData;

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(REDIS_KEY, JSON.stringify(stampedData));
    } catch (err) {
      console.error('Redis write error (data preserved in memory cache):', err);
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
