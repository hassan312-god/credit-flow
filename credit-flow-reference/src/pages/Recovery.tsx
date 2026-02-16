import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Clock, MessageSquare, Phone, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'

interface OverdueSchedule {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  amount_paid: number
  status: string
  loan: {
    id: string
    amount: number
    client: {
      id: string
      full_name: string
      phone: string
      email: string | null
    } | null
  } | null
}

interface RecoveryStats {
  totalOverdue: number
  totalAmount: number
  criticalCount: number
}

export default function Recovery() {
  const [overdueSchedules, setOverdueSchedules] = useState<OverdueSchedule[]>([])
  const [stats, setStats] = useState<RecoveryStats>({ totalOverdue: 0, totalAmount: 0, criticalCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOverdueData = async () => {
      setLoading(true)
      try {
        const today = new Date().toISOString().split('T')[0]

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
          .order('due_date', { ascending: true })

        if (error) {
          console.error('Error fetching overdue data:', error)
          toast.error('Erreur lors du chargement des données de recouvrement')
          return
        }

        const processed = data?.map(s => ({
          ...s,
          loan: Array.isArray(s.loan) ? s.loan[0] : s.loan,
        })) || []

        // Calculate stats
        const totalAmount = processed.reduce((sum, s) =>
          sum + (Number(s.amount_due) - Number(s.amount_paid || 0)), 0)
        const criticalCount = processed.filter(s =>
          differenceInDays(new Date(), new Date(s.due_date)) > 30,
        ).length

        setOverdueSchedules(processed)
        setStats({
          totalOverdue: processed.length,
          totalAmount,
          criticalCount,
        })
      }
      catch (error) {
        console.error('Error fetching overdue data:', error)
        toast.error('Erreur lors du chargement des données de recouvrement')
      }
      finally {
        setLoading(false)
      }
    }

    fetchOverdueData()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr })

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), new Date(dueDate))
  }

  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue > 60) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {' '}
          Critique
        </Badge>
      )
    }
    else if (daysOverdue > 30) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Sérieux</Badge>
    }
    else if (daysOverdue > 14) {
      return <Badge variant="secondary">Modéré</Badge>
    }
    return <Badge variant="outline">Récent</Badge>
  }

  // Group by client
  const groupedByClient = overdueSchedules.reduce((acc, schedule) => {
    const clientId = schedule.loan?.client?.id || 'unknown'
    if (!acc[clientId]) {
      acc[clientId] = {
        client: schedule.loan?.client,
        schedules: [],
        totalDue: 0,
      }
    }
    acc[clientId].schedules.push(schedule)
    acc[clientId].totalDue += Number(schedule.amount_due) - Number(schedule.amount_paid || 0)
    return acc
  }, {} as Record<string, { client: any, schedules: OverdueSchedule[], totalDue: number }>)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Recouvrement</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Échéances en retard</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalOverdue}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Montant impayé</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cas critiques (+30j)</p>
                  <p className="text-3xl font-bold mt-1">{stats.criticalCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clients avec impayés</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? (
                  <div className="space-y-4">
                    {[...Array.from({ length: 5 })].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                )
              : Object.keys(groupedByClient).length > 0
                ? (
                    <div className="space-y-4">
                      {Object.entries(groupedByClient)
                        .sort((a, b) => b[1].totalDue - a[1].totalDue)
                        .map(([clientId, data]) => {
                          const oldestSchedule = data.schedules[0]
                          const daysOverdue = getDaysOverdue(oldestSchedule.due_date)

                          return (
                            <div key={clientId} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <span className="text-lg font-semibold text-destructive">
                                      {data.client?.full_name?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold">{data.client?.full_name || 'Client inconnu'}</p>
                                    <p className="text-sm text-muted-foreground">{data.client?.phone}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-destructive text-lg">{formatCurrency(data.totalDue)}</p>
                                  {getSeverityBadge(daysOverdue)}
                                </div>
                              </div>

                              <div className="text-sm text-muted-foreground mb-3">
                                {data.schedules.length}
                                {' '}
                                échéance
                                {data.schedules.length > 1 ? 's' : ''}
                                {' '}
                                en retard •
                                Plus ancien:
                                {formatDate(oldestSchedule.due_date)}
                                {' '}
                                (
                                {daysOverdue}
                                {' '}
                                jours)
                              </div>

                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Phone className="w-4 h-4" />
                                  Appeler
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  SMS
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )
                : (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                        <TrendingDown className="w-8 h-8 text-success" />
                      </div>
                      <p className="font-medium">Aucun impayé</p>
                      <p className="text-sm">Tous les paiements sont à jour</p>
                    </div>
                  )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
