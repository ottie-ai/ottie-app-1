'use client'

import { useState } from 'react'
import { Site } from '@/types/database'
import { Lock, Globe, Check } from 'lucide-react'
import { LottieCopyIcon } from '@/components/ui/lottie-copy-icon'
import { toastSuccess } from '@/lib/toast-helpers'

interface SitePreviewProps {
  site: Site
}

export function SitePreview({ site }: SitePreviewProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isUrlHovered, setIsUrlHovered] = useState(false)

  // Use preview route instead of public URL to show draft/archived sites
  // This allows viewing unpublished sites (draft, archived) in the preview iframe
  // For localhost, we need to preserve the port number
  const getPreviewUrl = () => {
    if (typeof window === 'undefined') {
      return `/preview/${site.id}` // Fallback for SSR
    }
    
    // Get current protocol, hostname, and port
    const { protocol, hostname, port } = window.location
    
    // Construct base URL with port if present
    // On localhost, we need to use the same port (e.g., localhost:3000)
    const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
    
    return `${baseUrl}/preview/${site.id}`
  }
  
  const previewUrl = getPreviewUrl()

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await navigator.clipboard.writeText(previewUrl)
      setIsCopied(true)
      toastSuccess('Preview URL copied to clipboard')
      
      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

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
        <div 
          className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 min-w-0 relative group"
          onMouseEnter={() => setIsUrlHovered(true)}
          onMouseLeave={() => setIsUrlHovered(false)}
        >
          {site.password_protected && (
            <Lock className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <Globe className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate font-mono flex-1">
            {previewUrl}
          </span>
          <button
            onClick={handleCopyUrl}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all ${
              isUrlHovered || isCopied
                ? 'opacity-100 translate-x-0 pointer-events-auto'
                : 'opacity-0 -translate-x-2 pointer-events-none'
            } hover:bg-muted/80 active:scale-95`}
            title="Copy preview URL"
          >
            <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
              {isCopied ? (
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <LottieCopyIcon className="size-3" />
              )}
            </div>
          </button>
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

