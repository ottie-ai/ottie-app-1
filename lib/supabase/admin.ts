import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with secret/service role key
 * This bypasses RLS and should only be used for specific admin operations
 * 
 * Supports both new and legacy key names:
 * - New: SUPABASE_SECRET_KEY (sb_secret_...)
 * - Legacy: SUPABASE_SERVICE_ROLE_KEY
 * 
 * WARNING: Only use this for operations that:
 * 1. Need to bypass RLS (e.g., reading invitations by token for non-authenticated users)
 * 2. Are properly validated in the server action code
 * 3. Return only the necessary data (don't expose sensitive info)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Support both new (secret) and legacy (service_role) key names
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !secretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable. Please add it to your Vercel environment variables.')
  }

  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

