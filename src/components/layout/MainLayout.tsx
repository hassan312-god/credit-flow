import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
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
          <WorkSessionStatus />
          {children}
        </div>
      </main>
    </div>
  );
}
