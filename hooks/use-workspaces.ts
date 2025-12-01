'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { fetchUserWorkspaces } from '@/lib/workspace-queries'
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
        const workspacesData = await fetchUserWorkspaces(user.id)
        setWorkspaces(workspacesData)
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

