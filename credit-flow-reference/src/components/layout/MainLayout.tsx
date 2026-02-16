import type { ReactNode } from 'react'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { WorkSessionStatus } from '@/components/WorkSessionStatus'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAttendanceAlerts } from '@/hooks/useAttendanceAlerts'
import { cn } from '@/lib/utils'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileHeader } from './MobileHeader'
import { Sidebar } from './Sidebar'
import { SidebarProvider, useSidebarContext } from './SidebarContext'

interface MainLayoutProps {
  children: ReactNode
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebarContext()
  const isMobile = useIsMobile()
  // Initialize attendance alerts for admins and directors
  useAttendanceAlerts()

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay pour mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar />

      {/* Header mobile */}
      <MobileHeader />

      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          // Desktop: marge selon l'état de la sidebar
          isCollapsed ? 'md:ml-20' : 'md:ml-64',
          // Mobile: pas de marge, la sidebar est en overlay
          'ml-0',
          // Padding bottom pour la navigation mobile (safe area)
          isMobile && 'pb-24',
          // Padding top pour le header mobile
          isMobile && 'pt-[72px]',
        )}
      >
        <div className={cn(
          'p-4 md:p-8',
          // Pas de padding top supplémentaire sur mobile car déjà géré par main
          'w-full',
        )}
        >
          <ConnectionStatus />
          <WorkSessionStatus />
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Navigation mobile en bas */}
      <MobileBottomNav />
    </div>
  )
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  )
}
