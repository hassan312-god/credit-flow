import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, Download, AlertCircle, User, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToXLSX, exportToCSV } from '@/utils/exportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonthlyReport {
  user_id: string;
  full_name: string;
  email: string;
  days_worked: number;
  days_late: number;
  days_absent: number;
  total_late_minutes: number;
  total_work_minutes: number;
  avg_work_minutes: number;
}

export default function AttendanceReports() {
  const { role } = useAuth();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (role !== 'admin' && role !== 'directeur') {
      setLoading(false);
      return;
    }

    fetchReports();
  }, [role, selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');

      // Fetch all work sessions for the month
      const { data: sessions, error: sessionsError } = await supabase
        .from('work_sessions' as any)
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (sessionsError) throw sessionsError;

      // Fetch profiles separately (with error handling for offline mode)
      const userIds = [...new Set((sessions || []).map((s: any) => s.user_id))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          
          if (!profilesError && profilesData) {
            profiles = profilesData;
          }
        } catch (profilesErr) {
          console.warn('Could not fetch profiles (may be offline):', profilesErr);
          // Continue without profiles - we'll show user_id instead
        }
      }

      // Group by user and calculate statistics
      const userMap = new Map<string, MonthlyReport>();

      sessions?.forEach((session: any) => {
        const userId = session.user_id;
        const profile = profiles?.find((p: any) => p.id === userId);
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || `Utilisateur ${userId.substring(0, 8)}...`,
            email: profile?.email || 'Email non disponible',
            days_worked: 0,
            days_late: 0,
            days_absent: 0,
            total_late_minutes: 0,
            total_work_minutes: 0,
            avg_work_minutes: 0,
          });
        }

        const report = userMap.get(userId)!;
        if (session.status === 'closed') {
          report.days_worked++;
        }
        if (session.is_late) {
          report.days_late++;
        }
        if (session.status === 'absent') {
          report.days_absent++;
        }
        report.total_late_minutes += session.late_minutes || 0;
        report.total_work_minutes += session.total_work_minutes || 0;
      });

      // Calculate averages
      userMap.forEach((report) => {
        if (report.days_worked > 0) {
          report.avg_work_minutes = Math.round(report.total_work_minutes / report.days_worked);
        }
      });

      setReports(Array.from(userMap.values()));
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const prepareExportData = () => {
    const headers = ['Employé', 'Email', 'Jours travaillés', 'Retards', 'Absences', 'Minutes de retard', 'Heures totales', 'Moyenne heures/jour'];
    const rows = reports.map(r => [
      r.full_name,
      r.email,
      r.days_worked.toString(),
      r.days_late.toString(),
      r.days_absent.toString(),
      r.total_late_minutes.toString(),
      formatDuration(r.total_work_minutes),
      formatDuration(r.avg_work_minutes),
    ]);
    return { headers, rows };
  };

  const handleExportPDF = () => {
    const { headers, rows } = prepareExportData();
    exportToPDF(rows, headers, `rapport-presence-${selectedMonth}`, `Rapport de présence - ${selectedMonth}`);
  };

  const handleExportXLSX = async () => {
    const { headers, rows } = prepareExportData();
    await exportToXLSX(rows, headers, `rapport-presence-${selectedMonth}`, 'Rapport de présence');
  };

  const handleExportCSV = () => {
    const { headers, rows } = prepareExportData();
    exportToCSV(rows, headers, `rapport-presence-${selectedMonth}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (role !== 'admin' && role !== 'directeur') {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs et directeurs peuvent accéder à cette page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Rapports de présence</h1>
            <p className="text-muted-foreground mt-1">
              Rapports mensuels détaillés par employé
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <Button onClick={fetchReports} variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLSX}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exporter en Excel (XLSX)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter en CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Rapport mensuel - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
            </CardTitle>
            <CardDescription>
              Statistiques détaillées pour chaque employé
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun rapport disponible pour ce mois</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Jours travaillés</TableHead>
                    <TableHead>Retards</TableHead>
                    <TableHead>Absences</TableHead>
                    <TableHead>Minutes de retard</TableHead>
                    <TableHead>Heures totales</TableHead>
                    <TableHead>Moyenne/jour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.full_name}</div>
                          <div className="text-xs text-muted-foreground">{report.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{report.days_worked}</TableCell>
                      <TableCell>
                        {report.days_late > 0 ? (
                          <span className="text-orange-600 font-medium">{report.days_late}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.days_absent > 0 ? (
                          <span className="text-red-600 font-medium">{report.days_absent}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(report.total_late_minutes)}</TableCell>
                      <TableCell className="font-medium">{formatDuration(report.total_work_minutes)}</TableCell>
                      <TableCell>{formatDuration(report.avg_work_minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

