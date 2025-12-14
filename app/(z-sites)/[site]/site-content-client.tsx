'use client'

/**
 * SiteContentClient - Client wrapper for published sites
 * 
 * ARCHITECTURE:
 * This is the client-side wrapper for PUBLIC published sites.
 * It uses PublishedSitePage which is a clean component with:
 * - NO admin UI dependencies
 * - NO workspace/context dependencies
 * - NO editing capabilities
 * 
 * USED BY:
 * - app/(z-sites)/[site]/page.tsx (public site route)
 * 
 * FLOW:
 * 1. User visits slug.ottie.site
 * 2. Middleware rewrites to (z-sites)/[site]/page.tsx
 * 3. Server fetches site config from database
 * 4. This component renders the site using PublishedSitePage
 */

import type { Site } from '@/types/database'
import type { PageConfig } from '@/types/builder'
import { PublishedSitePage } from './published-site-page'

interface SiteContentClientProps {
  site: Site
  siteConfig: PageConfig
  canEdit: boolean  // Currently unused - kept for API compatibility
}

export function SiteContentClient({ site, siteConfig }: SiteContentClientProps) {
  // Merge siteConfig into site object
  const siteWithConfig = {
    ...site,
    config: siteConfig,
  }
  
  // Use clean PublishedSitePage for public sites
  // This component has NO admin dependencies
  return <PublishedSitePage site={siteWithConfig} />
}

