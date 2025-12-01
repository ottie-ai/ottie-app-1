'use server'

import { createClient } from '@/lib/supabase/server'
import type { Membership, Profile, Invitation } from '@/types/database'

/**
 * Team data queries
 * Functions for loading workspace members and invitations
 */

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
 * Load team data (members and invitations) for a workspace
 */
export async function loadTeamData(workspaceId: string): Promise<{
  members: Array<{ membership: Membership; profile: Profile }>
  invitations: Invitation[]
}> {
  const [members, invitations] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    getPendingInvitations(workspaceId),
  ])

  return {
    members,
    invitations,
  }
}

