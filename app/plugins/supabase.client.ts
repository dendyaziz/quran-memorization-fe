import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  return {
    provide: {
      supabase: createClient(supabaseUrl, supabaseAnonKey),
    },
  }
})
