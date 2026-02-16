import { cn } from '@/lib/utils'

type LoanStatus = 'en_attente' | 'en_cours_validation' | 'approuve' | 'rejete' | 'en_cours' | 'rembourse' | 'en_retard' | 'defaut'
type PaymentStatus = 'en_attente' | 'paye' | 'en_retard' | 'partiel'

interface StatusBadgeProps {
  status: LoanStatus | PaymentStatus
  type?: 'loan' | 'payment'
}

const loanStatusConfig: Record<LoanStatus, { label: string, className: string }> = {
  en_attente: { label: 'En attente', className: 'status-pending' },
  en_cours_validation: { label: 'En validation', className: 'status-active' },
  approuve: { label: 'Approuvé', className: 'status-approved' },
  rejete: { label: 'Rejeté', className: 'status-rejected' },
  en_cours: { label: 'En cours', className: 'status-active' },
  rembourse: { label: 'Remboursé', className: 'status-approved' },
  en_retard: { label: 'En retard', className: 'status-pending' },
  defaut: { label: 'Défaut', className: 'status-rejected' },
}

const paymentStatusConfig: Record<PaymentStatus, { label: string, className: string }> = {
  en_attente: { label: 'En attente', className: 'status-pending' },
  paye: { label: 'Payé', className: 'status-approved' },
  en_retard: { label: 'En retard', className: 'status-rejected' },
  partiel: { label: 'Partiel', className: 'status-pending' },
}

export function StatusBadge({ status, type = 'loan' }: StatusBadgeProps) {
  const config = type === 'loan'
    ? loanStatusConfig[status as LoanStatus]
    : paymentStatusConfig[status as PaymentStatus]

  if (!config)
    return null

  return (
    <span className={cn('status-badge', config.className)}>
      {config.label}
    </span>
  )
}
