import { createClient } from './server'

/**
 * Server-side authentication helpers
 * Use these in Server Components and Server Actions
 */

/**
 * Get current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Get current session (server-side)
 */
export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Require authentication - throws error if not authenticated
 * Use in Server Actions that require auth
 */
export async function requireAuth() {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return user
}

