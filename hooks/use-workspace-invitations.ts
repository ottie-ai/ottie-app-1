'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invitation } from '@/types/database'

/**
 * Hook to fetch pending invitations for a workspace
 * Accepts initial data to avoid duplicate fetches when data is already available
 */
export function useWorkspaceInvitations(
  workspaceId: string | null,
  initialInvitations?: Invitation[]
) {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations || [])
  const [loading, setLoading] = useState(!initialInvitations)

  const loadInvitations = useCallback(async () => {
    if (!workspaceId) {
      setInvitations([])
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Get pending invitations
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        setInvitations([])
      } else {
        setInvitations(data as Invitation[] || [])
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    // If initial data was provided, skip fetch
    if (initialInvitations !== undefined) {
      return
    }
    loadInvitations()
  }, [loadInvitations, initialInvitations])

  // Function to refresh invitations
  const refresh = useCallback(() => {
    setLoading(true)
    loadInvitations()
  }, [loadInvitations])

  return {
    invitations,
    loading,
    refresh,
  }
}

