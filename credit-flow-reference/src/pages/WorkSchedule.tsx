import { AlertCircle, Clock, Loader2, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface WorkScheduleType {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

const DAYS = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
]

export default function WorkSchedule() {
  const { role } = useAuth()
  const [schedules, setSchedules] = useState<WorkScheduleType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // IMPORTANT: Tous les hooks doivent être AVANT les returns conditionnels
  const allSchedules = useMemo(() => {
    return DAYS.map((day) => {
      const existing = schedules.find(s => s.day_of_week === day.value)
      if (existing) {
        return existing
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
      }
    })
  }, [schedules])

  useEffect(() => {
    if (role !== 'admin' && role !== 'directeur') {
      setLoading(false)
      return
    }
    fetchSchedules()
  }, [role])

  useEffect(() => {
    if (loading || schedules.length === 0)
      return

    const missingDays = DAYS.filter(day =>
      !schedules.find(s => s.day_of_week === day.value),
    )

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
      }))

      setSchedules(prev => [...prev, ...newSchedules])
    }
  }, [loading, schedules.length])

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('work_schedule' as any)
        .select('*')
        .order('day_of_week')

      if (error)
        throw error
      setSchedules((data || []) as unknown as WorkScheduleType[])
    }
    catch (error: any) {
      console.error('Error fetching schedules:', error)
      toast.error('Erreur lors du chargement des horaires')
    }
    finally {
      setLoading(false)
    }
  }

  const handleTimeChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules((prev) => {
      const existing = prev.find(s => s.day_of_week === dayOfWeek)
      if (existing) {
        return prev.map(schedule =>
          schedule.day_of_week === dayOfWeek
            ? { ...schedule, [field]: value }
            : schedule,
        )
      }
      else {
        return [...prev, {
          id: '',
          day_of_week: dayOfWeek,
          start_time: field === 'start_time' ? value : '08:00:00',
          end_time: field === 'end_time' ? value : '17:00:00',
          is_active: true,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
      }
    })
  }

  const handleActiveToggle = (dayOfWeek: number, isActive: boolean) => {
    setSchedules((prev) => {
      const existing = prev.find(s => s.day_of_week === dayOfWeek)
      if (existing) {
        return prev.map(schedule =>
          schedule.day_of_week === dayOfWeek
            ? { ...schedule, is_active: isActive }
            : schedule,
        )
      }
      else {
        return [...prev, {
          id: '',
          day_of_week: dayOfWeek,
          start_time: '08:00:00',
          end_time: '17:00:00',
          is_active: isActive,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const schedule of allSchedules) {
        const scheduleData: any = {
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: Boolean(schedule.is_active),
          updated_at: new Date().toISOString(),
        }

        if (schedule.id) {
          scheduleData.id = schedule.id
        }

        const { error } = await supabase
          .from('work_schedule' as any)
          .upsert(scheduleData as any, { onConflict: 'day_of_week' })

        if (error) {
          console.error('Error saving schedule:', scheduleData, error)
          throw error
        }
      }

      toast.success('Horaires sauvegardés avec succès !')
      await fetchSchedules()
    }
    catch (error: any) {
      console.error('Error saving schedules:', error)
      toast.error(error.message || 'Erreur lors de la sauvegarde des horaires')
    }
    finally {
      setSaving(false)
    }
  }

  // Les returns conditionnels sont APRÈS tous les hooks
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Horaires de travail</h1>
            <p className="text-muted-foreground mt-1">
              Définissez les horaires officiels de travail pour chaque jour de la semaine
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                )
              : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
          </Button>
        </div>

        <div className="grid gap-4">
          {allSchedules.map((schedule) => {
            const day = DAYS.find(d => d.value === schedule.day_of_week)!
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
                        onCheckedChange={checked => handleActiveToggle(schedule.day_of_week, checked)}
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
                        onChange={e => handleTimeChange(schedule.day_of_week, 'start_time', e.target.value)}
                        disabled={!schedule.is_active}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${schedule.day_of_week}`}>Heure de fin</Label>
                      <Input
                        id={`end-${schedule.day_of_week}`}
                        type="time"
                        value={schedule.end_time}
                        onChange={e => handleTimeChange(schedule.day_of_week, 'end_time', e.target.value)}
                        disabled={!schedule.is_active}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}
