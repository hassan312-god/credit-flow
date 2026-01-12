import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, AlertCircle, Search, Download, Filter, FileText, FileSpreadsheet, Users, LogIn, Edit, Trash2, UserPlus } from 'lucide-react';
import { exportToPDF, exportToXLSX, exportToCSV } from '@/utils/exportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'] & {
  profile: {
    full_name: string;
    email: string;
  } | null;
};

interface ActivityStats {
  totalLogins: number;
  totalCreations: number;
  totalUpdates: number;
  totalDeletions: number;
  activeUsersToday: number;
  recentLogins: { user_name: string; timestamp: string }[];
}

export default function ActivityLogs() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    fetchLogs();
    fetchStats();
  }, [role, page, filterAction, filterTable]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Récupérer les statistiques
      const { data: allLogs } = await supabase
        .from('audit_logs')
        .select('action, user_id, created_at')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      const logins = (allLogs || []).filter(l => l.action === 'LOGIN');
      const creations = (allLogs || []).filter(l => l.action === 'CREATE');
      const updates = (allLogs || []).filter(l => l.action === 'UPDATE');
      const deletions = (allLogs || []).filter(l => l.action === 'DELETE');
      
      // Utilisateurs actifs aujourd'hui
      const todayLogs = (allLogs || []).filter(l => l.created_at >= todayStr);
      const activeUsersToday = new Set(todayLogs.map(l => l.user_id).filter(Boolean)).size;

      // Dernières connexions avec profils
      const recentLoginLogs = logins.slice(0, 5);
      const recentUserIds = [...new Set(recentLoginLogs.map(l => l.user_id).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', recentUserIds);

      const recentLogins = recentLoginLogs.map(l => ({
        user_name: profiles?.find(p => p.id === l.user_id)?.full_name || 'Inconnu',
        timestamp: l.created_at,
      }));

      setStats({
        totalLogins: logins.length,
        totalCreations: creations.length,
        totalUpdates: updates.length,
        totalDeletions: deletions.length,
        activeUsersToday,
        recentLogins,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      if (filterTable !== 'all') {
        query = query.eq('table_name', filterTable);
      }

      if (search) {
        query = query.or(`action.ilike.%${search}%,table_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set((data || []).map((log: any) => log.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combine data
      const logsWithProfiles = (data || []).map((log: any) => ({
        ...log,
        profile: profiles?.find((p: any) => p.id === log.user_id) || null,
      }));

      setLogs(logsWithProfiles as any);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const prepareExportData = () => {
    const headers = ['Date', 'Utilisateur', 'Action', 'Table', 'ID Enregistrement', 'IP', 'Données'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr }),
      log.profile?.full_name || log.profile?.email || 'Système',
      log.action,
      log.table_name,
      log.record_id || '-',
      log.ip_address || '-',
      JSON.stringify(log.new_data || log.old_data || {}),
    ]);
    return { headers, rows };
  };

  const handleExportPDF = () => {
    const { headers, rows } = prepareExportData();
    exportToPDF(rows, headers, `logs-activite-${format(new Date(), 'yyyy-MM-dd')}`, 'Journal d\'activité');
  };

  const handleExportXLSX = async () => {
    const { headers, rows } = prepareExportData();
    await exportToXLSX(rows, headers, `logs-activite-${format(new Date(), 'yyyy-MM-dd')}`, 'Journal d\'activité');
  };

  const handleExportCSV = () => {
    const { headers, rows } = prepareExportData();
    exportToCSV(rows, headers, `logs-activite-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'CREATE': 'bg-green-500',
      'UPDATE': 'bg-blue-500',
      'DELETE': 'bg-red-500',
      'LOGIN': 'bg-purple-500',
      'LOGOUT': 'bg-gray-500',
    };
    return (
      <Badge className={colors[action] || 'bg-gray-500'}>
        {action}
      </Badge>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (role !== 'admin') {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs peuvent accéder à cette page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.table_name.toLowerCase().includes(searchLower) ||
      log.profile?.full_name?.toLowerCase().includes(searchLower) ||
      log.profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Journal d'activité</h1>
            <p className="text-muted-foreground mt-1">
              Consultez l'historique complet des actions effectuées dans le système
            </p>
          </div>
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

        {/* Statistiques d'activité */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.activeUsersToday}</p>
                    <p className="text-xs text-muted-foreground">Utilisateurs actifs aujourd'hui</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <LogIn className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalLogins}</p>
                    <p className="text-xs text-muted-foreground">Connexions (30j)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <UserPlus className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCreations}</p>
                    <p className="text-xs text-muted-foreground">Créations (30j)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Edit className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUpdates}</p>
                    <p className="text-xs text-muted-foreground">Modifications (30j)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalDeletions}</p>
                    <p className="text-xs text-muted-foreground">Suppressions (30j)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dernières connexions */}
        {stats && stats.recentLogins.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Dernières connexions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {stats.recentLogins.map((login, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {login.user_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{login.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(login.timestamp), 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="CREATE">Création</SelectItem>
                  <SelectItem value="UPDATE">Modification</SelectItem>
                  <SelectItem value="DELETE">Suppression</SelectItem>
                  <SelectItem value="LOGIN">Connexion</SelectItem>
                  <SelectItem value="LOGOUT">Déconnexion</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les tables</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="loans">Prêts</SelectItem>
                  <SelectItem value="payments">Paiements</SelectItem>
                  <SelectItem value="users">Utilisateurs</SelectItem>
                  <SelectItem value="work_sessions">Sessions de travail</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchLogs} variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des actions</CardTitle>
            <CardDescription>
              {totalCount} action(s) enregistrée(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun log trouvé</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {log.profile ? (
                            <div>
                              <div className="font-medium">{log.profile.full_name}</div>
                              <div className="text-xs text-muted-foreground">{log.profile.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Système</span>
                          )}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address || '-'}</TableCell>
                        <TableCell>
                          {log.new_data || log.old_data ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-primary">Voir</summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.new_data || log.old_data, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} sur {Math.ceil(totalCount / pageSize)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(totalCount / pageSize)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

