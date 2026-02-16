import {
  AlertTriangle,
  CreditCard,
  FileText,
  LayoutDashboard,
  Plus,
  Users,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const mobileMenuItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Accueil',
    roles: ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  },
  {
    path: '/clients',
    icon: Users,
    label: 'Clients',
    roles: ['admin', 'directeur', 'agent_credit'],
  },
  {
    path: '/loans',
    icon: FileText,
    label: 'Prêts',
    roles: ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  },
  {
    path: '/payments',
    icon: CreditCard,
    label: 'Paiements',
    roles: ['admin', 'directeur', 'caissier'],
  },
  {
    path: '/recovery',
    icon: AlertTriangle,
    label: 'Recouvrement',
    roles: ['admin', 'directeur', 'recouvrement'],
  },
]

export function MobileBottomNav() {
  const { role } = useAuth()
  const location = useLocation()
  const isMobile = useIsMobile()

  if (!isMobile)
    return null

  const filteredItems = mobileMenuItems.filter(
    item => role && item.roles.includes(role),
  )

  // Déterminer le chemin pour le bouton "Nouveau"
  const getNewItemPath = () => {
    if (role === 'directeur' || role === 'agent_credit') {
      if (location.pathname.startsWith('/clients'))
        return '/clients/new'
      if (location.pathname.startsWith('/loans'))
        return '/loans/new'
      return '/loans/new' // Par défaut
    }
    return null
  }

  const newItemPath = getNewItemPath()
  const canCreate = role === 'directeur' || role === 'agent_credit'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-1 pb-safe">
        {filteredItems.slice(0, canCreate ? 4 : 5).map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
            || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 touch-manipulation',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-primary',
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-200',
                isActive && 'bg-primary/10 scale-110',
              )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                'text-[10px] font-medium mt-0.5 leading-tight',
                isActive && 'font-semibold text-primary',
              )}
              >
                {item.label}
              </span>
            </NavLink>
          )
        })}

        {/* Bouton central "Nouveau" */}
        {canCreate && newItemPath && (
          <NavLink
            to={newItemPath}
            className="flex flex-col items-center justify-center -mt-5 relative touch-manipulation"
          >
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground mt-0.5">Nouveau</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
