'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Site } from '@/types/database'

/**
 * Shared hook for fetching current site data
 * 
 * Usage:
 * const { site, loading, error, refresh } = useCurrentSite(siteId)
 * 
 * Benefits:
 * - Consistent data fetching logic across builder and backend views
 * - Real-time updates via Supabase subscriptions
 * - Error handling
 */
export function useCurrentSite(siteId: string) {
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSite = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .is('deleted_at', null)
        .single()

      if (fetchError) {
        console.error('[useCurrentSite] Error fetching site:', fetchError)
        setError(fetchError.message)
        setSite(null)
      } else {
        setSite(data)
      }
    } catch (err) {
      console.error('[useCurrentSite] Unexpected error:', err)
      setError('Failed to fetch site')
      setSite(null)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchSite()
  }, [siteId])

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel(`site-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
          filter: `id=eq.${siteId}`,
        },
        (payload) => {
          console.log('[useCurrentSite] Real-time update:', payload)
          if (payload.eventType === 'DELETE') {
            setSite(null)
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSite(payload.new as Site)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siteId])

  return {
    site,
    loading,
    error,
    refresh: fetchSite,
  }
}








