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

    // Validate user with Supabase server (not just local token)
    // This ensures deleted users are detected
    const validateUser = async () => {
      try {
        // getUser() validates with Supabase server, unlike getSession() which only checks local token
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('[useAuth] Error validating user:', error)
          // If user validation fails (e.g., user deleted), sign out and clear session
          if (error.message?.includes('User not found') || error.status === 401 || error.status === 403) {
            await supabase.auth.signOut()
          }
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('[useAuth] Error in validateUser:', error)
        setUser(null)
        setLoading(false)
      }
    }

    validateUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // For sign in/sign up events, validate the user
      if (event === 'SIGNED_IN' && session?.user) {
        // Re-validate with server to ensure user exists
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          await supabase.auth.signOut()
          setUser(null)
        } else {
          setUser(user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  return { user, loading }
}

