import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { WorkSessionStatus } from '@/components/WorkSessionStatus';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { SidebarProvider, useSidebarContext } from './SidebarContext';
import { useAttendanceAlerts } from '@/hooks/useAttendanceAlerts';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { isCollapsed } = useSidebarContext();
  // Initialize attendance alerts for admins and directors
  useAttendanceAlerts();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isCollapsed ? "ml-20" : "ml-64"} style={{ transition: 'margin-left 300ms ease-in-out' }}>
        <div className="p-8">
          <ConnectionStatus />
          <WorkSessionStatus />
          {children}
        </div>
      </main>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
