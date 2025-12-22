import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOfflineQueue();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstall = async () => {
    const result = await install();
    if (result.success) {
      // Installation réussie
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
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Synchroniser
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Bouton d'installation PWA */}
      {isInstallable && !isInstalled && (
        <Alert variant="default" className="border-primary/50 bg-primary/5">
          <Download className="h-4 w-4 text-primary" />
          <AlertTitle>Installer l'application</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Installez l'application pour une meilleure expérience et un accès hors ligne</span>
            <Button 
              size="sm" 
              onClick={handleInstall}
              className="ml-4"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Installer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation d'installation */}
      {isInstalled && (
        <Alert variant="default" className="border-success/50 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle>Application installée</AlertTitle>
          <AlertDescription>
            L'application est installée et fonctionne en mode hors ligne.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

