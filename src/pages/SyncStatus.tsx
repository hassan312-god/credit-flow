import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, RefreshCw, Database, Cloud, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { syncAll, downloadAllData } from '@/services/syncService';
import { getMetadata } from '@/services/localStorage';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncStatus {
  table: string;
  localCount: number;
  remoteCount: number;
  synced: boolean;
  lastSync: number | null;
}

export default function SyncStatus() {
  const { role } = useAuth();
  const { isOnline, queue, isSyncing, syncQueue } = useOfflineQueue();
  const [statuses, setStatuses] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastFullSync, setLastFullSync] = useState<number | null>(null);

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    loadSyncStatus();
    loadLastSync();
  }, [role]);

  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const tables = ['clients', 'loans', 'payments', 'payment_schedule'];
      const statuses: SyncStatus[] = [];

      for (const table of tables) {
        const { getFromLocal, STORES } = await import('@/services/localStorage');
        const storeName = STORES[table as keyof typeof STORES];
        
        if (storeName) {
          const localData = await getFromLocal(storeName);
          const localCount = Array.isArray(localData) ? localData.length : 0;
          
          // Get remote count
          let remoteCount = 0;
          if (isOnline) {
            try {
              const { supabase } = await import('@/integrations/supabase/client');
              const { count, error: countError } = await supabase
                .from(table as any)
                .select('*', { count: 'exact', head: true });
              
              if (countError) {
                console.error(`Error fetching count for ${table}:`, countError);
              } else {
                remoteCount = count || 0;
              }
            } catch (error) {
              console.error(`Error fetching remote count for ${table}:`, error);
            }
          }

          const lastSync = await getMetadata(`last_sync_${table}`);

          statuses.push({
            table,
            localCount,
            remoteCount,
            synced: localCount === remoteCount || !isOnline,
            lastSync: lastSync || null,
          });
        }
      }

      setStatuses(statuses);
    } catch (error: any) {
      console.error('Error loading sync status:', error);
      toast.error('Erreur lors du chargement du statut de synchronisation');
    } finally {
      setLoading(false);
    }
  };

  const loadLastSync = async () => {
    const timestamp = await getMetadata('last_full_sync');
    if (timestamp) {
      setLastFullSync(timestamp);
    }
  };

  const handleFullSync = async () => {
    if (!isOnline) {
      toast.error('Connexion requise pour synchroniser');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncAll();
      if (result.success) {
        const { saveMetadata } = await import('@/services/localStorage');
        await saveMetadata('last_full_sync', Date.now());
        setLastFullSync(Date.now());
        toast.success(`${result.synced} élément(s) synchronisé(s) avec succès`);
        loadSyncStatus();
      } else {
        toast.error(`Erreur lors de la synchronisation: ${result.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!isOnline) {
      toast.error('Connexion requise pour télécharger les données');
      return;
    }

    setSyncing(true);
    try {
      const result = await downloadAllData();
      if (result.success) {
        const { saveMetadata } = await import('@/services/localStorage');
        await saveMetadata('last_full_sync', Date.now());
        setLastFullSync(Date.now());
        toast.success(`${result.synced} élément(s) téléchargé(s) avec succès`);
        loadSyncStatus();
      } else {
        toast.error(`Erreur lors du téléchargement: ${result.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncQueue = async () => {
    await syncQueue();
    loadSyncStatus();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (role !== 'admin') {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs peuvent accéder à cette page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const pendingActions = queue.filter(action => !action.synced);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Synchronisation hors ligne</h1>
            <p className="text-muted-foreground mt-1">
              Gérez la synchronisation des données entre le stockage local et le serveur
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSyncQueue}
              disabled={!isOnline || isSyncing || pendingActions.length === 0}
              variant="outline"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser la file ({pendingActions.length})
                </>
              )}
            </Button>
            <Button
              onClick={handleFullSync}
              disabled={!isOnline || syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser tout
                </>
              )}
            </Button>
            <Button
              onClick={handleDownloadAll}
              disabled={!isOnline || syncing}
              variant="outline"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Télécharger tout
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>État de la connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {isOnline ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <div className="font-medium text-green-600">En ligne</div>
                    <div className="text-sm text-muted-foreground">
                      La synchronisation est active
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <div className="font-medium text-red-600">Hors ligne</div>
                    <div className="text-sm text-muted-foreground">
                      Les données sont stockées localement
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Actions en attente</CardTitle>
              <CardDescription>
                {pendingActions.length} action(s) en attente de synchronisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingActions.slice(0, 10).map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>{action.type}</TableCell>
                      <TableCell>{action.table}</TableCell>
                      <TableCell>
                        {format(new Date(action.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-600">
                          En attente
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pendingActions.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4">
                  ... et {pendingActions.length - 10} autre(s) action(s)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync Status by Table */}
        <Card>
          <CardHeader>
            <CardTitle>Statut de synchronisation par table</CardTitle>
            <CardDescription>
              Comparaison entre les données locales et distantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Distant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.table}>
                    <TableCell className="font-medium">{status.table}</TableCell>
                    <TableCell>{status.localCount}</TableCell>
                    <TableCell>{isOnline ? status.remoteCount : '-'}</TableCell>
                    <TableCell>
                      {status.synced ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Synchronisé
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Non synchronisé
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {status.lastSync ? (
                        format(new Date(status.lastSync), 'dd/MM/yyyy HH:mm', { locale: fr })
                      ) : (
                        <span className="text-muted-foreground">Jamais</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Last Full Sync */}
        {lastFullSync && (
          <Card>
            <CardHeader>
              <CardTitle>Dernière synchronisation complète</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" />
                <span>
                  {format(new Date(lastFullSync), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

