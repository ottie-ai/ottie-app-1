'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Membership, Profile } from '@/types/database'

interface WorkspaceMember {
  membership: Membership
  profile: Profile
}

/**
 * Hook to fetch all members of a workspace with their profile information
 */
export function useWorkspaceMembers(workspaceId: string | null) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMembers() {
      if (!workspaceId) {
        setMembers([])
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Get all memberships with profile information
        const { data: memberships, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            *,
            profile:profiles!inner(*)
          `)
          .eq('workspace_id', workspaceId)
          .is('profile.deleted_at', null)
          .order('created_at', { ascending: false })

        if (membershipError) {
          console.error('Error fetching workspace members:', membershipError)
          setMembers([])
        } else if (memberships) {
          const membersData = memberships
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
          setMembers(membersData)
        } else {
          setMembers([])
        }
      } catch (error) {
        console.error('Error loading workspace members:', error)
        setMembers([])
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [workspaceId])

  return {
    members,
    loading,
  }
}

