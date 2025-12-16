'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useOptimisticNavigation } from '@/hooks/use-optimistic-navigation'
import { LottieSpinner } from '@/components/ui/lottie-spinner'

/**
 * Auth Guard Component
 * 
 * Protects dashboard routes by redirecting unauthenticated users to login
 * Excludes /login, /signup, and /auth routes from protection
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { navigate } = useOptimisticNavigation()
  const pathname = usePathname()

  // Public routes that don't need authentication
  // /invite routes are public because non-authenticated users need to see the invitation
  const publicRoutes = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password', '/invite']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  
  // Preview routes need white background during loading, not workspace background
  // Builder routes are in separate (builder) route group, so they don't use this AuthGuard
  const isPreviewRoute = pathname?.startsWith('/preview/')

  console.log('[AuthGuard] State:', { pathname, loading, user: user?.email, isPublicRoute, isPreviewRoute })

  useEffect(() => {
    // Only redirect if not on a public route
    if (!loading && !user && !isPublicRoute) {
      console.log('[AuthGuard] No user, redirecting to login')
      // Preserve the current pathname in redirect so user returns after login
      // Use optimistic navigation for instant UI update
      navigate(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, navigate, isPublicRoute, pathname])

  // For public routes, always render children
  if (isPublicRoute) {
    console.log('[AuthGuard] Public route, rendering children')
    return <>{children}</>
  }

  if (loading) {
    console.log('[AuthGuard] Loading...')
    // For preview routes, return null - their own loading will run
    // Builder routes are in separate (builder) route group, so they don't use this AuthGuard
    if (isPreviewRoute) return null
    // For workspace routes, show loader
    return (
      <div className="flex h-screen items-center justify-center">
        <LottieSpinner size={32} />
      </div>
    )
  }

  if (!user) {
    console.log('[AuthGuard] No user, returning null')
    return null
  }

  console.log('[AuthGuard] User authenticated, rendering children')
  return <>{children}</>
}

