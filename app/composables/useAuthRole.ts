import type { User } from '@supabase/supabase-js'
import type { AppRole } from '~/types/database'
import { canAccessPath as checkPathAccess } from '~/constants/menuAccess'

export function useAuthRole() {
  const state = useState<{ user: User | null, role: AppRole | null, profile: { full_name: string, email: string, avatar_url?: string | null } | null, loading: boolean }>('auth-role-state', () => ({
    user: null,
    role: null,
    profile: null,
    loading: true,
  }))

  const supabaseRef = useSupabase()

  async function refresh() {
    state.value.loading = true
    const supabase = supabaseRef?.value ?? null
    if (!supabase) {
      state.value.loading = false
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        state.value.user = null
        state.value.role = null
        state.value.profile = null
      }
      else {
        state.value.user = user
        const [profileRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        ])
        const fromDb = profileRes.data as { full_name?: string, email?: string, avatar_url?: string | null } | null
        const fallbackName = user.user_metadata?.full_name as string | undefined
        const fallbackEmail = user.email ?? ''
        if (fromDb) {
          state.value.profile = {
            full_name: (fromDb.full_name?.trim() || fallbackName?.trim() || fallbackEmail) ?? '',
            email: fromDb.email ?? fallbackEmail,
            avatar_url: fromDb.avatar_url ?? null,
          }
        }
        else {
          state.value.profile = {
            full_name: fallbackName?.trim() || fallbackEmail || 'Utilisateur',
            email: fallbackEmail,
            avatar_url: null,
          }
        }
        state.value.role = roleRes.data?.role as AppRole ?? null
      }
    }
    catch (e) {
      console.error('useAuthRole refresh', e)
    }
    state.value.loading = false
  }

  async function signOut() {
    try {
      const supabase = supabaseRef?.value ?? null
      if (supabase) {
        // scope: 'local' évite un 403 possible sur /auth/v1/logout (Supabase) tout en déconnectant l'app
        await supabase.auth.signOut({ scope: 'local' })
      }
    }
    catch (_e) {
      // Même en cas d'erreur (ex. 403), on nettoie l'état local
    }
    state.value.user = null
    state.value.role = null
    state.value.profile = null
  }

  function canAccessPath(path: string): boolean {
    return checkPathAccess(path, state.value.role)
  }

  return {
    user: computed(() => state.value?.user ?? null),
    role: computed(() => state.value?.role ?? null),
    profile: computed(() => state.value?.profile ?? null),
    loading: computed(() => state.value?.loading ?? true),
    isAuthenticated: computed(() => !!state.value?.user),
    refresh,
    signOut,
    canAccessPath,
  }
}
