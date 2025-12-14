import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PageConfig, Section } from '@/types/builder'
import { PasswordCheck } from './password-check'
import { SiteContentClient } from './site-content-client'

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  try {
    const { site } = await params
    const siteData = await getSiteConfig(site)
    
    if (!siteData) {
      return {
        title: 'Site Not Found',
        description: 'The requested site could not be found.',
        robots: 'noindex, nofollow', // Don't index 404 pages
      }
    }

    const { config: siteConfig } = siteData

    // Extract site title from first section (usually Hero)
    // Handle case where sections might be empty or undefined
    const heroSection = siteConfig?.sections?.find((s: Section) => s.type === 'hero')
    const siteTitle = (heroSection?.data as any)?.title || siteData.site?.title || 'Property Site'
    const siteSubtitle = (heroSection?.data as any)?.subtitle || ''
    
    // Canonical URL for SEO - only on ottie.site subdomain
    const canonicalUrl = `https://${site}.ottie.site`

    return {
      title: siteTitle,
      description: siteSubtitle || `View ${siteTitle} - Real estate property listing.`,
      robots: 'index, follow', // Allow indexing on ottie.site subdomains
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: siteTitle,
        description: siteSubtitle || `View ${siteTitle} - Real estate property listing.`,
        url: canonicalUrl,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('[generateMetadata] Error:', error)
    return {
      title: 'Site Error',
      description: 'An error occurred while loading the site.',
      robots: 'noindex, nofollow',
    }
  }
}

/**
 * Public Site Page - Dynamically Rendered Client Sites
 * 
 * This page is rendered for user-generated public sites (e.g., jozko.ottie.com)
 * The [site] parameter contains the subdomain/slug extracted by middleware
 * 
 * HOW IT WORKS:
 * 1. Middleware extracts subdomain from URL (e.g., "jozko" from "jozko.ottie.com")
 * 2. Middleware rewrites request to this route with params.site = "jozko"
 * 3. This component fetches site configuration from Supabase using the subdomain
 * 4. Site config contains JSON with theme, sections, and content
 * 5. We render the site using SectionRenderer with the fetched data
 * 
 * IMPORTANT: This route should NOT catch workspace/builder routes.
 * Workspace routes (/dashboard, /sites, /settings, /client-portals) and
 * builder routes (/builder/*) are handled by (app) route group.
 * 
 * The "z-" prefix in the route group name ensures this route group is checked
 * AFTER (app) route group, so static routes in (app) take priority over this
 * dynamic [site] route.
 * 
 * DATABASE STRUCTURE (TODO - when implementing):
 * Table: sites
 * - subdomain (text, unique) -> e.g., "jozko"
 * - custom_domain (text, unique, nullable) -> e.g., "jozkovarealitka.sk"
 * - theme_json (jsonb) -> ThemeConfig object (includes ctaType, ctaValue)
 * - content_json (jsonb) -> Array of Section objects
 * - published (boolean) -> Whether site is published
 * - created_at, updated_at (timestamps)
 * 
 * Note: CTA (Call-to-Action) button config is stored in theme_json.ctaType and theme_json.ctaValue
 * 
 * ROUTE PRIORITY:
 * This route should NOT catch workspace/builder routes. We use generateStaticParams to exclude
 * workspace routes, and also check in the component to return notFound() if a workspace route
 * somehow matches. This ensures (app)/workspace/* routes take priority.
 * 
 * IMPLEMENTATION EXAMPLE (when database is ready):
 * 
 * const { theme, sections, ctaType, ctaValue } = siteConfig
 * 
 * return (
 *   <>
 *     <FontLoader fontFamily={theme.fontFamily} headingFontFamily={theme.headingFontFamily} />
 *     <FontTransition />
 *     <div style={{ fontFamily: theme.fontFamily, backgroundColor: theme.backgroundColor, color: theme.textColor }}>
 *       {sections.map((section) => (
 *         <SectionRenderer key={section.id} section={section} theme={theme} colorScheme={section.colorScheme} />
 *       ))}
 *     </div>
 *     <FloatingCTAButton type={ctaType} value={ctaValue} colorScheme={sections[0]?.colorScheme || 'dark'} />
 *   </>
 * )
 */

/**
 * Fetch site configuration from database by slug
 * The slug comes from the subdomain (e.g., "231-keaton-street" from "231-keaton-street.ottie.site")
 * Only returns site if it's published
 */
