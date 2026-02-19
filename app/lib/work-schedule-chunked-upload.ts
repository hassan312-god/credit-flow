/**
 * Envoi fiable de work_schedule par chunks (payload > 32 KB).
 * Chunking, ack avec vérification checksum, retry backoff exponentiel, complete, reload, vérification et stratégie de conflit.
 */

export const CHUNK_MAX_BYTES = 32 * 1024 // 32 KB
export const MAX_CHUNK_ATTEMPTS = 5
export const BACKOFF_BASE_MS = 200

export type ConflictStrategy = 'keep_server' | 'keep_local' | 'merge'

export interface ChunkPayload {
  schedule_id: string
  user_id: string
  chunk_index: number
  total_chunks: number
  chunk_checksum: string
  timestamp: string
  payload: string
}

export interface ChunkAckResponse {
  ok?: boolean
  chunk_checksum?: string
  [key: string]: unknown
}

export interface CompletePayload {
  schedule_id: string
  user_id: string
  chunk_checksums: string[]
  total_chunks: number
}

export interface UploadResult {
  status: 'success' | 'partial' | 'failed'
  message: string
  server_snapshot: unknown
  attempts_log: AttemptLogEntry[]
  metrics: UploadMetrics
}

export interface AttemptLogEntry {
  phase: 'chunk' | 'complete' | 'get' | 'upsert'
  chunk_index?: number
  attempt: number
  success: boolean
  latency_ms?: number
  request?: string
  response?: string
  error?: string
}

export interface UploadMetrics {
  total_chunks: number
  chunk_failed_count: number
  retry_count: number
  total_latency_ms: number
}

export interface WorkScheduleChunkedUploadConfig {
  baseUrl: string
  getAuthHeaders: () => Promise<HeadersInit>
  endpoints: {
    chunk: string
    complete: string
    get: string
    upsert?: string
  }
  conflictStrategy?: ConflictStrategy
  scheduleId: string
  userId: string
  /** Logger optionnel : chaque étape est loguée (latence, retries, chunk_failed_count). */
  logger?: (message: string, data?: Record<string, unknown>) => void
}

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Calcule le SHA-256 hex du texte (Web Crypto API). */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(hash)
}

/** Découpe une chaîne JSON en chunks de taille max (en octets UTF-8). */
export function chunkJson(jsonString: string, maxBytes: number = CHUNK_MAX_BYTES): string[] {
  const chunks: string[] = []
  const encoder = new TextEncoder()
  let start = 0
  while (start < jsonString.length) {
    let end = Math.min(start + maxBytes, jsonString.length)
    if (end < jsonString.length) {
      while (end > start) {
        const slice = jsonString.slice(start, end)
        if (encoder.encode(slice).length <= maxBytes)
          break
        end--
      }
    }
    chunks.push(jsonString.slice(start, end))
    start = end
  }
  return chunks
}

/** Délai pour backoff exponentiel (ms). */
export function backoffMs(attempt: number, baseMs: number = BACKOFF_BASE_MS): number {
  return baseMs * 2 ** attempt
}

