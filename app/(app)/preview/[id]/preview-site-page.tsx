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

