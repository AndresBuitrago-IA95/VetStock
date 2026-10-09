import { neon } from '@neondatabase/serverless';

export type Product = {
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

export type SaleItem = {
  productId: string;
  product: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  total: number;
};

export type Sale = {
  id: string;
  product: string;
  qty: number;
  total: number;
  date: string;
  client: string;
  items?: SaleItem[];
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
  saleId?: string;
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

const STATE_ROW_ID = 1;

function rethrowConfigurationError(error: unknown, fallback: string): never {
  if (
    error instanceof Error &&
    (error.message.startsWith('Falta configurar') ||
      error.message.startsWith('Configura INITIAL_ADMIN_') ||
      error.message.startsWith('INITIAL_ADMIN_PASSWORD'))
  ) {
    throw error;
  }
  throw new Error(fallback);
}

function getInitialAppState(): AppState {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Configura INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD para crear el superadmin inicial.');
  }
  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }
  return {
    updatedAt: 1,
    superAdmin: {
      id: 'superadmin-1',
      name: 'Super Admin',
      email,
      password,
      role: 'superadmin',
    },
    clinics: [],
  };
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('Falta configurar DATABASE_URL o POSTGRES_URL para conectar AndeStock con Neon.');
  }
  return url;
}

async function getSql() {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS andestock_app_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const existing = await sql`SELECT id FROM andestock_app_state WHERE id = ${STATE_ROW_ID}`;
  if (!existing.length) {
    await sql`
      INSERT INTO andestock_app_state (id, state)
      VALUES (${STATE_ROW_ID}, ${JSON.stringify(getInitialAppState())}::jsonb)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  return sql;
}

export async function readAppStateFile(): Promise<AppState> {
  try {
    const sql = await getSql();
    const rows = await sql`SELECT state FROM andestock_app_state WHERE id = ${STATE_ROW_ID}`;
    const state = rows[0]?.state as AppState | undefined;
    if (!state || !state.superAdmin || !Array.isArray(state.clinics)) {
      throw new Error('La estructura de datos almacenada en Neon no es válida.');
    }
    return state;
  } catch (error) {
    console.error('Neon read error:', error);
    rethrowConfigurationError(error, 'No se pudo leer el estado en Neon. Verifica la conexión y la tabla de AndeStock.');
  }
}

export async function writeAppStateFile(data: AppState): Promise<AppState> {
  const stampedData: AppState = {
    ...data,
    updatedAt: Date.now(),
  };

  try {
    const sql = await getSql();
    await sql`
      INSERT INTO andestock_app_state (id, state, updated_at)
      VALUES (${STATE_ROW_ID}, ${JSON.stringify(stampedData)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at
    `;
    return stampedData;
  } catch (error) {
    console.error('Neon write error:', error);
    rethrowConfigurationError(error, 'No se pudo guardar el estado en Neon. Los cambios no fueron confirmados.');
  }
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
