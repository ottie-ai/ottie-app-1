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

/**
 * Get user profile (uncached)
 * Used for refreshing profile data after updates
 * This bypasses React cache to ensure fresh data
 */
export async function getUserProfileUncached(userId: string): Promise<Profile | null> {
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
  const avatarFile = formData.get('avatarFile') as File | null
  const avatarUrl = formData.get('avatarUrl') as string | null

  // Get current profile to check for old avatar and preserve it if not changing
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single()

  // Start with current avatar URL to preserve it if not changing
  let finalAvatarUrl: string | null | undefined = currentProfile?.avatar_url ?? null
  let uploadError: string | null = null

  // If a file is uploaded, upload it to storage first
  // Note: uploadAvatar function already deletes all old avatars before uploading new one
  if (avatarFile && avatarFile.size > 0) {
    const uploadResult = await uploadAvatar(userId, avatarFile)
    if ('error' in uploadResult) {
      // Store error but don't fail the entire update - allow saving other fields
      uploadError = uploadResult.error
      // Keep the current avatar URL if upload fails
      finalAvatarUrl = currentProfile?.avatar_url ?? null
    } else {
      finalAvatarUrl = uploadResult.url
      // Old avatars are already deleted by uploadAvatar function
    }
  } else if (avatarUrl !== null) {
    // If avatarUrl is explicitly provided (even if empty string), use it
    // This handles the case where avatar is being removed (empty string)
    finalAvatarUrl = avatarUrl || null
  }
  // Otherwise, finalAvatarUrl remains as currentProfile?.avatar_url (preserved)

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

  // Only update avatar_url in database if it actually changed
  // (file upload, explicit URL change, or removal)
  if (avatarFile && avatarFile.size > 0) {
    // File upload - avatar_url will be updated
    updates.avatar_url = finalAvatarUrl ?? null
  } else if (avatarUrl !== null) {
    // Explicit URL change (including removal with empty string)
    updates.avatar_url = finalAvatarUrl ?? null
  }
  // Otherwise, don't update avatar_url in database

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    // Provide more specific error messages
    if (error.message?.includes('row-level security')) {
      return { error: 'Permission denied. Please check your database permissions.' }
    }
    return { error: `Failed to update profile: ${error.message || 'Unknown error'}` }
  }

  // Update user metadata in Auth - only update full_name, not avatar_url
  // We don't sync avatar_url to user_metadata - app always uses profile.avatar_url
  // Google avatar in user_metadata can stay as-is from signup
  try {
    const metadataUpdates: Record<string, any> = {}
    
    if (fullName !== undefined) {
      metadataUpdates.full_name = fullName || null
    }
    
    // Only update if there's something to update
    if (Object.keys(metadataUpdates).length > 0) {
      await supabase.auth.updateUser({
        data: metadataUpdates
      })
    }
  } catch (metadataError) {
    // Don't fail the entire update if metadata update fails
    console.error('Error updating user metadata:', metadataError)
  }

  // Revalidate the settings page cache to show updated data
  // This ensures the server component will fetch fresh data on next render
  revalidatePath('/settings')
  
  // Return success even if upload failed, but include warning
  if (uploadError) {
    return { 
      success: true, 
      profile: data as Profile,
      warning: `Profile updated, but avatar upload failed: ${uploadError}` 
    }
  }
  
  return { success: true, profile: data as Profile }
}

/**
 * Upload avatar to Supabase Storage
 * Uploads a file to the 'avatars' bucket and returns the public URL
 */
