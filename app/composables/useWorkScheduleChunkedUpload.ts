/**
 * Composable pour l'envoi fiable de work_schedule par chunks.
 * Utilise work-schedule-chunked-upload.ts ; à brancher quand l'API chunk/complete est disponible.
 */

import type { ConflictStrategy } from '~/lib/work-schedule-chunked-upload'
import {
  sendWorkScheduleChunked,
  type UploadResult,
  type WorkScheduleChunkedUploadConfig,
} from '~/lib/work-schedule-chunked-upload'

export function useWorkScheduleChunkedUpload() {
  const runtimeConfig = useRuntimeConfig()
  const { user } = useAuthRole()

  /**
   * Envoie le payload work_schedule de façon fiable (chunks si > 32 KB).
   * Ne pas naviguer côté client avant d'avoir reçu le résultat (status success/partial/failed).
   */
  async function upload(
    payload: unknown,
    options: {
      scheduleId: string
      baseUrl?: string
      conflictStrategy?: ConflictStrategy
      logger?: (message: string, data?: Record<string, unknown>) => void
    },
  ): Promise<UploadResult> {
    const baseUrl = options.baseUrl ?? runtimeConfig.public?.apiUrl ?? ''
    const userId = user.value?.id ?? ''
    if (!userId) {
      return {
        status: 'failed',
        message: 'Utilisateur non connecté.',
        server_snapshot: null,
        attempts_log: [],
        metrics: {
          total_chunks: 0,
          chunk_failed_count: 0,
          retry_count: 0,
          total_latency_ms: 0,
        },
      }
    }
    const getAuthHeaders = async (): Promise<HeadersInit> => {
      const supabase = useSupabase().value
      if (!supabase) return {}
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return {}
      return { Authorization: `Bearer ${token}` }
    }
    const config: WorkScheduleChunkedUploadConfig = {
      baseUrl,
      getAuthHeaders,
      endpoints: {
        chunk: '/work_schedule/chunk',
        complete: '/work_schedule/complete',
        get: '/work_schedule',
        upsert: '/work_schedule/upsert',
      },
      conflictStrategy: options.conflictStrategy ?? 'merge',
      scheduleId: options.scheduleId,
      userId,
      logger: options.logger ?? ((msg, data) => { if (import.meta.dev) console.log(`[work_schedule] ${msg}`, data ?? '') }),
    }
    return sendWorkScheduleChunked(config, payload)
  }

  return { upload }
}
