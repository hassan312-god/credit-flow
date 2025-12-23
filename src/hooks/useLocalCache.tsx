import { useState, useEffect, useCallback } from 'react';
import { useOfflineQueue } from './useOfflineQueue';
import {
  saveToLocal,
  getFromLocal,
  STORES,
  initLocalDB,
} from '@/services/localStorage';
import {
  syncAll,
  downloadAllData,
  requiresOnline,
} from '@/services/syncService';
import { supabase } from '@/integrations/supabase/client';

interface UseLocalCacheOptions {
  table: 'clients' | 'loans' | 'payments' | 'payment_schedule';
  autoSync?: boolean;
  syncInterval?: number; // en millisecondes
}

/**
 * Hook pour gérer le cache local et la synchronisation
 */
export function useLocalCache<T extends { id: string }>(options: UseLocalCacheOptions) {
  const { table, autoSync = true, syncInterval = 5 * 60 * 1000 } = options;
  const { isOnline, syncQueue } = useOfflineQueue();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const storeName = STORES[table];

  // Initialiser la base de données
  useEffect(() => {
    initLocalDB();
  }, []);

  // Charger les données depuis le cache local
  const loadFromCache = useCallback(async () => {
    try {
      const cachedData = await getFromLocal<T>(storeName);
      setData(cachedData);
      setLoading(false);
    } catch (error) {
      console.error(`Error loading from cache for ${table}:`, error);
      setLoading(false);
    }
  }, [storeName, table]);

  // Synchroniser les données
  const sync = useCallback(async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      // Synchroniser la queue d'actions hors ligne
      await syncQueue();

      // Synchroniser les données de cette table
      const { syncTable } = await import('@/services/syncService');
      const result = await syncTable(table);
      
      if (result.success) {
        // Recharger les données depuis le cache (qui a été mis à jour)
        await loadFromCache();
        setLastSync(Date.now());
      }
    } catch (error) {
      console.error(`Error syncing ${table}:`, error);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, syncQueue, table, loadFromCache]);

  // Charger les données (depuis le cache ou Supabase)
  const fetchData = useCallback(async (forceOnline = false) => {
    setLoading(true);

    try {
      if (isOnline && forceOnline) {
        // Si en ligne et forceOnline=true, récupérer depuis Supabase et mettre à jour le cache
        const { data: remoteData, error } = await supabase
          .from(table)
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1000);

        if (error) throw error;

        if (remoteData) {
          // Sauvegarder dans le cache local
          await saveToLocal(storeName, remoteData as unknown as T[], true);
          setData(remoteData as unknown as T[]);
          setLastSync(Date.now());
        }
      } else {
        // Charger depuis le cache (hors ligne ou première charge)
        const cachedData = await getFromLocal<T>(storeName);
        setData(cachedData);
        
        // Si en ligne et le cache est vide, charger depuis Supabase
        if (isOnline && cachedData.length === 0) {
          try {
            const { data: remoteData, error } = await supabase
              .from(table)
              .select('*')
              .order('updated_at', { ascending: false })
              .limit(1000);

            if (!error && remoteData && remoteData.length > 0) {
              await saveToLocal(storeName, remoteData as unknown as T[], true);
              setData(remoteData as unknown as T[]);
              setLastSync(Date.now());
            }
          } catch (fetchError) {
            console.warn(`Could not fetch ${table} from Supabase, using cache:`, fetchError);
          }
        } else if (isOnline && cachedData.length > 0) {
          // Si en ligne et cache non vide, synchroniser en arrière-plan (sans bloquer)
          setTimeout(() => {
            sync().catch(err => console.warn('Background sync failed:', err));
          }, 100);
        }
      }
    } catch (error) {
      console.error(`Error fetching data for ${table}:`, error);
      // En cas d'erreur, essayer de charger depuis le cache
      await loadFromCache();
    } finally {
      setLoading(false);
    }
  }, [isOnline, table, storeName, sync]);

  // Télécharger toutes les données depuis Supabase
  const downloadAll = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Connexion requise pour télécharger les données');
    }

    setSyncing(true);
    try {
      const result = await downloadAllData();
      if (result.success) {
        await fetchData(true);
      }
      return result;
    } catch (error) {
      console.error('Error downloading all data:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [isOnline, fetchData]);

  // Charger les données au montage
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronisation automatique périodique
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const interval = setInterval(() => {
      sync();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, syncInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchroniser automatiquement quand on revient en ligne
  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ajouter une donnée au cache local
  const addToCache = useCallback(async (item: T, synced: boolean = false) => {
    try {
      await saveToLocal(storeName, item, synced);
      setData(prev => {
        const existing = prev.find(d => d.id === item.id);
        if (existing) {
          return prev.map(d => d.id === item.id ? item : d);
        }
        return [...prev, item];
      });
    } catch (error) {
      console.error(`Error adding to cache for ${table}:`, error);
      throw error;
    }
  }, [storeName, table]);

  // Mettre à jour une donnée dans le cache
  const updateInCache = useCallback(async (item: T, synced: boolean = false) => {
    await addToCache(item, synced);
  }, [addToCache]);

  // Supprimer une donnée du cache
  const removeFromCache = useCallback(async (id: string) => {
    try {
      const { deleteFromLocal } = await import('@/services/localStorage');
      await deleteFromLocal(storeName, id);
      setData(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error(`Error removing from cache for ${table}:`, error);
      throw error;
    }
  }, [storeName, table]);

  // Vérifier si une opération nécessite une connexion
  const checkOnlineRequired = useCallback((operation: string): boolean => {
    return requiresOnline(operation);
  }, []);

  return {
    data,
    loading,
    syncing,
    lastSync,
    isOnline,
    fetchData,
    sync,
    downloadAll,
    addToCache,
    updateInCache,
    removeFromCache,
    checkOnlineRequired,
    refresh: () => fetchData(true),
  };
}

