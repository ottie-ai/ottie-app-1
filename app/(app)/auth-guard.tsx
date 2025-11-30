'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

/**
 * Auth Guard Component
 * 
 * Protects dashboard routes by redirecting unauthenticated users to login
 * Excludes /login, /signup, and /auth routes from protection
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  console.log('[AuthGuard] State:', { pathname, loading, user: user?.email, isPublicRoute })

  useEffect(() => {
    // Only redirect if not on a public route
    if (!loading && !user && !isPublicRoute) {
      console.log('[AuthGuard] No user, redirecting to login')
      router.push('/login?redirect=/overview')
    }
  }, [user, loading, router, isPublicRoute])

  // For public routes, always render children
  if (isPublicRoute) {
    console.log('[AuthGuard] Public route, rendering children')
    return <>{children}</>
  }

  if (loading) {
    console.log('[AuthGuard] Loading...')
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

