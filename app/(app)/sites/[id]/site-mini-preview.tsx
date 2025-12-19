'use client'

import { Site } from '@/types/database'
import { PageConfig } from '@/types/builder'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { Pencil } from 'lucide-react'

interface SiteMiniPreviewProps {
  site: Site
}

/**
 * Site Mini Preview - Malý náhľad Hero sekcie webu
 * 
 * Zobrazuje scaled-down verziu Hero sekcie.
 * Hover: Ukáže "Edit Layout" overlay
 * Click: Otvorí builder v novom okne
 */
export function SiteMiniPreview({ site }: SiteMiniPreviewProps) {
  const config = site.config as PageConfig | null
  const heroSection = config?.sections?.find(s => s.type === 'hero')
  const theme = config?.theme

  // Get fonts for FontLoader
  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]

  const handleClick = () => {
    window.open(`/builder/${site.id}`, '_blank', 'noopener,noreferrer')
  }

  if (!heroSection) {
    return (
      <div 
        className="group relative rounded-lg border bg-muted flex items-center justify-center h-64 cursor-pointer hover:ring-2 ring-primary transition-all overflow-hidden"
        onClick={handleClick}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center justify-center gap-3">
          <Pencil className="size-6 text-white" />
          <div className="text-white text-base font-medium">
            Edit Layout
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">No hero section</p>
          <p className="text-xs text-muted-foreground/70">Click to add sections</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <FontLoader fonts={fonts} />
      <div 
        className="group relative rounded-lg border overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
        onClick={handleClick}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center justify-center gap-3">
          <Pencil className="size-6 text-white" />
          <div className="text-white text-base font-medium">
            Edit Layout
          </div>
        </div>
        
        {/* Hero preview (scaled down and cropped) */}
        <div className="relative w-full h-64 overflow-hidden">
          <style dangerouslySetInnerHTML={{
            __html: `
              .site-mini-preview-section section {
                margin: 0 !important;
                padding: 0 !important;
                min-height: 1024px !important;
                height: 1024px !important;
              }
            `
          }} />
          <div 
            className="absolute top-0 left-0 origin-top-left pointer-events-none site-mini-preview-section"
            style={{
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
              width: '400%',
              height: '400%',
            }}
          >
            <div style={{ 
              height: '1024px', 
              minHeight: '1024px', 
              width: '100%'
            }}>
              <SectionRenderer
                section={heroSection}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}




