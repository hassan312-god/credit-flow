import { differenceInDays } from 'date-fns'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface PaymentNotification {
  id: string
  type: 'reminder' | 'overdue'
  schedule_id: string
  loan_id: string
  due_date: string
  amount_due: number
  amount_paid: number
  remaining: number
  daysUntilDue: number
  client_name: string
  installment_number: number
}

export function usePaymentNotifications() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split('T')[0]

        // Date dans 7 jours pour les rappels
        const reminderDate = new Date(today)
        reminderDate.setDate(reminderDate.getDate() + 7)
        const reminderDateStr = reminderDate.toISOString().split('T')[0]

        // Récupérer les échéances en attente ou partiellement payées
        const { data: schedules, error } = await supabase
          .from('payment_schedule')
          .select(`
            id,
            loan_id,
            installment_number,
            due_date,
            amount_due,
            amount_paid,
            status,
            loan:loans(
              client:clients(full_name)
            )
          `)
          .in('status', ['en_attente', 'partiel'])
          .lte('due_date', reminderDateStr)
          .order('due_date', { ascending: true })

        if (error)
          throw error

        const notificationList: PaymentNotification[] = []

        schedules?.forEach((schedule) => {
          const loan = Array.isArray(schedule.loan) ? schedule.loan[0] : schedule.loan
          const client = Array.isArray(loan?.client) ? loan?.client[0] : loan?.client

          const dueDate = new Date(schedule.due_date)
          dueDate.setHours(0, 0, 0, 0)

          const amountPaid = Number(schedule.amount_paid || 0)
          const amountDue = Number(schedule.amount_due)
          const remaining = amountDue - amountPaid

          // Ignorer si déjà payé en totalité
          if (remaining <= 0)
            return

          const daysUntilDue = differenceInDays(dueDate, today)

          // Notification de retard (échéance dépassée)
          if (dueDate < today) {
            notificationList.push({
              id: schedule.id,
              type: 'overdue',
              schedule_id: schedule.id,
              loan_id: schedule.loan_id,
              due_date: schedule.due_date,
              amount_due: amountDue,
              amount_paid: amountPaid,
              remaining,
              daysUntilDue: Math.abs(daysUntilDue),
              client_name: client?.full_name || 'Client inconnu',
              installment_number: schedule.installment_number,
            })
          }
          // Notification de rappel (échéance dans les 7 prochains jours)
          else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
            notificationList.push({
              id: schedule.id,
              type: 'reminder',
              schedule_id: schedule.id,
              loan_id: schedule.loan_id,
              due_date: schedule.due_date,
              amount_due: amountDue,
              amount_paid: amountPaid,
              remaining,
              daysUntilDue,
              client_name: client?.full_name || 'Client inconnu',
              installment_number: schedule.installment_number,
            })
          }
        })

        // Trier : retards d'abord, puis rappels par date
        notificationList.sort((a, b) => {
          if (a.type === 'overdue' && b.type !== 'overdue')
            return -1
          if (a.type !== 'overdue' && b.type === 'overdue')
            return 1
          return a.daysUntilDue - b.daysUntilDue
        })

        setNotifications(notificationList)
      }
      catch (error) {
        console.error('Error fetching payment notifications:', error)
      }
      finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return { notifications, loading }
}
