'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { fetchUserWorkspaces } from '@/lib/workspace-queries'
import type { Workspace, Membership } from '@/types/database'

/**
 * Hook to fetch all workspaces where user is a member
 * Uses React Query for automatic caching and background refetching
 */
export function useWorkspaces() {
  const { user } = useAuth()

  const {
    data: workspaces = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['workspaces', user?.id],
    queryFn: () => fetchUserWorkspaces(user!.id),
    enabled: !!user?.id,
    staleTime: 0, // Always consider stale - refetch immediately when needed
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })

  return {
    workspaces,
    loading,
  }
}

