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
    staleTime: 60 * 1000, // 1 minute - data is fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus (reduces unnecessary requests)
  })

  return {
    workspaces,
    loading,
  }
}

