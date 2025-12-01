'use client'

import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { loadUserData, fetchUserProfile, loadUserWorkspace } from '@/lib/workspace-queries'
import type { Profile, Workspace } from '@/types/database'

interface UserDataContextType {
  profile: Profile | null
  workspace: Workspace | null
  loading: boolean
  refresh: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshWorkspace: () => Promise<void>
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined)

/**
 * UserDataProvider - Loads profile and workspace using React Query
 * Provides automatic caching, background refetching, and stale-while-revalidate
 * 
 * @param initialData - Optional initial data from server-side rendering to avoid duplicate fetches
 */
export function UserDataProvider({ 
  children,
  initialData,
}: { 
  children: React.ReactNode
  initialData?: {
    profile: Profile | null
    workspace: Workspace | null
  }
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Use React Query for profile and workspace data
  const {
    data: userData,
    isLoading: loading,
  } = useQuery({
    queryKey: ['userData', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { profile: null, workspace: null }
      }
      return loadUserData(user.id)
    },
    enabled: !!user?.id && !initialData, // Skip fetch if initial data provided
    initialData: initialData, // Use initial data if provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Use query data (which may be pre-populated via setQueryData) or fall back to initialData
  // Priority: userData (from query) > initialData (prop) > null
  const profile = userData?.profile ?? initialData?.profile ?? null
  const workspace = userData?.workspace ?? initialData?.workspace ?? null
  
  // If we have initial data (either from prop or pre-populated cache), we're not loading
  const isLoading = (initialData || userData) ? false : loading

  const refresh = async () => {
    if (!user?.id) return
    await queryClient.invalidateQueries({ queryKey: ['userData', user.id] })
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    // Invalidate and refetch profile
    await queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    await queryClient.invalidateQueries({ queryKey: ['userData', user.id] })
  }

  const refreshWorkspace = async () => {
    if (!user?.id) return
    // Invalidate and refetch workspace
    await queryClient.invalidateQueries({ queryKey: ['workspace', user.id] })
    await queryClient.invalidateQueries({ queryKey: ['userData', user.id] })
  }

  return (
    <UserDataContext.Provider
      value={{
        profile,
        workspace,
        loading: isLoading,
        refresh,
        refreshProfile,
        refreshWorkspace,
      }}
    >
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserData() {
  const context = useContext(UserDataContext)
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider')
  }
  return context
}

/**
 * Hook for backward compatibility with UserProfileProvider
 * Returns profile-related data in the same format
 */
export function useUserProfile() {
  const { profile, loading, refreshProfile } = useUserData()
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
  const { workspace, loading, refreshWorkspace } = useUserData()

  return {
    workspace,
    loading,
    refresh: refreshWorkspace,
  }
}

