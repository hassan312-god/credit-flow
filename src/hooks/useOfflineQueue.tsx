import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { initLocalDB, getFromLocal, saveToLocal, markAsSynced, deleteFromLocal, STORES } from '@/services/localStorage';

export interface QueuedAction {
  id: string;
  type: 'create_client' | 'create_loan' | 'create_payment' | 'update_client' | 'update_loan';
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
  error?: string;
}


const STORE_NAME = STORES['offline-queue'];

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
        const queueData = await getFromLocal(STORE_NAME);
        setQueue(queueData as QueuedAction[]);
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
      await saveToLocal(STORE_NAME, queuedAction, false);
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
      for (const action of unsyncedActions) {
        try {
          let result;
          
          switch (action.type) {
            case 'create_client':
            case 'create_loan':
            case 'create_payment':
              const { data: insertData, error: insertError } = await supabase
                .from(action.table as any)
                .insert(action.data)
                .select()
                .single();
              
              if (insertError) throw insertError;
              result = insertData;
              break;

            case 'update_client':
            case 'update_loan':
              const { data: updateData, error: updateError } = await supabase
                .from(action.table as any)
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
          await markAsSynced(STORE_NAME, action.id);
          setQueue(prev => prev.map(a => a.id === action.id ? { ...a, synced: true } : a));
        } catch (error: any) {
          console.error(`Error syncing action ${action.id}:`, error);
          
          // Marquer l'erreur
          const failedAction = { ...action, error: error.message };
          await saveToLocal(STORE_NAME, failedAction, false);
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
      await deleteFromLocal(STORE_NAME, id);
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

