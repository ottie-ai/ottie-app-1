'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PageTitle } from '@/components/page-title'
import { useRouter } from 'next/navigation'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { SectionEditor } from '@/components/workspace/SectionEditor'
import { HeroRemixPanel } from '@/components/builder/settings/PageSettings'
import { PageSettingsPanel } from '@/components/builder/settings/PageSettings'
import { FeaturesRemixPanel } from '@/components/builder/settings/FeaturesSettings'
import { Section, ThemeConfig, HeroSectionData, FeaturesSectionData, ColorScheme } from '@/types/builder'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { WorkspaceNavbar } from '@/components/workspace/workspace-navbar'
import { useUserProfile, useWorkspace } from '@/contexts/user-data-context'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { cn } from '@/lib/utils'

// Example theme configuration
const exampleTheme: ThemeConfig = {
  fontFamily: 'system-ui, sans-serif',
  headingFontFamily: 'Canela',
  headingFontSize: 1,
  headingLetterSpacing: 0,
  uppercaseTitles: false,
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 'lg',
  ctaType: 'whatsapp',
  ctaValue: '',
}

// Example sections data with color schemes
const initialSections: Section[] = [
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

export default function EditorPage() {
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { workspace } = useWorkspace()
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [theme, setTheme] = useState<ThemeConfig>(exampleTheme)
  // Initialize with second section's color scheme (first non-hero section)
  // Hero has its own background image, so light/dark starts from section 2
  const firstNonHeroSection = initialSections.find(s => s.type !== 'hero')
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(
    firstNonHeroSection?.colorScheme ?? 'light'
  )
  // Track if we're still in hero section (background should be hidden)
  const [isInHero, setIsInHero] = useState(true)

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      router.refresh()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [router])
  
  // Refs for section elements
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Temporary state for editing (before save)
  const [editingTheme, setEditingTheme] = useState<ThemeConfig>(exampleTheme)
  const [editingVariant, setEditingVariant] = useState<Record<string, string>>({})
  const [editingData, setEditingData] = useState<Record<string, Section['data']>>({})
  const [editingColorScheme, setEditingColorScheme] = useState<Record<string, ColorScheme>>({})

  // Scroll detection for color scheme changes
  // Hero section is excluded - it has its own background image
  // Light/dark background only applies to non-hero sections
  useEffect(() => {
    const handleScroll = () => {
      // Use a point 60% down the viewport to detect sections
      const detectionPoint = window.scrollY + window.innerHeight * 0.6
      
      let activeSectionId: string | null = null
      let activeSectionColorScheme: ColorScheme | undefined = undefined
      let inHeroSection = false
      
      // Find the section that contains the detection point
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
      
      // Update hero state
      if (inHeroSection !== isInHero) {
        setIsInHero(inHeroSection)
      }
      
      // Only update color scheme for non-hero sections
      if (activeSectionId && !inHeroSection) {
        const scheme = editingColorScheme[activeSectionId] ?? activeSectionColorScheme ?? 'light'
        if (scheme !== currentColorScheme) {
          setCurrentColorScheme(scheme)
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check
    
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

  // Save changes for a section
  const handleSave = (sectionId: string) => {
    // Apply theme changes
    setTheme(editingTheme)
    
    // Apply variant, data, and color scheme changes
    setSections(prev => 
      prev.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          variant: editingVariant[sectionId] ?? section.variant,
          data: editingData[sectionId] ?? section.data,
          colorScheme: editingColorScheme[sectionId] ?? section.colorScheme,
        }
      })
    )
    
    // Clear editing state for this section
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

  // Reset editing state when panel closes without saving
  const handleCancel = (sectionId: string) => {
    setEditingTheme(theme)
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

  return (
    <div className="min-h-screen">
      <PageTitle 
        title="Editor" 
        description="Edit your real estate site with our powerful visual editor."
      />
      {/* Fixed background that transitions between light/dark */}
      {/* Only visible after hero section */}
      <div 
        className="fixed inset-0 -z-10 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          backgroundColor: currentColorScheme === 'dark' ? '#000000' : '#ffffff',
          opacity: isInHero ? 0 : 1,
        }}
      />
      
      {/* Fixed CTA Button - Preview in editor (only shows in published site) */}
      <FloatingCTAButton 
        type={editingTheme.ctaType} 
        value={editingTheme.ctaValue}
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
          setTheme(editingTheme)
        }}
      />

      {/* Load Google Fonts dynamically */}
      <FontLoader fonts={[editingTheme.headingFontFamily]} />

      {/* Site Content with Section Editors */}
      <div>
        <FontTransition font={editingTheme.headingFontFamily}>
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
