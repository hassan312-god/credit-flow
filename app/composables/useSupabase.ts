/** Retourne une ref réactive vers le client Supabase (ou null si non configuré). Utiliser .value dans le script. */
export function useSupabase() {
  const { $supabase } = useNuxtApp()
  return $supabase as Ref<import('@supabase/supabase-js').SupabaseClient | null>
}
