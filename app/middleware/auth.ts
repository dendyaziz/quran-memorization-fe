export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server) return

  const authStore = useAuthStore()

  // Wait for auth to be initialized
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (!authStore.isAuthenticated) {
    // Store the intended destination in sessionStorage for post-login redirect
    try {
      localStorage.set('redirectAfterLogin', to.fullPath)
    } catch (error) {
      console.warn('Failed to save redirect path to SessionStorage:', error)
    }
    console.log('isAuthenticated', authStore.isAuthenticated)

    // Redirect to login
    return navigateTo('/login')
  }
})
