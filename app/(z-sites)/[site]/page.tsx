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
 * Fetch site configuration from database
 * TODO: Implement when database is ready
 */
async function getSiteConfig(subdomain: string): Promise<PageConfig | null> {
  // TODO: Uncomment when database is ready
  /*
  const supabase = await createClient()
  
  const { data: siteConfig, error } = await supabase
    .from('sites')
    .select('*')
    .or(`subdomain.eq.${subdomain},custom_domain.eq.${subdomain}`)
    .eq('published', true)
    .single()
  
  if (error || !siteConfig) {
    return null
  }
  
  return {
    theme: siteConfig.theme_json as ThemeConfig,
    sections: siteConfig.content_json as Section[],
    // CTA is stored in theme config
    ctaType: (siteConfig.theme_json as ThemeConfig).ctaType || 'none',
    ctaValue: (siteConfig.theme_json as ThemeConfig).ctaValue || '',
  }
  */
  
  // Placeholder: Return null to show "not found" message
  return null
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
  
  // If site doesn't exist or isn't published, show 404
  if (!siteConfig) {
    notFound()
  }
  
  // TODO: When database is ready, replace this placeholder with actual rendering code
  // See the implementation guide in the component comments above
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Site Ready for Database Integration</h1>
          <p className="text-muted-foreground text-lg">
            Subdomain: <code className="bg-muted px-3 py-1 rounded-md font-mono">{site}</code>
        </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
          <h2 className="font-semibold text-lg">Next Steps:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Create <code className="bg-background px-2 py-0.5 rounded">sites</code> table in Supabase</li>
            <li>Add columns: <code className="bg-background px-2 py-0.5 rounded">subdomain</code>, <code className="bg-background px-2 py-0.5 rounded">theme_json</code>, <code className="bg-background px-2 py-0.5 rounded">content_json</code></li>
            <li>Uncomment the database fetch code in <code className="bg-background px-2 py-0.5 rounded">getSiteConfig()</code></li>
            <li>Uncomment the rendering code in the component</li>
            <li>Test with a real subdomain (e.g., <code className="bg-background px-2 py-0.5 rounded">jozko.ottie.com</code>)</li>
          </ol>
        </div>
        
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            This page will automatically render the published site once database is connected.
            No rebuild needed - changes appear instantly when saved in the builder!
          </p>
        </div>
      </div>
    </div>
  )
}
