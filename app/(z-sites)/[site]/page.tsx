import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PageConfig, Section, LegacyPageConfig } from '@/types/builder'
import { getV1Config } from '@/lib/config-migration'
import { PasswordCheck } from './password-check'
import { SiteContentClient } from './site-content-client'

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  try {
    const { site: siteSlug } = await params
    
    // Get workspace context from headers
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const workspaceSlug = headersList.get('x-workspace-slug') || undefined
    const workspaceDomain = headersList.get('x-workspace-domain') || undefined
    const workspaceId = headersList.get('x-workspace-id') || undefined
    
    const siteData = await getSiteConfig(siteSlug, workspaceSlug, workspaceDomain, workspaceId)
    
    if (!siteData) {
      return {
        title: 'Site Not Found',
        description: 'The requested site could not be found.',
        robots: 'noindex, nofollow', // Don't index 404 pages
      }
    }

    const { config: siteConfig, workspace } = siteData

    // Extract site title from first section (usually Hero)
    // Handle case where sections might be empty or undefined
    const heroSection = siteConfig?.sections?.find((s: Section) => s.type === 'hero')
    const siteTitle = (heroSection?.data as any)?.title || siteData.site?.title || 'Property Site'
    const siteSubtitle = (heroSection?.data as any)?.subtitle || ''
    
    // Canonical URL for SEO - use workspace slug subdomain + site slug path
    const canonicalUrl = workspaceDomain 
      ? `https://${workspaceDomain}/${siteSlug}`
      : `https://${workspace?.slug || workspaceSlug}.ottie.site/${siteSlug}`

    return {
      title: siteTitle,
      description: siteSubtitle || `View ${siteTitle} - Real estate property listing.`,
      robots: 'index, follow', // Allow indexing
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
 * NEW URL STRUCTURE: workspace-slug.ottie.site/site-slug
 * 
 * @param siteSlug - Site slug from path
 * @param workspaceSlug - Workspace slug from subdomain (for ottie.site)
 * @param workspaceDomain - Custom workspace domain (for custom domains)
 * @param workspaceId - Workspace ID (from middleware headers for custom domains)
 * 
 * Only returns site if it's published
 */
async function getSiteConfig(
  siteSlug: string, 
  workspaceSlug?: string, 
  workspaceDomain?: string, 
  workspaceId?: string
): Promise<{ site: any; config: LegacyPageConfig; workspace?: any } | null> {
  try {
    const supabase = await createClient()
    
    let workspace: any = null
    let resolvedWorkspaceId: string | undefined = workspaceId
    
    // Step 1: Resolve workspace
    if (workspaceDomain && workspaceId) {
      // Custom workspace domain - workspace ID already provided by middleware
      if (process.env.NODE_ENV === 'development') {
        console.log('[getSiteConfig] Using workspace domain from headers:', { workspaceDomain })
      }
      
      // Fetch workspace for additional data
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, slug, branding_config')
        .eq('id', workspaceId)
        .is('deleted_at', null)
        .single()
      
      workspace = ws
    } else if (workspaceSlug) {
      // ottie.site subdomain - look up workspace by slug
      if (process.env.NODE_ENV === 'development') {
        console.log('[getSiteConfig] Looking up workspace by slug:', workspaceSlug)
      }
      
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, slug, branding_config')
        .eq('slug', workspaceSlug)
        .is('deleted_at', null)
        .single()
      
      if (wsError || !ws) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[getSiteConfig] Workspace not found for slug:', workspaceSlug)
        }
        return null
      }
      
      workspace = ws
      resolvedWorkspaceId = ws.id
    } else {
      // No workspace context - cannot look up site
      if (process.env.NODE_ENV === 'development') {
        console.log('[getSiteConfig] No workspace context provided')
      }
      return null
    }
    
    // Step 2: Look up site by slug within the workspace
    // Site slugs are unique per workspace (not globally)
    const query = supabase
      .from('sites')
      .select('*, password_protected')
      .eq('slug', siteSlug)
      .eq('workspace_id', resolvedWorkspaceId)
      .eq('status', 'published') // Only published sites are accessible
      .is('deleted_at', null)
    
    // Use maybeSingle() instead of single() to avoid error when no rows found
    const { data: site, error } = await query.maybeSingle()
    
    // Only log in development - avoid exposing query details in production
    if (process.env.NODE_ENV === 'development') {
      console.log('[getSiteConfig] Site result:', { 
        found: !!site, 
        error: error ? { code: error.code, message: error.message } : null,
        siteSlug,
        workspaceSlug,
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
  
    // Extract config and convert to legacy format for backward compatibility
    // Migration utility handles both v1 and v2 configs automatically
    const config = getV1Config(site.config)
    
    // In dev mode, allow sites without config - just check if slug exists
    // Return site even if config is null (we'll show default site)
    if (!config || !config.sections || config.sections.length === 0) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[getSiteConfig] Site found but config is null/empty - returning site without config for dev mode')
      }
    }
    
    return { site, config, workspace }
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
  const { site: siteSlug } = await params
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SitePage] Received site slug:', siteSlug)
  }
  
  // IMPORTANT: Exclude workspace/builder routes - these should be handled by (app) route group
  // If this route matches a workspace/builder path, it means Next.js couldn't find
  // the static route in (app) route group, which shouldn't happen.
  // But we check anyway to prevent rendering the wrong page.
  const workspaceRoutes = ['dashboard', 'sites', 'settings', 'client-portals', 'builder']
  if (workspaceRoutes.includes(siteSlug) || siteSlug.startsWith('builder-')) {
    // This should never happen if routes are set up correctly
    // Return 404 so Next.js tries the next matching route (which should be (app) route group)
    notFound()
  }
  
  // Get workspace context from middleware headers
  // In Next.js 15+, headers() is async
  let workspaceSlug: string | undefined
  let workspaceDomain: string | undefined
  let workspaceId: string | undefined
  
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    
    // x-workspace-slug is set for ottie.site subdomains
    workspaceSlug = headersList.get('x-workspace-slug') || undefined
    // x-workspace-domain and x-workspace-id are set for custom workspace domains
    workspaceDomain = headersList.get('x-workspace-domain') || undefined
    workspaceId = headersList.get('x-workspace-id') || undefined
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SitePage] Workspace context:', { workspaceSlug, workspaceDomain, workspaceId: workspaceId ? '(set)' : undefined })
    }
    
    // If no workspace context from headers, try to detect from hostname
    if (!workspaceSlug && !workspaceDomain) {
      const hostname = headersList.get('host') || headersList.get('x-forwarded-host')
      if (hostname) {
        const hostnameWithoutPort = hostname.split(':')[0]
        
        // Skip Vercel preview URLs and localhost
        if (hostnameWithoutPort.includes('vercel.app') || hostnameWithoutPort.includes('localhost')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SitePage] Skipping workspace lookup for preview/localhost:', hostnameWithoutPort)
          }
        } else {
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
          const rootDomainWithoutPort = rootDomain.split(':')[0]
          const sitesDomain = 'ottie.site'
          
          // Check if this is an ottie.site subdomain
          if (hostnameWithoutPort.endsWith(`.${sitesDomain}`)) {
            workspaceSlug = hostnameWithoutPort.replace(`.${sitesDomain}`, '').split('.')[0]
            if (process.env.NODE_ENV === 'development') {
              console.log('[SitePage] Detected workspace slug from hostname:', workspaceSlug)
            }
          } else {
            // Check if this is a custom workspace domain
            const isAppDomain = hostnameWithoutPort === `app.${rootDomainWithoutPort}` || 
                               hostnameWithoutPort === rootDomainWithoutPort || 
                               hostnameWithoutPort === `www.${rootDomainWithoutPort}`
            
            if (!isAppDomain) {
              // This might be a custom workspace domain - try to look it up
              if (process.env.NODE_ENV === 'development') {
                console.log('[SitePage] Trying workspace domain lookup for:', hostnameWithoutPort)
              }
              const { getWorkspaceByBrandDomain } = await import('@/lib/data/workspace-domain-data')
              const domainResult = await getWorkspaceByBrandDomain(hostnameWithoutPort, undefined)
              if (domainResult && domainResult.verified) {
                workspaceDomain = hostnameWithoutPort
                workspaceId = domainResult.workspace.id
                if (process.env.NODE_ENV === 'development') {
                  console.log('[SitePage] Found workspace domain via direct lookup')
                }
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
  const siteData = await getSiteConfig(siteSlug, workspaceSlug, workspaceDomain, workspaceId)
  
  // If site doesn't exist or isn't published, redirect appropriately
  if (!siteData) {
    // If this is a custom workspace domain, redirect to root domain of the workspace domain
    if (workspaceDomain) {
      const domainParts = workspaceDomain.split('.')
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
  
  // Default config if missing - using LegacyPageConfig format for backward compatibility
  const defaultConfig: LegacyPageConfig = {
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
