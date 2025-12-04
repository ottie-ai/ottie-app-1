'use client'

import { Site } from '@/types/database'
import type { PageConfig, Section } from '@/types/builder'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'

interface PreviewSitePageProps {
  site: Site
}

export function PreviewSitePage({ site }: PreviewSitePageProps) {
  const config = site.config as PageConfig | null

  // Default config if missing
  const siteConfig: PageConfig = config || {
    theme: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      headingFontSize: 1,
      headingLetterSpacing: 0,
      uppercaseTitles: false,
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderRadius: 'md',
      ctaType: 'none',
      ctaValue: '',
    },
    sections: [],
  }

  const { theme, sections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  const primaryFont = theme?.fontFamily || 'Inter'

  // If no sections, show a placeholder message (same design as public site page)
  if (!sections || sections.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '3rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
            {site.title}
          </h1>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>
            Site is working! 🎉
          </p>
          <div style={{ fontSize: '0.875rem', color: '#888' }}>
            <p>Slug: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.slug}</code></p>
            <p>Status: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.status}</code></p>
            <p>Domain: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.domain}</code></p>
            <p>Password Protected: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{site.password_protected ? 'Yes' : 'No'}</code></p>
            <p>Has Config: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{config ? 'Yes' : 'No'}</code></p>
            <p>Sections: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{sections?.length || 0}</code></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <FontLoader fonts={fonts} />
      <FontTransition font={primaryFont}>
        <div style={{ fontFamily: theme?.fontFamily, backgroundColor: theme?.backgroundColor, color: theme?.textColor }}>
          {sections?.map((section: Section) => (
            <SectionRenderer key={section.id} section={section} theme={theme} colorScheme={section.colorScheme || 'light'} />
          ))}
        </div>
        <FloatingCTAButton type={ctaType} value={ctaValue} colorScheme={sections?.[0]?.colorScheme || 'light'} />
      </FontTransition>
    </>
  )
}

