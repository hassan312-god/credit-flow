import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DeepLinkHandler } from '@/components/DeepLinkHandler'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/useAuth'
import ActivityLogs from './pages/ActivityLogs'
import Attendance from './pages/Attendance'
import AttendanceReports from './pages/AttendanceReports'
import Auth from './pages/Auth'
import ClientDetails from './pages/ClientDetails'
import ClientForm from './pages/ClientForm'
import Clients from './pages/Clients'
import CompanyFunds from './pages/CompanyFunds'
import Dashboard from './pages/Dashboard'
import Horaires from './pages/Horaires'
import Index from './pages/Index'
import LoanDetails from './pages/LoanDetails'
import LoanForm from './pages/LoanForm'
import Loans from './pages/Loans'
import NotFound from './pages/NotFound'
import Payments from './pages/Payments'
import Prets from './pages/Prets'
import Recovery from './pages/Recovery'
import Reports from './pages/Reports'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import SyncStatus from './pages/SyncStatus'
import Users from './pages/Users'
import WorkSchedule from './pages/WorkSchedule'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DeepLinkHandler />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientDetails />} />
              <Route path="/prets" element={<Prets />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/loans/new" element={<LoanForm />} />
              <Route path="/loans/:id" element={<LoanDetails />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/recovery" element={<Recovery />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/company-funds" element={<CompanyFunds />} />
              <Route path="/work-schedule" element={<WorkSchedule />} />
              <Route path="/horaires" element={<Horaires />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/attendance-reports" element={<AttendanceReports />} />
              <Route path="/activity-logs" element={<ActivityLogs />} />
              <Route path="/sync-status" element={<SyncStatus />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
