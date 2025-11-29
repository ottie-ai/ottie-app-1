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
 */
export async function signInWithOAuth(provider: 'google', redirectTo?: string) {
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  })

  return { data, error }
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

