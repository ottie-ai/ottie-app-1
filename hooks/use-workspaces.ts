'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, Membership } from '@/types/database'

/**
 * Hook to fetch all workspaces where user is a member
 * Returns list of workspaces with membership info
 */
export function useWorkspaces() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Array<{ workspace: Workspace; membership: Membership }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkspaces() {
      if (!user?.id) {
        setWorkspaces([])
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Get all memberships with workspaces where user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            *,
            workspace:workspaces!inner(*)
          `)
          .eq('user_id', user.id)
          .is('workspace.deleted_at', null)
          .order('created_at', { ascending: false })

        if (membershipError) {
          console.error('Error fetching user workspaces:', membershipError)
          setWorkspaces([])
        } else if (memberships) {
          const workspacesData = memberships
            .filter(m => m.workspace)
            .map(m => ({
              workspace: m.workspace as Workspace,
              membership: {
                id: m.id,
                workspace_id: m.workspace_id,
                user_id: m.user_id,
                role: m.role,
                last_active_at: m.last_active_at,
                created_at: m.created_at,
              } as Membership,
            }))
          setWorkspaces(workspacesData)
        } else {
          setWorkspaces([])
        }
      } catch (error) {
        console.error('Error loading workspaces:', error)
        setWorkspaces([])
      } finally {
        setLoading(false)
      }
    }

    loadWorkspaces()
  }, [user?.id])

  return {
    workspaces,
    loading,
  }
}

