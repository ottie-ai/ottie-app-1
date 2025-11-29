'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface UseUnsavedChangesOptions {
  hasChanges: boolean
  onNavigationAttempt: (targetPath: string) => void
}

/**
 * Hook to intercept navigation when there are unsaved changes
 * Intercepts both Link clicks and browser back/forward
 */
export function useUnsavedChanges({ hasChanges, onNavigationAttempt }: UseUnsavedChangesOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const hasChangesRef = useRef(hasChanges)
  const isHandlingBackRef = useRef(false)

  // Keep ref in sync with prop
  useEffect(() => {
    hasChangesRef.current = hasChanges
  }, [hasChanges])

  // Push initial state to enable back button interception
  useEffect(() => {
    if (hasChanges) {
      // Push a state so we can intercept back button
      window.history.pushState({ unsavedChanges: true }, '', pathname)
    }
  }, [hasChanges, pathname])

  // Intercept link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only intercept if we have unsaved changes
      if (!hasChangesRef.current) return

      // Find the closest anchor tag
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Skip external links
      if (href.startsWith('http') || href.startsWith('//')) return

      // Skip same page links (anchors)
      if (href.startsWith('#')) return

      // Skip if it's the same page
      if (href === pathname) return

      // Skip settings subpages (tabs are handled separately)
      if (href.startsWith('/settings')) return

      // Prevent navigation and show dialog
      e.preventDefault()
      e.stopPropagation()
      onNavigationAttempt(href)
    }

    // Use capture phase to intercept before the link navigates
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, onNavigationAttempt])

  // Intercept browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Prevent infinite loop
      if (isHandlingBackRef.current) return
      
      if (hasChangesRef.current) {
        isHandlingBackRef.current = true
        
        // Push state back to prevent navigation
        window.history.pushState({ unsavedChanges: true }, '', pathname)
        
        // Show dialog
        onNavigationAttempt('back')
        
        // Reset flag after a short delay
        setTimeout(() => {
          isHandlingBackRef.current = false
        }, 100)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [pathname, onNavigationAttempt])

  // Navigate to path (called after user confirms)
  const navigateTo = useCallback((path: string) => {
    // Clear the extra history state we added
    if (path === 'back') {
      // Go back twice - once for our pushed state, once for actual back
      window.history.go(-2)
    } else {
      router.push(path)
    }
  }, [router])

  return { navigateTo }
}

