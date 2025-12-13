'use client'

import { useState, useEffect } from 'react'
import { Site } from '@/types/database'

interface SitePreviewProps {
  site: Site
  onUnsavedChangesChange?: (hasChanges: boolean) => void
}

export function SitePreview({ site, onUnsavedChangesChange }: SitePreviewProps) {
  const [iframeUrl, setIframeUrl] = useState<string>('')

  // Use preview route for iframe to show draft/archived sites
  // This allows viewing unpublished sites (draft, archived) in the preview iframe
  // Use relative URL - preview route is available on same domain
  const getPreviewUrl = () => {
    return `/preview/${site.id}`
  }
  
  // Set iframe URL - use relative URL for iframe to avoid cross-origin issues
  useEffect(() => {
    const previewUrl = getPreviewUrl()
    console.log('[SitePreview] Setting iframe URL:', previewUrl, 'Current location:', typeof window !== 'undefined' ? window.location.href : 'SSR')
    setIframeUrl(previewUrl)
  }, [site.id])

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UNSAVED_CHANGES') {
        onUnsavedChangesChange?.(event.data.hasChanges)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onUnsavedChangesChange])

  return (
    <div className="relative w-full h-full bg-muted flex flex-col">
      {/* Preview iframe container */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {iframeUrl && (
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            className="w-full h-full border-0"
            title={`Preview of ${site.title}`}
            onLoad={() => {
              console.log('[SitePreview] Iframe loaded successfully:', iframeUrl)
              
              // Listen for messages from iframe
              const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'UNSAVED_CHANGES') {
                  onUnsavedChangesChange?.(event.data.hasChanges)
                }
              }
              
              window.addEventListener('message', handleMessage)
              
              // Cleanup
              return () => {
                window.removeEventListener('message', handleMessage)
              }
            }}
            onError={(e) => {
              console.error('[SitePreview] Iframe error:', e, 'URL:', iframeUrl)
            }}
          />
        )}
        {!iframeUrl && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading preview...
          </div>
        )}
      </div>
    </div>
  )
}

