'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { loadUserWorkspace } from '@/lib/workspace-queries'
import type { Workspace } from '@/types/database'

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
        const workspaceData = await loadUserWorkspace(user.id)
        setWorkspace(workspaceData)
      } catch (error) {
        console.error('Error loading workspace:', error)
        setWorkspace(null)
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [user?.id])

  const refresh = async () => {
    if (!user?.id) {
      setWorkspace(null)
      return
    }

    try {
      const workspaceData = await loadUserWorkspace(user.id)
      setWorkspace(workspaceData)
    } catch (error) {
      console.error('Error refreshing workspace:', error)
    }
  }

  return {
    workspace,
    loading,
    refresh,
  }
}

