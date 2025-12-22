import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { NotificationBell } from '@/components/NotificationBell';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalClients: number;
  totalLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  totalAmount: number;
  monthlyPayments: number;
}

interface RecentLoan {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  client: { full_name: string } | null;
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { notifications } = usePaymentNotifications();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalLoans: 0,
    pendingLoans: 0,
    overdueLoans: 0,
    totalAmount: 0,
    monthlyPayments: 0,
  });
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch clients count
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        // Fetch loans data
        const { data: loansData } = await supabase
          .from('loans')
          .select('id, amount, status, total_amount');

        const pendingCount = loansData?.filter(l => l.status === 'en_attente').length || 0;
        const overdueCount = loansData?.filter(l => l.status === 'en_retard' || l.status === 'defaut').length || 0;
        const totalAmount = loansData?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0;

        // Fetch recent loans with client info
        const { data: recent } = await supabase
          .from('loans')
          .select(`
            id,
            amount,
            status,
            created_at,
            client:clients(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalClients: clientsCount || 0,
          totalLoans: loansData?.length || 0,
          pendingLoans: pendingCount,
          overdueLoans: overdueCount,
          totalAmount,
          monthlyPayments: 0,
        });

        setRecentLoans(recent?.map(loan => ({
          ...loan,
          client: Array.isArray(loan.client) ? loan.client[0] : loan.client
        })) || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Voici un aperçu de votre activité aujourd'hui
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            {isInstallable && !isInstalled && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={async () => {
                  const result = await install();
                  if (result.success) {
                    toast.success('Application installée avec succès !');
                  } else if (result.error) {
                    toast.error(result.error);
                  }
                }}
              >
                <Download className="w-4 h-4" />
                Installer l'app
              </Button>
            )}
            {(role === 'directeur' || role === 'agent_credit') && (
              <Link to="/loans/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau prêt
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            change="+12% ce mois"
            changeType="positive"
            icon={Users}
            iconColor="bg-info/10 text-info"
          />
          <StatCard
            title="Prêts Actifs"
            value={stats.totalLoans}
            icon={FileText}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Encours Total"
            value={formatCurrency(stats.totalAmount)}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Prêts en Retard"
            value={stats.overdueLoans}
            change={stats.overdueLoans > 0 ? 'Attention requise' : 'Aucun retard'}
            changeType={stats.overdueLoans > 0 ? 'negative' : 'positive'}
            icon={AlertTriangle}
            iconColor="bg-warning/10 text-warning"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Loans */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Derniers Prêts</CardTitle>
              <Link to="/loans">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentLoans.length > 0 ? (
                <div className="space-y-4">
                  {recentLoans.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {loan.client?.full_name || 'Client inconnu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(Number(loan.amount))}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={loan.status as any} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(loan.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun prêt récent</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Actions en Attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.pendingLoans > 0 && (
                  <Link to="/loans?status=en_attente" className="block">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Prêts à valider</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.pendingLoans} demande{stats.pendingLoans > 1 ? 's' : ''} en attente
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Link>
                )}

                {stats.overdueLoans > 0 && (
                  <Link to="/recovery" className="block">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Prêts en retard</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.overdueLoans} prêt{stats.overdueLoans > 1 ? 's' : ''} à recouvrer
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Link>
                )}

                {notifications.length > 0 && (
                  <div className="space-y-2">
                    {notifications.filter(n => n.type === 'overdue').length > 0 && (
                      <Link to="/recovery" className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Paiements en retard</p>
                              <p className="text-sm text-muted-foreground">
                                {notifications.filter(n => n.type === 'overdue').length} échéance{notifications.filter(n => n.type === 'overdue').length > 1 ? 's' : ''} dépassée{notifications.filter(n => n.type === 'overdue').length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Link>
                    )}
                    {notifications.filter(n => n.type === 'reminder').length > 0 && (
                      <Link to="/payments" className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Rappels de paiement</p>
                              <p className="text-sm text-muted-foreground">
                                {notifications.filter(n => n.type === 'reminder').length} échéance{notifications.filter(n => n.type === 'reminder').length > 1 ? 's' : ''} dans les 7 prochains jours
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {stats.pendingLoans === 0 && stats.overdueLoans === 0 && notifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                    <p className="font-medium">Tout est à jour !</p>
                    <p className="text-sm">Aucune action en attente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
