import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle,
  RefreshCw,
  Database,
  Cloud
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { syncAll, downloadAllData } from '@/services/syncService';
import { getMetadata, saveMetadata } from '@/services/localStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOfflineQueue();
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastFullSync, setLastFullSync] = useState<number | null>(null);

  useEffect(() => {
    // Charger le timestamp de la dernière synchronisation complète
    const loadLastSync = async () => {
      const timestamp = await getMetadata('last_full_sync');
      if (timestamp) {
        setLastFullSync(timestamp);
      }
    };
    loadLastSync();
  }, []);

  const handleFullSync = async () => {
    if (!isOnline) {
      toast.error('Connexion requise pour synchroniser');
      return;
    }

    setSyncingAll(true);
    try {
      const result = await syncAll();
      if (result.success) {
        await saveMetadata('last_full_sync', Date.now());
        setLastFullSync(Date.now());
        toast.success(`${result.synced} élément(s) synchronisé(s) avec succès`);
      } else {
        toast.error(`Erreur lors de la synchronisation: ${result.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!isOnline) {
      toast.error('Connexion requise pour télécharger les données');
      return;
    }

    setSyncingAll(true);
    try {
      const result = await downloadAllData();
      if (result.success) {
        await saveMetadata('last_full_sync', Date.now());
        setLastFullSync(Date.now());
        toast.success(`${result.synced} élément(s) téléchargé(s) avec succès`);
      } else {
        toast.error(`Erreur lors du téléchargement: ${result.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* État de connexion */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Badge variant="default" className="gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            En ligne
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            Hors ligne
          </Badge>
        )}
        
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1.5">
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                {pendingCount} en attente
              </>
            )}
          </Badge>
        )}
      </div>

      {/* Alerte hors ligne */}
      {!isOnline && (
        <Alert variant="default" className="border-warning/50 bg-warning/5">
          <WifiOff className="h-4 w-4 text-warning" />
          <AlertTitle>Mode hors ligne</AlertTitle>
          <AlertDescription>
            Vous pouvez continuer à travailler. Les données seront synchronisées automatiquement lorsque la connexion sera rétablie.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerte de synchronisation */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <Alert variant="default" className="border-info/50 bg-info/5">
          <RefreshCw className="h-4 w-4 text-info" />
          <AlertTitle>Synchronisation disponible</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{pendingCount} action{pendingCount > 1 ? 's' : ''} en attente de synchronisation</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={syncQueue}
              className="ml-4"
              disabled={isSyncing}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isSyncing && "animate-spin")} />
              Synchroniser
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Boutons de synchronisation complète */}
      {isOnline && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFullSync}
            disabled={syncingAll}
            className="flex-1"
          >
            {syncingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 mr-1.5" />
                Synchroniser tout
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadAll}
            disabled={syncingAll}
            className="flex-1"
          >
            {syncingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 mr-1.5" />
                Télécharger tout
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info dernière synchronisation */}
      {lastFullSync && (
        <p className="text-xs text-muted-foreground text-center">
          Dernière synchronisation: {new Date(lastFullSync).toLocaleString('fr-FR')}
        </p>
      )}

      {/* Application desktop Tauri - pas besoin d'installation */}
    </div>
  );
}

