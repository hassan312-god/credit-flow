import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { WorkSessionStatus } from '@/components/WorkSessionStatus';
import { SidebarProvider, useSidebarContext } from './SidebarContext';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isCollapsed ? "ml-20" : "ml-64"} style={{ transition: 'margin-left 300ms ease-in-out' }}>
        <div className="p-8">
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
