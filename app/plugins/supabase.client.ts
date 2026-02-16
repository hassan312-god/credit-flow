import { createSupabaseClient } from '~/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type FetchFn = typeof globalThis.fetch

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  // Nuxt met les clés en camelCase (supabaseUrl, supabaseAnonKey)
  const url = ((config.supabaseUrl as string) || (config as any).supabase_url || '').trim()
  const key = ((config.supabaseAnonKey as string) || (config as any).supabase_anon_key || '').trim()
  const clientRef = ref<SupabaseClient | null>(null)

  function setClient(supabaseUrl: string, supabaseAnonKey: string, customFetch?: FetchFn) {
    try {
      clientRef.value = createSupabaseClient(supabaseUrl, supabaseAnonKey, customFetch)
    }
    catch {
      clientRef.value = null
    }
  }

  if (url && key) {
    // En Tauri, utiliser le fetch du plugin HTTP pour éviter CORS (origine tauri://localhost)
    if (import.meta.client && (window as any).__TAURI__) {
      import('@tauri-apps/plugin-http').then((m) => {
        setClient(url, key, m.fetch as FetchFn)
        nextTick(() => { try { useAuthRole().refresh() } catch { /* app pas encore prêt */ } })
      }).catch(() => setClient(url, key))
    }
    else {
      setClient(url, key)
    }
  }
  else if (import.meta.client) {
    // Fallback Tauri / build statique : charger depuis public/supabase-config.json
    fetch('/supabase-config.json')
      .then(r => r.ok ? r.json() : null)
      .then((c: { url?: string, anonKey?: string } | null) => {
        if (!c?.url || !c?.anonKey) return
        const u = c.url.trim()
        const k = c.anonKey.trim()
        if ((window as any).__TAURI__) {
          import('@tauri-apps/plugin-http').then((m) => {
            setClient(u, k, m.fetch as FetchFn)
            nextTick(() => { try { useAuthRole().refresh() } catch { /* app pas encore prêt */ } })
          }).catch(() => setClient(u, k))
        }
        else {
          setClient(u, k)
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
