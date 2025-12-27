'use client'

/**
 * PublishedSitePage - Clean component for PUBLIC published sites
 * 
 * ARCHITECTURE:
 * This component is specifically designed for PUBLIC sites only.
 * It has NO dependencies on admin UI, workspace context, or internal tools.
 * 
 * WHAT IT DOES:
 * 1. Renders site content (sections) based on site.config
 * 2. Loads fonts (Google Fonts or Premium self-hosted fonts)
 * 3. Applies heading font globally to all h1-h6 elements
 * 4. Shows floating CTA button if configured
 * 
 * WHAT IT DOES NOT DO:
 * - No editing capabilities
 * - No admin UI elements
 * - No workspace/context dependencies
 * - No internal state management beyond rendering
 * 
 * USED BY:
 * - app/(z-sites)/[site]/site-content-client.tsx (public sites)
 * 
 * NOT USED BY:
 * - Admin preview (uses app/(app)/preview/[id]/preview-site-page.tsx)
 * - Builder (uses its own components)
 */

import dynamic from 'next/dynamic'
import type { Site } from '@/types/database'
import type { PageConfig, Section, ThemeConfig, CTAType, ColorScheme, LegacyPageConfig } from '@/types/builder'
import { getV1Config } from '@/lib/config-migration'
import { DynamicSectionRenderer } from '@/components/templates/DynamicSectionRenderer'
import { LenisProvider } from '@/components/providers/LenisProvider'
import { useEffect, useMemo } from 'react'
import { getFontByValue, getGoogleFontsUrl } from '@/lib/fonts'

// Dynamically import FloatingCTAButton - only loaded when CTA is enabled
const FloatingCTAButton = dynamic(
  () => import('@/components/shared/whatsapp-button').then(mod => ({ default: mod.FloatingCTAButton })),
  { ssr: false }
)

/**
 * Minimal site data needed for published site rendering
 * Only includes public fields - no sensitive data
 */
export type PublishedSiteData = Pick<Site, 'id' | 'title' | 'config'>

interface PublishedSitePageProps {
  site: PublishedSiteData
}

/**
 * Load fonts for the site
 * - Google Fonts: loaded via <link> tag
 * - Premium Fonts: loaded via @font-face CSS rules
 */
function useSiteFonts(fonts: string[]) {
  useEffect(() => {
    const googleFonts: string[] = []
    const premiumFonts: Array<{ value: string; fontFiles: any[] }> = []
    
    // Local fonts that don't need loading
    const LOCAL_FONTS = ['Canela']
    
    // Separate fonts by type
    fonts.forEach(fontValue => {
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
      const linkId = 'published-site-google-fonts'
      
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
    
    // Load Premium Fonts
    if (premiumFonts.length > 0) {
      const styleId = 'published-site-premium-fonts'
      let style = document.getElementById(styleId) as HTMLStyleElement | null
      
      if (!style) {
        style = document.createElement('style')
        style.id = styleId
        document.head.appendChild(style)
      }
      
      const fontFaceRules = premiumFonts
        .flatMap(({ value, fontFiles }) => {
          return fontFiles.map((file: { weight: number; style: string; url: string }) => `
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
    
    // Cleanup on unmount
    return () => {
      // Don't remove fonts on unmount - they might be cached and reused
    }
  }, [fonts])
}

/**
 * PublishedSitePage - Renders a published site for public viewing
 */
export function PublishedSitePage({ site }: PublishedSitePageProps) {
  // Get config in legacy format for backward compatibility with section renderers
  // Migration utility handles both v1 and v2 configs
  const siteConfig = useMemo(() => getV1Config(site.config), [site.config])

  const { theme, sections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''
  const headingFont = theme?.headingFontFamily || 'Inter'
  const bodyFont = theme?.fontFamily || 'Inter'

  // Load fonts
  const fonts = [bodyFont, headingFont].filter((f, i, arr) => f && arr.indexOf(f) === i)
  useSiteFonts(fonts)

  // If no sections, show a minimal placeholder
  if (!sections || sections.length === 0) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          backgroundColor: theme?.backgroundColor || '#f5f5f5',
          fontFamily: `'${bodyFont}', system-ui, sans-serif`,
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <div style={{
          backgroundColor: '#fff',
          padding: '3rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem', 
            color: theme?.textColor || '#333',
            fontFamily: `'${headingFont}', system-ui, sans-serif`,
          }}>
            {site.title}
          </h1>
          <p style={{ fontSize: '1rem', color: '#666' }}>
            Coming soon...
          </p>
        </div>
      </div>
    )
  }

  return (
    <LenisProvider>
      <div 
        data-published-site
        style={{ 
          fontFamily: `'${bodyFont}', system-ui, sans-serif`,
          backgroundColor: theme?.backgroundColor,
          color: theme?.textColor,
        }}
      >
        {/* Global heading font style - scoped to this site only */}
        <style dangerouslySetInnerHTML={{
          __html: `
            [data-published-site] h1,
            [data-published-site] h2,
            [data-published-site] h3,
            [data-published-site] h4,
            [data-published-site] h5,
            [data-published-site] h6 {
              font-family: '${headingFont}', system-ui, -apple-system, sans-serif !important;
            }
          `
        }} />
        
        {/* Site sections - dynamically loaded for optimal bundle size */}
        {sections.map((section: Section) => (
          <DynamicSectionRenderer 
            key={section.id} 
            section={section} 
            theme={theme} 
            colorScheme={section.colorScheme || 'light'} 
          />
        ))}
        
        {/* Floating CTA button - only rendered if enabled */}
        {ctaType !== 'none' && ctaValue && (
          <FloatingCTAButton 
            type={ctaType} 
            value={ctaValue} 
            colorScheme={sections[0]?.colorScheme || 'light'} 
          />
        )}
      </div>
    </LenisProvider>
  )
}
