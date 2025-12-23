import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { Lock, AlertTriangle, Unlock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WorkSessionDialog } from './WorkSessionDialog';
import { supabase } from '@/integrations/supabase/client';

interface OperationBlockedProps {
  operation: string;
}

export function OperationBlocked({ operation }: OperationBlockedProps) {
  const { role } = useAuth();
  const { isOpen, canPerformOperations } = useWorkSession();
  const [dialogOpen, setDialogOpen] = useState(false);
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
        .single();

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

  // Les administrateurs ne peuvent pas effectuer d'opérations métier (supervision uniquement)
  // Seuls les autres rôles avec journée ouverte peuvent effectuer des opérations
  if (role === 'admin') {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Action non autorisée</AlertTitle>
        <AlertDescription>
          Les administrateurs ne peuvent pas effectuer d'opérations métier. Votre rôle est limité à la supervision et au contrôle.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (canPerformOperations) {
    return null;
  }

  return (
    <>
      <Alert 
        variant="destructive" 
        className="mb-6 
          md:mb-6
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
          <span className="hidden md:inline">Opération bloquée</span>
        </AlertTitle>
        <AlertDescription className="mt-1 md:mt-2">
          <p className="mb-2 md:mb-3 text-sm md:text-sm">
            <span className="md:hidden">Ouvrez votre journée pour {operation}.</span>
            <span className="hidden md:inline">Vous ne pouvez pas {operation} car votre journée de travail n'est pas ouverte.</span>
          </p>
          {workHours && (
            <p className="text-xs text-orange-700/70 dark:text-orange-300/70 mb-2 md:hidden">
              Horaires : {workHours.start} – {workHours.end}
            </p>
          )}
          <p className="mb-3 text-xs md:text-sm hidden md:block">
            <strong>Règle importante :</strong> Tous les utilisateurs (sauf les administrateurs) doivent
            obligatoirement ouvrir leur journée de travail avant toute opération métier.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
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
        mode="open"
      />
    </>
  );
}

