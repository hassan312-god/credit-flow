import { useEffect, useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, MoreVertical, Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, Save, Loader2, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInMinutes, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { exportToPDF, exportToXLSX, exportToCSV } from '@/utils/exportUtils';

// ==================== TYPES ====================
interface WorkSession {
  id: string;
  user_id: string;
  work_date: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  is_late: boolean | null;
  late_minutes: number | null;
  total_work_minutes: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

interface WorkScheduleType {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  work_date: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  is_late: boolean | null;
  late_minutes: number | null;
  total_work_minutes: number | null;
  status: string | null;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

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

const DAYS = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

type MainTab = 'historique' | 'parametres' | 'presence' | 'rapports';

export default function Horaires() {
  const { role } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('historique');

  // Vérification d'accès
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Horaires</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les horaires, suivez les présences et consultez les rapports
            </p>
          </div>
        </div>

        {/* Sélecteur de section (un seul bloc, pas de doublon avec les filtres en bas) */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Label className="text-muted-foreground shrink-0">Section :</Label>
          <Select value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as MainTab)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="historique">Historique</SelectItem>
              <SelectItem value="parametres">Paramètres</SelectItem>
              <SelectItem value="presence">Présence</SelectItem>
              <SelectItem value="rapports">Rapports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contenu : Historique (recherche + dates + Tous/Résumé/etc) ou autre section */}
        {activeMainTab === 'historique' && <HistoriqueTab />}
        {activeMainTab === 'parametres' && <ParametresTab />}
        {activeMainTab === 'presence' && <PresenceTab />}
        {activeMainTab === 'rapports' && <RapportsTab />}
      </div>
    </MainLayout>
  );
}

// ==================== ONGLET HISTORIQUE ====================
function HistoriqueTab() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'summary' | 'completed' | 'cancelled' | 'open'>('all');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour voir les horaires');
        setSessions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('work_sessions' as any)
        .select(`
          id,
          user_id,
          work_date,
          opened_at,
          closed_at,
          status,
          is_late,
          late_minutes,
          actual_start_time,
          actual_end_time
        `)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: false })
        .order('opened_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        const errorMessage = error.message || 'Erreur inconnue';
        // Vérifier si c'est un problème de permissions
        if (error.code === 'PGRST301' || errorMessage.includes('permission') || errorMessage.includes('policy')) {
          toast.error('Vous n\'avez pas les permissions nécessaires pour voir les horaires. Contactez un administrateur.');
        } else {
          toast.error(`Erreur lors du chargement des horaires: ${errorMessage}`);
        }
        setSessions([]);
        return;
      }

      const userIds = [...new Set((data || []).map((s: any) => s.user_id))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          toast.error('Erreur lors du chargement des profils');
        } else {
          profiles = profilesData || [];
        }
      }

      const sessionsWithProfiles = (data || []).map((session: any) => {
        // Calculer total_work_minutes si manquant
        let totalMinutes = session.total_work_minutes;
        if (!totalMinutes && session.opened_at && session.closed_at) {
          const opened = new Date(session.opened_at);
          const closed = new Date(session.closed_at);
          totalMinutes = Math.round((closed.getTime() - opened.getTime()) / (1000 * 60));
        }
        
        return {
          ...session,
          total_work_minutes: totalMinutes,
          profile: profiles.find((p: any) => p.id === session.user_id) || null,
        };
      });

      setSessions(sessionsWithProfiles as WorkSession[]);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        toast.error('Vous n\'avez pas les permissions nécessaires pour voir les horaires. Contactez un administrateur.');
      } else {
        toast.error(`Erreur lors du chargement des horaires: ${errorMessage}`);
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    switch (activeTab) {
      case 'completed':
        filtered = filtered.filter(s => s.status === 'closed');
        break;
      case 'cancelled':
        filtered = filtered.filter(s => s.status === 'absent');
        break;
      case 'open':
        filtered = filtered.filter(s => s.status === 'open');
        break;
      default:
        break;
    }

    if (search) {
      filtered = filtered.filter(s =>
        s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [sessions, activeTab, search]);

  const getStatusBadge = (session: WorkSession) => {
    switch (session.status) {
      case 'closed':
        return <Badge variant="default" className="bg-green-500">Terminé</Badge>;
      case 'open':
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="secondary">{session.status}</Badge>;
    }
  };

  const getTimeRemaining = (session: WorkSession) => {
    if (session.status === 'closed' || session.status === 'absent' || session.closed_at) {
      return '-';
    }
    const opened = parseISO(session.opened_at);
    const now = new Date();
    const minutes = differenceInMinutes(now, opened);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins}min`;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'closed').length,
    open: sessions.filter(s => s.status === 'open').length,
    absent: sessions.filter(s => s.status === 'absent').length,
    totalHours: sessions
      .filter(s => s.total_work_minutes)
      .reduce((sum, s) => sum + (s.total_work_minutes || 0), 0) / 60,
  };

  return (
    <div className="space-y-4">
      {/* Search and Date Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">à</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="summary">Résumé</TabsTrigger>
          <TabsTrigger value="completed">Terminés</TabsTrigger>
          <TabsTrigger value="open">En cours</TabsTrigger>
          <TabsTrigger value="cancelled">Absents</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Terminés</p>
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Heures totales</p>
                <p className="text-2xl font-bold">{Math.round(stats.totalHours)}h</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <SessionsTable sessions={filteredSessions} loading={loading} getStatusBadge={getStatusBadge} getTimeRemaining={getTimeRemaining} formatDuration={formatDuration} />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <SessionsTable sessions={filteredSessions} loading={loading} getStatusBadge={getStatusBadge} getTimeRemaining={getTimeRemaining} formatDuration={formatDuration} />
        </TabsContent>

        <TabsContent value="open" className="mt-4">
          <SessionsTable sessions={filteredSessions} loading={loading} getStatusBadge={getStatusBadge} getTimeRemaining={getTimeRemaining} formatDuration={formatDuration} />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          <SessionsTable sessions={filteredSessions} loading={loading} getStatusBadge={getStatusBadge} getTimeRemaining={getTimeRemaining} formatDuration={formatDuration} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== ONGLET PARAMÈTRES ====================
function ParametresTab() {
  const [schedules, setSchedules] = useState<WorkScheduleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const allSchedules = useMemo(() => {
    return DAYS.map(day => {
      const existing = schedules.find(s => s.day_of_week === day.value);
      if (existing) {
        return existing;
      }
      return {
        id: '',
        day_of_week: day.value,
        start_time: '08:00:00',
        end_time: '17:00:00',
        is_active: false,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }, [schedules]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (loading || schedules.length === 0) return;
    const missingDays = DAYS.filter(day => !schedules.find(s => s.day_of_week === day.value));
    if (missingDays.length > 0) {
      const newSchedules = missingDays.map(day => ({
        id: '',
        day_of_week: day.value,
        start_time: '08:00:00',
        end_time: '17:00:00',
        is_active: false,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setSchedules(prev => [...prev, ...newSchedules]);
    }
  }, [loading, schedules.length]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour voir les horaires');
        setSchedules([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('work_schedule' as any)
        .select('*')
        .order('day_of_week');

      if (error) {
        console.error('Error fetching schedules:', error);
        // Vérifier si c'est un problème de permissions
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
          toast.error('Vous n\'avez pas les permissions nécessaires pour voir les horaires. Contactez un administrateur.');
        } else {
          toast.error(`Erreur lors du chargement des horaires: ${error.message || 'Erreur inconnue'}`);
        }
        setSchedules([]);
        return;
      }
      setSchedules((data || []) as unknown as WorkScheduleType[]);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        toast.error('Vous n\'avez pas les permissions nécessaires pour voir les horaires. Contactez un administrateur.');
      } else {
        toast.error(`Erreur lors du chargement des horaires: ${errorMessage}`);
      }
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.day_of_week === dayOfWeek);
      if (existing) {
        return prev.map(schedule =>
          schedule.day_of_week === dayOfWeek
            ? { ...schedule, [field]: value }
            : schedule
        );
      } else {
        return [...prev, {
          id: '',
          day_of_week: dayOfWeek,
          start_time: field === 'start_time' ? value : '08:00:00',
          end_time: field === 'end_time' ? value : '17:00:00',
          is_active: true,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    });
  };

  const handleActiveToggle = (dayOfWeek: number, isActive: boolean) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.day_of_week === dayOfWeek);
      if (existing) {
        return prev.map(schedule =>
          schedule.day_of_week === dayOfWeek
            ? { ...schedule, is_active: isActive }
            : schedule
        );
      } else {
        return [...prev, {
          id: '',
          day_of_week: dayOfWeek,
          start_time: '08:00:00',
          end_time: '17:00:00',
          is_active: isActive,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const schedule of allSchedules) {
        const scheduleData: any = {
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: Boolean(schedule.is_active),
          updated_at: new Date().toISOString(),
        };

        if (schedule.id) {
          scheduleData.id = schedule.id;
        }

        const { error } = await supabase
          .from('work_schedule' as any)
          .upsert(scheduleData as any, { onConflict: 'day_of_week' });

        if (error) {
          console.error('Error saving schedule:', scheduleData, error);
          throw error;
        }
      }

      toast.success('Horaires sauvegardés avec succès !');
      await fetchSchedules();
    } catch (error: any) {
      console.error('Error saving schedules:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde des horaires');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Horaires de travail</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Définissez les horaires officiels de travail pour chaque jour de la semaine
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {allSchedules.map((schedule) => {
          const day = DAYS.find(d => d.value === schedule.day_of_week)!;
          return (
            <Card key={schedule.day_of_week}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${schedule.day_of_week}`} className="text-sm">
                      Actif
                    </Label>
                    <Switch
                      id={`active-${schedule.day_of_week}`}
                      checked={Boolean(schedule.is_active)}
                      onCheckedChange={(checked) => handleActiveToggle(schedule.day_of_week, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`start-${schedule.day_of_week}`}>Heure de début</Label>
                    <Input
                      id={`start-${schedule.day_of_week}`}
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => handleTimeChange(schedule.day_of_week, 'start_time', e.target.value)}
                      disabled={!schedule.is_active}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`end-${schedule.day_of_week}`}>Heure de fin</Label>
                    <Input
                      id={`end-${schedule.day_of_week}`}
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => handleTimeChange(schedule.day_of_week, 'end_time', e.target.value)}
                      disabled={!schedule.is_active}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ==================== ONGLET PRÉSENCE ====================
