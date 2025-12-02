'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Request early access to Client Portals
 * Updates user preferences to indicate interest in client portals
 */
export async function requestClientPortalsEarlyAccess(userId: string): Promise<{ success: true } | { error: string }> {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Get current preferences
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) {
    console.error('Error fetching profile:', fetchError)
    return { error: 'Failed to fetch profile' }
  }

  // Update preferences to include client portals interest
  const currentPreferences = profile.preferences || {}
  const updatedPreferences = {
    ...currentPreferences,
    clientPortalsEarlyAccess: true,
    clientPortalsRequestedAt: new Date().toISOString(),
  }

  // Update profile with new preferences
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ preferences: updatedPreferences })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating preferences:', updateError)
    return { error: 'Failed to update preferences' }
  }

  // Revalidate client portals page
  revalidatePath('/client-portals')

  return { success: true }
}

