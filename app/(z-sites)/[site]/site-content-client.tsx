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

import { useState, useEffect, useRef } from 'react'
import type { Site } from '@/types/database'
import type { PageConfig } from '@/types/builder'
import { PublishedSitePage, type PublishedSiteData } from './published-site-page'
import { SiteLoader } from '@/components/site-loader'

interface SiteContentClientProps {
  site: Site
  siteConfig: PageConfig
  canEdit: boolean  // Currently unused - kept for API compatibility
}

export function SiteContentClient({ site, siteConfig }: SiteContentClientProps) {
  const [showLoader, setShowLoader] = useState(true)

  // Show loader briefly while React hydrates, then fade out smoothly
  useEffect(() => {
    // Hide loader after a brief delay to allow hydration
    const timer = setTimeout(() => {
      setShowLoader(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [])

  // SECURITY: Only pass public data to PublishedSitePage
  // Do NOT pass sensitive fields like workspace_id, creator_id, password_hash
  // PublishedSitePage only needs: id, title, config
  const publicSiteData: PublishedSiteData = {
    id: site.id, // Needed for password check component (if needed in future)
    title: site.title, // Public title
    config: siteConfig, // Public config (theme, sections)
  }

  // Get loader config from site config
  const loaderConfig = siteConfig?.loader
  const shouldShowLoader = loaderConfig && loaderConfig.type !== 'none'

  return (
    <>
      {/* Loader - fades out after hydration */}
      {shouldShowLoader && (
        <div
          style={{
            opacity: showLoader ? 1 : 0,
            transition: 'opacity 400ms ease-out',
            pointerEvents: showLoader ? 'auto' : 'none',
          }}
        >
          <SiteLoader config={loaderConfig} />
        </div>
      )}
      
      {/* Site content - always rendered, fades in */}
      <div
        style={{
          opacity: showLoader ? 0 : 1,
          transition: 'opacity 400ms ease-in',
        }}
      >
        <PublishedSitePage site={publicSiteData} />
      </div>
    </>
  )
}

