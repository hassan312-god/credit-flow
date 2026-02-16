import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Ban, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'

interface SuspensionRecord {
  id: string
  suspended_at: string
  suspended_until: string
  reason: string | null
  is_active: boolean
  lifted_at: string | null
  suspended_by_name?: string
  lifted_by_name?: string
}

interface SuspensionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

export function SuspensionHistoryDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: SuspensionHistoryDialogProps) {
  const [loading, setLoading] = useState(true)
  const [suspensions, setSuspensions] = useState<SuspensionRecord[]>([])

  useEffect(() => {
    if (open && userId) {
      fetchSuspensionHistory()
    }
  }, [open, userId])

  const fetchSuspensionHistory = async () => {
    setLoading(true)
    try {
      // Fetch all suspensions for this user
      const { data: suspensionsData, error } = await supabase
        .from('user_suspensions')
        .select('*')
        .eq('user_id', userId)
        .order('suspended_at', { ascending: false })

      if (error)
        throw error

      // Fetch names for suspended_by and lifted_by
      const suspenderIds = [...new Set([
        ...(suspensionsData || []).map(s => s.suspended_by).filter(Boolean),
        ...(suspensionsData || []).map(s => s.lifted_by).filter(Boolean),
      ])]

      let profilesMap: Record<string, string> = {}
      if (suspenderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', suspenderIds)

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name
          return acc
        }, {} as Record<string, string>)
      }

      const enrichedSuspensions = (suspensionsData || []).map(s => ({
        ...s,
        suspended_by_name: s.suspended_by ? profilesMap[s.suspended_by] || 'Inconnu' : undefined,
        lifted_by_name: s.lifted_by ? profilesMap[s.lifted_by] || 'Inconnu' : undefined,
      }))

      setSuspensions(enrichedSuspensions)
    }
    catch (error) {
      console.error('Error fetching suspension history:', error)
    }
    finally {
      setLoading(false)
    }
  }

  const formatDateTime = (date: string) =>
    format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })

  const getSuspensionStatus = (suspension: SuspensionRecord) => {
    const now = new Date()
    const until = new Date(suspension.suspended_until)

    if (!suspension.is_active || suspension.lifted_at) {
      return {
        label: 'Levée',
        variant: 'outline' as const,
        icon: CheckCircle,
        color: 'text-success',
      }
    }
    else if (until < now) {
      return {
        label: 'Expirée',
        variant: 'outline' as const,
        icon: Clock,
        color: 'text-muted-foreground',
      }
    }
    else {
      return {
        label: 'Active',
        variant: 'destructive' as const,
        icon: Ban,
        color: 'text-destructive',
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique des suspensions -
            {' '}
            {userName}
          </DialogTitle>
        </DialogHeader>

        {loading
          ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )
          : suspensions.length === 0
            ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                  <p>Aucune suspension enregistrée pour cet utilisateur</p>
                </div>
              )
            : (
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4">
                    {suspensions.map((suspension) => {
                      const status = getSuspensionStatus(suspension)
                      const StatusIcon = status.icon

                      return (
                        <div
                          key={suspension.id}
                          className="p-4 rounded-lg border bg-card space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Suspendu par
                                {' '}
                                <span className="font-medium text-foreground">{suspension.suspended_by_name}</span>
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{formatDateTime(suspension.suspended_at)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Début</p>
                              <p className="font-medium">{formatDateTime(suspension.suspended_at)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fin prévue</p>
                              <p className="font-medium">{formatDateTime(suspension.suspended_until)}</p>
                            </div>
                          </div>

                          {suspension.reason && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Raison</p>
                              <p className="text-sm bg-muted/50 p-2 rounded">{suspension.reason}</p>
                            </div>
                          )}

                          {suspension.lifted_at && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-success">
                                Levée le
                                {' '}
                                {formatDateTime(suspension.lifted_at)}
                                {suspension.lifted_by_name && (
                                  <>
                                    {' '}
                                    par
                                    <span className="font-medium">{suspension.lifted_by_name}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
      </DialogContent>
    </Dialog>
  )
}
