import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import type { ThemeConfig, Section, PageConfig } from '@/types/builder'

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const { site } = await params
  const siteConfig = await getSiteConfig(site)
  
  if (!siteConfig) {
    return {
      title: 'Site Not Found',
      description: 'The requested site could not be found.',
    }
  }

  // Extract site title from first section (usually Hero)
  const heroSection = siteConfig.sections?.find((s: Section) => s.type === 'hero')
  const siteTitle = (heroSection?.data as any)?.title || 'Property Site'
  const siteSubtitle = (heroSection?.data as any)?.subtitle || ''

  return {
    title: siteTitle,
    description: siteSubtitle || `View ${siteTitle} - Real estate property listing.`,
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
 */
async function getSiteConfig(slug: string): Promise<PageConfig | null> {
  const supabase = await createClient()
  
  // Fetch site by slug on ottie.site domain
  // Sites can be published, draft, or archived - all are accessible via subdomain
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .eq('domain', 'ottie.site')
    .is('deleted_at', null)
    .single()
  
  if (error || !site) {
    return null
  }
  
  // Extract config (PageConfig) from site.config
  const config = site.config as PageConfig | null
  
  if (!config) {
    return null
  }
  
  return config
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
  
  // Fetch site configuration from database
  const siteConfig = await getSiteConfig(site)
  
  // If site doesn't exist, show 404
  if (!siteConfig) {
    notFound()
  }
  
  // Extract theme and sections from config
  const { theme, sections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''
  
  // Render the site
  return (
    <>
      <FontLoader 
        fontFamily={theme?.fontFamily} 
        headingFontFamily={theme?.headingFontFamily} 
      />
      <FontTransition />
      <div 
        style={{ 
          fontFamily: theme?.fontFamily, 
          backgroundColor: theme?.backgroundColor, 
          color: theme?.textColor 
        }}
      >
        {sections?.map((section: Section) => (
          <SectionRenderer 
            key={section.id} 
            section={section} 
            theme={theme || {}} 
            colorScheme={section.colorScheme || 'light'} 
          />
        ))}
      </div>
      <FloatingCTAButton 
        type={ctaType} 
        value={ctaValue} 
        colorScheme={sections?.[0]?.colorScheme || 'light'} 
      />
    </>
  )
}
