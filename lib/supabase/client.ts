import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Creates a Supabase client for use in Client Components
 * Uses localStorage for session storage
 * Singleton pattern to ensure consistent session across the app
 */
export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )

  return supabaseInstance
}

