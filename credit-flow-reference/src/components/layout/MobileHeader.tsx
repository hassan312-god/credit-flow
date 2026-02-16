import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AdminNotifications } from '@/components/AdminNotifications'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarContext } from './SidebarContext'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Accueil',
  '/clients': 'Clients',
  '/loans': 'Prêts',
  '/payments': 'Paiements',
  '/recovery': 'Recouvrement',
  '/reports': 'Rapports',
  '/users': 'Utilisateurs',
  '/settings': 'Paramètres',
  '/company-funds': 'Fond de l\'entreprise',
  '/work-schedule': 'Horaires',
  '/attendance': 'Présence',
  '/attendance-reports': 'Rapports présence',
  '/activity-logs': 'Journal',
  '/sync-status': 'Synchronisation',
}

export function MobileHeader() {
  const location = useLocation()
  const { profile, role } = useAuth()
  const { setIsMobileOpen } = useSidebarContext()
  const isMobile = useIsMobile()

  if (!isMobile)
    return null

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname === path || location.pathname.startsWith(`${path}/`)) {
        return title
      }
    }
    return 'N\'FA KA SÉRUM'
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur'

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12)
      return 'Bonjour'
    if (hour < 18)
      return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-b border-border md:hidden shadow-sm">
      <div className="px-4 py-3 pt-safe">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="h-10 w-10 -ml-2 touch-manipulation"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <h1 className="font-display text-base font-bold text-foreground flex-1 text-center truncate">
            {getPageTitle()}
          </h1>

          <div className="flex items-center gap-1 justify-end">
            {role === 'admin' && <AdminNotifications />}
            <NotificationBell />
          </div>
        </div>

        {/* Greeting (only on dashboard) */}
        {location.pathname === '/dashboard' && (
          <div className="mt-3 pb-1">
            <p className="text-base font-semibold text-foreground">
              {getGreeting()}
              ,
              {firstName}
              {' '}
              👋
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        )}
      </div>
    </header>
  )
}
