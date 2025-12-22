import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { WorkSessionStatus } from '@/components/WorkSessionStatus';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <div className="fixed top-4 right-8 z-50">
            <NotificationBell />
          </div>
          <WorkSessionStatus />
          {children}
        </div>
      </main>
    </div>
  );
}
