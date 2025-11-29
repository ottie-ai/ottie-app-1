'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile } from '@/types/database'

/**
 * Server Actions for Settings Page
 * 
 * Note: getCurrentUserProfile is now cached using React cache() for automatic
 * request deduplication. This reduces DB calls when the same data is requested
 * multiple times in the same render cycle.
 */

/**
 * Get user profile (cached)
 * Uses React cache() for automatic request deduplication
 * This function is now primarily used by server components, but kept here
 * for backward compatibility if needed elsewhere
 */
export const getCurrentUserProfile = cache(async (userId: string): Promise<Profile | null> => {
  if (!userId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
})

export async function updateUserProfile(userId: string, formData: FormData) {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  const fullName = formData.get('fullName') as string
  const avatarUrl = formData.get('avatarUrl') as string | null

  const updates: {
    full_name?: string | null
    avatar_url?: string | null
    updated_at: string
  } = {
    updated_at: new Date().toISOString()
  }

  if (fullName !== undefined) {
    updates.full_name = fullName || null
  }

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl || null
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile' }
  }

  // Revalidate the settings page cache to show updated data
  // This ensures the server component will fetch fresh data on next render
  revalidatePath('/settings')
  
  return { success: true, profile: data as Profile }
}

