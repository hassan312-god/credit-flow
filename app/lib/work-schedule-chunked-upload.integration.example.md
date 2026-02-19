# Intégration envoi chunked work_schedule

## Côté frontend (exemple dans la page horaires)

```ts
// Dans app/pages/horaires/index.vue ou un composable dédié

const { upload } = useWorkScheduleChunkedUpload()

async function saveAllWithChunkedUpload() {
  const payload = allSchedules.value
  const scheduleId = 'work_schedule' // ou un id métier si vous en avez un
  const result = await upload(payload, {
    scheduleId,
    baseUrl: 'https://votre-api.com', // ou laisser runtimeConfig.public.apiUrl
    conflictStrategy: 'merge',
  })

  // Ne pas naviguer avant confirmation finale
  if (result.status === 'failed') {
    error.value = result.message
    console.error('Chunked upload failed', result.attempts_log, result.metrics)
    return
  }
  if (result.status === 'partial') {
    error.value = result.message
    if (result.server_snapshot)
      allSchedules.value = normalizeServerSnapshot(result.server_snapshot)
    return
  }
  if (result.server_snapshot)
    allSchedules.value = normalizeServerSnapshot(result.server_snapshot)
  await fetchSchedules()
}
```

## Instrumentation (logger + métriques)

```ts
function logUploadResult(result: UploadResult) {
  console.log('[work_schedule] status=', result.status, 'message=', result.message)
  console.log('[work_schedule] metrics', result.metrics)
  result.attempts_log.forEach((entry, i) => {
    console.log(`[work_schedule] attempt ${i + 1}`, entry)
  })
  // Envoyer métriques (ex. analytics, Sentry)
  // trackMetric('work_schedule_upload_latency_ms', result.metrics.total_latency_ms)
  // trackMetric('work_schedule_upload_retries', result.metrics.retry_count)
  // trackMetric('work_schedule_chunk_failed_count', result.metrics.chunk_failed_count)
}
```

## Contrat API attendu côté serveur

- **POST /work_schedule/chunk**  
  Body: `{ schedule_id, user_id, chunk_index, total_chunks, chunk_checksum, timestamp, payload }`  
  Réponse: `200` ou `{ ok: true }` ; optionnellement `{ chunk_checksum }` pour vérification.

- **POST /work_schedule/complete**  
  Body: `{ schedule_id, user_id, chunk_checksums[], total_chunks }`  
  Réponse: `200` après réassemblage réussi.

- **GET /work_schedule?schedule_id=...&user_id=...**  
  Réponse: JSON du schedule complet (après complete).

- **PATCH /work_schedule/upsert** (optionnel)  
  Headers: `Prefer: return=representation`  
  Body: tableau ou objet du schedule à écrire.  
  Réponse: `200` + body = représentation mise à jour.

Toutes les requêtes doivent pouvoir être faites avec `Cache-Control: no-store` (le client l’envoie).
