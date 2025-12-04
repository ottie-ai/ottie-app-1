import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// import { SectionRenderer } from '@/components/templates/SectionRenderer'
// import { FontLoader } from '@/components/builder/FontLoader'
// import { FontTransition } from '@/components/builder/FontTransition'
// import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import type { PageConfig, Section } from '@/types/builder'
import { PasswordCheck } from './password-check'

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
    let query = supabase
      .from('sites')
      .select('*, password_protected, password_hash')
      .eq('slug', slug)
      .eq('status', 'published') // Only published sites are accessible
      .is('deleted_at', null)
    
    // If domain is provided, filter by domain
    if (domain) {
      query = query.eq('domain', domain)
    } else {
      // Default to ottie.site if no domain specified
      query = query.eq('domain', 'ottie.site')
    }
    
    // If workspaceId is provided (from brand domain), filter by workspace
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }
    
    const { data: site, error } = await query.single()
    
    console.log('[getSiteConfig] Site result (any status):', { site, error })
    
    if (error) {
      console.error('[getSiteConfig] Error fetching site:', error)
      return null
    }
    
    if (!site) {
      console.log('[getSiteConfig] No site found with slug:', slug)
      return null
    }
  
  // Extract config (PageConfig) from site.config
  const config = site.config as PageConfig | null
  
  // In dev mode, allow sites without config - just check if slug exists
  // Return site even if config is null (we'll show default site)
  if (!config) {
    console.log('[getSiteConfig] Site found but config is null - returning site without config for dev mode')
    // Return site with empty config - will show default site
    return { 
      site, 
      config: { 
        theme: {
          fontFamily: 'Inter',
          headingFontFamily: 'Inter',
          headingFontSize: 1,
          headingLetterSpacing: 0,
          uppercaseTitles: false,
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
  
  // Check if this is a brand domain request (from middleware headers)
  // In Next.js 15+, headers() is async
  let brandDomain: string | undefined
  let workspaceId: string | undefined
  
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    brandDomain = headersList.get('x-brand-domain') || undefined
    workspaceId = headersList.get('x-workspace-id') || undefined
  } catch (error) {
    // Headers might not be available in all contexts
    console.log('[SitePage] Could not access headers:', error)
  }
  
  // Fetch site configuration from database
  console.log('[SitePage] Fetching site config for slug:', site)
  console.log('[SitePage] Brand domain:', brandDomain || 'none')
  console.log('[SitePage] Workspace ID:', workspaceId || 'none')
  const siteData = await getSiteConfig(site, brandDomain, workspaceId)
  console.log('[SitePage] Site data result:', siteData ? 'Found' : 'Not found')
  
  // If site doesn't exist or isn't published, redirect appropriately
  if (!siteData) {
    console.log('[SitePage] Site not found or not published, redirecting')
    
    // If this is a brand domain, redirect to root domain of the brand domain
    // For example: properties.ottie.ai -> ottie.ai
    if (brandDomain) {
      const domainParts = brandDomain.split('.')
      // Extract root domain (last 2 parts: domain.tld)
      const rootDomain = domainParts.slice(-2).join('.')
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const redirectUrl = new URL(`${protocol}://${rootDomain}`)
      redirectUrl.searchParams.set('site', site) // Optional: pass site slug for analytics
      console.log('[SitePage] Brand domain detected, redirecting to root domain:', rootDomain)
      redirect(redirectUrl.toString())
    } else {
      // Default: redirect to ottie.com
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
      const rootDomainWithoutPort = rootDomain.split(':')[0]
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const redirectUrl = new URL(`${protocol}://${rootDomainWithoutPort}`)
      redirectUrl.searchParams.set('site', site) // Optional: pass site slug for analytics
      redirect(redirectUrl.toString())
    }
  }
  
  const { site: siteRecord, config: siteConfig } = siteData
  
  // Check if site is password protected
  const isPasswordProtected = siteRecord.password_protected === true
  
  // TEMPORARY: Simple render for testing
  // This confirms that database fetch and routing work
  const siteContent = (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
          {siteRecord.title}
        </h1>
        <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>
          Site is working! 🎉
        </p>
        <div style={{ fontSize: '0.875rem', color: '#888' }}>
          <p>Slug: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{siteRecord.slug}</code></p>
          <p>Status: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{siteRecord.status}</code></p>
          <p>Domain: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{siteRecord.domain}</code></p>
          <p>Password Protected: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{isPasswordProtected ? 'Yes' : 'No'}</code></p>
          <p>Has Config: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{siteConfig ? 'Yes' : 'No'}</code></p>
          <p>Sections: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{siteConfig?.sections?.length || 0}</code></p>
        </div>
      </div>
    </div>
  )
  
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
  
  // TODO: Uncomment when ready to render full site with sections
  // const { theme, sections } = siteConfig
  // const ctaType = theme?.ctaType || 'none'
  // const ctaValue = theme?.ctaValue || ''
  // 
  // const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  // const primaryFont = theme?.fontFamily || 'Inter'
  // 
  // return (
  //   <>
  //     <FontLoader fonts={fonts} />
  //     <FontTransition font={primaryFont}>
  //       <div style={{ fontFamily: theme?.fontFamily, backgroundColor: theme?.backgroundColor, color: theme?.textColor }}>
  //         {sections?.map((section: Section) => (
  //           <SectionRenderer key={section.id} section={section} theme={theme} colorScheme={section.colorScheme || 'light'} />
  //         ))}
  //       </div>
  //       <FloatingCTAButton type={ctaType} value={ctaValue} colorScheme={sections?.[0]?.colorScheme || 'light'} />
  //     </FontTransition>
  //   </>
  // )
}
