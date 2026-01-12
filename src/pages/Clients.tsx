import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Phone, Mail, AlertTriangle, Trash2, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLocalCache } from '@/hooks/useLocalCache';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { deleteFromLocal, STORES } from '@/services/localStorage';
import { DataScopeIndicator } from '@/components/DataScopeIndicator';
import { EmployeeFilter } from '@/components/EmployeeFilter';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  profession: string | null;
  created_at: string;
  created_by: string | null;
}

export default function Clients() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Utiliser le cache local avec synchronisation automatique
  const { data: clients, loading, isOnline, refresh, removeFromCache } = useLocalCache<Client>({
    table: 'clients',
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // Synchroniser toutes les 5 minutes
  });

  // Vérifier si l'utilisateur a accès aux clients
  const canAccessClients = role === 'admin' || role === 'directeur' || role === 'agent_credit';

  useEffect(() => {
    if (!canAccessClients) {
      navigate('/dashboard');
      return;
    }
  }, [canAccessClients, navigate]);

  // Forcer le chargement depuis Supabase si le cache est vide et que l'utilisateur est en ligne
  useEffect(() => {
    if (canAccessClients && isOnline && !loading && clients.length === 0) {
      refresh();
    }
  }, [canAccessClients, isOnline, loading, clients.length, refresh]);

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchesEmployee = employeeFilter === 'all' || c.created_by === employeeFilter;
    return matchesSearch && matchesEmployee;
  });

  const canDeleteClient = (client: Client) => {
    // Seuls admin et directeur peuvent supprimer
    return (role === 'admin' || role === 'directeur');
  };

  const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setDeleting(true);
    try {
      // Vérifier s'il y a des prêts actifs (en cours de remboursement)
      const { data: activeLoans } = await supabase
        .from('loans')
        .select('id')
        .eq('client_id', clientToDelete.id)
        .in('status', ['en_cours', 'en_retard'] as any);

      if (activeLoans && activeLoans.length > 0) {
        toast.error(`Ce client a ${activeLoans.length} prêt(s) en cours de remboursement. Clôturez-les d'abord.`);
        setDeleteDialogOpen(false);
        setDeleting(false);
        return;
      }

      // Récupérer tous les prêts du client
      const { data: clientLoans } = await supabase
        .from('loans')
        .select('id')
        .eq('client_id', clientToDelete.id);

      if (clientLoans && clientLoans.length > 0) {
        const loanIds = clientLoans.map(l => l.id);

        // Supprimer les paiements associés
        await supabase
          .from('payments')
          .delete()
          .in('loan_id', loanIds);

        // Supprimer les échéanciers
        await supabase
          .from('payment_schedule')
          .delete()
          .in('loan_id', loanIds);

        // Supprimer les prêts
        await supabase
          .from('loans')
          .delete()
          .eq('client_id', clientToDelete.id);
      }

      // Supprimer le client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) throw error;

      // Supprimer du cache local
      try {
        await removeFromCache(clientToDelete.id);
      } catch (cacheError) {
        console.warn('Error deleting from local cache:', cacheError);
        try {
          await deleteFromLocal(STORES.clients, clientToDelete.id);
        } catch (e) {
          console.warn('Error with deleteFromLocal:', e);
        }
      }

      toast.success('Client et données associées supprimés avec succès');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      refresh();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Erreur lors de la suppression du client');
    } finally {
      setDeleting(false);
    }
  };

  if (!canAccessClients) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold">Clients</h1>
            <DataScopeIndicator />
          </div>
          <div className="flex items-center gap-2">
            {(role === 'directeur' || role === 'agent_credit') && (
              <Link to="/clients/new">
                <Button className="gap-2 w-full sm:w-auto" size="sm">
                  <Plus className="w-4 h-4" />
                  Nouveau client
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <EmployeeFilter value={employeeFilter} onChange={setEmployeeFilter} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 md:p-6">
                  <div className="h-5 md:h-6 bg-muted rounded w-2/3 mb-3 md:mb-4" />
                  <div className="h-3 md:h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-all relative group shadow-sm">
                <Link to={`/clients/${client.id}`} className="block">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base md:text-lg font-semibold text-primary">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm md:text-base">{client.full_name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{client.profession || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="mt-3 md:mt-4 space-y-1.5 md:space-y-2">
                      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>
                {canDeleteClient(client) && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.preventDefault()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteClick(client, e)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun client trouvé</p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer le client <strong>{clientToDelete?.full_name}</strong> ?
                <br />
                <br />
                Cette action est <strong>irréversible</strong> et supprimera également :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Tous les prêts associés à ce client</li>
                  <li>Tous les échéanciers de paiement</li>
                  <li>Tous les paiements enregistrés</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setClientToDelete(null);
                }}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteClient}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