/** Envoie un chunk avec retries et vérification du checksum dans la réponse. */
async function sendChunkWithRetry(
  config: WorkScheduleChunkedUploadConfig,
  chunk: ChunkPayload,
  attemptsLog: AttemptLogEntry[],
  metrics: UploadMetrics,
): Promise<boolean> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/${config.endpoints.chunk.replace(/^\//, '')}`
  const body = JSON.stringify(chunk)
  let lastError: string | undefined
  for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS; attempt++) {
    const t0 = performance.now()
    try {
      const headers: HeadersInit = {
        ...DEFAULT_HEADERS,
        ...(await config.getAuthHeaders()),
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        cache: 'no-store',
      })
      const latency_ms = Math.round(performance.now() - t0)
      const responseText = await res.text()
      let parsed: ChunkAckResponse | null = null
      try {
        parsed = JSON.parse(responseText) as ChunkAckResponse
      } catch {
        /* pas du JSON */
      }
      const ok = res.ok && (parsed?.ok === true || res.status === 200)
      const serverChecksum = parsed?.chunk_checksum
      const checksumOk = serverChecksum == null || serverChecksum === chunk.chunk_checksum
      if (ok && checksumOk) {
        attemptsLog.push({
          phase: 'chunk',
          chunk_index: chunk.chunk_index,
          attempt: attempt + 1,
          success: true,
          latency_ms,
        })
        return true
      }
      if (!ok)
        lastError = `HTTP ${res.status} ${responseText.slice(0, 200)}`
      else if (!checksumOk)
        lastError = `checksum mismatch local=${chunk.chunk_checksum} server=${serverChecksum}`
      metrics.retry_count++
      attemptsLog.push({
        phase: 'chunk',
        chunk_index: chunk.chunk_index,
        attempt: attempt + 1,
        success: false,
        latency_ms,
        response: responseText.slice(0, 500),
        error: lastError,
      })
    }
    catch (e: any) {
      const latency_ms = Math.round(performance.now() - t0)
      lastError = e?.message ?? String(e)
      metrics.retry_count++
      attemptsLog.push({
        phase: 'chunk',
        chunk_index: chunk.chunk_index,
        attempt: attempt + 1,
        success: false,
        latency_ms,
        error: lastError,
      })
    }
    if (attempt < MAX_CHUNK_ATTEMPTS - 1)
      await new Promise(r => setTimeout(r, backoffMs(attempt)))
  }
  metrics.chunk_failed_count++
  attemptsLog.push({
    phase: 'chunk',
    chunk_index: chunk.chunk_index,
    attempt: MAX_CHUNK_ATTEMPTS,
    success: false,
    error: `Failed after ${MAX_CHUNK_ATTEMPTS} attempts. Last: ${lastError}`,
    request: body.slice(0, 500),
  })
  return false
}

/** Normalise un objet schedule pour comparaison (dates en ISO, champs triés). */
export function normalizeForCompare(obj: unknown): unknown {
  if (obj === null || obj === undefined)
    return obj
  if (Array.isArray(obj))
    return obj.map(normalizeForCompare)
  if (typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    if (o.created_at != null && typeof o.created_at === 'string')
      o = { ...o, created_at: new Date(o.created_at).toISOString() }
    if (o.updated_at != null && typeof o.updated_at === 'string')
      o = { ...o, updated_at: new Date(o.updated_at).toISOString() }
    const keys = Object.keys(o).sort()
    return keys.reduce((acc, k) => ({ ...acc, [k]: normalizeForCompare(o[k]) }), {} as Record<string, unknown>)
  }
  return obj
}

export function jsonEquivalent(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b))
}

/** Merge strategy: garder heures non vides et les plus récentes (updated_at). */
export function mergeSchedules(local: unknown, server: unknown): unknown {
  if (!Array.isArray(local) || !Array.isArray(server))
    return server
  const serverByDay = new Map((server as Array<Record<string, unknown>>).map(s => [s.day_of_week, s]))
  const merged = (local as Array<Record<string, unknown>>).map((loc) => {
    const srv = serverByDay.get(loc.day_of_week)
    if (!srv)
      return loc
    const locUpdated = loc.updated_at ? new Date(String(loc.updated_at)).getTime() : 0
    const srvUpdated = srv.updated_at ? new Date(String(srv.updated_at)).getTime() : 0
    const takeLocal = locUpdated >= srvUpdated
    return {
      ...srv,
      start_time: takeLocal && loc.start_time ? loc.start_time : (srv.start_time ?? loc.start_time),
      end_time: takeLocal && loc.end_time ? loc.end_time : (srv.end_time ?? loc.end_time),
      is_active: takeLocal && loc.is_active !== undefined ? loc.is_active : (srv.is_active ?? loc.is_active),
      updated_at: takeLocal ? loc.updated_at : srv.updated_at,
    }
  })
  return merged
}

/**
 * Envoi fiable complet : chunk → complete → GET → comparaison → résolution conflit si besoin.
 */
