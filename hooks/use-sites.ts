'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSites } from '@/lib/data/site-data'
import type { Site } from '@/types/database'

/**
 * Hook to fetch and cache sites for a workspace
 * Uses React Query for automatic caching and refetching
 */
export function useSites(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient()

  const {
    data: sites,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sites', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      return getSites(workspaceId)
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds - sites data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  const refresh = async () => {
    if (!workspaceId) return
    await queryClient.invalidateQueries({ queryKey: ['sites', workspaceId] })
  }

  return {
    sites: sites || [],
    loading: isLoading,
    error,
    refresh,
  }
}

