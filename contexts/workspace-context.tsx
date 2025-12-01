'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { loadUserWorkspace } from '@/lib/workspace-queries'
import type { Workspace } from '@/types/database'

interface WorkspaceContextType {
  workspace: Workspace | null
  loading: boolean
  refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const loadWorkspace = useCallback(async () => {
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
  }, [user?.id])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const refresh = useCallback(async () => {
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
  }, [user?.id])

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        loading,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

