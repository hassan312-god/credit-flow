/**
 * Au démarrage client, on rafraîchit l'état auth une fois.
 * Ainsi loading passe à false et le middleware/layout peut rediriger vers /auth/login si non connecté.
 */
export default defineNuxtPlugin(() => {
  useAuthRole().refresh()
})
