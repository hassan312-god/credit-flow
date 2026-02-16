import { createSupabaseClient } from '~/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_STATE_KEY = 'supabase-client'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const url = (config.supabaseUrl as string) || ''
  const key = (config.supabaseAnonKey as string) || ''
  const clientRef = useState<SupabaseClient | null>(SUPABASE_STATE_KEY, () => null)

  function setClient(supabaseUrl: string, supabaseAnonKey: string) {
    try {
      clientRef.value = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    }
    catch {
      clientRef.value = null
    }
  }

  if (url && key) {
    setClient(url, key)
  }
  else if (import.meta.client) {
    // Fallback pour Tauri / build statique : charger la config depuis un JSON (ex. copié dans les resources Tauri)
    fetch('/supabase-config.json')
      .then(r => r.ok ? r.json() : null)
      .then((c: { url?: string, anonKey?: string } | null) => {
        if (c?.url && c?.anonKey) {
          setClient(c.url, c.anonKey)
          nextTick(() => { try { useAuthRole().refresh() } catch { /* app pas encore prêt */ } })
        }
      })
      .catch(() => {})
  }

  return {
    provide: {
      supabase: clientRef,
    },
  }
})
