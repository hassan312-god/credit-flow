import { useState, useEffect } from 'react';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WorkSessionDialog } from './WorkSessionDialog';
import { Lock, Unlock, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function WorkSessionStatus() {
  const { role } = useAuth();
  const { isOpen, loading, canPerformOperations, workSession, today } = useWorkSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'open' | 'close'>('open');
  const [workHours, setWorkHours] = useState<{ start: string; end: string } | null>(null);

  // Récupérer les horaires de travail pour aujourd'hui (optionnel, affiché discrètement sur mobile)
  useEffect(() => {
    const fetchWorkHours = async () => {
      const dayOfWeek = new Date().getDay();
      const { data } = await supabase
        .from('work_schedule' as any)
        .select('start_time, end_time')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(':');
          return `${hours}h${minutes}`;
        };
        setWorkHours({
          start: formatTime((data as any).start_time),
          end: formatTime((data as any).end_time),
        });
      }
    };

    fetchWorkHours();
  }, []);

  // Les administrateurs n'ont pas besoin d'ouvrir une journée
  if (role === 'admin') {
    return null;
  }

  if (loading) {
    return (
      <Alert className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>Vérification de la journée de travail...</AlertTitle>
      </Alert>
    );
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
                Horaires : {workHours.start} – {workHours.end}
              </p>
            )}
            <Button
              onClick={() => {
                setDialogMode('open');
                setDialogOpen(true);
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
    );
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
          <div className="flex items-center justify-between">
            <p>
              Votre journée de travail est ouverte depuis{' '}
              {workSession?.opened_at
                ? new Date(workSession.opened_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'aujourd\'hui'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogMode('close');
                setDialogOpen(true);
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
  );
}

