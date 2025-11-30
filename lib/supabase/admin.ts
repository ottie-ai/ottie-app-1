import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role key
 * This bypasses RLS and should only be used for specific admin operations
 * 
 * WARNING: Only use this for operations that:
 * 1. Need to bypass RLS (e.g., reading invitations by token for non-authenticated users)
 * 2. Are properly validated in the server action code
 * 3. Return only the necessary data (don't expose sensitive info)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please add it to your .env.local file.')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

