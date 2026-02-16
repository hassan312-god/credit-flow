import type { Database } from '~/types/database'
import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(url: string, anonKey: string) {
  if (!url || !anonKey) {
    throw new Error('Missing Supabase URL or Anon Key. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
