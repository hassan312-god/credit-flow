import { useState } from 'react';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WorkSessionDialog } from './WorkSessionDialog';
import { Lock, Unlock, AlertTriangle, Clock } from 'lucide-react';

export function WorkSessionStatus() {
  const { role } = useAuth();
  const { isOpen, loading, canPerformOperations, workSession, today } = useWorkSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'open' | 'close'>('open');

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
        <Alert variant="destructive" className="mb-4">
          <Lock className="h-4 w-4" />
          <AlertTitle>Journée de travail non ouverte</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              Vous devez ouvrir votre journée de travail avant de pouvoir effectuer des opérations métier.
            </p>
            <Button
              onClick={() => {
                setDialogMode('open');
                setDialogOpen(true);
              }}
              size="sm"
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

