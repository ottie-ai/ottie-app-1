'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getCurrentUserProfile, getUserProfileUncached } from '@/app/(app)/settings/actions'
import type { Profile } from '@/types/database'

interface UserProfileContextType {
  profile: Profile | null
  userName: string
  userEmail: string
  userAvatar: string
  loading: boolean
  refresh: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const data = await getCurrentUserProfile(user.id)
      setProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const refresh = useCallback(async () => {
    if (user?.id) {
      try {
        const data = await getUserProfileUncached(user.id)
        setProfile(data)
      } catch (error) {
        console.error('Error refreshing profile:', error)
      }
    }
  }, [user?.id])

  // Get user data - profile always exists, so we always use profile data
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || ''
  // Avatar: Always use profile.avatar_url from database
  // If null, show empty (initials only). Never use Google avatar fallback.
  const userAvatar = loading 
    ? '' // During loading, show empty to prevent flicker
    : (profile?.avatar_url || '') // Use profile avatar_url, empty if null (deleted)

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        userName,
        userEmail,
        userAvatar,
        loading,
        refresh,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}