export async function sendWorkScheduleChunked(
  config: WorkScheduleChunkedUploadConfig,
  payload: unknown,
): Promise<UploadResult> {
  const log = config.logger ?? (() => {})
  const t0 = performance.now()
  const attemptsLog: AttemptLogEntry[] = []
  const metrics: UploadMetrics = {
    total_chunks: 0,
    chunk_failed_count: 0,
    retry_count: 0,
    total_latency_ms: 0,
  }
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const strategy = config.conflictStrategy ?? 'merge'
  const chunks = jsonString.length > CHUNK_MAX_BYTES
    ? chunkJson(jsonString)
    : [jsonString]
  metrics.total_chunks = chunks.length
  log('work_schedule_chunked_start', { total_chunks: chunks.length, payload_bytes: jsonString.length })
  const scheduleId = config.scheduleId
  const userId = config.userId
  const timestamp = new Date().toISOString()

  for (let i = 0; i < chunks.length; i++) {
    const chunkPayload = chunks[i]
    const chunk_checksum = await sha256Hex(chunkPayload)
    const chunkData: ChunkPayload = {
      schedule_id: scheduleId,
      user_id: userId,
      chunk_index: i,
      total_chunks: chunks.length,
      chunk_checksum,
      timestamp,
      payload: chunkPayload,
    }
    const ok = await sendChunkWithRetry(config, chunkData, attemptsLog, metrics)
    if (!ok) {
      metrics.total_latency_ms = Math.round(performance.now() - t0)
      log('work_schedule_chunked_failed', { chunk_index: i, attempts_log: attemptsLog, metrics })
      return {
        status: 'failed',
        message: `Chunk ${i + 1}/${chunks.length} a échoué après ${MAX_CHUNK_ATTEMPTS} tentatives.`,
        server_snapshot: null,
        attempts_log: attemptsLog,
        metrics,
      }
    }
  }
  log('work_schedule_chunks_acked', { total_chunks: chunks.length, retry_count: metrics.retry_count })

  const chunk_checksums = await Promise.all(chunks.map(c => sha256Hex(c)))
  const completePayload: CompletePayload = {
    schedule_id: scheduleId,
    user_id: userId,
    chunk_checksums,
    total_chunks: chunks.length,
  }
  const completeUrl = `${config.baseUrl.replace(/\/$/, '')}/${config.endpoints.complete.replace(/^\//, '')}`
  const tComplete = performance.now()
  try {
    const headers: HeadersInit = {
      ...DEFAULT_HEADERS,
      ...(await config.getAuthHeaders()),
    }
    const resComplete = await fetch(completeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(completePayload),
      cache: 'no-store',
    })
    const completeLatency = Math.round(performance.now() - tComplete)
    const completeText = await resComplete.text()
    if (!resComplete.ok) {
      attemptsLog.push({
        phase: 'complete',
        attempt: 1,
        success: false,
        latency_ms: completeLatency,
        response: completeText.slice(0, 500),
        error: `HTTP ${resComplete.status}`,
      })
      metrics.total_latency_ms = Math.round(performance.now() - t0)
      return {
        status: 'failed',
        message: 'Échec de l’appel complete (réassemblage).',
        server_snapshot: null,
        attempts_log: attemptsLog,
        metrics,
      }
    }
    attemptsLog.push({ phase: 'complete', attempt: 1, success: true, latency_ms: completeLatency })
    log('work_schedule_complete_ok', { latency_ms: completeLatency })
  }
  catch (e: any) {
    attemptsLog.push({
      phase: 'complete',
      attempt: 1,
      success: false,
      error: e?.message ?? String(e),
    })
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    return {
      status: 'failed',
      message: 'Erreur réseau sur complete.',
      server_snapshot: null,
      attempts_log: attemptsLog,
      metrics,
    }
  }

  const getUrl = `${config.baseUrl.replace(/\/$/, '')}/${config.endpoints.get.replace(/^\//, '')}?schedule_id=${encodeURIComponent(scheduleId)}&user_id=${encodeURIComponent(userId)}`
  const tGet = performance.now()
  let serverSnapshot: unknown = null
  try {
    const headers: HeadersInit = {
      ...DEFAULT_HEADERS,
      ...(await config.getAuthHeaders()),
    }
    const resGet = await fetch(getUrl, { headers, cache: 'no-store' })
    const getLatency = Math.round(performance.now() - tGet)
    const getText = await resGet.text()
    if (!resGet.ok) {
      attemptsLog.push({
        phase: 'get',
        attempt: 1,
        success: false,
        latency_ms: getLatency,
        response: getText.slice(0, 500),
      })
      metrics.total_latency_ms = Math.round(performance.now() - t0)
      return {
        status: 'partial',
        message: 'Upload réussi mais impossible de recharger le schedule.',
        server_snapshot: null,
        attempts_log: attemptsLog,
        metrics,
      }
    }
    serverSnapshot = JSON.parse(getText)
    attemptsLog.push({ phase: 'get', attempt: 1, success: true, latency_ms: getLatency })
  }
  catch (e: any) {
    attemptsLog.push({
      phase: 'get',
      attempt: 1,
      success: false,
      error: e?.message ?? String(e),
    })
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    return {
      status: 'partial',
      message: 'Réassemblage OK mais rechargement échoué.',
      server_snapshot: null,
      attempts_log: attemptsLog,
      metrics,
    }
  }

  const localNormalized = normalizeForCompare(payload)
  const serverNormalized = normalizeForCompare(serverSnapshot)
  if (jsonEquivalent(localNormalized, serverNormalized)) {
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    log('work_schedule_verify_ok', { total_latency_ms: metrics.total_latency_ms, metrics })
    return {
      status: 'success',
      message: 'Sauvegarde OK. Données identiques au serveur.',
      server_snapshot: serverSnapshot,
      attempts_log: attemptsLog,
      metrics,
    }
  }
  log('work_schedule_conflict', { strategy })

  if (!config.endpoints.upsert || strategy === 'keep_server') {
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    return {
      status: strategy === 'keep_server' ? 'success' : 'partial',
      message: strategy === 'keep_server'
        ? 'Conflit résolu : garde serveur.'
        : 'Conflit détecté. Pas d’upsert configuré.',
      server_snapshot: serverSnapshot,
      attempts_log: attemptsLog,
      metrics,
    }
  }

  let bodyToSend: unknown = payload
  if (strategy === 'merge')
    bodyToSend = mergeSchedules(payload, serverSnapshot)
  if (strategy === 'keep_local')
    bodyToSend = payload

  const upsertUrl = `${config.baseUrl.replace(/\/$/, '')}/${config.endpoints.upsert.replace(/^\//, '')}`
  const tUpsert = performance.now()
  try {
    const headers: HeadersInit = {
      ...DEFAULT_HEADERS,
      'Prefer': 'return=representation',
      ...(await config.getAuthHeaders()),
    }
    const resUpsert = await fetch(upsertUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(bodyToSend),
      cache: 'no-store',
    })
    const upsertLatency = Math.round(performance.now() - tUpsert)
    const upsertText = await resUpsert.text()
    if (!resUpsert.ok) {
      attemptsLog.push({
        phase: 'upsert',
        attempt: 1,
        success: false,
        latency_ms: upsertLatency,
        response: upsertText.slice(0, 500),
      })
      metrics.total_latency_ms = Math.round(performance.now() - t0)
      return {
        status: 'partial',
        message: 'Conflit corrigé par upsert mais réponse non OK.',
        server_snapshot: serverSnapshot,
        attempts_log: attemptsLog,
        metrics,
      }
    }
    let finalSnapshot: unknown = serverSnapshot
    try {
      finalSnapshot = JSON.parse(upsertText)
    } catch {
      /* garder serverSnapshot */
    }
    attemptsLog.push({ phase: 'upsert', attempt: 1, success: true, latency_ms: upsertLatency })
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    log('work_schedule_upsert_ok', { total_latency_ms: metrics.total_latency_ms, metrics })
    return {
      status: 'success',
      message: 'Conflit résolu par merge/keep_local et upsert.',
      server_snapshot: finalSnapshot,
      attempts_log: attemptsLog,
      metrics,
    }
  }
  catch (e: any) {
    attemptsLog.push({
      phase: 'upsert',
      attempt: 1,
      success: false,
      error: e?.message ?? String(e),
    })
    metrics.total_latency_ms = Math.round(performance.now() - t0)
    return {
      status: 'partial',
      message: 'Conflit détecté, upsert en erreur.',
      server_snapshot: serverSnapshot,
      attempts_log: attemptsLog,
      metrics,
    }
  }
}
