'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, Membership } from '@/types/database'

/**
 * Hook to fetch and cache current user's workspace
 * Returns workspace data or null if not found
 */
export function useWorkspace() {
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkspace() {
      if (!user?.id) {
        setWorkspace(null)
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Get user's membership with workspace
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            *,
            workspace:workspaces!inner(*)
          `)
          .eq('user_id', user.id)
          .is('workspace.deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (membershipError) {
          console.error('Error fetching user workspace:', membershipError)
          setWorkspace(null)
        } else if (membership && membership.workspace) {
          setWorkspace(membership.workspace as Workspace)
        } else {
          setWorkspace(null)
        }
      } catch (error) {
        console.error('Error loading workspace:', error)
        setWorkspace(null)
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [user?.id])

  return {
    workspace,
    loading,
  }
}

