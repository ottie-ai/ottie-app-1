'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Site } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Edit, Lock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SitePreviewProps {
  site: Site
}

export function SitePreview({ site }: SitePreviewProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  // Construct preview URL
  const previewUrl = site.domain && site.domain !== 'ottie.site'
    ? `https://${site.domain}`
    : `https://${site.slug}.ottie.site`

  const handleEditLayout = () => {
    router.push(`/builder/${site.id}`)
  }

  return (
    <div
      className="relative w-full h-full bg-muted flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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

        {/* Overlay with Edit Layout button */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity z-10">
            <Button
              size="lg"
              onClick={handleEditLayout}
              className="gap-2"
            >
              <Edit className="size-4" />
              Edit Layout
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