function PresenceTab() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'today' | 'date' | 'month'>('today');

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, viewMode]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour voir les présences');
        setAttendance([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('work_sessions' as any)
        .select('*')
        .order('work_date', { ascending: false })
        .order('opened_at', { ascending: false });

      if (viewMode === 'today') {
        query = query.eq('work_date', format(new Date(), 'yyyy-MM-dd'));
      } else if (viewMode === 'date') {
        query = query.eq('work_date', selectedDate);
      } else if (viewMode === 'month') {
        const startOfMonth = format(new Date(selectedDate + '-01'), 'yyyy-MM-dd');
        const endOfMonth = format(new Date(new Date(selectedDate + '-01').setMonth(new Date(selectedDate + '-01').getMonth() + 1)), 'yyyy-MM-dd');
        query = query.gte('work_date', startOfMonth).lt('work_date', endOfMonth);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        const errorMessage = error.message || 'Erreur inconnue';
        if (error.code === 'PGRST301' || errorMessage.includes('permission') || errorMessage.includes('policy')) {
          toast.error('Vous n\'avez pas les permissions nécessaires pour voir les présences. Contactez un administrateur.');
        } else {
          toast.error(`Erreur lors du chargement des présences: ${errorMessage}`);
        }
        setAttendance([]);
        return;
      }

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
        }
      }

      const attendanceWithProfiles = (sessions || []).map((session: any) => {
        // Calculer total_work_minutes si manquant
        let totalMinutes = session.total_work_minutes;
        if (!totalMinutes && session.opened_at && session.closed_at) {
          const opened = new Date(session.opened_at);
          const closed = new Date(session.closed_at);
          totalMinutes = Math.round((closed.getTime() - opened.getTime()) / (1000 * 60));
        }
        
        return {
          ...session,
          total_work_minutes: totalMinutes,
          profile: profiles?.find((p: any) => p.id === session.user_id) || null,
        };
      });

      setAttendance(attendanceWithProfiles as any);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        toast.error('Vous n\'avez pas les permissions nécessaires pour voir les présences. Contactez un administrateur.');
      } else {
        toast.error(`Erreur lors du chargement des présences: ${errorMessage}`);
      }
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.status === 'open') {
      return <Badge variant="default" className="bg-green-500">En service</Badge>;
    }
    if (record.status === 'closed') {
      return <Badge variant="secondary">Fermé</Badge>;
    }
    if (record.status === 'absent') {
      return <Badge variant="destructive">Absent</Badge>;
    }
    return <Badge variant="outline">-</Badge>;
  };

  const activeEmployees = attendance.filter(a => a.status === 'open');
  const lateEmployees = attendance.filter(a => a.is_late === true && a.status === 'open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Suivi des présences</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez les présences en temps réel et l'historique détaillé
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="date">Par date</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
            </SelectContent>
          </Select>
          {(viewMode === 'date' || viewMode === 'month') && (
            <Input
              type={viewMode === 'month' ? 'month' : 'date'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          )}
          <Button onClick={fetchAttendance} variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Employés actuellement en service</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lateEmployees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Employés en retard aujourd'hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendance.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Enregistrements trouvés</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Détails des présences</CardTitle>
          <CardDescription>
            Liste complète des journées de travail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune présence enregistrée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure prévue</TableHead>
                  <TableHead>Heure réelle</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Retard</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {record.profile?.full_name || `Utilisateur ${record.user_id.substring(0, 8)}...`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.profile?.email || 'Email non disponible'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.work_date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatTime(record.scheduled_start_time)} - {formatTime(record.scheduled_end_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatTime(record.actual_start_time)} - {formatTime(record.actual_end_time)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(record.total_work_minutes)}</TableCell>
                    <TableCell>
                      {record.is_late ? (
                        <Badge variant="destructive">
                          {formatDuration(record.late_minutes)}
                        </Badge>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ONGLET RAPPORTS ====================
function RapportsTab() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour voir les rapports');
        setReports([]);
        setLoading(false);
        return;
      }

      const [year, month] = selectedMonth.split('-');
      const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');

      const { data: sessions, error: sessionsError } = await supabase
        .from('work_sessions' as any)
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        const errorMessage = sessionsError.message || 'Erreur inconnue';
        if (sessionsError.code === 'PGRST301' || errorMessage.includes('permission') || errorMessage.includes('policy')) {
          toast.error('Vous n\'avez pas les permissions nécessaires pour voir les rapports. Contactez un administrateur.');
        } else {
          toast.error(`Erreur lors du chargement des rapports: ${errorMessage}`);
        }
        setReports([]);
        return;
      }

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
        }
      }

      const userMap = new Map<string, MonthlyReport>();

      sessions?.forEach((session: any) => {
        const userId = session.user_id;
        const profile = profiles?.find((p: any) => p.id === userId);
        
        // Calculer total_work_minutes si manquant
        let totalMinutes = session.total_work_minutes;
        if (!totalMinutes && session.opened_at && session.closed_at) {
          const opened = new Date(session.opened_at);
          const closed = new Date(session.closed_at);
          totalMinutes = Math.round((closed.getTime() - opened.getTime()) / (1000 * 60));
        }
        
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
        report.total_work_minutes += totalMinutes || 0;
      });

      userMap.forEach((report) => {
        if (report.days_worked > 0) {
          report.avg_work_minutes = Math.round(report.total_work_minutes / report.days_worked);
        }
      });

      setReports(Array.from(userMap.values()));
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        toast.error('Vous n\'avez pas les permissions nécessaires pour voir les rapports. Contactez un administrateur.');
      } else {
        toast.error(`Erreur lors du chargement des rapports: ${errorMessage}`);
      }
      setReports([]);
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
    toast.success('Export PDF généré avec succès');
  };

  const handleExportXLSX = async () => {
    try {
      const { headers, rows } = prepareExportData();
      await exportToXLSX(rows, headers, `rapport-presence-${selectedMonth}`, 'Rapport de présence');
      toast.success('Export Excel généré avec succès');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleExportCSV = () => {
    const { headers, rows } = prepareExportData();
    exportToCSV(rows, headers, `rapport-presence-${selectedMonth}`);
    toast.success('Export CSV généré avec succès');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rapports de présence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rapports mensuels détaillés par employé
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
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
  );
}

// ==================== COMPOSANT TABLEAU SESSIONS ====================
interface SessionsTableProps {
  sessions: WorkSession[];
  loading: boolean;
  getStatusBadge: (session: WorkSession) => JSX.Element;
  getTimeRemaining: (session: WorkSession) => string;
  formatDuration: (minutes: number | null) => string;
}

function SessionsTable({ sessions, loading, getStatusBadge, getTimeRemaining, formatDuration }: SessionsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Aucune session trouvée</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>ID</TableHead>
              <TableHead>Employé</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heure d'ouverture</TableHead>
              <TableHead>Heure de fermeture</TableHead>
              <TableHead>Temps restant</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-mono text-sm">#{session.id.substring(0, 8)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.profile?.full_name || 'Inconnu'}</p>
                      <p className="text-xs text-muted-foreground">{session.profile?.email || ''}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {format(parseISO(session.work_date), 'dd MMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {format(parseISO(session.opened_at), 'HH:mm', { locale: fr })}
                  </div>
                </TableCell>
                <TableCell>
                  {session.closed_at ? (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {format(parseISO(session.closed_at), 'HH:mm', { locale: fr })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{getTimeRemaining(session)}</span>
                </TableCell>
                <TableCell>
                  {formatDuration(session.total_work_minutes)}
                </TableCell>
                <TableCell>
                  {session.is_late ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Retard
                    </Badge>
                  ) : (
                    <Badge variant="outline">Normal</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(session)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir détails</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      {session.status === 'open' && (
                        <DropdownMenuItem className="text-destructive">Fermer session</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
