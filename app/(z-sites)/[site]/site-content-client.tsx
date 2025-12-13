'use client'

import type { Site } from '@/types/database'
import type { PageConfig } from '@/types/builder'
import { PreviewSitePage } from '@/app/preview/[id]/preview-site-page'

interface SiteContentClientProps {
  site: Site
  siteConfig: PageConfig
  canEdit: boolean
}

export function SiteContentClient({ site, siteConfig, canEdit }: SiteContentClientProps) {
  // Use clean PreviewSitePage component (no admin elements like morphing indicator)
  // This is for client portal pages, not admin preview
  // Update site.config to match siteConfig
  const siteWithConfig = {
    ...site,
    config: siteConfig,
  }
  
  return <PreviewSitePage site={siteWithConfig} />
}

