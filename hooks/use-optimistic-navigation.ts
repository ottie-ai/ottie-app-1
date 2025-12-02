'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

/**
 * Hook for optimistic navigation with startTransition
 * 
 * OPTIMIZATION: Uses React's startTransition to mark navigation as non-urgent
 * - UI updates immediately without waiting for route changes
 * - Better perceived performance and smoother navigation
 * - Prevents blocking of user interactions during navigation
 */
export function useOptimisticNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const navigate = (url: string, options?: Parameters<AppRouterInstance['push']>[1]) => {
    startTransition(() => {
      router.push(url, options)
    })
  }

  const replace = (url: string, options?: Parameters<AppRouterInstance['replace']>[1]) => {
    startTransition(() => {
      router.replace(url, options)
    })
  }

  return {
    navigate,
    replace,
    isPending,
    pathname,
  }
}

