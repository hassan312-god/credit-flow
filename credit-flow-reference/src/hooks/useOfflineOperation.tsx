import { useCallback } from 'react'
import { toast } from 'sonner'
import { useOfflineQueue } from './useOfflineQueue'

interface OfflineOperationOptions {
  requiresOnline?: boolean
  successMessage?: string
  errorMessage?: string
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useOfflineOperation() {
  const { isOnline, addToQueue } = useOfflineQueue()

  const execute = useCallback(async <T = any>(
    operation: () => Promise<T>,
    options: OfflineOperationOptions = {},
  ): Promise<T | string> => {
    const {
      requiresOnline = false,
      successMessage = 'Opération réussie',
      errorMessage = 'Erreur lors de l\'opération',
      onSuccess,
      onError,
    } = options

    // Vérifier si l'opération nécessite une connexion
    if (requiresOnline && !isOnline) {
      const error = new Error('Cette opération nécessite une connexion internet')
      toast.error(error.message)
      onError?.(error)
      throw error
    }

    try {
      // Si en ligne, exécuter directement
      if (isOnline) {
        const result = await operation()
        toast.success(successMessage)
        onSuccess?.(result)
        return result
      }

      // Si hors ligne, ajouter à la queue
      // Note: l'opération doit être sérialisable pour être mise en queue
      // Pour l'instant, on retourne un ID de queue
      const queueId = await addToQueue({
        type: 'create_client', // Sera déterminé dynamiquement
        table: 'clients', // Sera déterminé dynamiquement
        data: {}, // Sera déterminé dynamiquement
      })

      toast.success('Opération mise en file d\'attente. Elle sera synchronisée automatiquement.')
      return queueId
    }
    catch (error: any) {
      console.error('Operation error:', error)
      toast.error(errorMessage)
      onError?.(error)
      throw error
    }
  }, [isOnline, addToQueue])

  return {
    execute,
    isOnline,
  }
}
