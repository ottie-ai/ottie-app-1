'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook for managing authentication state
 * Uses getUser() on initial load to validate with Supabase server (detects deleted users)
 * Uses session from onAuthStateChange for subsequent updates (faster)
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Initial validation with Supabase server
    // This detects deleted users whose JWT token is still valid
    const initAuth = async () => {
      try {
        // First check if there's a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // No session = not logged in
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        // Validate user exists on server (catches deleted users)
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          // User doesn't exist on server - clear session
          console.warn('[useAuth] User validation failed, clearing session')
          await supabase.auth.signOut().catch(() => {})
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (isMounted) {
          setUser(user)
          setLoading(false)
        }
      } catch (error) {
        console.error('[useAuth] Init error:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      console.log('[useAuth] Auth state change:', event)
      
      // Update user state based on session
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return { user, loading }
}

