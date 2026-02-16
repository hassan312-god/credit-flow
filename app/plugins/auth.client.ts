import type { AppRole } from '~/types/database'
import type { User } from '@supabase/supabase-js'

export interface AuthRoleState {
  user: User | null
  role: AppRole | null
  profile: { full_name: string; email: string; avatar_url?: string | null } | null
  loading: boolean
}

export default defineNuxtPlugin(() => {
  const state = useState<AuthRoleState>('auth-role-state', () => ({
    user: null,
    role: null,
    profile: null,
    loading: true,
  }))

  const { $supabase: supabase } = useNuxtApp()

  async function fetchUserData(userId: string) {
    if (!supabase) return
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, avatar_url').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ])
      const authUser = state.value.user
      const fromDb = profileRes.data as { full_name?: string; email?: string; avatar_url?: string | null } | null
      const fallbackName = authUser?.user_metadata?.full_name as string | undefined
      const fallbackEmail = authUser?.email ?? ''
      if (fromDb) {
        state.value.profile = {
          full_name: (fromDb.full_name?.trim() || fallbackName?.trim() || fallbackEmail) ?? '',
          email: fromDb.email ?? fallbackEmail,
          avatar_url: fromDb.avatar_url ?? null,
        }
      }
      else if (authUser) {
        state.value.profile = {
          full_name: fallbackName?.trim() || fallbackEmail || 'Utilisateur',
          email: fallbackEmail,
          avatar_url: null,
        }
      }
      if (roleRes.data?.role) state.value.role = roleRes.data.role as AppRole
    }
    catch (e) {
      console.error('auth.client fetchUserData', e)
    }
  }

  function setUser(user: User | null) {
    state.value.user = user
    if (!user) {
      state.value.role = null
      state.value.profile = null
    }
  }

  if (!supabase) {
    state.value.loading = false
  }
  else {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserData(session.user.id).finally(() => { state.value.loading = false })
      }
      else {
        state.value.loading = false
      }
    })
  }

  if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserData(session.user.id)
      }
      else {
        setUser(null)
      }
    })
  }
})
