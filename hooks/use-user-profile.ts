'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { getCurrentUserProfile, getUserProfileUncached } from '@/app/(app)/settings/actions'
import type { Profile } from '@/types/database'

/**
 * Hook to fetch and cache current user profile from database
 * This ensures avatar and name are always up-to-date after changes
 */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const data = await getCurrentUserProfile(user.id)
        // Set profile to null if data is null (explicitly mark as "not found")
        // This distinguishes between "loading" and "no profile exists"
        setProfile(data)
      } catch (error) {
        console.error('Error loading user profile:', error)
        // On error, set to null to indicate profile doesn't exist
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id])

  // Get user data - profile always exists, so we always use profile data
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || ''
  // Avatar: Always use profile.avatar_url from database
  // If null, show empty (initials only). Never use Google avatar fallback.
  const userAvatar = loading 
    ? '' // During loading, show empty to prevent flicker
    : (profile?.avatar_url || '') // Use profile avatar_url, empty if null (deleted)

  return {
    profile,
    userName,
    userEmail,
    userAvatar,
    loading,
    refresh: async () => {
      if (user?.id) {
        try {
          const data = await getUserProfileUncached(user.id)
          setProfile(data)
        } catch (error) {
          console.error('Error refreshing profile:', error)
        }
      }
    }
  }
}

