import type { Session } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed(() => session.value?.user ?? null)
  const initialized = ref(false)
  const { $supabase } = useNuxtApp()

  // Computed property to check if user is authenticated
  const isAuthenticated = computed(() => !!user.value)

  // Initialize auth state
  const initialize = async () => {
    if (initialized.value)
      return

    // Get the current session
    const { data } = await $supabase.auth.getSession()
    session.value = data.session

    // Listen for auth changes
    $supabase.auth.onAuthStateChange((_, newSession) => {
      session.value = newSession

      // Handle redirect after login
      if (newSession && window.location.pathname === '/login') {
        handlePostLoginRedirect()
      }
    })

    initialized.value = true
  }

  // Handle redirect after login
  const handlePostLoginRedirect = () => {
    const redirectTo = localStorage.getItem('redirectAfterLogin')
    if (redirectTo) {
      localStorage.remove('redirectAfterLogin')
      return redirectTo
    }
    return '/'
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    const { data, error } = await $supabase.auth.signUp({
      email,
      password,
    })

    if (error)
      throw error
    return data
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { data, error } = await $supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error)
      throw error
    return data
  }

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    const { data, error } = await $supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error)
      throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await $supabase.auth.signOut()
    if (error)
      throw error

    navigateTo('/login')
  }

  // Reset password
  const resetPassword = async (email: string) => {
    const { data, error } = await $supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error)
      throw error
    return data
  }

  return {
    session,
    user,
    isAuthenticated,
    initialized,
    initialize,
    handlePostLoginRedirect,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  }
})
