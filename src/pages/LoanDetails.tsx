import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ArrowLeft, CheckCircle, XCircle, Loader2, User, Calendar, DollarSign, Percent, Clock, FileText, List, History, Ban } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWorkSession } from '@/hooks/useWorkSession';

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number | null;
  total_amount: number | null;
  purpose: string | null;
  status: string;
  created_at: string;
  validation_date: string | null;
  validated_by: string | null;
  client: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  validator: {
    full_name: string;
  } | null;
}

interface PaymentSchedule {
  id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  principal: number;
  interest: number;
  amount_paid: number | null;
  payment_date: string | null;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { canPerformOperations } = useWorkSession();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const fetchLoanData = async (loanId?: string) => {
    const loanIdToFetch = loanId || id;
    if (!loanIdToFetch) return;

    try {
      const { data: loanData, error } = await supabase
        .from('loans')
        .select(`
          *,
          client:clients(id, full_name, phone, email)
        `)
        .eq('id', loanIdToFetch)
        .maybeSingle();

      if (error) throw error;

      let validator = null;
      if (loanData?.validated_by) {
        const { data: validatorData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', loanData.validated_by)
          .maybeSingle();
        validator = validatorData;
      }

      if (loanData) {
        setLoan({
          ...loanData,
          client: Array.isArray(loanData.client) ? loanData.client[0] : loanData.client,
          validator,
        });

        // Fetch payment schedule
        const { data: scheduleData } = await supabase
          .from('payment_schedule')
          .select('*')
          .eq('loan_id', loanIdToFetch)
          .order('installment_number', { ascending: true });

        setPaymentSchedule(scheduleData || []);

        // Fetch payments history
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('loan_id', loanIdToFetch)
          .order('created_at', { ascending: false });

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching loan:', error);
      toast.error('Erreur lors du chargement du prêt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [id]);

  const canValidate = role === 'directeur';
  const canReject = role === 'directeur';

  const generatePaymentSchedule = async (loanId: string, loanData: Loan) => {
    // Vérifier si un échéancier existe déjà
    const { data: existingSchedule } = await supabase
      .from('payment_schedule')
      .select('id')
      .eq('loan_id', loanId)
      .limit(1);

    if (existingSchedule && existingSchedule.length > 0) {
      // L'échéancier existe déjà, ne pas le régénérer
      return;
    }

    const amount = Number(loanData.amount);
    const interestRate = Number(loanData.interest_rate);
    const durationMonths = loanData.duration_months;
    const monthlyPayment = loanData.monthly_payment || 0;
    const totalAmount = loanData.total_amount || amount;

    // Calculer les intérêts totaux (même méthode que LoanForm.tsx)
    const totalInterest = (amount * interestRate * durationMonths) / 100 / 12;
    const calculatedTotalAmount = amount + totalInterest;
    const calculatedMonthlyPayment = monthlyPayment > 0 
      ? monthlyPayment 
      : calculatedTotalAmount / durationMonths;

    // Répartir le capital et les intérêts équitablement sur toutes les échéances
    const principalPerMonth = amount / durationMonths;
    const interestPerMonth = totalInterest / durationMonths;

    // Date de départ : première échéance dans 1 mois à partir d'aujourd'hui
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1);

    const scheduleEntries = [];

    // Pour chaque échéance
    for (let i = 1; i <= durationMonths; i++) {
      // Calculer la date d'échéance
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i - 1);

      // Pour la dernière échéance, ajuster pour compenser les arrondis
      let principal = i === durationMonths 
        ? amount - (principalPerMonth * (durationMonths - 1))
        : principalPerMonth;
      
      let interest = i === durationMonths
        ? totalInterest - (interestPerMonth * (durationMonths - 1))
        : interestPerMonth;

      const amountDue = principal + interest;

      scheduleEntries.push({
        loan_id: loanId,
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount_due: Math.round(amountDue),
        principal: Math.round(principal),
        interest: Math.round(interest),
        amount_paid: 0,
        status: 'en_attente',
      });
    }

    // Insérer toutes les échéances
    if (scheduleEntries.length > 0) {
      const { error: scheduleError } = await supabase
        .from('payment_schedule')
        .insert(scheduleEntries);

      if (scheduleError) {
        console.error('Error creating payment schedule:', scheduleError);
        throw scheduleError;
      }
    }
  };

  const handleValidate = async () => {
    if (!loan || !user) return;
    if (!canPerformOperations) {
      toast.error('Vous devez ouvrir votre journée de travail avant de valider un prêt');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'approuve',
          validated_by: user.id,
          validation_date: new Date().toISOString(),
        })
        .eq('id', loan.id);

      if (error) throw error;

      // Générer l'échéancier automatiquement
      try {
        await generatePaymentSchedule(loan.id, loan);
      } catch (scheduleError) {
        console.error('Error generating payment schedule:', scheduleError);
        toast.error('Prêt approuvé mais erreur lors de la génération de l\'échéancier');
      }

      toast.success('Prêt approuvé avec succès');
      // Refresh all loan data
      await fetchLoanData();
    } catch (error) {
      console.error('Error validating loan:', error);
      toast.error('Erreur lors de la validation du prêt');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!loan || !user) return;
    if (!canPerformOperations) {
      toast.error('Vous devez ouvrir votre journée de travail avant de rejeter un prêt');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'rejete',
          validated_by: user.id,
          validation_date: new Date().toISOString(),
        })
        .eq('id', loan.id);

      if (error) throw error;

      toast.success('Prêt rejeté');
      // Refresh all loan data
      await fetchLoanData();
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast.error('Erreur lors du rejet du prêt');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseLoan = async () => {
    if (!loan || !user) return;
    if (!canPerformOperations) {
      toast.error('Vous devez ouvrir votre journée de travail avant de clôturer un prêt');
      return;
    }

    setProcessing(true);
    try {
      // Mettre à jour le statut du prêt à "rembourse" ou "defaut"
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalDue = loan.total_amount || loan.amount;
      const newStatus = totalPaid >= totalDue * 0.9 ? 'rembourse' : 'defaut'; // Si payé à 90%, considéré comme remboursé

      const { error } = await supabase
        .from('loans')
        .update({
          status: newStatus,
        })
        .eq('id', loan.id);

      if (error) throw error;

      // Marquer toutes les échéances restantes comme terminées
      const { error: scheduleError } = await supabase
        .from('payment_schedule')
        .update({ status: newStatus === 'rembourse' ? 'paye' : 'en_retard' })
        .eq('loan_id', loan.id)
        .eq('status', 'en_attente');

      if (scheduleError) {
        console.error('Error updating schedule:', scheduleError);
      }

      toast.success(newStatus === 'rembourse' ? 'Prêt clôturé avec succès (remboursé)' : 'Prêt clôturé (défaut de paiement)');
      setCloseDialogOpen(false);
      await fetchLoanData();
    } catch (error) {
      console.error('Error closing loan:', error);
      toast.error('Erreur lors de la clôture du prêt');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });

  const formatDateOnly = (date: string) =>
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

  if (!loan) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Prêt non trouvé</p>
          <Button className="mt-4" onClick={() => navigate('/loans')}>
            Retour aux prêts
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isPending = loan.status === 'en_attente' || loan.status === 'en_cours_validation';
  const showActions = isPending && (canValidate || canReject);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Détails du prêt</h1>
            <p className="text-muted-foreground">Prêt #{loan.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Loan Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Informations du prêt</CardTitle>
                  <StatusBadge status={loan.status as any} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Montant</p>
                      <p className="font-medium">{formatCurrency(loan.amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Percent className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
                      <p className="font-medium">{loan.interest_rate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Durée</p>
                      <p className="font-medium">{loan.duration_months} mois</p>
                    </div>
                  </div>

                  {loan.monthly_payment && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Mensualité</p>
                        <p className="font-medium">{formatCurrency(loan.monthly_payment)}</p>
                      </div>
                    </div>
                  )}

                  {loan.total_amount && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total à rembourser</p>
                        <p className="font-bold text-primary">{formatCurrency(loan.total_amount)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de création</p>
                      <p className="font-medium">{formatDate(loan.created_at)}</p>
                    </div>
                  </div>
                </div>

                {loan.purpose && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Objet du prêt</p>
                    </div>
                    <p className="text-sm">{loan.purpose}</p>
                  </div>
                )}

                {loan.validation_date && loan.validator && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">
                      {loan.status === 'approuve' ? 'Approuvé' : 'Rejeté'} le {formatDate(loan.validation_date)}
                    </p>
                    <p className="text-sm font-medium">par {loan.validator.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Info */}
            {loan.client && (
              <Card>
                <CardHeader>
                  <CardTitle>Informations du client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{loan.client.full_name}</p>
                      <p className="text-sm text-muted-foreground">{loan.client.phone}</p>
                      {loan.client.email && (
                        <p className="text-sm text-muted-foreground">{loan.client.email}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/clients/${loan.client!.id}`)}
                    >
                      Voir le client
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Récapitulatif financier */}
            {loan.status !== 'en_attente' && loan.status !== 'rejete' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const totalDue = loan.total_amount || loan.amount;
                    const remaining = totalDue - totalPaid;
                    const progressPercent = totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0;

                    return (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Total à rembourser</span>
                            <span className="font-medium">{formatCurrency(totalDue)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <span className="text-sm text-green-700 dark:text-green-400">Total payé</span>
                            <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(totalPaid)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <span className="text-sm text-orange-700 dark:text-orange-400">Reste à payer</span>
                            <span className="font-bold text-orange-700 dark:text-orange-400">{formatCurrency(remaining)}</span>
                          </div>

                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Paiements effectués</span>
                            <span className="font-medium">{payments.length}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {showActions && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canValidate && (
                    <Button
                      className="w-full gap-2"
                      onClick={handleValidate}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approuver le prêt
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={handleReject}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Rejeter le prêt
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Clôturer le prêt - visible si prêt en cours */}
            {(loan.status === 'en_cours' || loan.status === 'en_retard' || loan.status === 'approuve') && (role === 'admin' || role === 'directeur') && (
              <Card>
                <CardHeader>
                  <CardTitle>Clôturer le prêt</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clôturer ce prêt marquera toutes les échéances restantes comme terminées.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={processing}
                  >
                    <Ban className="w-4 h-4" />
                    Clôturer le prêt
                  </Button>
                </CardContent>
              </Card>
            )}

            {!showActions && isPending && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Vous n'avez pas les permissions pour valider ou rejeter ce prêt.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              Échéancier complet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentSchedule.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Échéance</TableHead>
                      <TableHead>Date d'échéance</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Intérêts</TableHead>
                      <TableHead>Montant dû</TableHead>
                      <TableHead>Montant payé</TableHead>
                      <TableHead>Reste à payer</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentSchedule.map((schedule) => {
                      const amountPaid = Number(schedule.amount_paid || 0);
                      const remaining = Number(schedule.amount_due) - amountPaid;
                      return (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            #{schedule.installment_number}
                          </TableCell>
                          <TableCell>
                            {formatDateOnly(schedule.due_date)}
                          </TableCell>
                          <TableCell>{formatCurrency(schedule.principal)}</TableCell>
                          <TableCell>{formatCurrency(schedule.interest)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(schedule.amount_due)}
                          </TableCell>
                          <TableCell>
                            {amountPaid > 0 ? formatCurrency(amountPaid) : '-'}
                          </TableCell>
                          <TableCell className={remaining > 0 ? 'text-destructive font-medium' : 'text-success'}>
                            {remaining > 0 ? formatCurrency(remaining) : '0 FCFA'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={schedule.status as any} type="payment" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun échéancier disponible pour ce prêt</p>
                <p className="text-sm mt-1">
                  L'échéancier sera généré automatiquement lors de l'approbation du prêt
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Date de paiement</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateOnly(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method === 'especes' ? 'Espèces' : 
                           payment.payment_method === 'virement' ? 'Virement' :
                           payment.payment_method === 'cheque' ? 'Chèque' :
                           payment.payment_method}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {payment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun paiement enregistré pour ce prêt</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close Loan Confirmation Dialog */}
        <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clôturer le prêt</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir clôturer ce prêt ?
                {(() => {
                  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                  const totalDue = loan?.total_amount || loan?.amount || 0;
                  const remaining = totalDue - totalPaid;
                  const percentPaid = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
                  
                  return (
                    <div className="mt-4 space-y-2">
                      <p>Montant payé: <strong>{formatCurrency(totalPaid)}</strong> ({percentPaid.toFixed(1)}%)</p>
                      <p>Reste impayé: <strong>{formatCurrency(remaining)}</strong></p>
                      {percentPaid >= 90 ? (
                        <p className="text-green-600">Le prêt sera marqué comme "Remboursé"</p>
                      ) : (
                        <p className="text-orange-600">Le prêt sera marqué comme "Défaut" (moins de 90% payé)</p>
                      )}
                    </div>
                  );
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCloseLoan}
                disabled={processing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Clôturer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

