import { createSupabaseClient } from '~/lib/supabase'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const url = (config.supabaseUrl as string) || ''
  const key = (config.supabaseAnonKey as string) || ''
  const supabase = url && key ? createSupabaseClient(url, key) : null
  return {
    provide: {
      supabase,
    },
  }
})
