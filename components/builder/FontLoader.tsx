'use client'

import { useEffect } from 'react'
import { getGoogleFontsUrl } from '@/lib/fonts'

// Local fonts that don't need Google Fonts loading
const LOCAL_FONTS = ['Canela']

interface FontLoaderProps {
  fonts: string[]
}

/**
 * Dynamically loads Google Fonts (skips local fonts)
 */
export function FontLoader({ fonts }: FontLoaderProps) {
  useEffect(() => {
    // Filter out local fonts
    const googleFonts = fonts.filter(font => !LOCAL_FONTS.includes(font))

    if (googleFonts.length === 0) return

    const url = getGoogleFontsUrl(googleFonts)
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

