/**
 * useSync Hook - Sincronización en tiempo real entre dispositivos
 * 
 * Este hook implementa:
 * 1. Polling periódico al servidor para detectar cambios remotos
 * 2. Timestamps para resolución de conflictos (el más reciente gana)
 * 3. Notificaciones cuando hay datos actualizados
 */

import { useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { Product, StockMovement, Sale, ClinicSettings, UserProfile } from '../types';

interface SyncData {
  products: Product[];
  movements: StockMovement[];
  sales: Sale[];
  settings?: ClinicSettings;
  user?: UserProfile;
  lastModified?: string;
}

interface SyncOptions {
  tenantEmail: string;
  enabled: boolean;
  pollInterval?: number; // en milisegundos, default 30000 (30 seg)
  onRemoteUpdate?: (data: SyncData) => void;
  localData: SyncData;
}

const SYNC_STORAGE_KEY = 'vetstock_last_sync_timestamp';

export function useSync(options: SyncOptions) {
  const {
    tenantEmail,
    enabled,
    pollInterval = 30000, // 30 segundos por defecto
    onRemoteUpdate,
    localData,
  } = options;

  const lastSyncRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  // Obtener timestamp de última sincronización
  const getLastSyncTimestamp = useCallback(() => {
    try {
      const key = `${SYNC_STORAGE_KEY}_${tenantEmail}`;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [tenantEmail]);

  // Guardar timestamp de sincronización
  const saveLastSyncTimestamp = useCallback((timestamp: string) => {
    try {
      const key = `${SYNC_STORAGE_KEY}_${tenantEmail}`;
      localStorage.setItem(key, timestamp);
    } catch (e) {
      console.warn('Error saving sync timestamp:', e);
    }
  }, [tenantEmail]);

  // Sincronizar datos locales con el servidor
  const syncToServer = useCallback(async (data: SyncData) => {
    if (!tenantEmail || !enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const dataWithTimestamp = {
        ...data,
        lastModified: timestamp,
      };

      const success = await api.syncTenantData(tenantEmail, dataWithTimestamp);
      
      if (success) {
        saveLastSyncTimestamp(timestamp);
        lastSyncRef.current = timestamp;
      }
    } catch (err) {
      console.warn('Error syncing to server:', err);
    }
  }, [tenantEmail, enabled, saveLastSyncTimestamp]);

  // Verificar actualizaciones remotas
  const checkRemoteUpdates = useCallback(async () => {
    if (!tenantEmail || !enabled) return;

    try {
      const cloudData = await api.getTenantData(tenantEmail);
      
      if (!cloudData) return;

      const remoteTimestamp = (cloudData as any).lastModified;
      const localTimestamp = getLastSyncTimestamp();

      // Si el servidor tiene datos más recientes
      if (remoteTimestamp && (!localTimestamp || remoteTimestamp > localTimestamp)) {
        console.log('[Sync] Remote data is newer, updating local state');
        
        if (onRemoteUpdate) {
          onRemoteUpdate(cloudData as SyncData);
        }
        
        saveLastSyncTimestamp(remoteTimestamp);
        lastSyncRef.current = remoteTimestamp;
      }
    } catch (err) {
      console.warn('Error checking remote updates:', err);
    }
  }, [tenantEmail, enabled, getLastSyncTimestamp, saveLastSyncTimestamp, onRemoteUpdate]);

  // Efecto para polling periódico
  useEffect(() => {
    if (!enabled || !tenantEmail) return;

    // Verificar al montar
    checkRemoteUpdates();

    // Configurar polling
    const intervalId = setInterval(checkRemoteUpdates, pollInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, tenantEmail, pollInterval, checkRemoteUpdates]);

  // Sincronizar cuando cambian los datos locales (con debounce)
  useEffect(() => {
    if (!enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      syncToServer(localData);
    }, 1500); // 1.5 segundos de debounce

    return () => clearTimeout(timeoutId);
  }, [localData, enabled, syncToServer]);

  return {
    syncToServer,
    checkRemoteUpdates,
    getLastSyncTimestamp,
  };
}

/**
 * Hook para sincronización manual bajo demanda
 * Útil para botón de "Actualizar" o refresh manual
 */
export function useManualSync(tenantEmail: string) {
  const lastSyncRef = useRef<string | null>(null);

  const forceSync = useCallback(async () => {
    if (!tenantEmail) return null;

    try {
      const cloudData = await api.getTenantData(tenantEmail);
      return cloudData;
    } catch (err) {
      console.warn('Error in manual sync:', err);
      return null;
    }
  }, [tenantEmail]);

  return {
    forceSync,
    lastSync: lastSyncRef.current,
  };
}
