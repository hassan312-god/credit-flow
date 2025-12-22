import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLocalCache } from '@/hooks/useLocalCache';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  profession: string | null;
  created_at: string;
}

export default function Clients() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Utiliser le cache local avec synchronisation automatique
  const { data: clients, loading, isOnline, refresh } = useLocalCache<Client>({
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

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Clients</h1>
          {(role === 'directeur' || role === 'agent_credit') && (
            <Link to="/clients/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nouveau client
              </Button>
            </Link>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-2/3 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Link key={client.id} to={`/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{client.full_name}</p>
                        <p className="text-sm text-muted-foreground">{client.profession || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun client trouvé</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
