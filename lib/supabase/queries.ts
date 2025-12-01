'use server'

import { createClient } from './server'
import type {
  Profile,
  Workspace,
  Membership,
  Site,
  Invitation,
  Integration,
  ProfileUpdate,
  WorkspaceUpdate,
  SiteUpdate,
  SiteInsert,
  MembershipInsert,
} from '@/types/database'

/**
 * Server-side database queries
 * 
 * These functions use RLS policies defined in your database
 */

// ==========================================
// PROFILES
// ==========================================

export async function getProfile(userId: string): Promise<Profile | null> {
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

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return data
}

// ==========================================
// WORKSPACES
// ==========================================

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workspaces:', error)
    return []
  }

  return data || []
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching workspace:', error)
    return null
  }

  return data
}

export async function updateWorkspace(
  workspaceId: string,
  updates: WorkspaceUpdate
): Promise<Workspace | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating workspace:', error)
    return null
  }

  return data
}

// ==========================================
// MEMBERSHIPS
// ==========================================

export async function getMemberships(workspaceId?: string): Promise<Membership[]> {
  const supabase = await createClient()
  let query = supabase.from('memberships').select('*')

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching memberships:', error)
    return []
  }

  return data || []
}

/**
 * Get current user's workspace and membership
 * Returns the workspace the user belongs to, or null if not found
 */
export async function getCurrentUserWorkspace(userId: string): Promise<{ workspace: Workspace; membership: Membership } | null> {
  const supabase = await createClient()
  
  // Get user's membership with workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      *,
      workspace:workspaces!inner(*)
    `)
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    console.error('Error fetching user workspace:', membershipError)
    return null
  }

  if (!membership || !membership.workspace) {
    return null
  }

  return {
    workspace: membership.workspace as Workspace,
    membership: {
      id: membership.id,
      workspace_id: membership.workspace_id,
      user_id: membership.user_id,
      role: membership.role,
      last_active_at: membership.last_active_at,
      created_at: membership.created_at,
    } as Membership,
  }
}

export async function updateMembershipActivity(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('memberships')
    .update({ last_active_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
}

// ==========================================
// SITES
// ==========================================

export async function getSites(workspaceId?: string): Promise<Site[]> {
  const supabase = await createClient()
  let query = supabase
    .from('sites')
    .select('*')
    .is('deleted_at', null)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching sites:', error)
    return []
  }

  return data || []
}

export async function getSite(siteId: string): Promise<Site | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching site:', error)
    return null
  }

  return data
}

export async function createSite(site: SiteInsert): Promise<Site | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()

  if (error) {
    console.error('Error creating site:', error)
    return null
  }

  return data
}

export async function updateSite(siteId: string, updates: SiteUpdate): Promise<Site | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sites')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating site:', error)
    return null
  }

  return data
}

export async function deleteSite(siteId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sites')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', siteId)

  if (error) {
    console.error('Error deleting site:', error)
    return false
  }

  return true
}

// ==========================================
// INVITATIONS
// ==========================================

export async function getInvitations(workspaceId?: string): Promise<Invitation[]> {
  const supabase = await createClient()
  let query = supabase.from('invitations').select('*')

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return data || []
}

// ==========================================
// INTEGRATIONS
// ==========================================

export async function getIntegrations(workspaceId: string): Promise<Integration[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching integrations:', error)
    return []
  }

  return data || []
}

/**
 * Get workspace members with profiles
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<Array<{ membership: Membership; profile: Profile }>> {
  const supabase = await createClient()

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      *,
      profile:profiles!inner(*)
    `)
    .eq('workspace_id', workspaceId)
    .is('profile.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workspace members:', error)
    return []
  }

  if (!memberships) {
    return []
  }

  return memberships
    .filter(m => m.profile)
    .map(m => ({
      membership: {
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
        last_active_at: m.last_active_at,
        created_at: m.created_at,
      } as Membership,
      profile: m.profile as Profile,
    }))
}

/**
 * Get pending invitations for a workspace
 */
export async function getPendingInvitations(workspaceId: string): Promise<Invitation[]> {
  const supabase = await createClient()

  const { data: invitations, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return (invitations as Invitation[]) || []
}

/**
 * Load all settings page data in parallel
 * Optimizes loading by fetching all required data simultaneously
 * Reduces 7+ sequential DB calls to 4 parallel calls
 */
export async function loadSettingsData(userId: string): Promise<{
  profile: Profile | null
  workspace: Workspace | null
  membership: Membership | null
  members: Array<{ membership: Membership; profile: Profile }>
  invitations: Invitation[]
}> {
  const supabase = await createClient()

  // Parallel queries - all execute simultaneously
  const [profileResult, workspaceResult] = await Promise.all([
    // Profile query
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single(),
    
    // Workspace query
    (async () => {
      const { data: membership, error } = await supabase
        .from('memberships')
        .select(`
          *,
          workspace:workspaces!inner(*)
        `)
        .eq('user_id', userId)
        .is('workspace.deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !membership || !membership.workspace) {
        return { workspace: null, membership: null }
      }

      return {
        workspace: membership.workspace as Workspace,
        membership: {
          id: membership.id,
          workspace_id: membership.workspace_id,
          user_id: membership.user_id,
          role: membership.role,
          last_active_at: membership.last_active_at,
          created_at: membership.created_at,
        } as Membership,
      }
    })(),
  ])

  const workspaceId = workspaceResult.workspace?.id

  // Load members and invitations in parallel (only if workspace exists)
  const [membersResult, invitationsResult] = await Promise.all([
    workspaceId ? getWorkspaceMembers(workspaceId) : Promise.resolve([]),
    workspaceId ? getPendingInvitations(workspaceId) : Promise.resolve([]),
  ])

  return {
    profile: profileResult.error ? null : (profileResult.data as Profile | null),
    workspace: workspaceResult.workspace,
    membership: workspaceResult.membership,
    members: membersResult,
    invitations: invitationsResult,
  }
}

