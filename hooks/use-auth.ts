'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook for managing authentication state
 * 
 * OPTIMIZATION: Uses session.user from cookies (no network request)
 * - getSession() reads from cookies, no network call needed
 * - User validation is handled by middleware (server-side)
 * - This eliminates duplicate getUser() network requests on every navigation
 * - onAuthStateChange handles auth events (sign in, sign out, token refresh)
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // OPTIMIZATION: Use getSession() which reads from cookies (no network request)
    // Session already contains user object, no need for getUser() call
    // User validation is handled server-side by middleware
    const initAuth = async () => {
      try {
        // getSession() reads from cookies - no network request
        const { data: { session } } = await supabase.auth.getSession()
        
          if (isMounted) {
          // Use session.user directly (already validated server-side)
          setUser(session?.user ?? null)
          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        console.error('[useAuth] Init error:', error)
        if (isMounted) {
        setUser(null)
        setLoading(false)
          setInitialized(true)
      }
    }
    }

    initAuth()

    // Listen for auth changes (sign in, sign out, token refresh)
    // This handles real-time auth state updates without polling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      console.log('[useAuth] Auth state change:', event)
      
      // Update user state based on session
      // session.user is already available, no getUser() call needed
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return { user, loading, initialized }
}

