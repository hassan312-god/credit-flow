import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Loan {
  id: string;
  amount: number;
  duration_months: number;
  status: string;
  created_at: string;
  client: { full_name: string } | null;
}

export default function Loans() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const canCreateLoans = role === 'directeur' || role === 'agent_credit';

  useEffect(() => {
    const fetchLoans = async () => {
      const { data } = await supabase
        .from('loans')
        .select('id, amount, duration_months, status, created_at, client:clients(full_name)')
        .order('created_at', { ascending: false });
      
      setLoans(data?.map(loan => ({
        ...loan,
        client: Array.isArray(loan.client) ? loan.client[0] : loan.client
      })) || []);
      setLoading(false);
    };
    fetchLoans();
  }, []);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const filteredLoans = loans.filter(l =>
    l.client?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Prêts</h1>
          {canCreateLoans && (
            <Link to="/loans/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nouveau prêt
              </Button>
            </Link>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <TableRow 
                    key={loan.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/loans/${loan.id}`)}
                  >
                    <TableCell className="font-medium">{loan.client?.full_name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{loan.duration_months} mois</TableCell>
                    <TableCell><StatusBadge status={loan.status as any} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(loan.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun prêt trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
