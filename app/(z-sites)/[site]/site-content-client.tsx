'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Site } from '@/types/database'
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
import { useAuth } from '@/hooks/use-auth'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AppContext } from '@/contexts/app-context'

interface SiteContentClientProps {
  site: Site
  siteConfig: PageConfig
  canEdit: boolean
}

export function SiteContentClient({ site, siteConfig, canEdit }: SiteContentClientProps) {
  const { user } = useAuth()
  const router = useRouter()
  
  // Try to get app context (might not be available for public sites)
  let userName = 'User'
  let userEmail = ''
  let userAvatar = ''
  let workspace = null
  
  try {
    const appContext = useContext(AppContext)
    if (appContext) {
      userName = appContext.profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
      userEmail = user?.email || ''
      userAvatar = appContext.profile?.avatar_url || ''
      workspace = appContext.currentWorkspace
    } else {
      // AppProvider not available - use user data directly
      userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
      userEmail = user?.email || ''
    }
  } catch (error) {
    // AppProvider not available (public site) - use defaults
    userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    userEmail = user?.email || ''
  }
  
  const { theme, sections: initialSections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  const primaryFont = theme?.fontFamily || 'Inter'

  // State management (similar to builder)
  const [sections, setSections] = useState<Section[]>(initialSections || [])
  const [editingTheme, setEditingTheme] = useState<ThemeConfig>(theme || siteConfig.theme)
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

  // Save changes for a section
  const handleSave = async (sectionId: string) => {
    if (!canEdit || !user) return
    
    // Update local state
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
    
    // Save to database
    const supabase = createClient()
    const updatedConfig: PageConfig = {
      theme: editingTheme,
      sections: sections.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          variant: editingVariant[sectionId] ?? section.variant,
          data: editingData[sectionId] ?? section.data,
          colorScheme: editingColorScheme[sectionId] ?? section.colorScheme,
        }
      })
    }
    
    const { error } = await supabase
      .from('sites')
      .update({ config: updatedConfig })
      .eq('id', site.id)
    
    if (error) {
      console.error('Error saving site:', error)
      return
    }
    
    // Clear editing state
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
    
    router.refresh()
  }

  const navbarSettingsPanel = (
    <PageSettingsPanel theme={editingTheme} onThemeChange={setEditingTheme} />
  )

  // Render without edit controls if user can't edit
  if (!canEdit || !user) {
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

  // Render with edit controls
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
        onSaveSettings={async () => {
          if (!canEdit || !user) return
          
          const supabase = createClient()
          const updatedConfig: PageConfig = {
            theme: editingTheme,
            sections: sections
          }
          
          const { error } = await supabase
            .from('sites')
            .update({ config: updatedConfig })
            .eq('id', site.id)
          
          if (error) {
            console.error('Error saving site:', error)
            return
          }
          
          router.refresh()
        }}
      />

      {/* Load Google Fonts dynamically */}
      <FontLoader fonts={fonts} />

      {/* Site Content with Section Editors */}
      <div>
        <FontTransition font={primaryFont}>
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

