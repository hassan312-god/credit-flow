import type { PaymentNotification } from '@/hooks/usePaymentNotifications'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Bell, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications'

export function NotificationBell() {
  const { notifications, loading } = usePaymentNotifications()

  const overdueCount = notifications.filter(n => n.type === 'overdue').length
  const reminderCount = notifications.filter(n => n.type === 'reminder').length
  const totalCount = notifications.length

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr })

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCount > 0
              ? `${totalCount} notification${totalCount > 1 ? 's' : ''}`
              : 'Aucune notification'}
          </p>
        </div>
        <ScrollArea className="h-[400px]">
          {totalCount === 0
            ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              )
            : (
                <div className="p-2">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
        </ScrollArea>
        {totalCount > 0 && (
          <div className="p-3 border-t flex gap-2">
            <Link to="/recovery" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Voir les retards
              </Button>
            </Link>
            <Link to="/payments" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Voir les paiements
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification,
  formatCurrency,
  formatDate,
}: {
  notification: PaymentNotification
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
}) {
  const isOverdue = notification.type === 'overdue'

  return (
    <Link
      to={`/loans/${notification.loan_id}`}
      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isOverdue
              ? 'bg-destructive/10 text-destructive'
              : 'bg-warning/10 text-warning'
          }`}
        >
          {isOverdue
            ? (
                <AlertTriangle className="w-5 h-5" />
              )
            : (
                <Clock className="w-5 h-5" />
              )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">
              {notification.client_name}
            </p>
            <Badge
              variant={isOverdue ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {isOverdue
                ? `Retard: ${notification.daysUntilDue}j`
                : `Dans ${notification.daysUntilDue}j`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            Échéance #
            {notification.installment_number}
            {' '}
            -
            {' '}
            {formatDate(notification.due_date)}
          </p>
          <p className="text-sm font-medium">
            {formatCurrency(notification.remaining)}
            {' '}
            à payer
          </p>
        </div>
      </div>
    </Link>
  )
}
