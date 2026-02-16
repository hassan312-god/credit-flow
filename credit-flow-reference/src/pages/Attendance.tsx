import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface AttendanceRecord {
  id: string
  user_id: string
  work_date: string
  actual_start_time: string | null
  actual_end_time: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  is_late: boolean | null
  late_minutes: number | null
  total_work_minutes: number | null
  status: string | null
  profile: {
    full_name: string
    email: string
  } | null
}

export default function Attendance() {
  const { role } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [viewMode, setViewMode] = useState<'today' | 'date' | 'month'>('today')

  useEffect(() => {
    if (role !== 'admin' && role !== 'directeur') {
      setLoading(false)
      return
    }

    fetchAttendance()
  }, [role, selectedDate, viewMode])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('work_sessions' as any)
        .select('id, user_id, work_date, opened_at, closed_at')
        .order('work_date', { ascending: false })
        .order('opened_at', { ascending: false })

      if (viewMode === 'today') {
        query = query.eq('work_date', format(new Date(), 'yyyy-MM-dd'))
      }
      else if (viewMode === 'date') {
        query = query.eq('work_date', selectedDate)
      }
      else if (viewMode === 'month') {
        const startOfMonth = format(new Date(`${selectedDate}-01`), 'yyyy-MM-dd')
        const endOfMonth = format(new Date(new Date(`${selectedDate}-01`).setMonth(new Date(`${selectedDate}-01`).getMonth() + 1)), 'yyyy-MM-dd')
        query = query.gte('work_date', startOfMonth).lt('work_date', endOfMonth)
      }

      const { data: sessions, error } = await query

      if (error)
        throw error

      // Fetch profiles separately (with error handling for offline mode)
      const userIds = [...new Set((sessions || []).map((s: any) => s.user_id))]
      let profiles: any[] = []

      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)

          if (!profilesError && profilesData) {
            profiles = profilesData
          }
        }
        catch (profilesErr) {
          console.warn('Could not fetch profiles (may be offline):', profilesErr)
          // Continue without profiles - we'll show user_id instead
        }
      }

      const timeFromIso = (iso: string | null) => iso ? new Date(iso).toTimeString().slice(0, 8) : null
      const attendanceWithProfiles = (sessions || []).map((session: any) => {
        let totalMinutes = session.total_work_minutes
        if (!totalMinutes && session.opened_at && session.closed_at) {
          const opened = new Date(session.opened_at)
          const closed = new Date(session.closed_at)
          totalMinutes = Math.round((closed.getTime() - opened.getTime()) / (1000 * 60))
        }
        return {
          ...session,
          status: session.closed_at ? 'closed' : 'open',
          actual_start_time: timeFromIso(session.opened_at),
          actual_end_time: timeFromIso(session.closed_at),
          total_work_minutes: totalMinutes,
          profile: profiles?.find((p: any) => p.id === session.user_id) || null,
        }
      })

      setAttendance(attendanceWithProfiles as any)
    }
    catch (error: any) {
      console.error('Error fetching attendance:', error)
      toast.error('Erreur lors du chargement des présences')
    }
    finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time)
      return '-'
    return time.substring(0, 5) // HH:MM
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes)
      return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.status === 'open') {
      return <Badge variant="default" className="bg-green-500">En service</Badge>
    }
    if (record.status === 'closed') {
      return <Badge variant="secondary">Fermé</Badge>
    }
    if (record.status === 'absent') {
      return <Badge variant="destructive">Absent</Badge>
    }
    return <Badge variant="outline">-</Badge>
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
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
    )
  }

  const activeEmployees = attendance.filter(a => a.status === 'open')
  const lateEmployees = attendance.filter(a => a.is_late === true && a.status === 'open')

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Suivi des présences</h1>
            <p className="text-muted-foreground mt-1">
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
              <input
                type={viewMode === 'month' ? 'month' : 'date'}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
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
            {attendance.length === 0
              ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune présence enregistrée</p>
                  </div>
                )
              : (
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
                      {attendance.map(record => (
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
                              {formatTime(record.scheduled_start_time)}
                              {' '}
                              -
                              {formatTime(record.scheduled_end_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatTime(record.actual_start_time)}
                              {' '}
                              -
                              {formatTime(record.actual_end_time)}
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(record.total_work_minutes)}</TableCell>
                          <TableCell>
                            {record.is_late
                              ? (
                                  <Badge variant="destructive">
                                    {formatDuration(record.late_minutes)}
                                  </Badge>
                                )
                              : (
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
    </MainLayout>
  )
}
