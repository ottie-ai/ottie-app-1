'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
 * UserDataProvider - Loads profile and workspace in parallel
 * Replaces the need for separate UserProfileProvider and WorkspaceProvider
 * Optimizes loading by fetching both simultaneously
 */
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setWorkspace(null)
      setLoading(false)
      return
    }

    try {
      // Parallel loading - both queries execute simultaneously
      const { profile: profileData, workspace: workspaceData } = await loadUserData(user.id)
      setProfile(profileData)
      setWorkspace(workspaceData)
    } catch (error) {
      console.error('Error loading user data:', error)
      setProfile(null)
      setWorkspace(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setWorkspace(null)
      return
    }

    try {
      // Parallel refresh
      const { profile: profileData, workspace: workspaceData } = await loadUserData(user.id)
      setProfile(profileData)
      setWorkspace(workspaceData)
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }, [user?.id])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      const profileData = await fetchUserProfile(user.id)
      setProfile(profileData)
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }, [user?.id])

  const refreshWorkspace = useCallback(async () => {
    if (!user?.id) {
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
    <UserDataContext.Provider
      value={{
        profile,
        workspace,
        loading,
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

