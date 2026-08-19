import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminAccount, Product, StockMovement, Sale, ClinicSettings, UserProfile } from '../types';

export const api = {
  // 1. Fetch all admin accounts from server
  async getAdmins(): Promise<AdminAccount[] | null> {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      const admins: AdminAccount[] = [];
      querySnapshot.forEach((doc) => {
        admins.push(doc.data() as AdminAccount);
      });
      return admins;
    } catch (err) {
      console.error('Error fetching admins:', err);
      return null;
    }
  },

  // Subscription to admins
  subscribeToAdmins(callback: (admins: AdminAccount[]) => void): () => void {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const admins: AdminAccount[] = [];
      snapshot.forEach((doc) => {
        admins.push(doc.data() as AdminAccount);
      });
      callback(admins);
    }, (error) => {
      console.error("Admins subscription error:", error);
    });
    return unsubscribe;
  },

  // Subscription to tenant data
  subscribeToTenantData(email: string, callback: (data: any) => void): () => void {
    const cleanEmail = email.trim().toLowerCase();
    const unsubscribe = onSnapshot(doc(db, 'tenants', cleanEmail), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    }, (error) => {
      console.error("Tenant subscription error:", error);
    });
    return unsubscribe;
  },

  // 2. Add an admin account to server
  async addAdmin(account: Omit<AdminAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; admin?: AdminAccount; message?: string }> {
    try {
      const cleanEmail = account.email.trim().toLowerCase();
      const newAdmin: AdminAccount = {
        ...account,
        id: `adm-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'admins', cleanEmail), newAdmin);
      return { success: true, admin: newAdmin };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al guardar administrador' };
    }
  },

  // 3. Update an admin account on server
  async updateAdmin(id: string, updates: Partial<AdminAccount>): Promise<{ success: boolean; admin?: AdminAccount; message?: string }> {
    try {
      // Find the document by ID first (since the document ID is the email)
      const querySnapshot = await getDocs(collection(db, 'admins'));
      let targetEmail = '';
      let targetData: any = {};
      querySnapshot.forEach((d) => {
        if (d.data().id === id) {
          targetEmail = d.id;
          targetData = d.data();
        }
      });
      
      if (!targetEmail) return { success: false, message: 'Admin no encontrado' };

      const updatedAdmin = { ...targetData, ...updates };
      await setDoc(doc(db, 'admins', targetEmail), updatedAdmin, { merge: true });
      return { success: true, admin: updatedAdmin as AdminAccount };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al actualizar administrador' };
    }
  },

  // 4. Delete an admin account from server
  async deleteAdmin(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      let targetEmail = '';
      querySnapshot.forEach((d) => {
        if (d.data().id === id) {
          targetEmail = d.id;
        }
      });
      
      if (targetEmail) {
        await deleteDoc(doc(db, 'admins', targetEmail));
        return { success: true, message: 'Eliminado correctamente' };
      }
      return { success: false, message: 'Admin no encontrado' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al eliminar administrador' };
    }
  },

  // 5. Authenticate with server (DEPRECATED for Firebase Auth, returns success to allow Google Login through)
  async login(email: string, securityPin?: string, isGoogleVerified?: boolean): Promise<{ success: boolean; message: string; admin?: AdminAccount }> {
    // Authentication is now strictly handled by Firebase Google Auth in AppContext
    return { success: true, message: 'Delegated to Firebase Auth' };
  },

  // 6. Get tenant data from server
  async getTenantData(email: string): Promise<{ products: Product[]; movements: StockMovement[]; sales: Sale[]; settings?: ClinicSettings; user?: UserProfile } | null> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const docSnap = await getDoc(doc(db, 'tenants', cleanEmail));
      if (docSnap.exists()) {
        return docSnap.data() as any;
      }
      return null;
    } catch (err) {
      console.error('Error fetching tenant data:', err);
      return null;
    }
  },

  // 7. Sync tenant data to server
  async syncTenantData(email: string, data: { products: Product[]; movements: StockMovement[]; sales: Sale[]; settings?: ClinicSettings; user?: UserProfile }): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      await setDoc(doc(db, 'tenants', cleanEmail), {
        ...data,
        ownerEmail: cleanEmail,
        lastUpdated: Date.now()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error syncing tenant data:', err);
      return false;
    }
  },
};
