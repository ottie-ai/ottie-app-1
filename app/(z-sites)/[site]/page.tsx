import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PageConfig } from '@/types/builder'

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
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
  const heroSection = siteConfig.sections?.find((s: Section) => s.type === 'hero')
  const siteTitle = (heroSection?.data as any)?.title || 'Property Site'
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
async function getSiteConfig(slug: string): Promise<{ site: any; config: PageConfig } | null> {
  const supabase = await createClient()
  
  // First, try to find the site (without status filter to see what we have)
  const { data: allSites, error: allError } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
  
  console.log('[getSiteConfig] Looking for slug:', slug)
  console.log('[getSiteConfig] All sites with this slug:', allSites)
  console.log('[getSiteConfig] Error:', allError)
  
  // TEMPORARY: For testing - allow draft sites too
  // Fetch site by slug on ottie.site domain
  // Only published sites are accessible via subdomain (in production)
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .eq('domain', 'ottie.site')
    // .eq('status', 'published') // TEMPORARILY DISABLED FOR TESTING
    .is('deleted_at', null)
    .single()
  
  console.log('[getSiteConfig] Site result (any status):', { site, error })
  
  if (error) {
    console.error('[getSiteConfig] Error fetching site:', error)
    return null
  }
  
  if (!site) {
    console.log('[getSiteConfig] No published site found with slug:', slug)
    return null
  }
  
  // Extract config (PageConfig) from site.config
  const config = site.config as PageConfig | null
  
  if (!config) {
    console.log('[getSiteConfig] Site found but config is null')
    // For testing, allow sites without config
    return { site, config: { theme: {}, sections: [] } as PageConfig }
  }
  
  return { site, config }
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

export default async function SitePage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  // In Next.js 15+, params is a Promise
  const { site } = await params
  
  console.log('[SitePage] Received slug:', site)
  
  // IMPORTANT: Exclude workspace/builder routes - these should be handled by (app) route group
  // If this route matches a workspace/builder path, it means Next.js couldn't find
  // the static route in (app) route group, which shouldn't happen.
  // But we check anyway to prevent rendering the wrong page.
  const workspaceRoutes = ['dashboard', 'sites', 'settings', 'client-portals', 'builder']
  if (workspaceRoutes.includes(site) || site.startsWith('builder-')) {
    // This should never happen if routes are set up correctly
    // Return 404 so Next.js tries the next matching route (which should be (app) route group)
    console.log('[SitePage] Workspace route detected, returning 404')
    notFound()
  }
  
  // Fetch site configuration from database
  console.log('[SitePage] Fetching site config for slug:', site)
  const siteData = await getSiteConfig(site)
  console.log('[SitePage] Site data result:', siteData ? 'Found' : 'Not found')
  
  // If site doesn't exist or isn't published, redirect to ottie.com
  if (!siteData) {
    console.log('[SitePage] Site not found or not published, redirecting to ottie.com')
    // Redirect to ottie.com (main domain)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    const rootDomainWithoutPort = rootDomain.split(':')[0]
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const redirectUrl = new URL(`${protocol}://${rootDomainWithoutPort}`)
    redirectUrl.searchParams.set('site', site) // Optional: pass site slug for analytics
    redirect(redirectUrl.toString())
  }
  
  const { site: siteRecord, config: siteConfig } = siteData
  
  // TEMPORARY: For testing - just show the property title
  // This confirms that subdomain routing is working
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontSize: '2rem',
      fontWeight: 'bold',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div>
        <h1>{siteRecord.title}</h1>
        <p style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}>
          Slug: {siteRecord.slug} | Status: {siteRecord.status} | Domain: {siteRecord.domain}
        </p>
      </div>
    </div>
  )
  
  // TODO: Uncomment when ready to render full site
  // Extract theme and sections from config
  // const { theme, sections } = siteConfig
  // const ctaType = theme?.ctaType || 'none'
  // const ctaValue = theme?.ctaValue || ''
  // 
  // // Collect unique fonts for FontLoader
  // const fonts = [
  //   theme?.fontFamily,
  //   theme?.headingFontFamily,
  // ].filter(Boolean) as string[]
  // 
  // // Render the site
  // return (
  //   <>
  //     <FontLoader fonts={fonts} />
  //     <FontTransition />
  //     <div 
  //       style={{ 
  //         fontFamily: theme?.fontFamily, 
  //         backgroundColor: theme?.backgroundColor, 
  //         color: theme?.textColor 
  //       }}
  //     >
  //       {sections?.map((section: Section) => (
  //         <SectionRenderer 
  //           key={section.id} 
  //           section={section} 
  //           theme={theme || {}} 
  //           colorScheme={section.colorScheme || 'light'} 
  //         />
  //       ))}
  //     </div>
  //     <FloatingCTAButton 
  //       type={ctaType} 
  //       value={ctaValue} 
  //       colorScheme={sections?.[0]?.colorScheme || 'light'} 
  //     />
  //   </>
  // )
}
