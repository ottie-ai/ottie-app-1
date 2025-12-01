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
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    workspaces,
    loading,
  }
}