async function getSiteConfig(slug: string, domain?: string, workspaceId?: string): Promise<{ site: any; config: PageConfig } | null> {
  try {
    const supabase = await createClient()
    
    // Build query - support both ottie.site and brand domains
    // SECURITY: Do NOT select password_hash - it's only needed for verification in server actions
    // Password verification is handled separately via verifySitePassword server action
    let query = supabase
      .from('sites')
      .select('*, password_protected')
      .eq('slug', slug)
      .eq('status', 'published') // Only published sites are accessible
      .is('deleted_at', null)
    
    // If workspaceId and brand domain are provided (from middleware headers), use brand domain directly
    // This avoids RLS issues when fetching workspace
    // Note: We don't filter by workspace_id here because RLS policy for brand domains doesn't require it
    // The domain filter is sufficient - RLS policy already ensures only published sites are accessible
    if (workspaceId && domain) {
      // Use brand domain directly from headers (middleware already verified it)
      query = query.eq('domain', domain)
      // Don't filter by workspace_id - RLS policy for brand domains allows public access
      // Filtering by workspace_id would require authenticated user, which we don't have for public sites
      // Only log in development - avoid exposing IDs in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[getSiteConfig] Using brand domain from headers:', { slug, domain })
      }
    } else if (workspaceId) {
      // WorkspaceId provided but no domain - try to get brand domain from workspace
      // This is fallback if headers weren't passed correctly
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('branding_config')
        .eq('id', workspaceId)
        .single()
      
      if (workspaceError) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[getSiteConfig] Error fetching workspace:', workspaceError)
        }
      }
      
      if (workspace?.branding_config) {
        const brandingConfig = workspace.branding_config as {
          custom_brand_domain?: string | null
          custom_brand_domain_verified?: boolean
        }
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[getSiteConfig] Workspace branding config:', {
            verified: brandingConfig.custom_brand_domain_verified,
          })
        }
        
        // If brand domain is verified, use it for filtering
        if (brandingConfig.custom_brand_domain_verified && brandingConfig.custom_brand_domain) {
          query = query.eq('domain', brandingConfig.custom_brand_domain)
        } else {
          // Brand domain not verified, but workspaceId provided - this shouldn't happen, but fallback to ottie.site
          query = query.eq('domain', 'ottie.site')
        }
      } else {
        // No branding config, fallback to ottie.site
        query = query.eq('domain', 'ottie.site')
      }
      
      // Also filter by workspace_id for additional security
      query = query.eq('workspace_id', workspaceId)
    } else if (domain) {
      // Domain provided directly (e.g., from ottie.site subdomain)
      query = query.eq('domain', domain)
    } else {
      // Default to ottie.site if no domain specified
      query = query.eq('domain', 'ottie.site')
    }
    
    // Use maybeSingle() instead of single() to avoid error when no rows found
    const { data: site, error } = await query.maybeSingle()
    
    // Only log in development - avoid exposing query details in production
    if (process.env.NODE_ENV === 'development') {
      console.log('[getSiteConfig] Site result:', { 
        found: !!site, 
        error: error ? { code: error.code, message: error.message } : null,
        slug,
      })
    }
    
    if (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[getSiteConfig] Error fetching site:', error)
      }
      return null
    }
    
    if (!site) {
      // Site not found - return null without logging sensitive info
      return null
    }
  
  // Extract config (PageConfig) from site.config
  const config = site.config as PageConfig | null
  
  // In dev mode, allow sites without config - just check if slug exists
  // Return site even if config is null (we'll show default site)
  if (!config) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[getSiteConfig] Site found but config is null - returning site without config for dev mode')
    }
    // Return site with empty config - will show default site
    return { 
      site, 
      config: { 
        theme: {
          fontFamily: 'Inter',
          headingFontFamily: 'Inter',
          headingFontSize: 1,
          headingLetterSpacing: 0,
          titleCase: 'sentence',
          primaryColor: '#000000',
          secondaryColor: '#666666',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          borderRadius: 'md',
        },
        sections: [] 
      } as PageConfig 
    }
  }
  
    return { site, config }
  } catch (error) {
    console.error('[getSiteConfig] Unexpected error:', error)
    return null
  }
}

/**
 * Generate static params - exclude workspace/builder routes
 * This helps Next.js prioritize (app) routes over this dynamic route
 */
export async function generateStaticParams() {
  // Return empty array to make this fully dynamic
  // But we exclude workspace routes in the component
  return []
}

export const dynamicParams = true
export const dynamic = 'force-dynamic' // Always render dynamically to support cookies/headers

