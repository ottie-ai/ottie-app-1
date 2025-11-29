'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile } from '@/types/database'

/**
 * Server Actions for Settings Page
 * Note: User ID is passed from client because we use localStorage for auth
 */

export async function getCurrentUserProfile(userId: string): Promise<Profile | null> {
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
}

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

  revalidatePath('/settings')
  return { success: true, profile: data as Profile }
}

