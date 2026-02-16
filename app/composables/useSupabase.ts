/** Retourne le client Supabase ou null si non configuré */
export function useSupabase() {
  const { $supabase } = useNuxtApp()
  return $supabase
}
