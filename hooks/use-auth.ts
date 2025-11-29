'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook for managing authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    const initSession = async () => {
      console.log('[useAuth] Getting initial session...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[useAuth] getSession result:', { session: session?.user?.email, error })
        
        if (error) {
          console.error('[useAuth] Error getting session:', error)
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('[useAuth] Error in initSession:', error)
        setUser(null)
        setLoading(false)
      }
    }

    initSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  return { user, loading }
}

