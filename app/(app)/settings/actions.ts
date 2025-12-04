'use server'

import { cache } from 'react'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { updateWorkspace } from '@/lib/supabase/queries'
import type { Profile, Workspace, Invitation } from '@/types/database'
import { sendInviteEmail } from '@/lib/email'

/**
 * Server Actions for Settings Page
 * 
 * Note: getCurrentUserProfile is now cached using React cache() for automatic
 * request deduplication. This reduces DB calls when the same data is requested
 * multiple times in the same render cycle.
 */

/**
 * Verify user has access to workspace
 * Returns membership role if user has access, null otherwise
 * This prevents users from accessing workspaces they don't belong to
 * by manipulating localStorage workspace_id
 */
async function verifyWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<{ role: string } | null> {
  if (!workspaceId || !userId) {
    return null
  }

  const supabase = await createClient()
  
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (error || !membership) {
    return null
  }

  return { role: membership.role }
}

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
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
})

/**
 * Get user profile (uncached)
 * Used when we need to force a fresh fetch (e.g., after profile update)
 */
export async function getUserProfileUncached(userId: string): Promise<Profile | null> {
  if (!userId) return null

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

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, formData: FormData) {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Get form data
  const fullName = formData.get('fullName') as string
  const avatarFile = formData.get('avatarFile') as File | null
  const avatarUrl = formData.get('avatarUrl') as string | null

  // Prepare profile update
  const updates: { full_name?: string; avatar_url?: string | null } = {}

  if (fullName !== null) {
    updates.full_name = fullName.trim() || undefined
  }

  // Handle avatar upload if file is provided
  if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(avatarFile.type)) {
    return { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' }
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
    if (avatarFile.size > maxSize) {
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
      const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
        .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      // Log detailed error server-side for debugging
      if (uploadError.message?.includes('Bucket not found')) {
        console.error('Storage bucket configuration error - avatars bucket not found')
      }
      if (uploadError.message?.includes('new row violates row-level security policy')) {
        console.error('Storage RLS policy error - avatars bucket')
      }
      // Return generic error message to client (don't reveal implementation details)
      return { error: 'Failed to upload avatar. Please try again later.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return { error: 'Failed to get avatar URL' }
    }

      updates.avatar_url = urlData.publicUrl
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
  } else if (avatarUrl !== null) {
    // If avatarUrl is provided (even if empty), use it
    updates.avatar_url = avatarUrl || null
  }

  // Update profile
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

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true, profile: data as Profile }
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
export async function removeAvatar(userId: string): Promise<{ success: true } | { error: string }> {
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

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Check workspaces for deletion
 * Returns list of workspaces owned by user and their member counts
 */
export async function checkWorkspacesForDeletion(userId: string): Promise<{
  workspaces: Array<{
    id: string
    name: string
    memberCount: number
  }>
  hasMultiUserWorkspace: boolean
}> {
  const supabase = await createClient()

  // Get all workspaces where user is owner
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      workspace_id,
      workspace:workspaces!inner(id, name)
    `)
    .eq('user_id', userId)
    .eq('role', 'owner')
    .is('workspace.deleted_at', null)

  if (error) {
    console.error('Error fetching workspaces:', error)
    return { workspaces: [], hasMultiUserWorkspace: false }
  }

  // Get member counts for each workspace
  const workspacesWithCounts = await Promise.all(
    (memberships || []).map(async (membership) => {
      const { count } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', membership.workspace_id)

      return {
        id: membership.workspace_id,
        name: (membership.workspace as any).name,
        memberCount: count || 0,
      }
    })
  )

  const hasMultiUserWorkspace = workspacesWithCounts.some(ws => ws.memberCount > 1)

  return {
    workspaces: workspacesWithCounts,
    hasMultiUserWorkspace,
  }
}

/**
 * Delete user account (soft delete)
 * - Anonymizes profile data
 * - Sets deleted_at timestamp
 * - Deletes sites and integrations for single-user workspaces
 * - Deletes single-user workspaces
 * - Deletes all memberships
 * - Deletes all avatars from storage
 * - Anonymizes email in auth.users
 */
export async function deleteUserAccount(userId: string): Promise<{ success: true } | { error: string }> {
  if (!userId) {
    return { error: 'Not authenticated' }
  }

  // Use regular client - RLS should allow user to update own profile
  const supabase = await createClient()

  try {
    // Check if we have a valid session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    
    if (!user || user.id !== userId) {
      console.error('Auth mismatch! userId:', userId, 'auth.uid:', user?.id)
      return { error: 'Session expired. Please refresh and try again.' }
    }

    // 1. FIRST - Anonymize profile (soft delete) while session is still valid
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email: null,
        full_name: null,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error anonymizing profile:', profileError)
      return { error: 'Failed to delete account' }
    }

    // 2. Get all workspaces where user is owner
    const { data: ownedWorkspaces } = await supabase
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'owner')

    if (ownedWorkspaces) {
      for (const membership of ownedWorkspaces) {
        // Check if workspace has multiple members
        const { count } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', membership.workspace_id)

        // If single-user workspace, delete sites and integrations
        if (count === 1) {
          // Delete sites
          await supabase
            .from('sites')
            .delete()
            .eq('workspace_id', membership.workspace_id)

          // Delete integrations
          await supabase
            .from('integrations')
            .delete()
            .eq('workspace_id', membership.workspace_id)

          // Delete workspace
          await supabase
            .from('workspaces')
            .delete()
            .eq('id', membership.workspace_id)
        }
      }
    }

    // 3. Delete all memberships for this user
    await supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)

    // 4. Delete all avatars from storage
    try {
      const { data: avatarFiles } = await supabase.storage
        .from('avatars')
        .list(userId)

      if (avatarFiles && avatarFiles.length > 0) {
        const filesToDelete = avatarFiles.map(file => `${userId}/${file.name}`)
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
      }
    } catch (avatarError) {
      console.error('Error deleting avatars:', avatarError)
      // Continue with deletion even if avatar deletion fails
    }

    // 5. Anonymize email in auth.users (requires RPC with security definer)
    // Generate anonymized email to allow re-registration with original email
    const anonymizedEmail = `deleted_${userId.substring(0, 8)}_${Date.now()}@deleted.local`
    
    const { error: authError } = await supabase.rpc('anonymize_auth_user', {
      user_uuid: userId,
      anonymized_email: anonymizedEmail,
    })

    if (authError) {
      console.error('Error anonymizing auth user:', authError)
      // Don't fail the entire operation if this fails - profile is already anonymized
    }

    // Revalidate settings page
    revalidatePath('/settings')

    return { success: true }
  } catch (error) {
    console.error('Error deleting user account:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Update workspace name
 * Only allowed for workspace owners/admins
 */
export async function updateWorkspaceName(
  workspaceId: string,
  userId: string,
  name: string
): Promise<{ success: true; workspace: Workspace } | { error: string }> {
  if (!workspaceId || !userId || !name) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can update workspace name' }
  }

  // Validate name
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length < 1) {
    return { error: 'Workspace name cannot be empty' }
  }

  if (trimmedName.length > 100) {
    return { error: 'Workspace name must be 100 characters or less' }
  }

  // Update workspace
  const updatedWorkspace = await updateWorkspace(workspaceId, { name: trimmedName })

  if (!updatedWorkspace) {
    return { error: 'Failed to update workspace name' }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true, workspace: updatedWorkspace }
}

/**
 * Upload workspace logo to Supabase Storage
 * Uploads a file to the 'workspace-logos' bucket and returns the public URL
 */
export async function uploadWorkspaceLogo(
  workspaceId: string,
  userId: string,
  file: File
): Promise<{ success: true; url: string } | { error: string }> {
  if (!workspaceId || !userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can upload workspace logo' }
  }

  // Validate file type (SVG excluded due to XSS risk from embedded JavaScript)
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
    // First, delete all existing logos for this workspace from storage
    // This ensures workspace always has only one logo
    try {
      const { data: existingFiles } = await supabase.storage
        .from('workspace-logos')
        .list(workspaceId)
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${workspaceId}/${file.name}`)
        await supabase.storage
          .from('workspace-logos')
          .remove(filesToDelete)
      }
    } catch (deleteError) {
      // Don't fail upload if deletion fails - continue with upload
      console.error('Error deleting old workspace logos:', deleteError)
    }

    // Generate unique filename: workspaceId-timestamp.extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${workspaceId}-${Date.now()}.${fileExt}`
    const filePath = `${workspaceId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('workspace-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Error uploading workspace logo:', uploadError)
      // Log detailed error server-side for debugging
      if (uploadError.message?.includes('Bucket not found')) {
        console.error('Storage bucket configuration error - workspace-logos bucket not found')
      }
      if (uploadError.message?.includes('new row violates row-level security policy')) {
        console.error('Storage RLS policy error - workspace-logos bucket')
      }
      // Return generic error message to client (don't reveal implementation details)
      return { error: 'Failed to upload logo. Please try again later.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('workspace-logos')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return { error: 'Failed to get logo URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Error uploading workspace logo:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Delete workspace logo from Supabase Storage
 */
export async function deleteWorkspaceLogo(workspaceId: string, logoUrl: string): Promise<void> {
  if (!workspaceId || !logoUrl) return

  const supabase = await createClient()

  // Extract file path from URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/workspace-logos/[path]
  try {
    const urlParts = logoUrl.split('/workspace-logos/')
    if (urlParts.length === 2) {
      const filePath = urlParts[1]
      await supabase.storage.from('workspace-logos').remove([filePath])
    }
  } catch (error) {
    // Silently fail - it's okay if we can't delete the old file
    console.error('Error deleting old workspace logo:', error)
  }
}

/**
 * Remove workspace logo from workspace
 * Deletes the logo from storage and removes the URL from workspace
 */
export async function removeWorkspaceLogo(
  workspaceId: string,
  userId: string
): Promise<{ success: true; workspace: Workspace } | { error: string }> {
  if (!workspaceId || !userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can remove workspace logo' }
  }

  // Get current workspace to find logo URL
  const { data: currentWorkspace } = await supabase
    .from('workspaces')
    .select('logo_url')
    .eq('id', workspaceId)
    .single()

  // Delete logo from storage if it exists and is from our storage
  if (currentWorkspace?.logo_url && currentWorkspace.logo_url.includes('/workspace-logos/')) {
    await deleteWorkspaceLogo(workspaceId, currentWorkspace.logo_url)
  }

  // Update workspace to remove logo URL
  const { data, error } = await supabase
    .from('workspaces')
    .update({ logo_url: null })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('Error removing workspace logo:', error)
    return { error: 'Failed to remove logo' }
  }

  // Revalidate settings page
  revalidatePath('/settings')
  
  return { success: true, workspace: data as Workspace }
}

/**
 * Delete workspace and create a new one
 * - Deletes all sites, integrations, and logo for the old workspace
 * - Soft deletes the old workspace
 * - Deletes all memberships for the old workspace
 * - Creates a new workspace with default name from user profile
 * - Creates new membership with owner role
 * Only allowed for workspace owners
 */
export async function resetWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: true; newWorkspace: Workspace } | { error: string }> {
  if (!workspaceId || !userId) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  try {
    // 1. Verify user is owner or admin of the workspace
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      return { error: 'Workspace membership not found' }
    }

    if (membership.role !== 'owner') {
      return { error: 'Only workspace owners can delete workspace' }
    }

    // 2. Get user profile for workspace name generation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { error: 'User profile not found' }
    }

    // 3. Get workspace info (for logo deletion and plan/stripe preservation)
    const { data: oldWorkspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('logo_url, plan, stripe_customer_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !oldWorkspace) {
      return { error: 'Workspace not found' }
    }

    // 4. Delete all sites for this workspace
    const { error: sitesError } = await supabase
      .from('sites')
      .delete()
      .eq('workspace_id', workspaceId)

    if (sitesError) {
      console.error('Error deleting sites:', sitesError)
      return { error: 'Failed to delete sites' }
    }

    // 5. Delete all integrations for this workspace
    const { error: integrationsError } = await supabase
      .from('integrations')
      .delete()
      .eq('workspace_id', workspaceId)

    if (integrationsError) {
      console.error('Error deleting integrations:', integrationsError)
      return { error: 'Failed to delete integrations' }
    }

    // 6. Delete workspace logo from storage if it exists
    if (oldWorkspace.logo_url && oldWorkspace.logo_url.includes('/workspace-logos/')) {
      try {
        await deleteWorkspaceLogo(workspaceId, oldWorkspace.logo_url)
      } catch (logoError) {
        console.error('Error deleting workspace logo:', logoError)
        // Continue with deletion even if logo deletion fails
      }
    }

    // 7. Delete all memberships for the old workspace
    const { error: membershipsError } = await supabase
      .from('memberships')
      .delete()
      .eq('workspace_id', workspaceId)

    if (membershipsError) {
      console.error('Error deleting memberships:', membershipsError)
      return { error: 'Failed to delete memberships' }
    }

    // 8. Soft delete the old workspace
    const { error: deleteError } = await supabase
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', workspaceId)

    if (deleteError) {
      console.error('Error deleting workspace:', deleteError)
      return { error: 'Failed to delete workspace' }
    }

    // 9. Set workspace name to "Personal Workspace" for all new workspaces
    const workspaceName = 'Personal Workspace'

    // 10. Generate unique slug from workspace name
    let workspaceSlug = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    workspaceSlug = `${workspaceSlug}-${userId.substring(0, 8)}`

    // 11. Create new workspace (preserve plan and stripe_customer_id from old workspace)
    // Ensure plan is preserved exactly as it was (null/empty is treated as 'free' by normalizePlan)
    const preservedPlan = oldWorkspace.plan ?? 'free'
    
    const { data: newWorkspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug: workspaceSlug,
        plan: preservedPlan,
        stripe_customer_id: oldWorkspace.stripe_customer_id, // Preserve Stripe customer ID
      })
      .select()
      .single()

    if (createError || !newWorkspace) {
      console.error('Error creating new workspace:', createError)
      return { error: 'Failed to create new workspace' }
    }

    // 12. Create new membership with owner role
    const { error: membershipCreateError } = await supabase
      .from('memberships')
      .insert({
        workspace_id: newWorkspace.id,
        user_id: userId,
        role: 'owner',
      })

    if (membershipCreateError) {
      console.error('Error creating membership:', membershipCreateError)
      // Try to clean up the workspace we just created
      await supabase
        .from('workspaces')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', newWorkspace.id)
      return { error: 'Failed to create membership' }
    }

    // 13. Update localStorage if this was the current workspace
    if (typeof window !== 'undefined') {
      const currentWorkspaceId = localStorage.getItem('current_workspace_id')
      if (currentWorkspaceId === workspaceId) {
        localStorage.setItem('current_workspace_id', newWorkspace.id)
      }
    }

    // Revalidate settings page
    revalidatePath('/settings')

    return { success: true, newWorkspace: newWorkspace as Workspace }
  } catch (error) {
    console.error('Error resetting workspace:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Update workspace (generic function for updating workspace fields)
 * Only allowed for workspace owners/admins
 */
export async function updateWorkspaceAction(
  workspaceId: string,
  userId: string,
  updates: { logo_url?: string | null }
): Promise<{ success: true; workspace: Workspace } | { error: string }> {
  if (!workspaceId || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can update workspace' }
  }

  // Update workspace
  const updatedWorkspace = await updateWorkspace(workspaceId, updates)

  if (!updatedWorkspace) {
    return { error: 'Failed to update workspace' }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true, workspace: updatedWorkspace }
}

/**
 * Update membership role
 * Only allowed for workspace owners/admins
 * Owner role cannot be changed
 */
export async function updateMembershipRole(
  membershipId: string,
  workspaceId: string,
  userId: string,
  newRole: 'admin' | 'agent'
): Promise<{ success: true } | { error: string }> {
  if (!membershipId || !workspaceId || !userId || !newRole) {
    return { error: 'Missing required fields' }
  }

  // Validate role - this check is redundant since role type is 'admin' | 'agent', but keeping for safety
  // TypeScript ensures newRole can never be 'owner' due to the function signature

  if (newRole !== 'admin' && newRole !== 'agent') {
    return { error: 'Invalid role. Must be admin or agent.' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: currentUserMembership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !currentUserMembership) {
    return { error: 'Workspace membership not found' }
  }

  if (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can change member roles' }
  }

  // Get the membership being updated to check if it's owner
  const { data: targetMembership, error: targetError } = await supabase
    .from('memberships')
    .select('role, user_id')
    .eq('id', membershipId)
    .eq('workspace_id', workspaceId)
    .single()

  if (targetError || !targetMembership) {
    return { error: 'Target membership not found' }
  }

  // Prevent changing owner role
  if (targetMembership.role === 'owner') {
    return { error: 'Cannot change owner role. Owner role cannot be modified.' }
  }

  // Prevent user from changing their own role
  if (targetMembership.user_id === userId) {
    return { error: 'Cannot change your own role' }
  }

  // Update membership role
  const { error: updateError } = await supabase
    .from('memberships')
    .update({ role: newRole })
    .eq('id', membershipId)
    .eq('workspace_id', workspaceId)

  if (updateError) {
    console.error('Error updating membership role:', updateError)
    return { error: 'Failed to update membership role' }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Remove a user from workspace (revoke access)
 * Only allowed for workspace owners/admins
 * Cannot remove owner or yourself
 */
export async function removeMembership(
  membershipId: string,
  workspaceId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  if (!membershipId || !workspaceId || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: currentUserMembership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !currentUserMembership) {
    return { error: 'Workspace membership not found' }
  }

  if (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can remove members' }
  }

  // Get the membership being removed to check if it's owner or current user
  const { data: targetMembership, error: targetError } = await supabase
    .from('memberships')
    .select('role, user_id')
    .eq('id', membershipId)
    .eq('workspace_id', workspaceId)
    .single()

  if (targetError || !targetMembership) {
    return { error: 'Target membership not found' }
  }

  // Prevent removing owner
  if (targetMembership.role === 'owner') {
    return { error: 'Cannot remove workspace owner. Transfer ownership first.' }
  }

  // Prevent user from removing themselves
  if (targetMembership.user_id === userId) {
    return { error: 'Cannot remove yourself from the workspace' }
  }

  // Remove the membership
  const { error: deleteError } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
    .eq('workspace_id', workspaceId)

  if (deleteError) {
    console.error('Error removing membership:', deleteError)
    return { error: 'Failed to remove member from workspace' }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Send password reset email (server action)
 * 
 * Email Enumeration Prevention: Always returns success to prevent
 * attackers from discovering which emails are registered.
 * Supabase will silently not send email if user doesn't exist or uses OAuth.
 */
export async function sendPasswordResetEmail(email: string) {
  const supabase = await createClient()
  
  // Get the app subdomain URL for redirect
  const getAppOrigin = () => {
    // In production, use app subdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const port = process.env.NODE_ENV === 'production' ? '' : ':3000'
    
    if (process.env.NODE_ENV === 'production') {
      return `${protocol}://app.${rootDomain}`
    }
    return `${protocol}://app.localhost${port}`
  }
  
  const appOrigin = getAppOrigin()
  const redirectTo = `${appOrigin}/reset-password`
  
  // Always attempt to send reset email
  // Supabase will silently not send email if:
  // - User doesn't exist
  // - User only has OAuth provider (no password)
  // This prevents email enumeration attacks
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  
  // ALWAYS return success - regardless of whether email was sent
  // This prevents attackers from discovering which emails are registered
  return {
    success: true,
  }
}

