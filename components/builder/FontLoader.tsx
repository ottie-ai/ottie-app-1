'use client'

import { useEffect } from 'react'
import { getGoogleFontsUrl, getFontByValue } from '@/lib/fonts'

// Local fonts that don't need Google Fonts loading
const LOCAL_FONTS = ['Canela']

interface FontLoaderProps {
  fonts: string[]
}

/**
 * Dynamically loads Google Fonts and Premium Fonts
 * - Google Fonts are loaded via <link> tag
 * - Premium Fonts are loaded via @font-face CSS rules
 * - Local fonts (Canela) are skipped
 */
export function FontLoader({ fonts }: FontLoaderProps) {
  useEffect(() => {
    const googleFonts: string[] = []
    const premiumFonts: Array<{ value: string; fontFiles: any[] }> = []
    
    // Separate fonts by type
    fonts.forEach(fontValue => {
      // Skip local fonts
      if (LOCAL_FONTS.includes(fontValue)) return
      
      const font = getFontByValue(fontValue)
      if (font?.isPremium && font.fontFiles) {
        premiumFonts.push({ value: fontValue, fontFiles: font.fontFiles })
      } else {
        googleFonts.push(fontValue)
      }
    })
    
    // Load Google Fonts
    if (googleFonts.length > 0) {
      const url = getGoogleFontsUrl(googleFonts)
      const linkId = 'google-fonts-loader'
      
      let link = document.getElementById(linkId) as HTMLLinkElement | null
      
      if (link) {
        link.href = url
      } else {
        link = document.createElement('link')
        link.id = linkId
        link.rel = 'stylesheet'
        link.href = url
        document.head.appendChild(link)
      }
    }
    
    // Load Premium Fonts (inject @font-face rules)
    if (premiumFonts.length > 0) {
      const styleId = 'premium-fonts-loader'
      let style = document.getElementById(styleId) as HTMLStyleElement | null
      
      if (!style) {
        style = document.createElement('style')
        style.id = styleId
        document.head.appendChild(style)
      }
      
      // Generate @font-face rules
      const fontFaceRules = premiumFonts
        .flatMap(({ value, fontFiles }) => {
          return fontFiles.map(file => `
            @font-face {
              font-family: '${value}';
              font-weight: ${file.weight};
              font-style: ${file.style};
              font-display: swap;
              src: url('${file.url}') format('woff2');
            }
          `)
        })
        .join('\n')
      
      style.textContent = fontFaceRules
    }
    
    return () => {
      // Optional: cleanup on unmount
    }
  }, [fonts])

  return null
}

