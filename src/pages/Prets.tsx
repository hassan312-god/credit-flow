import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Search, CreditCard, Calendar, Loader2, AlertTriangle, Phone, MessageSquare, Clock, TrendingDown, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { OperationBlocked } from '@/components/OperationBlocked';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { DataScopeIndicator } from '@/components/DataScopeIndicator';
import { EmployeeFilter } from '@/components/EmployeeFilter';

// Note: Les routes /loans/new et /loans/:id restent séparées pour le formulaire et les détails

// ==================== TYPES ====================
interface Loan {
  id: string;
  amount: number;
  duration_months: number;
  status: string;
  created_at: string;
  created_by: string | null;
  client: { full_name: string } | null;
}

interface PaymentSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  loan: {
    created_by: string | null;
    client: { full_name: string } | null;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  recorded_by: string | null;
  loan: {
    client: { full_name: string } | null;
  } | null;
}

interface OverdueSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  loan: {
    id: string;
    amount: number;
    client: {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
    } | null;
  } | null;
}

interface RecoveryStats {
  totalOverdue: number;
  totalAmount: number;
  criticalCount: number;
}

type MainTab = 'prets' | 'paiements' | 'recouvrement';

export default function Prets() {
  const { role } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('prets');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Prêts</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les prêts, enregistrez les paiements et suivez le recouvrement
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as MainTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prets">Liste des prêts</TabsTrigger>
            <TabsTrigger value="paiements">Paiements</TabsTrigger>
            <TabsTrigger value="recouvrement">Recouvrement</TabsTrigger>
          </TabsList>

          {/* Onglet Prêts */}
          <TabsContent value="prets" className="mt-6">
            <PretsTab />
          </TabsContent>

          {/* Onglet Paiements */}
          <TabsContent value="paiements" className="mt-6">
            <PaiementsTab />
          </TabsContent>

          {/* Onglet Recouvrement */}
          <TabsContent value="recouvrement" className="mt-6">
            <RecouvrementTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// ==================== ONGLET PRÊTS ====================
function PretsTab() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const canCreateLoans = role === 'directeur' || role === 'agent_credit';

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const { data, error } = await supabase
          .from('loans')
          .select('id, amount, duration_months, status, created_at, created_by, client:clients(full_name)')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching loans:', error);
          toast.error('Erreur lors du chargement des prêts');
          return;
        }
        
        setLoans(data?.map(loan => ({
          ...loan,
          client: Array.isArray(loan.client) ? loan.client[0] : loan.client
        })) || []);
      } catch (error) {
        console.error('Error fetching loans:', error);
        toast.error('Erreur lors du chargement des prêts');
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatDuration = (months: number) => {
    if (months < 1) {
      const weeks = Math.round(months * 4);
      return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    }
    return `${months} mois`;
  };

  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.client?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesEmployee = employeeFilter === 'all' || l.created_by === employeeFilter;
    return matchesSearch && matchesEmployee;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <EmployeeFilter value={employeeFilter} onChange={setEmployeeFilter} />
        </div>
        {canCreateLoans && (
          <Link to="/loans/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau prêt
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                    <TableCell>{formatDuration(loan.duration_months)}</TableCell>
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
    </div>
  );
}

// ==================== ONGLET PAIEMENTS ====================
function PaiementsTab() {
  const { role } = useAuth();
  const { canPerformOperations } = useWorkSession();
  const canRecordPayments = role === 'directeur' || role === 'caissier';
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'especes',
    reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedule')
        .select(`
          id, loan_id, installment_number, due_date, amount_due, amount_paid, status,
          loan:loans(created_by, client:clients(full_name))
        `)
        .in('status', ['en_attente', 'partiel'])
        .order('due_date', { ascending: true })
        .limit(50);

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError);
        toast.error('Erreur lors du chargement des échéances');
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date, payment_method, reference, recorded_by,
          loan:loans(client:clients(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        toast.error('Erreur lors du chargement des paiements');
      }

      setSchedules(schedulesData?.map(s => ({
        ...s,
        loan: Array.isArray(s.loan) ? s.loan[0] : s.loan
      })) || []);

      setRecentPayments(paymentsData?.map(p => ({
        ...p,
        loan: Array.isArray(p.loan) ? p.loan[0] : p.loan
      })) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  const handleOpenPayment = (schedule: PaymentSchedule) => {
    if (role === 'admin') {
      toast.error('Les administrateurs ne peuvent pas enregistrer de paiements. Cette fonctionnalité est réservée aux opérations métier.');
      return;
    }
    
    setSelectedSchedule(schedule);
    setPaymentForm({
      amount: Number(schedule.amount_due) - Number(schedule.amount_paid || 0),
      payment_method: 'especes',
      reference: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedSchedule || paymentForm.amount <= 0) return;
    
    if (role === 'admin') {
      toast.error('Les administrateurs ne peuvent pas enregistrer de paiements. Cette fonctionnalité est réservée aux opérations métier.');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { error: paymentError } = await supabase.from('payments').insert({
        loan_id: selectedSchedule.loan_id,
        schedule_id: selectedSchedule.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
        recorded_by: user.id,
        payment_date: new Date().toISOString().split('T')[0],
      });

      if (paymentError) throw paymentError;

      const newAmountPaid = Number(selectedSchedule.amount_paid || 0) + paymentForm.amount;
      const newStatus = newAmountPaid >= Number(selectedSchedule.amount_due) ? 'paye' : 'partiel';

      const { error: scheduleError } = await supabase
        .from('payment_schedule')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', selectedSchedule.id);

      if (scheduleError) throw scheduleError;

      toast.success('Paiement enregistré avec succès');
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.loan?.client?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesEmployee = employeeFilter === 'all' || s.loan?.created_by === employeeFilter;
    return matchesSearch && matchesEmployee;
  });

  return (
    <div className="space-y-6">
      <OperationBlocked operation="enregistrer un paiement" />
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par client..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <EmployeeFilter value={employeeFilter} onChange={setEmployeeFilter} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Échéances en attente */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Échéances en attente</CardTitle>
              <CardDescription>
                Paiements à venir et partiels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune échéance en attente
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Montant dû</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.loan?.client?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{formatDate(schedule.due_date)}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(schedule.amount_due) - Number(schedule.amount_paid || 0))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={schedule.status as any} />
                        </TableCell>
                        <TableCell>
                          {canRecordPayments && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(schedule)}
                              disabled={!canPerformOperations}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Payer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Paiements récents */}
        <Card>
          <CardHeader>
            <CardTitle>Paiements récents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucun paiement récent
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {payment.loan?.client?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.payment_method}</Badge>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de paiement */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input
                type="number"
                value={paymentForm.amount || ''}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Référence (optionnel)</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Numéro de transaction..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes supplémentaires..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitPayment} disabled={submitting || !canPerformOperations}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== ONGLET RECOUVREMENT ====================
function RecouvrementTab() {
  const navigate = useNavigate();
  const [overdueSchedules, setOverdueSchedules] = useState<OverdueSchedule[]>([]);
  const [stats, setStats] = useState<RecoveryStats>({ totalOverdue: 0, totalAmount: 0, criticalCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdueData = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('payment_schedule')
          .select(`
            id, loan_id, installment_number, due_date, amount_due, amount_paid, status,
            loan:loans(
              id, amount,
              client:clients(id, full_name, phone, email)
            )
          `)
          .in('status', ['en_attente', 'partiel', 'en_retard'])
          .lt('due_date', today)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Error fetching overdue data:', error);
          toast.error('Erreur lors du chargement des données de recouvrement');
          return;
        }

        const processed = data?.map(s => ({
          ...s,
          loan: Array.isArray(s.loan) ? s.loan[0] : s.loan
        })) || [];

        const totalAmount = processed.reduce((sum, s) => 
          sum + (Number(s.amount_due) - Number(s.amount_paid || 0)), 0
        );
        const criticalCount = processed.filter(s => 
          differenceInDays(new Date(), new Date(s.due_date)) > 30
        ).length;

        setOverdueSchedules(processed);
        setStats({
          totalOverdue: processed.length,
          totalAmount,
          criticalCount,
        });
      } catch (error) {
        console.error('Error fetching overdue data:', error);
        toast.error('Erreur lors du chargement des données de recouvrement');
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), new Date(dueDate));
  };

  const getUrgencyBadge = (days: number) => {
    if (days > 30) {
      return <Badge variant="destructive">Critique ({days}j)</Badge>;
    } else if (days > 15) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Urgent ({days}j)</Badge>;
    } else {
      return <Badge variant="outline">En retard ({days}j)</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total en retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOverdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Échéances en retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">À recouvrer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Plus de 30 jours</p>
          </CardContent>
        </Card>
      </div>

      {/* Table des échéances en retard */}
      <Card>
        <CardHeader>
          <CardTitle>Échéances en retard</CardTitle>
          <CardDescription>
            Liste des paiements en retard nécessitant un recouvrement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : overdueSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune échéance en retard</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Jours de retard</TableHead>
                  <TableHead>Montant dû</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueSchedules.map((schedule) => {
                  const daysOverdue = getDaysOverdue(schedule.due_date);
                  const amountDue = Number(schedule.amount_due) - Number(schedule.amount_paid || 0);
                  
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {schedule.loan?.client?.full_name || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Prêt #{schedule.loan?.id?.substring(0, 8) || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(schedule.due_date)}</TableCell>
                      <TableCell>{getUrgencyBadge(daysOverdue)}</TableCell>
                      <TableCell className="font-medium text-orange-600">
                        {formatCurrency(amountDue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {schedule.loan?.client?.phone && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`tel:${schedule.loan.client.phone}`}>
                                <Phone className="w-3 h-3 mr-1" />
                                Appeler
                              </a>
                            </Button>
                          )}
                          {schedule.loan?.client?.email && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${schedule.loan.client.email}`}>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => navigate(`/loans/${schedule.loan_id}`)}>
                          <FileText className="w-3 h-3 mr-1" />
                          Voir prêt
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