// ==========================================
// INVITATIONS
// ==========================================

/**
 * Generate a secure random token for invitations
 */
function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Get app origin URL for invite links
 */
function getAppOrigin(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const port = process.env.NODE_ENV === 'production' ? '' : ':3000'
  
  if (process.env.NODE_ENV === 'production') {
    return `${protocol}://app.${rootDomain}`
  }
  return `${protocol}://app.localhost${port}`
}

/**
 * Create a new invitation
 * Only allowed for workspace owners/admins on multi-user plans
 */
export async function createInvitation(
  workspaceId: string,
  invitedByUserId: string,
  email: string,
  role: 'admin' | 'agent'
): Promise<{ success: true; invitation: Invitation } | { error: string }> {
  if (!workspaceId || !invitedByUserId || !email || !role) {
    return { error: 'Missing required fields' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return { error: 'Invalid email address' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', invitedByUserId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can invite users' }
  }

  // Verify workspace is on a multi-user plan
  // IMPORTANT: Always check max_users from plans table, never hardcode plan names
  // See docs/patterns/multi-user-workspace-pattern.md for details
  // Get workspace with plan details from plans table (single source of truth)
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('plan, name')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (workspaceError || !workspace) {
    return { error: 'Workspace not found' }
  }

  // Check if plan allows multiple users (from plans table - single source of truth)
  const { data: planData, error: planError } = await supabase
    .from('plans')
    .select('max_users')
    .eq('name', workspace.plan || 'free')
    .single()

  if (planError || !planData) {
    // Fallback: if plan not found in DB, deny access (safe default)
    return { error: 'Plan configuration not found. Please contact support.' }
  }

  // Check if plan allows more than 1 user (max_users > 1)
  if (planData.max_users <= 1) {
    return { error: 'Upgrade to a team plan to invite team members' }
  }

  // Check if user is already a member
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .is('deleted_at', null)
    .single()

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', existingProfile.id)
      .single()

    if (existingMembership) {
      return { error: 'This user is already a member of this workspace' }
    }
  }

  // Check if there's already a pending invitation for this email
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('email', email.trim().toLowerCase())
    .eq('status', 'pending')
    .single()

  if (existingInvitation) {
    return { error: 'An invitation has already been sent to this email' }
  }

  // Fix #7: Rate limiting - max 5 invitations per email per hour (across all workspaces)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentInviteCount } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.trim().toLowerCase())
    .gte('created_at', oneHourAgo)

  if (recentInviteCount && recentInviteCount >= 5) {
    return { error: 'Too many invitations sent to this email recently. Please wait before sending another.' }
  }

  // Get inviter's name for the email
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', invitedByUserId)
    .single()

  const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member'

  // Generate unique token
  const token = generateInviteToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

  // Create invitation
  const { data: invitation, error: createError } = await supabase
    .from('invitations')
    .insert({
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      role: role,
      token: token,
      status: 'pending',
      invited_by: invitedByUserId,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating invitation:', createError)
    return { error: 'Failed to create invitation' }
  }

  // Send invitation email
  const inviteUrl = `${getAppOrigin()}/invite/${token}`
  
  const emailResult = await sendInviteEmail({
    to: email.trim().toLowerCase(),
    workspaceName: workspace.name,
    inviterName,
    role,
    inviteUrl,
  })

  if (!emailResult.success) {
    // Log error but don't fail - invitation was created and can be resent
    console.error('[INVITE] Failed to send invitation email:', emailResult.error)
    // Return error so user knows email failed
    return { error: `Invitation created but email failed to send: ${emailResult.error}. You can resend it later.` }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true, invitation: invitation as Invitation }
}

/**
 * Cancel a pending invitation
 * Only allowed for workspace owners/admins
 */
export async function cancelInvitation(
  invitationId: string,
  workspaceId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  if (!invitationId || !workspaceId || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can cancel invitations' }
  }

  // Delete the invitation
  const { error: deleteError } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')

  if (deleteError) {
    console.error('Error canceling invitation:', deleteError)
    return { error: 'Failed to cancel invitation' }
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Resend a pending invitation
 * Only allowed for workspace owners/admins
 */
export async function resendInvitation(
  invitationId: string,
  workspaceId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  if (!invitationId || !workspaceId || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user is owner or admin of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only workspace owners and admins can resend invitations' }
  }

  // Get the invitation
  const { data: invitation, error: getError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .single()

  if (getError || !invitation) {
    return { error: 'Invitation not found' }
  }

  if (invitation.status !== 'pending') {
    return { error: 'Can only resend pending invitations' }
  }

  // Get workspace name for email
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'A team member'

  // Generate new token and extend expiry
  const newToken = generateInviteToken()
  const newExpiresAt = new Date()
  newExpiresAt.setDate(newExpiresAt.getDate() + 7) // 7 days expiry

  // Update invitation with new token and expiry
  const { error: updateError } = await supabase
    .from('invitations')
    .update({
      token: newToken,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', invitationId)

  if (updateError) {
    console.error('Error resending invitation:', updateError)
    return { error: 'Failed to resend invitation' }
  }

  // Send the email
  const inviteUrl = `${getAppOrigin()}/invite/${newToken}`
  
  const emailResult = await sendInviteEmail({
    to: invitation.email,
    workspaceName: workspace?.name || 'Workspace',
    inviterName,
    role: invitation.role as 'admin' | 'agent',
    inviteUrl,
  })

  if (!emailResult.success) {
    console.error('Failed to resend invitation email:', emailResult.error)
  }

  // Revalidate settings page
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Mask email address for privacy (e.g., "john@example.com" -> "jo***@example.com")
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${local[1]}***@${domain}`
}

/**
 * Validate invitation token format
 */
function isValidToken(token: string): boolean {
  // Token should be at least 32 chars and only contain safe characters
  return token.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(token)
}

/**
 * Get invitation by token
 * Public function - no auth required (for accept flow)
 * Uses admin client to bypass RLS (since non-authenticated users can't read invitations)
 * Returns masked email for privacy
 */
export async function getInvitationByToken(
  token: string
): Promise<{ invitation: Invitation & { emailHint: string }; workspace: { name: string } } | { error: string; errorType?: 'expired' | 'used' | 'invalid' }> {
  // Fix #8: Token validation
  if (!token || !isValidToken(token)) {
    return { error: 'Invalid invitation link', errorType: 'invalid' }
  }

  // Use admin client to bypass RLS - necessary because:
  // 1. Non-authenticated users can't read invitations with the new secure RLS policy
  // 2. We validate the token server-side and only return necessary data
  const { createAdminClient } = await import('@/lib/supabase/admin')
  
  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('[getInvitationByToken] Failed to create admin client:', error)
    // Fallback to regular client if service role key is not configured
    supabase = await createClient()
  }

  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(`
      *,
      workspace:workspaces!inner(id, name)
    `)
    .eq('token', token)
    .is('workspace.deleted_at', null)
    .single()

  if (error || !invitation) {
    return { error: 'Invitation not found or has been cancelled', errorType: 'invalid' }
  }

  // Check if invitation is expired
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired', errorType: 'expired' }
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    return { error: 'This invitation has already been used', errorType: 'used' }
  }

  // Fix #2: Mask email and limit exposed data for privacy
  return {
    invitation: {
      id: invitation.id,
      workspace_id: invitation.workspace_id,
      email: invitation.email, // Full email needed for validation
      emailHint: maskEmail(invitation.email), // Masked email for display
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
      invited_by: invitation.invited_by,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
    } as Invitation & { emailHint: string },
    workspace: {
      // Don't expose workspace ID to public
      name: (invitation.workspace as any).name,
    },
  }
}

/**
 * Accept an invitation
 * Creates membership and marks invitation as accepted
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: true; workspaceId: string } | { error: string }> {
  if (!token || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Get the invitation
  const invitationResult = await getInvitationByToken(token)
  if ('error' in invitationResult) {
    return { error: invitationResult.error }
  }

  const { invitation, workspace } = invitationResult

  // Verify user email matches invitation email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { error: 'User profile not found' }
  }

  // Strict email matching - invitation must be accepted with the exact email it was sent to
  if (profile.email?.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
    return { error: 'This invitation was sent to a different email address. Please sign in with the email address that received the invitation.' }
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', userId)
    .single()

  if (existingMembership) {
    // User is already a member, just mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    return { success: true, workspaceId: invitation.workspace_id }
  }

  // Create membership
  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role,
    })

  if (membershipError) {
    console.error('Error creating membership:', membershipError)
    return { error: 'Failed to join workspace' }
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (updateError) {
    console.error('Error updating invitation status:', updateError)
    // Don't fail - membership was created successfully
  }

  // Revalidate pages
  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return { success: true, workspaceId: invitation.workspace_id }
}

/**
 * Get pending invitations for a workspace
 */
export async function getPendingInvitations(
  workspaceId: string,
  userId: string
): Promise<{ invitations: Invitation[] } | { error: string }> {
  if (!workspaceId || !userId) {
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  // Verify user has access to workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (membershipError || !membership) {
    return { error: 'Workspace membership not found' }
  }

  // Get pending invitations
  const { data: invitations, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return { error: 'Failed to fetch invitations' }
  }

  return { invitations: invitations as Invitation[] }
}
