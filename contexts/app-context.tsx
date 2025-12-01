'use client'

import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { loadAppData } from '@/lib/data/app-data-client'
import type { Profile, Workspace, Membership } from '@/types/database'

interface AppContextType {
  profile: Profile | null
  currentWorkspace: Workspace | null
  currentMembership: Membership | null
  allWorkspaces: Array<{ workspace: Workspace; role: string }>
  loading: boolean
  refresh: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshWorkspace: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

/**
 * AppProvider - Loads all app data using React Query
 * Provides automatic caching, background refetching, and stale-while-revalidate
 * 
 * @param initialData - Optional initial data from server-side rendering to avoid duplicate fetches
 */
export function AppProvider({ 
  children,
  initialData,
}: { 
  children: React.ReactNode
  initialData?: {
    profile: Profile | null
    currentWorkspace: Workspace | null
    currentMembership: Membership | null
    allWorkspaces: Array<{ workspace: Workspace; role: string }>
  }
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Use React Query for app data
  const {
    data: appData,
    isLoading: loading,
  } = useQuery({
    queryKey: ['appData', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          profile: null,
          currentWorkspace: null,
          currentMembership: null,
          allWorkspaces: [],
        }
      }
      return loadAppData(user.id)
    },
    enabled: !!user?.id && !initialData, // Skip fetch if initial data provided
    initialData: initialData, // Use initial data if provided
    staleTime: 60 * 1000, // 1 minute (as per recommendation)
  })

  // Use query data (which may be pre-populated via setQueryData) or fall back to initialData
  const profile = appData?.profile ?? initialData?.profile ?? null
  const currentWorkspace = appData?.currentWorkspace ?? initialData?.currentWorkspace ?? null
  const currentMembership = appData?.currentMembership ?? initialData?.currentMembership ?? null
  const allWorkspaces = appData?.allWorkspaces ?? initialData?.allWorkspaces ?? []
  
  // If we have initial data (either from prop or pre-populated cache), we're not loading
  const isLoading = (initialData || appData) ? false : loading

  const refresh = async () => {
    if (!user?.id) return
    await queryClient.invalidateQueries({ queryKey: ['appData', user.id] })
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    // Invalidate and refetch profile
    await queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    await queryClient.invalidateQueries({ queryKey: ['appData', user.id] })
  }

  const refreshWorkspace = async () => {
    if (!user?.id) return
    // Invalidate and refetch workspace
    await queryClient.invalidateQueries({ queryKey: ['workspace', user.id] })
    await queryClient.invalidateQueries({ queryKey: ['appData', user.id] })
  }

  return (
    <AppContext.Provider
      value={{
        profile,
        currentWorkspace,
        currentMembership,
        allWorkspaces,
        loading: isLoading,
        refresh,
        refreshProfile,
        refreshWorkspace,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppProvider')
  }
  return context
}

/**
 * Hook for backward compatibility with UserDataProvider
 * Returns profile and workspace in the same format
 */
export function useUserData() {
  const { profile, currentWorkspace, loading, refresh, refreshProfile, refreshWorkspace } = useAppData()

  return {
    profile,
    workspace: currentWorkspace,
    loading,
    refresh,
    refreshProfile,
    refreshWorkspace,
  }
}

/**
 * Hook for backward compatibility with UserProfileProvider
 * Returns profile-related data in the same format
 */
export function useUserProfile() {
  const { profile, loading, refreshProfile } = useAppData()
  const { user: authUser } = useAuth()

  const userName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User'
  const userEmail = authUser?.email || ''
  const userAvatar = loading 
    ? '' // During loading, show empty to prevent flicker
    : (profile?.avatar_url || '') // Use profile avatar_url, empty if null

  return {
    profile,
    userName,
    userEmail,
    userAvatar,
    loading,
    refresh: refreshProfile,
  }
}

/**
 * Hook for backward compatibility with WorkspaceProvider
 * Returns workspace in the same format
 */
export function useWorkspace() {
  const { currentWorkspace, loading, refreshWorkspace } = useAppData()

  return {
    workspace: currentWorkspace,
    loading,
    refresh: refreshWorkspace,
  }
}

