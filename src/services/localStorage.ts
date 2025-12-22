/**
 * Service de stockage local sécurisé utilisant IndexedDB
 * Stocke les données de l'application pour un accès hors ligne
 */

const DB_NAME = 'credit-flow-storage';
const DB_VERSION = 2;

// Stores pour différentes tables
const STORES = {
  clients: 'clients',
  loans: 'loans',
  payments: 'payments',
  payment_schedule: 'payment_schedule',
  'offline-queue': 'offline-queue',
  metadata: 'metadata',
} as const;

let db: IDBDatabase | null = null;

interface Metadata {
  key: string;
  value: any;
  updated_at: number;
}

/**
 * Initialise la base de données IndexedDB
 */
export const initLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Créer les stores pour chaque table
      Object.values(STORES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const objectStore = database.createObjectStore(storeName, { keyPath: 'id' });
          
          // Index pour la recherche et la synchronisation
          objectStore.createIndex('updated_at', 'updated_at', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });
          
          // Index spécifiques selon le store
          if (storeName === STORES.clients) {
            objectStore.createIndex('full_name', 'full_name', { unique: false });
            objectStore.createIndex('phone', 'phone', { unique: false });
          }
          if (storeName === STORES.loans) {
            objectStore.createIndex('client_id', 'client_id', { unique: false });
            objectStore.createIndex('status', 'status', { unique: false });
          }
          if (storeName === STORES.payments) {
            objectStore.createIndex('loan_id', 'loan_id', { unique: false });
            objectStore.createIndex('payment_date', 'payment_date', { unique: false });
          }
          if (storeName === STORES.payment_schedule) {
            objectStore.createIndex('loan_id', 'loan_id', { unique: false });
            objectStore.createIndex('due_date', 'due_date', { unique: false });
          }
        }
      });

      // Store pour les métadonnées
      if (!database.objectStoreNames.contains(STORES.metadata)) {
        const metadataStore = database.createObjectStore(STORES.metadata, { keyPath: 'key' });
        metadataStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Store pour la queue hors ligne
      if (!database.objectStoreNames.contains(STORES['offline-queue'])) {
        const queueStore = database.createObjectStore(STORES['offline-queue'], { keyPath: 'id' });
        queueStore.createIndex('synced', 'synced', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Sauvegarde des données dans le store local
 */
export const saveToLocal = async <T extends { id: string }>(
  storeName: string,
  data: T | T[],
  synced: boolean = true
): Promise<void> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    const itemWithMeta = {
      ...item,
      synced,
      updated_at: Date.now(),
      _local: true, // Marque comme données locales
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(itemWithMeta);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

/**
 * Récupère des données du store local
 */
export const getFromLocal = async <T>(
  storeName: string,
  id?: string
): Promise<T[]> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    let request: IDBRequest;
    
    if (id) {
      request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? [result] : []);
      };
    } else {
      request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    }
    
    request.onerror = () => reject(request.error);
  });
};

/**
 * Recherche dans le store local
 */
export const searchLocal = async <T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);

  return new Promise((resolve, reject) => {
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Supprime des données du store local
 */
export const deleteFromLocal = async (
  storeName: string,
  id: string | string[]
): Promise<void> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  const ids = Array.isArray(id) ? id : [id];
  
  for (const itemId of ids) {
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

/**
 * Marque des données comme synchronisées
 */
export const markAsSynced = async (
  storeName: string,
  id: string | string[]
): Promise<void> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  const ids = Array.isArray(id) ? id : [id];
  
  for (const itemId of ids) {
    const item = await getFromLocal(storeName, itemId);
    if (item.length > 0) {
      const updated = { ...item[0], synced: true, updated_at: Date.now() };
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
};

/**
 * Récupère les données non synchronisées
 */
export const getUnsyncedData = async (storeName: string): Promise<any[]> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    const request = index.getAll(false);
    request.onsuccess = () => {
      const results = request.result || [];
      // Retirer les métadonnées internes avant de retourner
      resolve(results.map(item => {
        const { _local, synced, updated_at, ...data } = item;
        return data;
      }));
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Sauvegarde des métadonnées
 */
export const saveMetadata = async (key: string, value: any): Promise<void> => {
  const database = await initLocalDB();
  const transaction = database.transaction([STORES.metadata], 'readwrite');
  const store = transaction.objectStore(STORES.metadata);

  const metadata: Metadata = {
    key,
    value,
    updated_at: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const request = store.put(metadata);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Récupère des métadonnées
 */
export const getMetadata = async (key: string): Promise<any | null> => {
  const database = await initLocalDB();
  const transaction = database.transaction([STORES.metadata], 'readonly');
  const store = transaction.objectStore(STORES.metadata);

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Nettoie les anciennes données (plus de 30 jours)
 */
export const cleanupOldData = async (storeName: string, daysToKeep: number = 30): Promise<void> => {
  const database = await initLocalDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  const index = store.index('updated_at');

  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
};

export { STORES };

