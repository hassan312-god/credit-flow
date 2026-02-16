import { Loader2, Lock, Unlock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useWorkSession } from '@/hooks/useWorkSession'

interface WorkSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'open' | 'close'
}

export function WorkSessionDialog({ open, onOpenChange, mode }: WorkSessionDialogProps) {
  const { workSession, openWorkSession, closeWorkSession, today } = useWorkSession()
  const [initialCash, setInitialCash] = useState('')
  const [finalCash, setFinalCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setLoading(true)
    const result = await openWorkSession(
      Number.parseFloat(initialCash) || 0,
      notes || undefined,
    )
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    }
    else {
      toast.success('Journée de travail ouverte avec succès')
      onOpenChange(false)
      setInitialCash('')
      setNotes('')
    }
  }

  const handleClose = async () => {
    setLoading(true)
    const result = await closeWorkSession(
      Number.parseFloat(finalCash) || 0,
      notes || undefined,
    )
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    }
    else {
      toast.success('Journée de travail fermée avec succès')
      onOpenChange(false)
      setFinalCash('')
      setNotes('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'open'
              ? (
                  <>
                    <Unlock className="w-5 h-5" />
                    Ouvrir une journée de travail
                  </>
                )
              : (
                  <>
                    <Lock className="w-5 h-5" />
                    Fermer la journée de travail
                  </>
                )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'open'
              ? `Ouvrez votre journée de travail pour le ${today}. Vous devrez fermer cette journée avant de pouvoir en ouvrir une nouvelle.`
              : `Fermez votre journée de travail pour le ${today}. Assurez-vous d'avoir enregistré toutes vos opérations.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'open'
            ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="initialCash">Caisse initiale (FCFA)</Label>
                    <Input
                      id="initialCash"
                      type="number"
                      placeholder="0"
                      value={initialCash}
                      onChange={e => setInitialCash(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Montant en caisse au début de la journée
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ajoutez des notes sur cette journée..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )
            : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="finalCash">Caisse finale (FCFA)</Label>
                    <Input
                      id="finalCash"
                      type="number"
                      placeholder="0"
                      value={finalCash}
                      onChange={e => setFinalCash(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Montant en caisse à la fin de la journée
                    </p>
                  </div>
                  {workSession?.initial_cash && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Caisse initiale</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF',
                          maximumFractionDigits: 0,
                        }).format(workSession.initial_cash)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ajoutez des notes sur cette journée..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={mode === 'open' ? handleOpen : handleClose}
            disabled={loading}
          >
            {loading
              ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'open' ? 'Ouverture...' : 'Fermeture...'}
                  </>
                )
              : (
                  mode === 'open' ? 'Ouvrir la journée' : 'Fermer la journée'
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
