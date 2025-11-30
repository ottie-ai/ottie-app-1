'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invitation } from '@/types/database'

/**
 * Hook to fetch pending invitations for a workspace
 */
export function useWorkspaceInvitations(workspaceId: string | null) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

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
    loadInvitations()
  }, [loadInvitations])

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

