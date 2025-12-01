import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rate limiting storage
 * In production, consider using Redis or a database for distributed rate limiting
 * 
 * Note: Expired records are automatically cleaned up in checkRateLimit()
 * when a new request comes in for that IP, so no manual cleanup is needed.
 */
const rateLimit = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit for an IP address
 * @param ip - Client IP address
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limit exceeded
 */
function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)

  if (!record || now > record.resetTime) {
    // No record or window expired - create new record
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return false
  }

  // Increment count
  record.count++
  return true
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // The first IP is usually the original client IP
  return forwardedFor?.split(',')[0]?.trim() ||
         realIp?.trim() ||
         cfConnectingIp?.trim() ||
         'unknown'
}

/**
 * Middleware for Subdomain Routing & Supabase Session Refresh
 * 
 * This middleware handles:
 * 1. Access control (domain/IP restrictions)
 * 2. Subdomain routing:
 *    - app.ottie.com (or app.localhost) -> Routes to (app) route group
 *    - ottie.com (or localhost) -> Routes to (marketing) route group  
 *    - *.ottie.com (any other subdomain) -> Routes to (z-sites)/[site] route group
 * 3. Supabase session refresh for authenticated routes
 * 
 * Note: In Next.js, route groups (parentheses) don't appear in URLs.
 * We need to ensure the correct route group is matched based on subdomain.
 * Since Next.js matches routes by pathname, we don't need to rewrite for route groups.
 * However, for sites subdomain, we need to rewrite to the dynamic [site] route.
 */

/**
 * Check if access should be restricted based on domain/IP
 * 
 * Environment variables:
 * - NEXT_PUBLIC_ACCESS_MODE: 'public' | 'restricted' (default: 'public')
 *   Note: Using NEXT_PUBLIC_ prefix for middleware compatibility in Next.js
 * - ALLOWED_DOMAINS: comma-separated list of allowed domains (e.g., 'example.com,app.example.com')
 * - ALLOWED_IPS: comma-separated list of allowed IPs (e.g., '1.2.3.4,5.6.7.8')
 */
function checkAccessControl(request: NextRequest): NextResponse | null {
  // Use NEXT_PUBLIC_ prefix for middleware compatibility
  // Fallback to ACCESS_MODE for backward compatibility
  const accessMode = process.env.NEXT_PUBLIC_ACCESS_MODE || process.env.ACCESS_MODE || 'public'
  const hostname = request.headers.get('host') || ''
  
  // DEBUG: Log access control values
  console.log('[ACCESS CONTROL] ACCESS_MODE:', accessMode)
  console.log('[ACCESS CONTROL] ALLOWED_DOMAINS:', process.env.ALLOWED_DOMAINS || '(empty)')
  console.log('[ACCESS CONTROL] ALLOWED_IPS:', process.env.ALLOWED_IPS || '(empty)')
  console.log('[ACCESS CONTROL] Hostname:', hostname)
  
  // If public mode, allow all access
  if (accessMode === 'public') {
    console.log('[ACCESS CONTROL] Allowing access - public mode')
    return null
  }
  
  console.log('[ACCESS CONTROL] Restricted mode - checking access')
  
  // Restricted mode - check domain and IP
  const hostnameWithoutPort = hostname.split(':')[0]
  
  // Extract client IP from headers (Next.js 15+ removed request.ip)
  // Priority: x-forwarded-for (first IP in chain) > x-real-ip > cf-connecting-ip > unknown
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
  
  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // The first IP is usually the original client IP
  const clientIp = forwardedFor?.split(',')[0]?.trim() ||
                   realIp?.trim() ||
                   cfConnectingIp?.trim() ||
                   'unknown'
  
  // Always allow localhost for development
  if (hostnameWithoutPort.includes('localhost') || hostnameWithoutPort === '127.0.0.1') {
    return null
  }
  
  // Get allowed domains and IPs from environment
  const allowedDomains = (process.env.ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim())
    .filter(Boolean)
  
  const allowedIps = (process.env.ALLOWED_IPS || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean)
  
  // In restricted mode, if both lists are empty, deny all access (security)
  if (allowedDomains.length === 0 && allowedIps.length === 0) {
    console.log('[ACCESS CONTROL] Denying access - both lists are empty')
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access denied',
        message: 'This site is currently restricted. Please contact the administrator.'
      }),
      { 
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
        }
      }
    )
  }
  
  // Check if domain is allowed (only if domain list is not empty)
  const isDomainAllowed = allowedDomains.length > 0 && 
    allowedDomains.some(domain => {
      // Exact match or subdomain match
      return hostnameWithoutPort === domain || 
             hostnameWithoutPort.endsWith('.' + domain) ||
             hostnameWithoutPort === `www.${domain}`
    })
  
  // Check if IP is allowed (only if IP list is not empty)
  const isIpAllowed = allowedIps.length > 0 && 
    allowedIps.includes(clientIp)
  
  // Allow if domain OR IP is allowed
  console.log('[ACCESS CONTROL] Domain allowed:', isDomainAllowed, 'IP allowed:', isIpAllowed)
  console.log('[ACCESS CONTROL] Client IP:', clientIp)
  console.log('[ACCESS CONTROL] Allowed domains:', allowedDomains)
  console.log('[ACCESS CONTROL] Allowed IPs:', allowedIps)
  
  if (isDomainAllowed || isIpAllowed) {
    console.log('[ACCESS CONTROL] Allowing access - domain or IP matches')
    return null
  }
  
  // Access denied - return 403
  console.log('[ACCESS CONTROL] Denying access - no match found')
  return new NextResponse(
    JSON.stringify({ 
      error: 'Access denied',
      message: 'This site is currently restricted. Please contact the administrator.'
    }),
    { 
      status: 403,
      headers: { 
        'Content-Type': 'application/json',
      }
    }
  )
}

