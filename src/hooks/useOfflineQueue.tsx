import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QueuedAction {
  id: string;
  type: 'create_client' | 'create_loan' | 'create_payment' | 'update_client' | 'update_loan';
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
  error?: string;
}

const DB_NAME = 'credit-flow-offline';
const STORE_NAME = 'offline-queue';
const VERSION = 1;

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('synced', 'synced', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charger la queue depuis IndexedDB
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          setQueue(request.result || []);
        };
      } catch (error) {
        console.error('Error loading queue:', error);
      }
    };

    loadQueue();
  }, []);

  // Synchroniser automatiquement quand on revient en ligne
  useEffect(() => {
    if (isOnline && queue.some(action => !action.synced)) {
      syncQueue();
    }
  }, [isOnline]);

  const addToQueue = useCallback(async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'synced'>): Promise<string> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedAction: QueuedAction = {
      ...action,
      id,
      timestamp: Date.now(),
      synced: false,
    };

    try {
      const database = await initDB();
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.add(queuedAction);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      setQueue(prev => [...prev, queuedAction]);
      return id;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    const unsyncedActions = queue.filter(action => !action.synced);
    if (unsyncedActions.length === 0) return;

    setIsSyncing(true);

    try {
      const database = await initDB();
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const action of unsyncedActions) {
        try {
          let result;
          
          switch (action.type) {
            case 'create_client':
            case 'create_loan':
            case 'create_payment':
              const { data: insertData, error: insertError } = await supabase
                .from(action.table)
                .insert(action.data)
                .select()
                .single();
              
              if (insertError) throw insertError;
              result = insertData;
              break;

            case 'update_client':
            case 'update_loan':
              const { data: updateData, error: updateError } = await supabase
                .from(action.table)
                .update(action.data)
                .eq('id', action.data.id)
                .select()
                .single();
              
              if (updateError) throw updateError;
              result = updateData;
              break;

            default:
              throw new Error(`Type d'action non supporté: ${action.type}`);
          }

          // Marquer comme synchronisé
          const updatedAction = { ...action, synced: true };
          await new Promise<void>((resolve, reject) => {
            const request = store.put(updatedAction);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });

          setQueue(prev => prev.map(a => a.id === action.id ? updatedAction : a));
        } catch (error: any) {
          console.error(`Error syncing action ${action.id}:`, error);
          
          // Marquer l'erreur
          const failedAction = { ...action, error: error.message };
          await new Promise<void>((resolve, reject) => {
            const request = store.put(failedAction);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });

          setQueue(prev => prev.map(a => a.id === action.id ? failedAction : a));
        }
      }
    } catch (error) {
      console.error('Error syncing queue:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [queue, isOnline, isSyncing]);

  const removeFromQueue = useCallback(async (id: string) => {
    try {
      const database = await initDB();
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      setQueue(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  }, []);

  return {
    queue,
    isOnline,
    isSyncing,
    addToQueue,
    syncQueue,
    removeFromQueue,
    pendingCount: queue.filter(a => !a.synced).length,
  };
}

