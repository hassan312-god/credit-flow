# Système de Stockage Local Sécurisé

## Vue d'ensemble

L'application utilise un système de stockage local sécurisé basé sur IndexedDB pour permettre le fonctionnement hors ligne et la synchronisation automatique des données.

## Architecture

### 1. Service de Stockage Local (`localStorage.ts`)

- **Base de données**: IndexedDB (`credit-flow-storage`)
- **Stores disponibles**:
  - `clients`: Données des clients
  - `loans`: Données des prêts
  - `payments`: Données des paiements
  - `payment_schedule`: Échéanciers de paiement
  - `offline-queue`: Queue des actions hors ligne
  - `metadata`: Métadonnées de synchronisation

### 2. Service de Synchronisation (`syncService.ts`)

- Synchronisation bidirectionnelle entre le stockage local et Supabase
- Gestion des conflits de données
- Téléchargement complet des données
- Vérification des opérations nécessitant une connexion

### 3. Hooks

#### `useLocalCache`
Hook principal pour gérer le cache local d'une table spécifique.

```typescript
const { data, loading, sync, refresh } = useLocalCache({
  table: 'clients',
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
});
```

#### `useOfflineQueue`
Gère la queue des actions hors ligne.

```typescript
const { addToQueue, syncQueue, pendingCount } = useOfflineQueue();
```

## Fonctionnalités

### Mode Hors Ligne

- **Création de clients**: ✅ Disponible hors ligne
- **Création de prêts**: ✅ Disponible hors ligne
- **Enregistrement de paiements**: ✅ Disponible hors ligne
- **Validation de prêts**: ❌ Nécessite une connexion
- **Gestion des utilisateurs**: ❌ Nécessite une connexion

### Synchronisation Automatique

- Synchronisation automatique toutes les 5 minutes (configurable)
- Synchronisation immédiate au retour de la connexion
- Synchronisation manuelle via les boutons dans `ConnectionStatus`

### Persistance des Données

- Les données sont stockées dans IndexedDB (persistant même après fermeture)
- Les données sont disponibles immédiatement au chargement de l'application
- Nettoyage automatique des données anciennes (> 30 jours)

## Sécurité

- Les données sensibles sont stockées localement mais ne sont jamais exposées
- Les opérations critiques nécessitent une connexion active
- Les données sont synchronisées de manière sécurisée avec Supabase

## Utilisation

### Dans une page

```typescript
import { useLocalCache } from '@/hooks/useLocalCache';

function MyPage() {
  const { data, loading, refresh } = useLocalCache({
    table: 'clients',
    autoSync: true,
  });

  // Les données sont automatiquement chargées depuis le cache
  // et synchronisées avec Supabase
}
```

### Création hors ligne

```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function MyForm() {
  const { isOnline, addToQueue } = useOfflineQueue();

  const handleSubmit = async (data) => {
    if (!isOnline) {
      // Ajouter à la queue
      await addToQueue({
        type: 'create_client',
        table: 'clients',
        data: data,
      });
    } else {
      // Créer directement
      await supabase.from('clients').insert(data);
    }
  };
}
```

## État de Connexion

Le composant `ConnectionStatus` affiche:
- État de connexion (en ligne/hors ligne)
- Nombre d'actions en attente
- Boutons de synchronisation
- Dernière synchronisation

## Notes Importantes

1. Les données sont stockées localement et synchronisées automatiquement
2. Les données persistent même après fermeture de l'application
3. La synchronisation est bidirectionnelle (local ↔ Supabase)
4. Certaines opérations nécessitent une connexion active

