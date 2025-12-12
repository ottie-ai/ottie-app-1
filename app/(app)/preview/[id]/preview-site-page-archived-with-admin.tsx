'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Site } from '@/types/database'
import type { PageConfig, Section, ThemeConfig, HeroSectionData, FeaturesSectionData, ColorScheme } from '@/types/builder'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { SectionEditor } from '@/components/workspace/SectionEditor'
import { HeroRemixPanel } from '@/components/builder/settings/PageSettings'
import { PageSettingsPanel } from '@/components/builder/settings/PageSettings'
import { FeaturesRemixPanel } from '@/components/builder/settings/FeaturesSettings'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { WorkspaceNavbar } from '@/components/workspace/workspace-navbar'
import { useUserProfile, useWorkspace } from '@/contexts/app-context'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'

// Test sections (hardcoded for testing when site has no sections)
const testSections: Section[] = [
  {
    id: 'hero-1',
    type: 'hero',
    variant: 'full',
    colorScheme: 'dark',
    data: {
      headline: '21 Maine Street',
      subheadline: 'Herman Thompson Jr., a financial planner with Innovative Financial Group in Atlanta, Ga. says he checks his portfolio when he makes a trade.',
      price: 'Articles',
      address: '21 Maine street, DE',
      ctaText: 'Schedule a Tour',
      ctaLink: '#contact',
      propertyImage: 'https://images.unsplash.com/photo-1679364297777-1db77b6199be?w=1920&q=80',
    },
  },
  {
    id: 'features-1',
    type: 'features',
    variant: 'grid',
    colorScheme: 'light',
    data: {
      title: 'Property Features',
      features: [
        { icon: 'bed', label: 'Bedrooms', value: '4' },
        { icon: 'bath', label: 'Bathrooms', value: '3.5' },
        { icon: 'ruler', label: 'Sq. Ft.', value: '3,200' },
        { icon: 'car', label: 'Garage', value: '2 Car' },
      ],
    },
  },
  {
    id: 'gallery-1',
    type: 'gallery',
    variant: 'grid',
    colorScheme: 'dark',
    data: {
      title: 'Photo Gallery',
      images: [
        { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', alt: 'Living room' },
        { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', alt: 'Kitchen' },
        { src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', alt: 'Bedroom' },
        { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', alt: 'Exterior' },
      ],
      layout: 'grid',
    },
  },
  {
    id: 'agent-1',
    type: 'agent',
    variant: 'card',
    colorScheme: 'light',
    data: {
      name: 'Sarah Johnson',
      title: 'Senior Real Estate Agent',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      bio: 'With over 15 years of experience in luxury real estate, Sarah specializes in high-end properties and exceptional client service.',
      phone: '+1 (555) 123-4567',
      email: 'sarah@luxuryhomes.com',
      company: 'Luxury Homes RE',
      license: 'DRE# 01234567',
    },
  },
  {
    id: 'contact-1',
    type: 'contact',
    variant: 'simple',
    colorScheme: 'dark',
    data: {
      title: 'Schedule a Viewing',
      subtitle: 'Interested in this property? Get in touch with us to schedule a private viewing.',
      showForm: true,
      showMap: false,
      address: '21 Maine Street, Delaware',
      phone: '+1 (555) 123-4567',
      email: 'info@luxuryhomes.com',
    },
  },
]

interface PreviewSitePageProps {
  site: Site
}

/**
 * ARCHIVED VERSION - Preview Site Page WITH Admin Elements
 * 
 * This version includes:
 * - WorkspaceNavbar (floating bar at top)
 * - Remix buttons on each section
 * - Section editors with dropdowns
 * - Settings panel
 * 
 * Archived on: 2024 (when user requested clean preview)
 * 
 * To use this version again, rename this file to preview-site-page.tsx
 * and remove the current clean version.
 */
export function PreviewSitePageWithAdmin({ site }: PreviewSitePageProps) {
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { workspace } = useWorkspace()
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

  const { theme, sections: initialSections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  // Get actual sections from config (prioritize config over default)
  // If no sections, use test sections (hardcoded for testing)
  const actualSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
    ? config.sections 
    : (initialSections && initialSections.length > 0 ? initialSections : testSections)

  // State management (similar to builder)
  const [sections, setSections] = useState<Section[]>(actualSections)
  
  // Ensure editingTheme has all required properties
  const defaultTheme: ThemeConfig = {
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
  }
  
  const [editingTheme, setEditingTheme] = useState<ThemeConfig>(
    config?.theme || theme || siteConfig.theme || defaultTheme
  )
  const [editingVariant, setEditingVariant] = useState<Record<string, string>>({})
  const [editingData, setEditingData] = useState<Record<string, Section['data']>>({})
  const [editingColorScheme, setEditingColorScheme] = useState<Record<string, ColorScheme>>({})
  
  // Scroll detection for color scheme changes
  const firstNonHeroSection = sections.find(s => s.type !== 'hero')
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(
    firstNonHeroSection?.colorScheme ?? 'light'
  )
  const [isInHero, setIsInHero] = useState(true)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Scroll detection for color scheme changes
  useEffect(() => {
    const handleScroll = () => {
      const detectionPoint = window.scrollY + window.innerHeight * 0.6
      
      let activeSectionId: string | null = null
      let activeSectionColorScheme: ColorScheme | undefined = undefined
      let inHeroSection = false
      
      for (const [id, element] of sectionRefs.current.entries()) {
        const rect = element.getBoundingClientRect()
        const elementTop = window.scrollY + rect.top
        const elementBottom = elementTop + rect.height
        
        if (detectionPoint >= elementTop && detectionPoint <= elementBottom) {
          const section = sections.find(s => s.id === id)
          if (section) {
            if (section.type === 'hero') {
              inHeroSection = true
            } else {
              activeSectionId = section.id
              activeSectionColorScheme = section.colorScheme
            }
          }
        }
      }
      
      if (inHeroSection !== isInHero) {
        setIsInHero(inHeroSection)
      }
      
      if (activeSectionId && !inHeroSection) {
        const scheme = editingColorScheme[activeSectionId] ?? activeSectionColorScheme ?? 'light'
        if (scheme !== currentColorScheme) {
          setCurrentColorScheme(scheme)
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections, currentColorScheme, editingColorScheme, isInHero])

  // Register section ref
  const registerSectionRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      sectionRefs.current.set(id, element)
    } else {
      sectionRefs.current.delete(id)
    }
  }, [])

  // Get current variant for a section
  const getSectionVariant = (sectionId: string, currentVariant: string) => {
    return editingVariant[sectionId] ?? currentVariant
  }

  // Get current data for a section
  const getSectionData = (section: Section) => {
    return editingData[section.id] ?? section.data
  }

  // Get current color scheme for a section
  const getSectionColorScheme = (section: Section): ColorScheme => {
    return editingColorScheme[section.id] ?? section.colorScheme ?? 'light'
  }

  // Update section variant
  const updateSectionVariant = (sectionId: string, variant: string) => {
    setEditingVariant(prev => ({ ...prev, [sectionId]: variant }))
  }

  // Update section data
  const updateSectionData = (sectionId: string, data: Section['data']) => {
    setEditingData(prev => ({ ...prev, [sectionId]: data }))
  }

  // Update section color scheme
  const updateSectionColorScheme = (sectionId: string, colorScheme: ColorScheme) => {
    setEditingColorScheme(prev => ({ ...prev, [sectionId]: colorScheme }))
  }

  // Save changes for a section (preview mode - no actual save, just clear editing state)
  const handleSave = (sectionId: string) => {
    // In preview mode, we don't actually save to database
    // Just clear editing state to show original
    setEditingVariant(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
    setEditingData(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
    setEditingColorScheme(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
  }

  const navbarSettingsPanel = (
    <PageSettingsPanel theme={editingTheme} onThemeChange={setEditingTheme} />
  )

  // Update sections when site.config changes (important for preview)
  useEffect(() => {
    const newSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
      ? config.sections 
      : (initialSections && initialSections.length > 0 ? initialSections : testSections)
    
    if (newSections.length > 0) {
      setSections(newSections)
    }
    
    if (config?.theme) {
      // Merge with default theme to ensure all properties exist
      setEditingTheme({ ...defaultTheme, ...config.theme })
    } else if (theme) {
      setEditingTheme({ ...defaultTheme, ...theme })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, initialSections, theme])

  // If no sections, show a placeholder message
  if (!sections || sections.length === 0) {
    return (
      <div className="min-h-screen">
        <WorkspaceNavbar
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          workspace={workspace}
          settingsPanel={navbarSettingsPanel}
          onSaveSettings={() => {
            // Preview mode - no actual save
          }}
        />
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
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Fixed background that transitions between light/dark */}
      <div 
        className="fixed inset-0 -z-10 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          backgroundColor: currentColorScheme === 'dark' ? '#000000' : '#ffffff',
          opacity: isInHero ? 0 : 1,
        }}
      />
      
      {/* Fixed CTA Button */}
      <FloatingCTAButton 
        type={ctaType} 
        value={ctaValue}
        colorScheme={isInHero ? 'dark' : currentColorScheme}
      />
      
      {/* Workspace Navbar */}
      <WorkspaceNavbar
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        workspace={workspace}
        settingsPanel={navbarSettingsPanel}
        onSaveSettings={() => {
          // Preview mode - no actual save
        }}
      />

      {/* Load Google Fonts dynamically - use editingTheme for live updates */}
      <FontLoader fonts={[editingTheme.fontFamily, editingTheme.headingFontFamily].filter(Boolean) as string[]} />

      {/* Site Content with Section Editors */}
      <div>
        <FontTransition font={editingTheme.headingFontFamily || 'Inter'}>
          {sections.map((section, index) => {
            const currentVariant = getSectionVariant(section.id, section.variant)
            const currentData = getSectionData(section)
            const colorScheme = getSectionColorScheme(section)
            const displaySection = { ...section, variant: currentVariant, data: currentData, colorScheme }

            const sectionContent = (
              <div 
                ref={(el) => registerSectionRef(section.id, el)}
                className="w-full"
              >
                <SectionRenderer
                  section={displaySection}
                  theme={editingTheme}
                  colorScheme={colorScheme}
                  onDataChange={(data) => updateSectionData(section.id, data)}
                />
              </div>
            )

            if (section.type === 'hero') {
              return (
                <SectionEditor
                  key={section.id}
                  onSave={() => handleSave(section.id)}
                  isFirstSection={true}
                  remixPanel={
                    <HeroRemixPanel
                      variant={currentVariant}
                      data={currentData as HeroSectionData}
                      colorScheme={colorScheme}
                      onVariantChange={(v) => updateSectionVariant(section.id, v)}
                      onDataChange={(data) => updateSectionData(section.id, data)}
                      onColorSchemeChange={(cs) => updateSectionColorScheme(section.id, cs)}
                    />
                  }
                >
                  {sectionContent}
                </SectionEditor>
              )
            }

            if (section.type === 'features') {
              return (
                <SectionEditor
                  key={section.id}
                  onSave={() => handleSave(section.id)}
                  remixPanel={
                    <FeaturesRemixPanel
                      variant={currentVariant}
                      data={currentData as FeaturesSectionData}
                      colorScheme={colorScheme}
                      onVariantChange={(v) => updateSectionVariant(section.id, v)}
                      onDataChange={(data) => updateSectionData(section.id, data)}
                      onColorSchemeChange={(cs) => updateSectionColorScheme(section.id, cs)}
                    />
                  }
                >
                  {sectionContent}
                </SectionEditor>
              )
            }

            // Other sections without editor for now
            return (
              <div key={section.id} ref={(el) => registerSectionRef(section.id, el)}>
                <SectionRenderer
                  section={displaySection}
                  theme={editingTheme}
                  colorScheme={colorScheme}
                />
              </div>
            )
          })}
        </FontTransition>
      </div>
    </div>
  )
}

