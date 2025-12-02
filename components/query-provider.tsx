'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * QueryClientProvider wrapper for React Query
 * Creates a QueryClient instance with optimized defaults
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache time: data stays in cache for 10 minutes after being unused
            gcTime: 10 * 60 * 1000,
            // Don't refetch on window focus (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (reduces unnecessary requests)
            refetchOnReconnect: false,
            // Retry failed requests once
            retry: 1,
            // Retry delay: exponential backoff starting at 1s
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}




