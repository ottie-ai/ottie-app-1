'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Invitation } from '@/types/database'

/**
 * Hook to fetch pending invitations for a workspace
 * Uses React Query for automatic caching and background refetching
 * Accepts initial data to avoid duplicate fetches when data is already available
 */
export function useWorkspaceInvitations(
  workspaceId: string | null,
  initialInvitations?: Invitation[]
) {
  const queryClient = useQueryClient()

  const {
    data: invitations = initialInvitations || [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['workspaceInvitations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return []
      }

      const supabase = createClient()
      
      // Get pending invitations
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        return []
      }

      return (data as Invitation[]) || []
    },
    enabled: !!workspaceId && initialInvitations === undefined, // Skip fetch if initial data provided
    initialData: initialInvitations, // Use initial data if provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Function to refresh invitations
  const refresh = async () => {
    if (!workspaceId) return
    await queryClient.invalidateQueries({ queryKey: ['workspaceInvitations', workspaceId] })
  }

  return {
    invitations,
    loading: initialInvitations !== undefined ? false : loading, // Don't show loading if initial data provided
    refresh,
  }
}