export async function middleware(request: NextRequest) {
  // Check access control first (before routing)
  const accessCheck = checkAccessControl(request)
  if (accessCheck) {
    return accessCheck
  }

  const url = request.nextUrl.clone()
  const pathname = url.pathname
  const hostname = request.headers.get('host') || ''

  // Rate limiting for authentication endpoints
  const authEndpoints = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthEndpoint = authEndpoints.some(endpoint => pathname === endpoint || pathname.startsWith(endpoint + '/'))

  if (isAuthEndpoint) {
    const clientIp = getClientIp(request)
    
    // Different rate limits for different endpoints
    let limit: number
    let windowMs: number

    if (pathname === '/login' || pathname.startsWith('/login')) {
      // Login: 5 attempts per 15 minutes
      limit = 5
      windowMs = 15 * 60 * 1000
    } else if (pathname === '/signup' || pathname.startsWith('/signup')) {
      // Signup: 3 attempts per 15 minutes
      limit = 3
      windowMs = 15 * 60 * 1000
    } else if (pathname === '/forgot-password' || pathname.startsWith('/forgot-password')) {
      // Password reset: 3 attempts per hour
      limit = 3
      windowMs = 60 * 60 * 1000
    } else if (pathname === '/reset-password' || pathname.startsWith('/reset-password')) {
      // Reset password (form submission): 5 attempts per hour
      limit = 5
      windowMs = 60 * 60 * 1000
    } else {
      // Default: 10 requests per 15 minutes
      limit = 10
      windowMs = 15 * 60 * 1000
    }

    if (!checkRateLimit(clientIp, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(windowMs / 1000)),
          },
        }
      )
    }
  }

  // Get root domain from environment (default to localhost for development)
  // In production, this should be set to your actual domain (e.g., 'ottie.com')
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const rootDomainWithoutPort = rootDomain.split(':')[0]
  const appDomain = `app.${rootDomainWithoutPort}` // Remove port for domain comparison
  
  // Extract subdomain (remove port for localhost)
  const hostnameWithoutPort = hostname.split(':')[0]
  const isLocalhost = hostnameWithoutPort.includes('localhost')
  
  // Redirect www.app.* to app.* (remove www prefix from app subdomain)
  if (!isLocalhost && hostnameWithoutPort.startsWith('www.app.')) {
    // Extract everything after 'www.app.' to get the rest of the domain
    const restOfDomain = hostnameWithoutPort.replace('www.app.', 'app.')
    const redirectUrl = new URL(pathname, `${request.nextUrl.protocol}//${restOfDomain}`)
    redirectUrl.search = request.nextUrl.search // Preserve query params
    return NextResponse.redirect(redirectUrl, 301) // Permanent redirect
  }
  
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
    // Exclude: root domain, www.root, app domain, www.app.*, and any app.* subdomain
    const isAppOrMarketingDomain = 
      hostnameWithoutPort === rootDomainWithoutPort || 
      hostnameWithoutPort === `www.${rootDomainWithoutPort}` || 
      hostnameWithoutPort === appDomain || 
      hostnameWithoutPort.startsWith('app.') ||
      hostnameWithoutPort.startsWith('www.app.')
    
    if (!isAppOrMarketingDomain) {
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
        // We pass through and Next.js should match (app)/overview
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
      // Root localhost (localhost:3000) - only marketing routes allowed
      // App routes should redirect to app.localhost subdomain
      const appRoutes = ['/overview', '/sites', '/settings', '/client-portals', '/login', '/signup', '/auth']
      const isAppRoute = appRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || 
                         pathname.startsWith('/builder/')
      
      if (isAppRoute) {
        // Redirect app routes to app.localhost subdomain
        const port = hostname.split(':')[1] || '3000'
        const appUrl = new URL(pathname, `http://app.localhost:${port}`)
        appUrl.search = url.search // Preserve query params
        return NextResponse.redirect(appUrl)
      } else if (pathname === '/' || pathname.startsWith('/privacy') || pathname.startsWith('/terms')) {
        // Marketing routes - no rewrite needed
        response = NextResponse.next()
      } else {
        // Other paths -> treat as site route (z-sites)
        const pathSegments = pathname.split('/').filter(Boolean)
        if (pathSegments.length > 0) {
          const siteSlug = pathSegments[0]
          url.pathname = `/${siteSlug}${pathname.substring(`/${siteSlug}`.length) || '/'}`
          response = NextResponse.rewrite(url)
        } else {
          response = NextResponse.next()
        }
      }
    }
  }
  
  // Handle Supabase session refresh for protected routes
  try {
  return await handleSupabaseSession(request, response, pathname)
  } catch (error) {
    // Log error but don't break the request
    console.error('Middleware error:', error)
    return response
  }
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase env vars are missing, just return response without session refresh
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are missing, skipping session refresh')
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  // Validate user with Supabase server
  // This detects deleted users and clears invalid sessions
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // User doesn't exist or session is invalid
      // Clear the session cookies by signing out
      await supabase.auth.signOut()
      
      // If on a protected route, redirect to login
      const inviteRoute = pathname.startsWith('/invite/')
      if (!inviteRoute) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  } catch (error) {
    // If session validation fails, continue - auth guard will handle it
    console.warn('Session validation failed:', error)
  }

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
