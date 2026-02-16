const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth']

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return
  const path = to.path
  if (publicPaths.some(p => path === p || path.startsWith(`${p}/`)))
    return

  const { isAuthenticated, loading, role, canAccessPath } = useAuthRole()
  // Première connexion / non connecté : afficher directement la page login (pas de flash du dashboard)
  if (path === '/' && (loading.value || !isAuthenticated.value))
    return navigateTo('/auth/login', { replace: true })
  if (loading.value)
    return
  if (!isAuthenticated.value)
    return navigateTo('/auth/login', { replace: true })
  if (path === '/')
    return
  if (!role.value)
    return navigateTo('/', { replace: true })
  if (!canAccessPath(path))
    return navigateTo('/', { replace: true })
})
