import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware for Subdomain Routing & Supabase Session Refresh
 * 
 * This middleware handles:
 * 1. Subdomain routing:
 *    - app.ottie.com (or app.localhost) -> Routes to (app) route group
 *    - ottie.com (or localhost) -> Routes to (marketing) route group  
 *    - *.ottie.com (any other subdomain) -> Routes to (z-sites)/[site] route group
 * 2. Supabase session refresh for authenticated routes
 * 
 * Note: In Next.js, route groups (parentheses) don't appear in URLs.
 * We need to ensure the correct route group is matched based on subdomain.
 * Since Next.js matches routes by pathname, we don't need to rewrite for route groups.
 * However, for sites subdomain, we need to rewrite to the dynamic [site] route.
 */

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  const hostname = request.headers.get('host') || ''

  // Get root domain from environment (default to localhost for development)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const appDomain = `app.${rootDomain.split(':')[0]}` // Remove port for domain comparison
  
  // Extract subdomain (remove port for localhost)
  const hostnameWithoutPort = hostname.split(':')[0]
  const isLocalhost = hostnameWithoutPort.includes('localhost')
  
  // Redirect app subdomain root (/) to /overview
  const isAppSubdomain = isLocalhost 
    ? hostnameWithoutPort.startsWith('app.')
    : (hostnameWithoutPort === appDomain || hostnameWithoutPort.startsWith('app.'))
  
  if (isAppSubdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/overview', request.url))
  }
  
  let response: NextResponse
  
  // Handle sites subdomain routing (needs rewrite to [site] dynamic route)
  if (!isLocalhost) {
    // Production: Check for client subdomain
    if (hostnameWithoutPort !== rootDomain && 
        hostnameWithoutPort !== `www.${rootDomain}` && 
        hostnameWithoutPort !== appDomain && 
        !hostnameWithoutPort.startsWith('app.')) {
      // Client subdomain -> rewrite to (z-sites)/[site] route
      const subdomain = hostnameWithoutPort.split('.')[0]
      url.pathname = `/${subdomain}${pathname === '/' ? '' : pathname}`
      response = NextResponse.rewrite(url)
    } else {
      // App or marketing domain - no rewrite needed, Next.js will match route groups automatically
      response = NextResponse.next()
    }
  } else {
    // Localhost: Check for subdomain simulation
    if (hostnameWithoutPort.startsWith('app.')) {
      // app.localhost - all routes should go to (app) route group
      // We need to ensure workspace/builder routes are explicitly routed to (app)
      // by checking if it's a workspace route and passing through without rewrite
      // Next.js will match (app) routes first due to alphabetical order
      const workspaceRoutes = ['/overview', '/sites', '/settings', '/client-portals']
      const isWorkspaceRoute = workspaceRoutes.includes(pathname) || pathname.startsWith('/builder/')
      
      if (isWorkspaceRoute) {
        // Workspace/builder route on app.localhost - ensure it goes to (app) route group
        // We pass through and Next.js should match (app)/workspace/overview
        response = NextResponse.next()
      } else {
        // Other routes on app.localhost - also go to (app) route group
        response = NextResponse.next()
      }
    } else if (hostnameWithoutPort !== 'localhost' && hostnameWithoutPort !== '127.0.0.1') {
      // Other localhost subdomains -> rewrite to (z-sites)/[site] route
      const subdomain = hostnameWithoutPort.split('.')[0]
      url.pathname = `/${subdomain}${pathname === '/' ? '' : pathname}`
      response = NextResponse.rewrite(url)
    } else {
      // Root localhost - need to distinguish between workspace/builder routes and sites routes
      // Workspace/builder routes should go to (app) route group
      // Sites routes should go to (z-sites)/[site] route group
      const workspaceRoutes = ['/overview', '/sites', '/settings', '/client-portals']
      const isWorkspaceRoute = workspaceRoutes.includes(pathname) || pathname.startsWith('/builder/')
      
      if (isWorkspaceRoute) {
        // Workspace/builder route -> ensure it goes to (app) route group
        // We can't rewrite to route group syntax, but we can add a header to help Next.js
        // prioritize the correct route. However, Next.js should already prioritize static routes
        // over dynamic ones, so we just pass through and let Next.js match correctly.
        // The key is that (app)/workspace/overview is a static route, while (sites)/[site] is dynamic.
        response = NextResponse.next()
      } else if (pathname !== '/' && !pathname.startsWith('/privacy') && !pathname.startsWith('/terms') && 
                 !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/auth')) {
          // Other paths on root localhost that aren't marketing/auth routes -> treat as site route
          // Extract the first segment as site slug and rewrite to (z-sites)/[site] route
        const pathSegments = pathname.split('/').filter(Boolean)
        if (pathSegments.length > 0) {
          const siteSlug = pathSegments[0]
          // Rewrite to /[site] format for (sites) route group
          url.pathname = `/${siteSlug}${pathname.substring(`/${siteSlug}`.length) || '/'}`
          response = NextResponse.rewrite(url)
        } else {
          response = NextResponse.next()
        }
      } else {
        // Marketing/auth routes - no rewrite needed
        response = NextResponse.next()
      }
    }
  }
  
  // Handle Supabase session refresh for protected routes
  return await handleSupabaseSession(request, response, pathname)
}

/**
 * Handle Supabase session refresh
 */
async function handleSupabaseSession(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): Promise<NextResponse> {
  // Public routes that don't need auth session refresh
  const publicRoutes = ['/', '/privacy', '/terms', '/login', '/signup', '/auth']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // For public routes, just pass through without session refresh
  if (isPublicRoute) {
    return response
  }

  // For protected routes, refresh session using standard cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * 
     * Note: Public routes (/, /privacy, /terms, /login, /signup, /auth) are handled in middleware
     * and don't require session refresh, but still go through middleware.
     * Protected routes: /overview, /sites, /settings, /client-portals, /builder/* require authentication.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
