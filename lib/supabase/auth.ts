'use client'

import { createClient } from './client'
import type { AuthError } from '@supabase/supabase-js'

/**
 * Client-side authentication helpers
 */

export interface SignUpCredentials {
  email: string
  password: string
  options?: {
    data?: {
      full_name?: string
    }
  }
}

export interface SignInCredentials {
  email: string
  password: string
}

/**
 * Sign up with email and password
 */
export async function signUp(credentials: SignUpCredentials) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: credentials.options,
  })
  return { data, error }
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: SignInCredentials) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })
  return { data, error }
}

/**
 * Sign in with OAuth provider (Google, etc.)
 * @param provider - OAuth provider ('google')
 * @param redirectTo - URL to redirect to after successful auth
 * @param emailHint - Optional email hint to pre-select Google account (Fix #6)
 */
export async function signInWithOAuth(provider: 'google', redirectTo?: string, emailHint?: string) {
  const supabase = createClient()
  
  // Get the app subdomain URL for redirect
  // In development: app.localhost:3000
  // In production: app.ottie.com (or whatever NEXT_PUBLIC_ROOT_DOMAIN is set to)
  const getAppOrigin = () => {
    if (typeof window === 'undefined') return ''
    
    const hostname = window.location.hostname
    const port = window.location.port
    const protocol = window.location.protocol
    
    // Check if we're on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
      return `${protocol}//app.localhost${port ? `:${port}` : ''}`
    }
    
    // Production: use app subdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    return `${protocol}//app.${rootDomain}`
  }
  
  const appOrigin = getAppOrigin()
  const nextPath = redirectTo || '/overview'
  const callbackUrl = `${appOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`

  // Build query params for OAuth
  // Fix #6: Add email hint to pre-select correct Google account
  const queryParams: Record<string, string> = {}
  if (emailHint) {
    queryParams.login_hint = emailHint // Pre-select Google account
    queryParams.prompt = 'select_account' // But still allow switching
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    },
  })

  return { data, error }
}

/**
 * Normalize authentication errors to prevent email enumeration
 * Returns a generic error message for login failures
 */
export function normalizeAuthError(error: AuthError | null): string | null {
  if (!error) return null
  
  // List of error messages that indicate authentication failure
  // These should all return the same generic message
  const authFailureMessages = [
    'invalid login credentials',
    'invalid credentials',
    'email not confirmed',
    'user not found',
    'wrong password',
    'incorrect password',
    'invalid password',
    'invalid email or password',
    'user already registered',
    'email already registered',
    'email already exists',
  ]
  
  const errorMessage = error.message.toLowerCase()
  
  // Check if this is an authentication failure
  if (authFailureMessages.some(msg => errorMessage.includes(msg))) {
    return 'Invalid email or password'
  }
  
  // For other errors (like network errors, rate limiting, etc.), return the original message
  return error.message
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Reset password for email
 * Returns error if user doesn't exist or uses OAuth provider
 */
export async function resetPassword(email: string) {
  const supabase = createClient()
  
  // First, try to get user info to check provider
  // Note: We can't directly query auth.users from client, but we can try reset
  // and handle the error, or use a server action to check provider first
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
  })
  
  return { data, error }
}

