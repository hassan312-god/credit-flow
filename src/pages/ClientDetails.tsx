import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, CreditCard, FileText, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { deleteFromLocal } from '@/services/localStorage';
import { STORES } from '@/services/localStorage';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  id_type: string;
  id_number: string;
  address: string | null;
  profession: string | null;
  monthly_income: number | null;
  created_at: string;
}

interface Loan {
  id: string;
  amount: number;
  status: string;
  duration_months: number;
  created_at: string;
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Vérifier si l'utilisateur a accès aux clients
  const canAccessClients = role === 'admin' || role === 'directeur' || role === 'agent_credit';

  useEffect(() => {
    if (!canAccessClients) {
      navigate('/dashboard');
    }
  }, [canAccessClients, navigate]);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) return;

      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        const { data: loansData } = await supabase
          .from('loans')
          .select('id, amount, status, duration_months, created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        setClient(clientData);
        setLoans(loansData || []);
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </MainLayout>
    );
  }

  if (!canAccessClients) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder aux détails d'un client.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (!client) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client non trouvé</p>
          <Button className="mt-4" onClick={() => navigate('/clients')}>
            Retour aux clients
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalLoans = loans.reduce((sum, l) => sum + Number(l.amount), 0);
  const activeLoans = loans.filter(l => ['en_cours', 'decaisse', 'en_attente', 'approuve'].includes(l.status)).length;
  const canDeleteClient = (role === 'admin' || role === 'directeur') && activeLoans === 0;

  const handleDeleteClient = async () => {
    if (!client || !id) return;
    
    setDeleting(true);
    try {
      // Supprimer de Supabase
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Supprimer du cache local
      try {
        await deleteFromLocal(STORES.clients, id);
      } catch (cacheError) {
        console.warn('Error deleting from local cache:', cacheError);
      }

      toast.success('Client supprimé avec succès');
      navigate('/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Erreur lors de la suppression du client');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-display text-3xl font-bold">{client.full_name}</h1>
                <p className="text-muted-foreground">Client depuis le {formatDate(client.created_at)}</p>
              </div>
            </div>
            {canDeleteClient && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer le client
              </Button>
            )}
          </div>
          {activeLoans > 0 && (role === 'admin' || role === 'directeur') && (
            <Alert variant="destructive" className="max-w-2xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Suppression impossible</AlertTitle>
              <AlertDescription>
                Ce client a {activeLoans} prêt(s) actif(s) ou en attente. Vous devez d'abord clôturer ou annuler tous les prêts avant de pouvoir supprimer le client.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>

                {client.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{client.address}</p>
                    </div>
                  </div>
                )}

                {client.profession && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profession</p>
                      <p className="font-medium">{client.profession}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{client.id_type}</p>
                    <p className="font-medium">{client.id_number}</p>
                  </div>
                </div>

                {client.monthly_income && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Revenu mensuel</p>
                      <p className="font-medium">{formatCurrency(client.monthly_income)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total emprunté</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalLoans)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Prêts actifs</p>
                <p className="text-3xl font-bold mt-1">{activeLoans}</p>
              </CardContent>
            </Card>
            {(role === 'directeur' || role === 'agent_credit') && (
              <Link to={`/loans/new?client=${id}`}>
                <Button className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau prêt
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Loans History */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des prêts</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Montant</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{loan.duration_months} mois</TableCell>
                      <TableCell><StatusBadge status={loan.status as any} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(loan.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Aucun prêt enregistré pour ce client
              </p>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer le client <strong>{client.full_name}</strong> ?
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
                onClick={() => setDeleteDialogOpen(false)}
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
