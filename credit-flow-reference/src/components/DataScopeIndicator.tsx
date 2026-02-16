import { Eye, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

export function DataScopeIndicator() {
  const { role } = useAuth()

  const isGlobalScope = role === 'admin' || role === 'directeur'

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 px-3 py-1 ${
        isGlobalScope
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-muted text-muted-foreground border-muted-foreground/20'
      }`}
    >
      {isGlobalScope
        ? (
            <>
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Toutes les données</span>
            </>
          )
        : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Mes données</span>
            </>
          )}
    </Badge>
  )
}
