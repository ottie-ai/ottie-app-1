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
  
  // DEBUG: Log all IP headers
  console.log('[ACCESS CONTROL] IP Headers:')
  console.log('  - x-forwarded-for:', forwardedFor || '(not set)')
  console.log('  - x-real-ip:', realIp || '(not set)')
  console.log('  - cf-connecting-ip:', cfConnectingIp || '(not set)')
  
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
    console.log('[ACCESS CONTROL] Denying access - both lists are empty in restricted mode')
    console.log('[ACCESS CONTROL] HINT: Set ALLOWED_DOMAINS or ALLOWED_IPS environment variables')
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access denied',
        message: 'This site is currently restricted. Please contact the administrator.',
        debug: process.env.NODE_ENV === 'development' ? {
          reason: 'Both ALLOWED_DOMAINS and ALLOWED_IPS are empty in restricted mode',
          clientIp,
          hostname: hostnameWithoutPort
        } : undefined
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
  console.log('[ACCESS CONTROL] ❌ Access denied for:', { clientIp, hostname: hostnameWithoutPort })
  return new NextResponse(
    JSON.stringify({ 
      error: 'Access denied',
      message: 'This site is currently restricted. Please contact the administrator.',
      debug: process.env.NODE_ENV === 'development' ? {
        reason: 'IP or domain not in allowed lists',
        clientIp,
        hostname: hostnameWithoutPort,
        allowedDomains,
        allowedIps
      } : undefined
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
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  const hostname = request.headers.get('host') || ''

  // Skip access control for static assets and API routes
  const isStaticAsset = pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|otf)$/)
  const isApiRoute = pathname.startsWith('/api/')
  const isNextAsset = pathname.startsWith('/_next/')
  
  if (isStaticAsset || isApiRoute || isNextAsset) {
    // For static assets, skip all middleware processing
    return NextResponse.next()
  }

  // Check access control (after static asset check)
  const accessCheck = checkAccessControl(request)
  if (accessCheck) {
    return accessCheck
  }

  // Rate limiting for authentication endpoints
  const authEndpoints = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthEndpoint = authEndpoints.some(endpoint => pathname === endpoint || pathname.startsWith(endpoint + '/'))

  if (isAuthEndpoint) {
    const clientIp = getClientIp(request)
    
    // Different rate limits for different endpoints
    let limit: number
    let windowMs: number

    if (pathname === '/login' || pathname.startsWith('/login')) {
      // Login: 15 attempts per 15 minutes (allows for typos and password issues)
      limit = 15
      windowMs = 15 * 60 * 1000
    } else if (pathname === '/signup' || pathname.startsWith('/signup')) {
      // Signup: 5 attempts per 15 minutes (allows for form validation errors)
      limit = 5
      windowMs = 15 * 60 * 1000
    } else if (pathname === '/forgot-password' || pathname.startsWith('/forgot-password')) {
      // Password reset: 5 attempts per hour (prevents abuse but allows legitimate use)
      limit = 5
      windowMs = 60 * 60 * 1000
    } else if (pathname === '/reset-password' || pathname.startsWith('/reset-password')) {
      // Reset password (form submission): 10 attempts per hour
      limit = 10
      windowMs = 60 * 60 * 1000
    } else {
      // Default: 20 requests per 15 minutes
      limit = 20
      windowMs = 15 * 60 * 1000
    }

    if (!checkRateLimit(clientIp, limit, windowMs)) {
      // Get the reset time from the rate limit record
      const record = rateLimit.get(clientIp)
      const retryAfterMs = record ? Math.max(0, record.resetTime - Date.now()) : windowMs
      const retryAfterMinutes = Math.ceil(retryAfterMs / (60 * 1000))
      
      // For login/signup pages, redirect with query parameter instead of returning error
      if (pathname === '/login' || pathname.startsWith('/login')) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('rateLimit', 'true')
        redirectUrl.searchParams.set('retryAfter', String(retryAfterMinutes))
        // Preserve existing redirect parameter if present
        const existingRedirect = url.searchParams.get('redirect')
        if (existingRedirect) {
          redirectUrl.searchParams.set('redirect', existingRedirect)
        }
        return NextResponse.redirect(redirectUrl)
      } else if (pathname === '/signup' || pathname.startsWith('/signup')) {
        const redirectUrl = new URL('/signup', request.url)
        redirectUrl.searchParams.set('rateLimit', 'true')
        redirectUrl.searchParams.set('retryAfter', String(retryAfterMinutes))
        // Preserve existing redirect parameter if present
        const existingRedirect = url.searchParams.get('redirect')
        if (existingRedirect) {
          redirectUrl.searchParams.set('redirect', existingRedirect)
        }
        return NextResponse.redirect(redirectUrl)
      }
      
      // For other endpoints, return 429 error
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
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
  const sitesDomain = 'ottie.site' // Domain for published sites
  
  // Use x-forwarded-host for Vercel (more reliable than host header)
  const forwardedHost = request.headers.get('x-forwarded-host') || hostname
  const hostnameWithoutPort = forwardedHost.split(':')[0]
  const isLocalhost = hostnameWithoutPort.includes('localhost')
  
  // Check if this is ottie.site domain (for published sites)
  const isOttieSiteDomain = hostnameWithoutPort === sitesDomain || hostnameWithoutPort.endsWith(`.${sitesDomain}`)
  
  console.log('[Middleware] Hostname:', hostnameWithoutPort)
  console.log('[Middleware] Forwarded host:', forwardedHost)
  console.log('[Middleware] Is ottie.site domain:', isOttieSiteDomain)
  console.log('[Middleware] Sites domain:', sitesDomain)
  
  // NOTE: Vercel redirects ottie.com → www.ottie.com (HTTP 307)
  // So all requests to ottie.com come to middleware as www.ottie.com
  // We need to block site routes on BOTH ottie.com AND www.ottie.com
  
  // Redirect ottie.site root (without subdomain) to www.ottie.com
  // (Vercel redirects ottie.site → www.ottie.site, but we redirect to ottie.com)
  if (!isLocalhost && hostnameWithoutPort === sitesDomain) {
    console.log('[Middleware] Redirecting ottie.site root to www.ottie.com')
    const redirectUrl = new URL(pathname, `https://www.${rootDomainWithoutPort}`)
    redirectUrl.search = request.nextUrl.search // Preserve query params
    return NextResponse.redirect(redirectUrl, 301) // Permanent redirect
  }
  
  // CRITICAL: Block any site routes on ottie.com AND www.ottie.com (root domain)
  // Sites should ONLY be accessible on ottie.site subdomains
  // Marketing routes (/, /privacy, /terms) are ALWAYS publicly accessible on ottie.com
  // NOTE: Vercel redirects ottie.com → www.ottie.com, so we check for both
  const isRootDomain = !isLocalhost && (
    hostnameWithoutPort === rootDomainWithoutPort || 
    hostnameWithoutPort === `www.${rootDomainWithoutPort}`
  )
  
  if (isRootDomain) {
    // Marketing routes that are always publicly accessible
    const marketingRoutes = ['/', '/privacy', '/terms']
    const isMarketingRoute = marketingRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
    
    // Auth routes are also allowed (they redirect to app subdomain if needed)
    const authRoutes = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password']
    const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
    
    // Preview routes - require authentication (handled in the route itself)
    const isPreviewRoute = pathname.startsWith('/preview/')
    
    // API routes are allowed
    const isApiRoute = pathname.startsWith('/api/')
    
    // If it's a marketing, auth, preview, or API route, allow it to continue
    // Marketing routes are handled by (marketing) route group and are always public
    // Preview routes are handled by preview route group and require authentication
    if (isMarketingRoute || isAuthRoute || isPreviewRoute || isApiRoute) {
      // Allow these routes - continue to route groups
      // Marketing will be handled by (marketing) route group
      // Preview will be handled by preview route group
      console.log('[Middleware] Allowing route on root domain:', pathname)
    } else {
      // ANY other path on ottie.com is BLOCKED
      // Sites should ONLY be accessible on ottie.site subdomains
      console.log('[Middleware] BLOCKING site route on root domain:', pathname)
      console.log('[Middleware] Sites are only accessible on ottie.site subdomains (e.g., testujem.ottie.site)')
      const redirectUrl = new URL('/', `https://${rootDomainWithoutPort}`)
      return NextResponse.redirect(redirectUrl, 301)
    }
  }
  
  // Redirect www.app.* to app.* (remove www prefix from app subdomain)
  if (!isLocalhost && hostnameWithoutPort.startsWith('www.app.')) {
    // Extract everything after 'www.app.' to get the rest of the domain
    const restOfDomain = hostnameWithoutPort.replace('www.app.', 'app.')
    const redirectUrl = new URL(pathname, `${request.nextUrl.protocol}//${restOfDomain}`)
    redirectUrl.search = request.nextUrl.search // Preserve query params
    return NextResponse.redirect(redirectUrl, 301) // Permanent redirect
  }
  
  // Redirect app subdomain root (/) to /dashboard
  const isAppSubdomain = isLocalhost 
    ? hostnameWithoutPort.startsWith('app.')
    : (hostnameWithoutPort === appDomain || hostnameWithoutPort.startsWith('app.'))
  
  if (isAppSubdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  let response: NextResponse
  
  // Handle sites subdomain routing (needs rewrite to [site] dynamic route)
  if (!isLocalhost) {
    // Production: Check for client subdomain on ottie.site
    // Exclude: root domain, www.root, app domain, www.app.*, and any app.* subdomain
    const isAppOrMarketingDomain = 
      hostnameWithoutPort === rootDomainWithoutPort || 
      hostnameWithoutPort === `www.${rootDomainWithoutPort}` || 
      hostnameWithoutPort === appDomain || 
      hostnameWithoutPort.startsWith('app.') ||
      hostnameWithoutPort.startsWith('www.app.')
    
    // Check if this is an ottie.site subdomain (e.g., mysite.ottie.site)
    if (isOttieSiteDomain && !isAppOrMarketingDomain) {
      // Extract subdomain from ottie.site (e.g., "mysite" from "mysite.ottie.site")
      const subdomain = hostnameWithoutPort.replace(`.${sitesDomain}`, '').split('.')[0]
      
      console.log('[Middleware] ottie.site subdomain detected:', subdomain)
      console.log('[Middleware] Original pathname:', pathname)
      
      // Rewrite to (z-sites)/[site] route
      // For root path, rewrite to /[site], for other paths, rewrite to /[site]/path
      const rewritePath = pathname === '/' ? `/${subdomain}` : `/${subdomain}${pathname}`
      console.log('[Middleware] Rewriting to path:', rewritePath)
      
      url.pathname = rewritePath
      response = NextResponse.rewrite(url)
      console.log('[Middleware] Rewrite complete, new pathname:', url.pathname)
    } else if (!isAppOrMarketingDomain && !isOttieSiteDomain) {
      // Check if this is a brand domain (custom domain for workspace)
      // Brand domains are ONLY for sites, not for app routes
      
      // First, check if this is an app route - if so, redirect to app.ottie.com
      const appRoutes = ['/dashboard', '/sites', '/settings', '/client-portals', '/login', '/signup', '/auth']
      const isAppRoute = appRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || 
                         pathname.startsWith('/builder/')
      
      if (isAppRoute) {
        // App route on brand domain - redirect to app subdomain
        const redirectUrl = new URL(pathname, `https://${appDomain}`)
        redirectUrl.search = request.nextUrl.search
        return NextResponse.redirect(redirectUrl, 301)
      }
      
      // Import dynamically to avoid issues with server-only modules in middleware
      const { getWorkspaceByBrandDomain } = await import('@/lib/data/brand-domain-data')
      const brandDomainResult = await getWorkspaceByBrandDomain(hostnameWithoutPort, request)
      
      console.log('[Middleware] Brand domain lookup result:', {
        hostname: hostnameWithoutPort,
        found: !!brandDomainResult,
        verified: brandDomainResult?.verified,
        workspaceId: brandDomainResult?.workspace?.id,
      })
      
      if (brandDomainResult && brandDomainResult.verified) {
        // Brand domain detected - route to site based on path
        // Brand domains ONLY serve sites, not app routes
        const pathSegments = pathname.split('/').filter(Boolean)
        
        if (pathSegments.length === 0) {
          // Root path on brand domain - redirect to root domain of the brand domain
          // For example: properties.ottie.ai -> ottie.ai
          const domainParts = hostnameWithoutPort.split('.')
          // Extract root domain (last 2 parts: domain.tld)
          const brandRootDomain = domainParts.slice(-2).join('.')
          const redirectUrl = new URL('/', `https://${brandRootDomain}`)
          console.log('[Middleware] Root path on brand domain, redirecting to root domain:', brandRootDomain)
          return NextResponse.redirect(redirectUrl, 301)
        }
        
        // Extract site slug from first path segment
        const siteSlug = pathSegments[0]
        const remainingPath = pathSegments.slice(1).join('/')
        const rewritePath = remainingPath ? `/${siteSlug}/${remainingPath}` : `/${siteSlug}`
        
        console.log('[Middleware] Brand domain detected:', hostnameWithoutPort)
        console.log('[Middleware] Site slug:', siteSlug)
        console.log('[Middleware] Rewriting to:', rewritePath)
        
        // Create new request headers with brand domain info
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-workspace-id', brandDomainResult.workspace.id)
        requestHeaders.set('x-brand-domain', hostnameWithoutPort)
        
        // Rewrite URL and pass headers
        url.pathname = rewritePath
        response = NextResponse.rewrite(url, {
          request: {
            headers: requestHeaders,
          },
        })
      } else {
        // Other subdomains (not ottie.site, not app/marketing, not brand domain)
        // If brand domain exists but not verified, redirect to root domain
        if (brandDomainResult && !brandDomainResult.verified) {
          const domainParts = hostnameWithoutPort.split('.')
          const brandRootDomain = domainParts.slice(-2).join('.')
          const redirectUrl = new URL(pathname, `https://${brandRootDomain}`)
          redirectUrl.search = request.nextUrl.search
          console.log('[Middleware] Brand domain not verified, redirecting to root domain:', brandRootDomain)
          return NextResponse.redirect(redirectUrl, 301)
        }
        
        // Unknown domain - redirect to ottie.com
        const redirectUrl = new URL(pathname, `https://${rootDomainWithoutPort}`)
        redirectUrl.search = request.nextUrl.search
        return NextResponse.redirect(redirectUrl, 301)
      }
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
      const workspaceRoutes = ['/dashboard', '/sites', '/settings', '/client-portals']
      const isWorkspaceRoute = workspaceRoutes.includes(pathname) || pathname.startsWith('/builder/')
      
      if (isWorkspaceRoute) {
        // Workspace/builder route on app.localhost - ensure it goes to (app) route group
        // We pass through and Next.js should match (app)/dashboard
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
      const appRoutes = ['/dashboard', '/sites', '/settings', '/client-portals', '/login', '/signup', '/auth']
      const isAppRoute = appRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || 
                         pathname.startsWith('/builder/')
      
      // Preview routes are allowed on root localhost (they require auth)
      const isPreviewRoute = pathname.startsWith('/preview/')
      
      if (isAppRoute) {
        // Redirect app routes to app.localhost subdomain
        const port = hostname.split(':')[1] || '3000'
        const appUrl = new URL(pathname, `http://app.localhost:${port}`)
        appUrl.search = url.search // Preserve query params
        return NextResponse.redirect(appUrl)
      } else if (pathname === '/' || pathname.startsWith('/privacy') || pathname.startsWith('/terms')) {
        // Marketing routes - no rewrite needed
        response = NextResponse.next()
      } else if (isPreviewRoute) {
        // Preview routes - allow on root localhost
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
 * 
 * OPTIMIZATION: Only validates with Supabase server if session cookie exists.
 * This avoids network requests on every navigation when user is not logged in.
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

  // OPTIMIZATION: Check for session cookie first (no network request)
  // Supabase SSR stores session in cookies with prefix 'sb-<project-ref>-auth-token'
  const hasSessionCookie = request.cookies.getAll().some(
    cookie => cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  )

  // If no session cookie, skip validation (auth guard will handle redirect)
  // This avoids network request to Supabase on every navigation when user is not logged in
  if (!hasSessionCookie) {
    return response
  }

  // For protected routes with session cookie, refresh session using standard cookie handling
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

  // Validate user with Supabase server only if session cookie exists
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
     * Protected routes: /dashboard, /sites, /settings, /client-portals, /builder/* require authentication.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
