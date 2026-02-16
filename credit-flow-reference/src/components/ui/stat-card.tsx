import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  iconColor?: string
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary/10 text-primary',
}: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">{title}</p>
          <p className="text-xl md:text-3xl font-display font-bold text-foreground truncate">{value}</p>
          {change && (
            <p className={cn(
              'mt-1 text-xs md:text-sm font-medium',
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground',
            )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-2 md:p-3 rounded-xl flex-shrink-0 ml-2', iconColor)}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  )
}
