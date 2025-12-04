'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Membership, Profile } from '@/types/database'

interface WorkspaceMember {
  membership: Membership
  profile: Profile
}

/**
 * Hook to fetch all members of a workspace with their profile information
 * Uses React Query for automatic caching and background refetching
 * Accepts initial data to avoid duplicate fetches when data is already available
 * 
 * N+1 Prevention:
 * - Uses JOIN query (profile:profiles!inner(*)) to fetch all data in a single query
 * - All member profiles are loaded together, not individually
 * - When mapping over members in components, ensure no additional queries are made per member
 * - If you need to update roles or other member data, batch updates rather than individual calls
 */
export function useWorkspaceMembers(
  workspaceId: string | null,
  initialMembers?: WorkspaceMember[]
) {
  const {
    data: members = initialMembers || [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['workspaceMembers', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return []
      }

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
            status: (m.status || 'active') as Membership['status'],
            last_active_at: m.last_active_at,
            created_at: m.created_at,
          } as Membership,
          profile: m.profile as Profile,
        }))
    },
    enabled: !!workspaceId && !initialMembers, // Skip fetch if initial data provided
    initialData: initialMembers, // Use initial data if provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    members,
    loading: initialMembers ? false : loading, // Don't show loading if initial data provided
  }
}

