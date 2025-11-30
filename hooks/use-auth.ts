'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook for managing authentication state
 * Uses getUser() to validate with Supabase server (not just local token)
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Validate user with Supabase server (not just local token)
    // This ensures deleted users are detected
    const validateUser = async () => {
      try {
        // First check if there's a session at all
        const { data: { session } } = await supabase.auth.getSession()
        
        // No session means not logged in - this is fine, no need to validate
        if (!session) {
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        // getUser() validates with Supabase server, unlike getSession() which only checks local token
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          console.error('[useAuth] Error validating user:', error?.message || 'No user found')
          // Session exists but user validation failed - sign out silently
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            // Ignore sign out errors - session might already be invalid
            console.warn('[useAuth] Sign out failed:', signOutError)
          }
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
        console.error('[useAuth] Error in validateUser:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    validateUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setLoading(false)
        return
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Re-validate with server to ensure user exists
        try {
          const { data: { user }, error } = await supabase.auth.getUser()
          if (isMounted) {
            if (error || !user) {
              await supabase.auth.signOut()
              setUser(null)
            } else {
              setUser(user)
            }
          }
        } catch {
          if (isMounted) setUser(null)
        }
      } else if (session?.user) {
        setUser(session.user)
      }
      
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  return { user, loading }
}