export default async function SitePage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  // In Next.js 15+, params is a Promise
  const { site } = await params
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SitePage] Received slug:', site)
  }
  
  // IMPORTANT: Exclude workspace/builder routes - these should be handled by (app) route group
  // If this route matches a workspace/builder path, it means Next.js couldn't find
  // the static route in (app) route group, which shouldn't happen.
  // But we check anyway to prevent rendering the wrong page.
  const workspaceRoutes = ['dashboard', 'sites', 'settings', 'client-portals', 'builder']
  if (workspaceRoutes.includes(site) || site.startsWith('builder-')) {
    // This should never happen if routes are set up correctly
    // Return 404 so Next.js tries the next matching route (which should be (app) route group)
    notFound()
  }
  
  // Check if this is a brand domain request (from middleware headers or direct lookup)
  // In Next.js 15+, headers() is async
  let brandDomain: string | undefined
  let workspaceId: string | undefined
  
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    brandDomain = headersList.get('x-brand-domain') || undefined
    workspaceId = headersList.get('x-workspace-id') || undefined
    
    // If headers not available, try to get hostname from request
    // But skip Vercel preview URLs and localhost
    if (!brandDomain) {
      const hostname = headersList.get('host') || headersList.get('x-forwarded-host')
      if (hostname) {
        const hostnameWithoutPort = hostname.split(':')[0]
        
        // Skip Vercel preview URLs and localhost
        if (hostnameWithoutPort.includes('vercel.app') || hostnameWithoutPort.includes('localhost')) {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('[SitePage] Skipping brand domain lookup for preview/localhost:', hostnameWithoutPort)
          }
        } else {
          // Check if this is a brand domain (not ottie.site, not app/marketing domain)
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
          const rootDomainWithoutPort = rootDomain.split(':')[0]
          const isOttieSite = hostnameWithoutPort === 'ottie.site' || hostnameWithoutPort.endsWith('.ottie.site')
          const isAppDomain = hostnameWithoutPort === `app.${rootDomainWithoutPort}` || 
                             hostnameWithoutPort === rootDomainWithoutPort || 
                             hostnameWithoutPort === `www.${rootDomainWithoutPort}`
          
          if (!isOttieSite && !isAppDomain) {
            // This might be a brand domain - try to look it up
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log('[SitePage] No headers, trying direct brand domain lookup for:', hostnameWithoutPort)
            }
            const { getWorkspaceByBrandDomain } = await import('@/lib/data/brand-domain-data')
            const brandDomainResult = await getWorkspaceByBrandDomain(hostnameWithoutPort, undefined)
            if (brandDomainResult && brandDomainResult.verified) {
              brandDomain = hostnameWithoutPort
              workspaceId = brandDomainResult.workspace.id
              // Only log in development - don't expose workspace IDs in production
              if (process.env.NODE_ENV === 'development') {
                console.log('[SitePage] Found brand domain via direct lookup')
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Headers might not be available in all contexts - silently continue
  }
  
  // Fetch site configuration from database
  const siteData = await getSiteConfig(site, brandDomain, workspaceId)
  
  // If site doesn't exist or isn't published, redirect appropriately
  if (!siteData) {
    // If this is a brand domain, redirect to root domain of the brand domain
    // For example: properties.ottie.ai -> ottie.ai
    if (brandDomain) {
      const domainParts = brandDomain.split('.')
      // Extract root domain (last 2 parts: domain.tld)
      const rootDomain = domainParts.slice(-2).join('.')
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const redirectUrl = new URL(`${protocol}://${rootDomain}`)
      // Don't pass site slug in URL - could be used for enumeration
      redirect(redirectUrl.toString())
    } else {
      // Default: redirect to ottie.com
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
      const rootDomainWithoutPort = rootDomain.split(':')[0]
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const redirectUrl = new URL(`${protocol}://${rootDomainWithoutPort}`)
      // Don't pass site slug in URL - could be used for enumeration
      redirect(redirectUrl.toString())
    }
  }
  
  const { site: siteRecord, config: siteConfig } = siteData
  
  // Check if site is password protected
  const isPasswordProtected = siteRecord.password_protected === true
  
  // Check if user has edit permissions (for authenticated users)
  let canEdit = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check permissions: owner, admin, creator, or assigned_agent_id
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('workspace_id', siteRecord.workspace_id)
        .eq('user_id', user.id)
        .single()
      
      const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
      const isCreator = siteRecord.creator_id === user.id
      const isAssignedAgent = siteRecord.assigned_agent_id === user.id
      
      canEdit = isOwnerOrAdmin || isCreator || isAssignedAgent
    }
  } catch (error) {
    // User not authenticated or error - can't edit
    canEdit = false
  }
  
  // Default config if missing
  const defaultConfig: PageConfig = {
    theme: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      headingFontSize: 1,
      headingLetterSpacing: 0,
      titleCase: 'sentence',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderRadius: 'md',
      ctaType: 'none',
      ctaValue: '',
    },
    sections: [],
  }
  
  const finalConfig = siteConfig || defaultConfig
  
  const siteContent = <SiteContentClient site={siteRecord} siteConfig={finalConfig} canEdit={canEdit} />
  
  // Wrap content with password check if site is password protected
  if (isPasswordProtected) {
    return (
      <PasswordCheck
        siteId={siteRecord.id}
        siteTitle={siteRecord.title}
        passwordProtected={isPasswordProtected}
      >
        {siteContent}
      </PasswordCheck>
    )
  }
  
  return siteContent
}
