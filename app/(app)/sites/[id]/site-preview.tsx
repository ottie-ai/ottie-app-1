'use client'

import { Site } from '@/types/database'
import { Lock, Globe } from 'lucide-react'

interface SitePreviewProps {
  site: Site
}

export function SitePreview({ site }: SitePreviewProps) {
  // Use preview route instead of public URL to show draft/archived sites
  // This allows viewing unpublished sites (draft, archived) in the preview iframe
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
  const rootDomainWithoutPort = rootDomain.split(':')[0]
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http'
  const previewUrl = `${protocol}://${rootDomainWithoutPort}/preview/${site.id}`

  return (
    <div className="relative w-full h-full bg-muted flex flex-col">
      {/* Browser Chrome */}
      <div className="bg-background border-b flex items-center gap-2 px-3 py-2 shrink-0">
        {/* Browser Controls */}
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-red-500/80" />
          <div className="size-3 rounded-full bg-yellow-500/80" />
          <div className="size-3 rounded-full bg-green-500/80" />
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 min-w-0">
          {site.password_protected && (
            <Lock className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <Globe className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate font-mono">
            {previewUrl}
          </span>
        </div>
      </div>

      {/* Preview iframe container */}
      <div className="flex-1 relative overflow-hidden bg-background">
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={`Preview of ${site.title}`}
        />
      </div>
    </div>
  )
}

