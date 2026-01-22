import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import ClientDetails from "./pages/ClientDetails";
import Prets from "./pages/Prets";
import Loans from "./pages/Loans";
import LoanForm from "./pages/LoanForm";
import LoanDetails from "./pages/LoanDetails";
import Payments from "./pages/Payments";
import Recovery from "./pages/Recovery";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import CompanyFunds from "./pages/CompanyFunds";
import WorkSchedule from "./pages/WorkSchedule";
import Horaires from "./pages/Horaires";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import ActivityLogs from "./pages/ActivityLogs";
import SyncStatus from "./pages/SyncStatus";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
);

export default App;
