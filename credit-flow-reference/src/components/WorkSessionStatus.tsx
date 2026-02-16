import { Clock, Lock, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useWorkSession } from '@/hooks/useWorkSession'
import { supabase } from '@/integrations/supabase/client'
import { WorkSessionDialog } from './WorkSessionDialog'

function getElapsedSince(openedAt: string): string {
  const opened = new Date(openedAt).getTime()
  const now = Date.now()
  const minutes = Math.floor((now - opened) / (1000 * 60))
  if (minutes < 1)
    return 'à l\'instant'
  if (minutes < 60)
    return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}min` : `${hours}h`
}

export function WorkSessionStatus() {
  const { role } = useAuth()
  const { isOpen, loading, canPerformOperations, workSession, today } = useWorkSession()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'open' | 'close'>('open')
  const [workHours, setWorkHours] = useState<{ start: string, end: string } | null>(null)
  const [elapsed, setElapsed] = useState<string>('')

  // Récupérer les horaires de travail pour aujourd'hui (optionnel, affiché discrètement sur mobile)
  useEffect(() => {
    const fetchWorkHours = async () => {
      const dayOfWeek = new Date().getDay()
      const { data } = await supabase
        .from('work_schedule' as any)
        .select('start_time, end_time')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .maybeSingle()

      if (data) {
        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(':')
          return `${hours}h${minutes}`
        }
        setWorkHours({
          start: formatTime((data as any).start_time),
          end: formatTime((data as any).end_time),
        })
      }
    }

    fetchWorkHours()
  }, [])

  // Décompte en temps réel quand la journée est ouverte
  useEffect(() => {
    if (!isOpen || !workSession?.opened_at) {
      setElapsed('')
      return
    }
    const updateElapsed = () => setElapsed(getElapsedSince(workSession.opened_at))
    updateElapsed()
    const interval = setInterval(updateElapsed, 60 * 1000)
    return () => clearInterval(interval)
  }, [isOpen, workSession?.opened_at])

  // Les administrateurs n'ont pas besoin d'ouvrir une journée
  if (role === 'admin') {
    return null
  }

  if (loading) {
    return (
      <Alert className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>Vérification de la journée de travail...</AlertTitle>
      </Alert>
    )
  }

  if (!isOpen) {
    return (
      <>
        <Alert
          variant="destructive"
          className="mb-4
            md:mb-4
            md:border-destructive/50 md:text-destructive
            border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200
            md:dark:border-destructive md:dark:bg-transparent md:dark:text-destructive
            [&>svg]:text-orange-600 dark:[&>svg]:text-orange-400
            md:[&>svg]:text-destructive
            p-3 md:p-4"
        >
          <Lock className="h-4 w-4" />
          <AlertTitle className="text-base md:text-base mb-1 md:mb-1">
            <span className="md:hidden">Journée non ouverte</span>
            <span className="hidden md:inline">Journée de travail non ouverte</span>
          </AlertTitle>
          <AlertDescription className="mt-1 md:mt-2">
            <p className="mb-2 md:mb-3 text-sm md:text-sm">
              <span className="md:hidden">Ouvrez votre journée pour effectuer des opérations.</span>
              <span className="hidden md:inline">Vous devez ouvrir votre journée de travail avant de pouvoir effectuer des opérations métier.</span>
            </p>
            {workHours && (
              <p className="text-xs text-orange-700/70 dark:text-orange-300/70 mb-2 md:hidden">
                Horaires :
                {' '}
                {workHours.start}
                {' '}
                –
                {' '}
                {workHours.end}
              </p>
            )}
            <Button
              onClick={() => {
                setDialogMode('open')
                setDialogOpen(true)
              }}
              size="sm"
              className="
                w-full md:w-auto
                mt-2 md:mt-0
                bg-orange-600 hover:bg-orange-700 text-white
                md:bg-primary md:hover:bg-primary/90 md:text-primary-foreground
                font-medium
                shadow-sm md:shadow-none
              "
            >
              <Unlock className="w-4 h-4 mr-2" />
              Ouvrir la journée
            </Button>
          </AlertDescription>
        </Alert>
        <WorkSessionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
        />
      </>
    )
  }

  return (
    <>
      <Alert className="mb-4 border-success/20 bg-success/5">
        <Unlock className="h-4 w-4 text-success" />
        <AlertTitle className="flex items-center justify-between">
          <span>Journée de travail ouverte</span>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            {today}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Ouverte à
                {' '}
                {workSession?.opened_at
                  ? new Date(workSession.opened_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
              {elapsed && (
                <Badge variant="secondary" className="font-mono text-success bg-success/10 border-success/20">
                  <Clock className="w-3 h-3 mr-1" />
                  {elapsed}
                </Badge>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogMode('close')
                setDialogOpen(true)
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              Fermer la journée
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      <WorkSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
      />
    </>
  )
}
