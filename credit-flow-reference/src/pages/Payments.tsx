import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Calendar, CreditCard, Loader2, Plus, Search } from 'lucide-react'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DataScopeIndicator } from '@/components/DataScopeIndicator'
import { EmployeeFilter } from '@/components/EmployeeFilter'
import { MainLayout } from '@/components/layout/MainLayout'
import { OperationBlocked } from '@/components/OperationBlocked'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useWorkSession } from '@/hooks/useWorkSession'
import { supabase } from '@/integrations/supabase/client'

interface PaymentSchedule {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  amount_paid: number
  status: string
  loan: {
    created_by: string | null
    client: { full_name: string } | null
  } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  reference: string | null
  recorded_by: string | null
  loan: {
    client: { full_name: string } | null
  } | null
}

export default function Payments() {
  const { role } = useAuth()
  const { canPerformOperations } = useWorkSession()
  const canRecordPayments = role === 'directeur' || role === 'caissier'
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'especes',
    reference: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch pending schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedule')
        .select(`
          id, loan_id, installment_number, due_date, amount_due, amount_paid, status,
          loan:loans(created_by, client:clients(full_name))
        `)
        .in('status', ['en_attente', 'partiel'])
        .order('due_date', { ascending: true })
        .limit(50)

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError)
        toast.error('Erreur lors du chargement des échéances')
      }

      // Fetch recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date, payment_method, reference, recorded_by,
          loan:loans(client:clients(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError)
        toast.error('Erreur lors du chargement des paiements')
      }

      setSchedules(schedulesData?.map(s => ({
        ...s,
        loan: Array.isArray(s.loan) ? s.loan[0] : s.loan,
      })) || [])

      setRecentPayments(paymentsData?.map(p => ({
        ...p,
        loan: Array.isArray(p.loan) ? p.loan[0] : p.loan,
      })) || [])
    }
    catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr })

  const handleOpenPayment = (schedule: PaymentSchedule) => {
    // Admin ne peut pas enregistrer de paiements
    if (role === 'admin') {
      toast.error('Les administrateurs ne peuvent pas enregistrer de paiements. Cette fonctionnalité est réservée aux opérations métier.')
      return
    }

    setSelectedSchedule(schedule)
    setPaymentForm({
      amount: Number(schedule.amount_due) - Number(schedule.amount_paid || 0),
      payment_method: 'especes',
      reference: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedSchedule || paymentForm.amount <= 0)
      return

    // Admin ne peut pas enregistrer de paiements
    if (role === 'admin') {
      toast.error('Les administrateurs ne peuvent pas enregistrer de paiements. Cette fonctionnalité est réservée aux opérations métier.')
      return
    }

    setSubmitting(true)
    try {
      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        loan_id: selectedSchedule.loan_id,
        schedule_id: selectedSchedule.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      })

      if (paymentError)
        throw paymentError

      // Update schedule
      const newAmountPaid = Number(selectedSchedule.amount_paid || 0) + paymentForm.amount
      const remaining = Number(selectedSchedule.amount_due) - newAmountPaid
      const newStatus = remaining <= 0 ? 'paye' : 'partiel'

      await supabase
        .from('payment_schedule')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', selectedSchedule.id)

      toast.success('Paiement enregistré avec succès')
      setDialogOpen(false)
      fetchData()
    }
    catch (error) {
      console.error('Error submitting payment:', error)
      toast.error('Erreur lors de l\'enregistrement du paiement')
    }
    finally {
      setSubmitting(false)
    }
  }

  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch = s.loan?.client?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesEmployee = employeeFilter === 'all' || s.loan?.created_by === employeeFilter
    return matchesSearch && matchesEmployee
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {!canRecordPayments && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action non autorisée</AlertTitle>
            <AlertDescription>
              Les administrateurs ne peuvent pas enregistrer de paiements. Cette fonctionnalité est réservée aux opérations métier.
            </AlertDescription>
          </Alert>
        )}
        {!canPerformOperations && canRecordPayments && (
          <OperationBlocked operation="enregistrer un paiement" />
        )}
        {/* Header masqué sur mobile (déjà dans MobileHeader) */}
        <div className="hidden md:flex md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Paiements</h1>
            <DataScopeIndicator />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Pending Schedules */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    Échéances à payer
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        className="pl-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <EmployeeFilter value={employeeFilter} onChange={setEmployeeFilter} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="table-header">
                          <TableHead>Client</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading
                          ? (
                              [...Array.from({ length: 5 })].map((_, i) => (
                                <TableRow key={i}>
                                  <TableCell colSpan={6}>
                                    <div className="h-4 bg-muted rounded animate-pulse" />
                                  </TableCell>
                                </TableRow>
                              ))
                            )
                          : filteredSchedules.length > 0
                            ? (
                                filteredSchedules.map(schedule => (
                                  <TableRow key={schedule.id}>
                                    <TableCell className="font-medium">
                                      {schedule.loan?.client?.full_name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      #
                                      {schedule.installment_number}
                                    </TableCell>
                                    <TableCell>{formatDate(schedule.due_date)}</TableCell>
                                    <TableCell>
                                      <div>
                                        <span className="font-medium">{formatCurrency(Number(schedule.amount_due))}</span>
                                        {Number(schedule.amount_paid) > 0 && (
                                          <span className="text-xs text-muted-foreground block">
                                            Payé:
                                            {' '}
                                            {formatCurrency(Number(schedule.amount_paid))}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge status={schedule.status as any} />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenPayment(schedule)}
                                        disabled={!canRecordPayments || !canPerformOperations}
                                      >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Payer
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )
                            : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Aucune échéance en attente
                                  </TableCell>
                                </TableRow>
                              )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Derniers paiements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.length > 0
                ? (
                    <div className="space-y-4">
                      {recentPayments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium text-sm">
                              {payment.loan?.client?.full_name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.payment_date)}
                              {' '}
                              •
                              {payment.payment_method}
                            </p>
                          </div>
                          <span className="font-bold text-success">
                            +
                            {formatCurrency(Number(payment.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                : (
                    <p className="text-center py-8 text-muted-foreground">
                      Aucun paiement récent
                    </p>
                  )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            {selectedSchedule && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedSchedule.loan?.client?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Échéance #
                    {selectedSchedule.installment_number}
                    {' '}
                    -
                    {' '}
                    {formatDate(selectedSchedule.due_date)}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    Reste à payer:
                    {' '}
                    {formatCurrency(Number(selectedSchedule.amount_due) - Number(selectedSchedule.amount_paid || 0))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Montant *</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Mode de paiement</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={v => setPaymentForm(prev => ({ ...prev, payment_method: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Numéro de référence (optionnel)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes additionnelles..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmitPayment} disabled={submitting || paymentForm.amount <= 0}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirmer le paiement
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