export async function uploadAvatar(userId: string, file: File): Promise<{ success: true; url: string } | { error: string }> {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' }
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    return { error: 'File size too large. Maximum size is 2MB.' }
  }

  try {
    // First, delete all existing avatars for this user from storage
    // This ensures user always has only one avatar
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId)
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`)
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
      }
    } catch (deleteError) {
      // Don't fail upload if deletion fails - continue with upload
      console.error('Error deleting old avatars:', deleteError)
    }

    // Generate unique filename: userId-timestamp.extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      // Provide more specific error messages
      if (uploadError.message?.includes('Bucket not found')) {
        return { error: 'Storage bucket not found. Please create the "avatars" bucket in Supabase Storage.' }
      }
      if (uploadError.message?.includes('new row violates row-level security policy')) {
        return { error: 'Permission denied. Please check Storage policies for the "avatars" bucket.' }
      }
      return { error: `Failed to upload avatar: ${uploadError.message || 'Unknown error'}` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return { error: 'Failed to get avatar URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Delete avatar from Supabase Storage
 * Removes the old avatar file when a new one is uploaded
 */
export async function deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
  if (!userId || !avatarUrl) return

  const supabase = await createClient()

  // Extract file path from URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/avatars/[path]
  try {
    const urlParts = avatarUrl.split('/avatars/')
    if (urlParts.length === 2) {
      const filePath = urlParts[1]
      await supabase.storage.from('avatars').remove([filePath])
    }
  } catch (error) {
    // Silently fail - it's okay if we can't delete the old file
    console.error('Error deleting old avatar:', error)
  }
}

/**
 * Remove avatar from user profile
 * Deletes the avatar from storage and removes the URL from profile
 */
export async function removeAvatar(userId: string): Promise<{ success: true; profile: Profile } | { error: string }> {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Get current profile to find avatar URL
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single()

  // Delete avatar from storage if it exists and is from our storage
  if (currentProfile?.avatar_url && currentProfile.avatar_url.includes('/avatars/')) {
    await deleteAvatar(userId, currentProfile.avatar_url)
  }

  // Update profile to remove avatar URL
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error removing avatar:', error)
    return { error: 'Failed to remove avatar' }
  }

  // Don't update user_metadata - app always uses profile.avatar_url
  // Google avatar in user_metadata can stay as-is from signup

  // Revalidate the settings page cache
  revalidatePath('/settings')
  
  return { success: true, profile: data as Profile }
}

/**
 * Check if user is owner in any workspace with multiple users
 * Returns list of workspaces that will be deleted
 */
export async function checkWorkspacesForDeletion(userId: string): Promise<{
  workspacesToDelete: Array<{ id: string; name: string; memberCount: number }>
  hasMultiUserWorkspace: boolean
}> {
  if (!userId) {
    return { workspacesToDelete: [], hasMultiUserWorkspace: false }
  }

  const supabase = await createClient()

  // Find all workspaces where user is owner
  const { data: ownerMemberships, error: ownerError } = await supabase
    .from('memberships')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (ownerError || !ownerMemberships || ownerMemberships.length === 0) {
    return { workspacesToDelete: [], hasMultiUserWorkspace: false }
  }

  const workspaceIds = ownerMemberships.map(m => m.workspace_id)
  const workspacesToDelete: Array<{ id: string; name: string; memberCount: number }> = []
  let hasMultiUserWorkspace = false

  // Get workspace details and member counts
  for (const workspaceId of workspaceIds) {
    // Get workspace details
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) continue

    // Count members in this workspace
    const { data: members, error: membersError } = await supabase
      .from('memberships')
      .select('id')
      .eq('workspace_id', workspaceId)

    const memberCount = members?.length || 0

    if (memberCount > 1) {
      hasMultiUserWorkspace = true
    }

    workspacesToDelete.push({
      id: workspace.id,
      name: workspace.name,
      memberCount,
    })
  }

  return { workspacesToDelete, hasMultiUserWorkspace }
}

/**
 * Soft delete user account (anonymize instead of hard delete)
 * This preserves data for compliance and analytics while removing personal information.
 * 
 * Process:
 * - Anonymizes personal data in profile (email, full_name, avatar_url)
 * - Sets deleted_at timestamp in profile
 * - Anonymizes email in auth.users to allow re-registration with same email
 * - For single-user workspaces: deletes workspace and all associated data
 * - For multi-user workspaces: removes user from workspace but keeps workspace
 * - Deletes avatars from storage
 * 
 * Note: User can re-register with the same email because auth.users email is anonymized.
 * Profile remains anonymized (soft delete) for compliance/analytics purposes.
 */
export async function deleteUserAccount(userId: string): Promise<{ success: true } | { error: string }> {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  try {
    // 1. Find all workspaces where user is owner
    const { data: ownerMemberships, error: ownerError } = await supabase
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'owner')

    if (ownerError) {
      console.error('Error finding owner workspaces:', ownerError)
      return { error: 'Failed to find workspaces' }
    }

    const workspaceIdsToDelete = ownerMemberships?.map(m => m.workspace_id) || []

    // 2. For single-user workspaces: Delete sites and integrations
    // For multi-user workspaces: Keep them (other users need them)
    if (workspaceIdsToDelete.length > 0) {
      // Check which workspaces are single-user (only this user)
      for (const workspaceId of workspaceIdsToDelete) {
        const { data: members, error: membersError } = await supabase
          .from('memberships')
          .select('id')
          .eq('workspace_id', workspaceId)

        const memberCount = members?.length || 0

        // Only delete sites/integrations if it's a single-user workspace
        if (memberCount === 1) {
          // Delete sites
          const { error: deleteSitesError } = await supabase
            .from('sites')
            .delete()
            .eq('workspace_id', workspaceId)

          if (deleteSitesError) {
            console.error('Error deleting sites:', deleteSitesError)
          }

          // Delete integrations
          const { error: deleteIntegrationsError } = await supabase
            .from('integrations')
            .delete()
            .eq('workspace_id', workspaceId)

          if (deleteIntegrationsError) {
            console.error('Error deleting integrations:', deleteIntegrationsError)
          }

          // Delete workspace (single-user only)
          const { error: deleteWorkspaceError } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', workspaceId)

          if (deleteWorkspaceError) {
            console.error('Error deleting workspace:', deleteWorkspaceError)
          }
        }
        // For multi-user workspaces, we keep them but remove the user's membership
      }
    }

    // 3. Delete all memberships (user is removed from all workspaces)
    const { error: deleteMembershipsError } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)

    if (deleteMembershipsError) {
      console.error('Error deleting memberships:', deleteMembershipsError)
      return { error: 'Failed to delete memberships' }
    }

    // 4. Delete all avatars uploaded by the user from storage
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('avatars')
        .list(userId)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`)
        const { error: deleteAvatarsError } = await supabase.storage
          .from('avatars')
          .remove(filesToDelete)

        if (deleteAvatarsError) {
          console.error('Error deleting avatars from storage:', deleteAvatarsError)
          // Continue even if avatar deletion fails
        }
      }
    } catch (avatarError) {
      console.error('Error accessing storage for avatar deletion:', avatarError)
      // Continue even if avatar deletion fails
    }

    // 5. Soft delete: Anonymize profile instead of deleting
    // This preserves data for compliance/analytics while removing personal info
    const anonymizedEmail = `deleted_${userId.substring(0, 8)}@deleted.local`
    const anonymizedName = 'Deleted User'
    
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        email: anonymizedEmail,
        full_name: anonymizedName,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
        preferences: {} // Clear preferences
      })
      .eq('id', userId)

    if (updateProfileError) {
      console.error('Error soft deleting profile:', updateProfileError)
      return { error: `Failed to delete profile: ${updateProfileError.message || 'Unknown error'}` }
    }

    // 6. Anonymize email in auth.users to allow re-registration with same email
    // This uses a security definer function that can update auth.users
    // This is necessary so user can register again with the same email
    // The profile remains anonymized (soft delete) for compliance/analytics
    const { error: anonymizeAuthUserError } = await supabase.rpc('anonymize_auth_user', {
      user_uuid: userId,
      anonymized_email: anonymizedEmail
    })
    
    if (anonymizeAuthUserError) {
      console.error('Error anonymizing auth user:', anonymizeAuthUserError)
      // Continue - profile is already anonymized, but user won't be able to re-register
      // with same email until auth.users email is manually changed
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting account:', error)
    return { error: 'An unexpected error occurred' }
  }
}

