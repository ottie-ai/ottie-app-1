'use client'

import { useEffect } from 'react'
import { getGoogleFontsUrl } from '@/lib/fonts'

interface FontLoaderProps {
  fonts: string[]
}

/**
 * Dynamically loads Google Fonts
 */
export function FontLoader({ fonts }: FontLoaderProps) {
  useEffect(() => {
    if (fonts.length === 0) return

    const url = getGoogleFontsUrl(fonts)
    const linkId = 'google-fonts-loader'
    
    // Check if link already exists
    let link = document.getElementById(linkId) as HTMLLinkElement | null
    
    if (link) {
      // Update existing link
      link.href = url
    } else {
      // Create new link
      link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = url
      document.head.appendChild(link)
    }
    
    return () => {
      // Optional: cleanup on unmount
      // const existingLink = document.getElementById(linkId)
      // if (existingLink) existingLink.remove()
    }
  }, [fonts])

  return null
}

