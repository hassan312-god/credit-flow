import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { TrendingUp, Users, FileText, CreditCard, ArrowUp, ArrowDown, Download, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToXLSX } from '@/utils/exportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DataScopeIndicator } from '@/components/DataScopeIndicator';
import { EmployeeFilter } from '@/components/EmployeeFilter';
import { EmployeeSummary } from '@/components/EmployeeSummary';
import { EmployeePerformanceChart } from '@/components/EmployeePerformanceChart';
import { useAuth } from '@/hooks/useAuth';

interface MonthlyData {
  month: string;
  loans: number;
  payments: number;
  amount: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

export default function Reports() {
  const { role } = useAuth();
  const [period, setPeriod] = useState('6');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [stats, setStats] = useState({
    totalLoans: 0,
    totalClients: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    avgLoanAmount: 0,
    repaymentRate: 0,
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const months = parseInt(period);
        const monthsData: MonthlyData[] = [];
        
        // Generate data for each month
        for (let i = months - 1; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(monthStart);
          
          let loansQuery = supabase
            .from('loans')
            .select('amount, created_by')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());
          
          if (employeeFilter !== 'all') {
            loansQuery = loansQuery.eq('created_by', employeeFilter);
          }
          
          const { data: loansData } = await loansQuery;

          let paymentsQuery = supabase
            .from('payments')
            .select('amount, recorded_by')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());
          
          if (employeeFilter !== 'all') {
            paymentsQuery = paymentsQuery.eq('recorded_by', employeeFilter);
          }
          
          const { data: paymentsData } = await paymentsQuery;

          monthsData.push({
            month: format(monthStart, 'MMM yy', { locale: fr }),
            loans: loansData?.length || 0,
            payments: paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            amount: loansData?.reduce((sum, l) => sum + Number(l.amount), 0) || 0,
          });
        }

        setMonthlyData(monthsData);

        // Fetch status distribution
        let allLoansQuery = supabase
          .from('loans')
          .select('status, amount, created_by');
        
        if (employeeFilter !== 'all') {
          allLoansQuery = allLoansQuery.eq('created_by', employeeFilter);
        }
        
        const { data: allLoans } = await allLoansQuery;

        const statusCounts = allLoans?.reduce((acc, loan) => {
          acc[loan.status] = (acc[loan.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const statusLabels: Record<string, string> = {
          en_attente: 'En attente',
          approuve: 'Approuvé',
          decaisse: 'Décaissé',
          en_cours: 'En cours',
          rembourse: 'Remboursé',
          en_retard: 'En retard',
          defaut: 'Défaut',
          rejete: 'Rejeté',
        };

        setStatusDistribution(
          Object.entries(statusCounts).map(([status, count], i) => ({
            name: statusLabels[status] || status,
            value: count,
            color: COLORS[i % COLORS.length],
          }))
        );

        // Calculate overall stats
        let clientsQuery = supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        
        if (employeeFilter !== 'all') {
          clientsQuery = clientsQuery.eq('created_by', employeeFilter);
        }
        
        const { count: clientsCount } = await clientsQuery;

        const totalDisbursed = allLoans
          ?.filter(l => ['decaisse', 'en_cours', 'rembourse', 'en_retard'].includes(l.status))
          .reduce((sum, l) => sum + Number(l.amount), 0) || 0;

        let paymentsQuery = supabase
          .from('payments')
          .select('amount, recorded_by');
        
        if (employeeFilter !== 'all') {
          paymentsQuery = paymentsQuery.eq('recorded_by', employeeFilter);
        }
        
        const { data: allPayments } = await paymentsQuery;

        const totalCollected = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        setStats({
          totalLoans: allLoans?.length || 0,
          totalClients: clientsCount || 0,
          totalDisbursed,
          totalCollected,
          avgLoanAmount: allLoans?.length ? totalDisbursed / allLoans.length : 0,
          repaymentRate: totalDisbursed > 0 ? (totalCollected / totalDisbursed) * 100 : 0,
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [period, employeeFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold">Rapports & Statistiques</h1>
            <DataScopeIndicator />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <EmployeeFilter value={employeeFilter} onChange={setEmployeeFilter} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const headers = ['Mois', 'Prêts', 'Paiements', 'Montant'];
                  const rows = monthlyData.map(d => [d.month, d.loans.toString(), d.payments.toString(), formatCurrency(d.amount)]);
                  exportToPDF(rows, headers, `rapports-${period}-mois`, `Rapports & Statistiques - ${period} mois`);
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const headers = ['Mois', 'Prêts', 'Paiements', 'Montant'];
                  const rows = monthlyData.map(d => [d.month, d.loans.toString(), d.payments.toString(), formatCurrency(d.amount)]);
                  await exportToXLSX(rows, headers, `rapports-${period}-mois`, 'Rapports');
                }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exporter en Excel (XLSX)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 derniers mois</SelectItem>
                <SelectItem value="6">6 derniers mois</SelectItem>
                <SelectItem value="12">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalClients}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Prêts</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalLoans}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Décaissements</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalDisbursed)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <ArrowUp className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recouvrements</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCollected)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <ArrowDown className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Loans Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution des prêts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 bg-muted rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="loans" fill="hsl(160, 84%, 39%)" name="Nb de prêts" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 bg-muted rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Payments Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tendance des recouvrements</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 bg-muted rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(38, 92%, 50%)"
                      strokeWidth={2}
                      name="Décaissements"
                      dot={{ fill: 'hsl(38, 92%, 50%)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="payments"
                      stroke="hsl(160, 84%, 39%)"
                      strokeWidth={2}
                      name="Recouvrements"
                      dot={{ fill: 'hsl(160, 84%, 39%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employee Performance Chart - Only for admin/directeur */}
        {(role === 'admin' || role === 'directeur') && (
          <div className="grid grid-cols-1 gap-6">
            <EmployeePerformanceChart />
          </div>
        )}

        {/* Employee Summary - Only for admin/directeur */}
        {(role === 'admin' || role === 'directeur') && (
          <EmployeeSummary />
        )}

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Indicateurs clés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Montant moyen des prêts</span>
                <span className="font-bold">{formatCurrency(stats.avgLoanAmount)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Taux de recouvrement</span>
                <span className={`font-bold ${stats.repaymentRate >= 80 ? 'text-success' : stats.repaymentRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {stats.repaymentRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Prêts par client</span>
                <span className="font-bold">
                  {stats.totalClients > 0 ? (stats.totalLoans / stats.totalClients).toFixed(1) : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Résumé financier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">Encours total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalDisbursed - stats.totalCollected)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="text-xs text-muted-foreground">Décaissé</p>
                  <p className="font-bold text-warning">{formatCurrency(stats.totalDisbursed)}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-xs text-muted-foreground">Recouvré</p>
                  <p className="font-bold text-success">{formatCurrency(stats.totalCollected)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
