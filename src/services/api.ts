import { AdminAccount, Product, StockMovement, Sale, ClinicSettings, UserProfile } from '../types';

async function safeParseJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  // 1. Fetch all admin accounts from server
  async getAdmins(): Promise<AdminAccount[] | null> {
    try {
      const res = await fetch('/api/admins');
      if (!res.ok) return null;
      const data = await safeParseJson<{ success: boolean; admins: AdminAccount[] }>(res);
      return data?.success ? data.admins : null;
    } catch {
      return null;
    }
  },

  // 2. Add an admin account to server
  async addAdmin(account: Omit<AdminAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; admin?: AdminAccount; message?: string }> {
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      const data = await safeParseJson<{ success: boolean; admin?: AdminAccount; message?: string }>(res);
      return data || { success: false, message: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al conectar con el servidor' };
    }
  },

  // 3. Update an admin account on server
  async updateAdmin(id: string, updates: Partial<AdminAccount>): Promise<{ success: boolean; admin?: AdminAccount; message?: string }> {
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await safeParseJson<{ success: boolean; admin?: AdminAccount; message?: string }>(res);
      return data || { success: false, message: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al conectar con el servidor' };
    }
  },

  // 4. Delete an admin account from server
  async deleteAdmin(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
      });
      const data = await safeParseJson<{ success: boolean; message?: string }>(res);
      return data || { success: false, message: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al conectar con el servidor' };
    }
  },

  // 5. Authenticate with server
  async login(email: string, securityPin?: string, isGoogleVerified?: boolean): Promise<{ success: boolean; message: string; admin?: AdminAccount }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, securityPin, isGoogleVerified }),
      });
      const data = await safeParseJson<{ success: boolean; message: string; admin?: AdminAccount }>(res);
      if (!data) {
        return { success: false, message: 'Servidor no disponible en este entorno' };
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error de conexión con el servidor central' };
    }
  },

  // 6. Get tenant data from server
  async getTenantData(email: string): Promise<{ products: Product[]; movements: StockMovement[]; sales: Sale[]; settings?: ClinicSettings; user?: UserProfile } | null> {
    try {
      const res = await fetch(`/api/tenant/${encodeURIComponent(email)}`);
      if (!res.ok) return null;
      const json = await safeParseJson<{ success: boolean; data: any }>(res);
      return json?.success ? json.data : null;
    } catch {
      return null;
    }
  },

  // 7. Sync tenant data to server
  async syncTenantData(email: string, data: { products: Product[]; movements: StockMovement[]; sales: Sale[]; settings?: ClinicSettings; user?: UserProfile }): Promise<boolean> {
    try {
      const res = await fetch(`/api/tenant/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await safeParseJson<{ success: boolean }>(res);
      return json?.success === true;
    } catch {
      return false;
    }
  },
};
