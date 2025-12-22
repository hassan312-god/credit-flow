import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { Lock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { WorkSessionDialog } from './WorkSessionDialog';

interface OperationBlockedProps {
  operation: string;
}

export function OperationBlocked({ operation }: OperationBlockedProps) {
  const { role } = useAuth();
  const { isOpen, canPerformOperations } = useWorkSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Les administrateurs peuvent toujours effectuer des opérations
  if (role === 'admin' || canPerformOperations) {
    return null;
  }

  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Opération bloquée</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Vous ne pouvez pas {operation} car votre journée de travail n'est pas ouverte.
          </p>
          <p className="mb-3 text-sm">
            <strong>Règle importante :</strong> Tous les utilisateurs (sauf les administrateurs) doivent
            obligatoirement ouvrir leur journée de travail avant toute opération métier.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
          >
            <Lock className="w-4 h-4 mr-2" />
            Ouvrir la journée de travail
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

