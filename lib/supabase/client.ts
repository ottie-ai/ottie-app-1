import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in Client Components
 * Uses cookies for session storage (shared with server-side)
 * 
 * IMPORTANT: This uses @supabase/ssr package which stores session in cookies,
 * making it accessible to both client and server components.
 * This is the correct way to do SSR auth with Supabase in Next.js App Router.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
