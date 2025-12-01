'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

/**
 * Centralized user data queries
 * Server-side functions for fetching user profile data
 */

/**
 * Fetch user profile
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

