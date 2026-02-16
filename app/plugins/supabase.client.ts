import { createSupabaseClient } from '~/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  // Nuxt met les clés en camelCase (supabaseUrl, supabaseAnonKey)
  const url = ((config.supabaseUrl as string) || (config as any).supabase_url || '').trim()
  const key = ((config.supabaseAnonKey as string) || (config as any).supabase_anon_key || '').trim()
  const clientRef = ref<SupabaseClient | null>(null)

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
    // Fallback Tauri / build statique : charger depuis public/supabase-config.json
    fetch('/supabase-config.json')
      .then(r => r.ok ? r.json() : null)
      .then((c: { url?: string, anonKey?: string } | null) => {
        if (c?.url && c?.anonKey) {
          setClient(c.url.trim(), c.anonKey.trim())
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
