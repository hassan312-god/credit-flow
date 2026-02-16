const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth']

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return
  const path = to.path
  if (publicPaths.some(p => path === p || path.startsWith(`${p}/`)))
    return

  const { isAuthenticated, loading, role, canAccessPath } = useAuthRole()
  if (loading.value)
    return

  if (!isAuthenticated.value)
    return navigateTo('/auth/login', { replace: true })
  // Ne jamais rediriger vers / quand on est déjà sur / (évite la boucle infinie)
  if (path === '/')
    return
  if (!role.value)
    return navigateTo('/', { replace: true })
  if (!canAccessPath(path))
    return navigateTo('/', { replace: true })
})
