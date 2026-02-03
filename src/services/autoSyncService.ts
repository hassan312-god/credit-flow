/**
 * Service de synchronisation automatique
 * Gère la synchronisation et le téléchargement automatique des données
 */

import { syncAll, downloadAllData } from './syncService';
import { getMetadata, saveMetadata } from './localStorage';

interface AutoSyncResult {
  success: boolean;
  synced: number;
  errors: number;
  message?: string;
}

/**
 * Vérifie si la synchronisation automatique est nécessaire
 */
const shouldAutoSync = async (): Promise<boolean> => {
  const lastFullSync = await getMetadata('last_full_sync');
  if (!lastFullSync) return true;
  
  const now = Date.now();
  const syncInterval = 15 * 60 * 1000; // 15 minutes
  return (now - lastFullSync) > syncInterval;
};

/**
 * Vérifie si le téléchargement automatique est nécessaire
 */
const shouldAutoDownload = async (): Promise<boolean> => {
  const lastFullSync = await getMetadata('last_full_sync');
  if (!lastFullSync) return true;
  
  const now = Date.now();
  const downloadInterval = 60 * 60 * 1000; // 1 heure
  return (now - lastFullSync) > downloadInterval;
};

/**
 * Effectue la synchronisation automatique si nécessaire
 */
export const autoSyncIfNeeded = async (): Promise<AutoSyncResult | null> => {
  try {
    const needsSync = await shouldAutoSync();
    if (!needsSync) {
      return null;
    }

    console.log('Démarrage de la synchronisation automatique...');
    const result = await syncAll();
    
    if (result.success) {
      await saveMetadata('last_full_sync', Date.now());
      console.log(`Synchronisation automatique réussie: ${result.synced} éléments`);
    } else {
      console.error('Erreur lors de la synchronisation automatique:', result.message);
    }
    
    return result;
  } catch (error: any) {
    console.error('Erreur lors de la synchronisation automatique:', error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      message: error.message,
    };
  }
};

/**
 * Effectue le téléchargement automatique si nécessaire
 */
export const autoDownloadIfNeeded = async (): Promise<AutoSyncResult | null> => {
  try {
    const needsDownload = await shouldAutoDownload();
    if (!needsDownload) {
      return null;
    }

    console.log('Démarrage du téléchargement automatique...');
    const result = await downloadAllData();
    
    if (result.success) {
      await saveMetadata('last_full_sync', Date.now());
      console.log(`Téléchargement automatique réussi: ${result.synced} éléments`);
    } else {
      console.error('Erreur lors du téléchargement automatique:', result.message);
    }
    
    return result;
  } catch (error: any) {
    console.error('Erreur lors du téléchargement automatique:', error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      message: error.message,
    };
  }
};

/**
 * Initialise la synchronisation automatique
 */
export const initAutoSync = () => {
  // Synchronisation automatique toutes les 15 minutes
  const syncInterval = setInterval(async () => {
    try {
      await autoSyncIfNeeded();
    } catch (error) {
      console.error('Erreur dans la synchronisation automatique:', error);
    }
  }, 15 * 60 * 1000); // 15 minutes

  // Téléchargement automatique toutes les heures
  const downloadInterval = setInterval(async () => {
    try {
      await autoDownloadIfNeeded();
    } catch (error) {
      console.error('Erreur dans le téléchargement automatique:', error);
    }
  }, 60 * 60 * 1000); // 1 heure

  // Nettoyer les intervalles lors du déchargement de la page
  const cleanup = () => {
    clearInterval(syncInterval);
    clearInterval(downloadInterval);
  };

  window.addEventListener('beforeunload', cleanup);

  // Retourner une fonction de nettoyage
  return () => {
    cleanup();
    window.removeEventListener('beforeunload', cleanup);
  };
};
