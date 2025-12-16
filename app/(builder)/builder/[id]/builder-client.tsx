'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import useMeasure from 'react-use-measure'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Site } from '@/types/database'
import type { PageConfig, Section, ColorScheme, ThemeConfig, LoaderConfig } from '@/types/builder'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { SectionMorphingIndicator } from '@/components/shared/section-morphing-indicator'
import { SiteLoader } from '@/components/site-loader'
import { handlePublishSite, handleUnpublishSite } from '@/app/actions/site-actions'

interface BuilderClientProps {
  site: Site
}

/**
 * Builder Client - Full-screen layout editor
 * 
 * Renderuje site priamo s admin controls on top:
 * - Floating top navbar (Back, Tabs, Preview, Publish)
 * - Site content (window scroll - aby highlights fungovalo)
 * - Floating bottom bar (SectionMorphingIndicator)
 */
export function BuilderClient({ site }: BuilderClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [buttonRef, buttonBounds] = useMeasure()
  const [activeTab, setActiveTab] = useState('layout')
  const router = useRouter()
  const isMobile = useIsMobile()
  
  // Refs for save/theme/loader/sections
  const saveChangesRef = useRef<(() => Promise<void>) | null>(null)
  const themeRef = useRef<ThemeConfig | null>(null)
  const loaderRef = useRef<LoaderConfig | null>(null)
  const sectionsRef = useRef<Section[] | null>(null)
  
  // Site config
  const config = site.config as PageConfig | null
  const siteConfig: PageConfig = config || {
    theme: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      headingFontSize: 1,
      headingLetterSpacing: 0,
      titleCase: 'sentence',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderRadius: 'md',
      ctaType: 'none',
      ctaValue: '',
    },
    sections: [],
    loader: {
      type: 'none',
      colorScheme: 'light',
    },
  }

  // Loader state
  const loaderConfig = siteConfig.loader || { type: 'none', colorScheme: 'light' }
  const [isLoading, setIsLoading] = useState(true)

  // Add site-route class to body to hide workspace background
  useEffect(() => {
    document.body.classList.add('site-route')
    return () => {
      document.body.classList.remove('site-route')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // Initialize loader ref
  useEffect(() => {
    loaderRef.current = loaderConfig
  }, [loaderConfig])

  // Theme state
  const [localTheme, setLocalTheme] = useState<ThemeConfig>(siteConfig.theme || {
    fontFamily: 'Inter',
    headingFontFamily: 'Inter',
    headingFontSize: 1,
    headingLetterSpacing: 0,
    titleCase: 'sentence',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderRadius: 'md',
    ctaType: 'none',
    ctaValue: '',
  })

  useEffect(() => {
    if (themeRef) {
      themeRef.current = localTheme
    }
  }, [localTheme, themeRef])

  // Sections state
  const actualSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
    ? config.sections 
    : []
  
  const [sections, setSections] = useState<Section[]>(actualSections)
  const [activeSection, setActiveSection] = useState<Section | null>(sections[0] || null)
  const [editingState, setEditingState] = useState<Record<string, { variant: string; data: any; colorScheme: ColorScheme }>>({})
  
  // Section refs for scroll detection
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const sectionsForScrollRef = useRef<Section[]>(sections)
  
  useEffect(() => {
    sectionsForScrollRef.current = sections
    sectionsRef.current = sections
  }, [sections])

  // Register section refs
  const registerSectionRef = (sectionId: string, element: HTMLDivElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element)
    } else {
      sectionRefs.current.delete(sectionId)
    }
  }

  // Scroll detection for active section - uses window scroll
  const handleScrollDetection = useCallback(() => {
    if (sectionRefs.current.size === 0) return
    
    const viewportCenter = window.innerHeight * 0.5
    
    let activeSectionId: string | null = null
    let minDistance = Infinity
    
    // Find the section closest to viewport center
    for (const [id, element] of sectionRefs.current.entries()) {
      const rect = element.getBoundingClientRect()
      const elementTop = rect.top
      const elementBottom = rect.bottom
      const elementCenter = rect.top + rect.height / 2
      
      // Check if viewport center is within this section
      if (viewportCenter >= elementTop && viewportCenter <= elementBottom) {
        const distance = Math.abs(viewportCenter - elementCenter)
        if (distance < minDistance) {
          minDistance = distance
          activeSectionId = id
        }
      }
    }
    
    // Fallback: find closest visible section
    if (!activeSectionId) {
      for (const [id, element] of sectionRefs.current.entries()) {
        const rect = element.getBoundingClientRect()
        const elementCenter = rect.top + rect.height / 2
        const distance = Math.abs(viewportCenter - elementCenter)
        
        // Only consider sections that are at least partially visible
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          if (distance < minDistance) {
            minDistance = distance
            activeSectionId = id
          }
        }
      }
    }
    
    if (activeSectionId) {
      setActiveSection(prev => {
        if (prev?.id === activeSectionId) return prev
        const section = sectionsForScrollRef.current.find(s => s.id === activeSectionId)
        return section || prev
      })
    }
  }, [])

  // Setup scroll detection - window scroll
  useEffect(() => {
    window.addEventListener('scroll', handleScrollDetection, { passive: true })
    handleScrollDetection() // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScrollDetection)
    }
  }, [handleScrollDetection])

  // Handle section changes
  const handleSectionChange = (sectionId: string, updates: { variant?: string; data?: any; colorScheme?: ColorScheme }) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          variant: updates.variant ?? s.variant,
          data: updates.data ?? s.data,
          colorScheme: updates.colorScheme ?? s.colorScheme,
        }
      }
      return s
    }))
    
    // Clear editing state for this section
    setEditingState(prev => {
      const next = { ...prev }
      delete next[sectionId]
      return next
    })
  }

  // Handle editing state changes
  const handleEditingStateChange = (sectionId: string, editingState: { variant: string; data: any; colorScheme: ColorScheme }) => {
    setEditingState(prev => ({
      ...prev,
      [sectionId]: editingState,
    }))
  }

  // Track unsaved changes
  useEffect(() => {
    let hasAnyChanges = false
    
    for (const section of sections) {
      const editing = editingState[section.id]
      if (editing) {
        const hasChanges = 
          editing.variant !== section.variant ||
          JSON.stringify(editing.data) !== JSON.stringify(section.data) ||
          editing.colorScheme !== (section.colorScheme || 'light')
        
        if (hasChanges) {
          hasAnyChanges = true
          break
        }
      }
    }
    
    const themeChanged = themeRef?.current && JSON.stringify(themeRef.current) !== JSON.stringify(siteConfig.theme)
    const hasChanges = hasAnyChanges || !!themeChanged
    
    setHasUnsavedChanges(hasChanges)
  }, [editingState, sections, themeRef, siteConfig.theme])

  // Save function
  const handleSaveAllChanges = useCallback(async () => {
    const themeChanged = themeRef?.current && JSON.stringify(themeRef.current) !== JSON.stringify(siteConfig.theme)
    const currentLoaderInConfig = siteConfig.loader || { type: 'none', colorScheme: 'light' }
    const loaderChanged = loaderRef?.current && JSON.stringify(loaderRef.current) !== JSON.stringify(currentLoaderInConfig)
    
    if (!hasUnsavedChanges && !themeChanged && !loaderChanged) return
    
    setIsSaving(true)
    
    // Save all sections with editing state
    let updatedSections = sections.map(section => {
      const editing = editingState[section.id]
      if (editing) {
        return {
          ...section,
          variant: editing.variant,
          data: editing.data,
          colorScheme: editing.colorScheme,
        }
      }
      return section
    })
    
    // Check if sections order was changed
    if (sectionsRef?.current) {
      const reorderedSections = sectionsRef.current
      const currentIds = new Set(updatedSections.map(s => s.id))
      const reorderedIds = new Set(reorderedSections.map(s => s.id))
      const idsMatch = currentIds.size === reorderedIds.size && 
        [...currentIds].every(id => reorderedIds.has(id))
      
      if (idsMatch) {
        updatedSections = reorderedSections
      }
    }
    
    setSections(updatedSections)
    setEditingState({})
    setHasUnsavedChanges(false)
    
    // Save to database
    const supabase = createClient()
    const loaderToSave = loaderRef?.current ?? siteConfig.loader ?? {
      type: 'none',
      colorScheme: 'light',
    }
    const updatedConfig: PageConfig = {
      ...siteConfig,
      sections: updatedSections,
      theme: themeRef?.current || localTheme,
      loader: loaderToSave,
    }
    
    const { error } = await supabase
      .from('sites')
      .update({ config: updatedConfig })
      .eq('id', site.id)
    
    if (error) {
      console.error('Error saving site:', error)
      toast.error('Failed to save changes')
      setIsSaving(false)
      return
    }
    
    toastSuccess('Changes saved successfully')
    setIsSaving(false)
    router.refresh()
  }, [sections, editingState, hasUnsavedChanges, themeRef, loaderRef, siteConfig, localTheme, site.id, router])

  // Expose save function via ref
  useEffect(() => {
    saveChangesRef.current = handleSaveAllChanges
  }, [handleSaveAllChanges])

  // Determine current button text
  const currentButtonText = hasUnsavedChanges
    ? (isSaving ? 'Saving...' : 'Save Changes')
    : (site.status === 'published' ? 'Unpublish' : 'Publish')

  // Handle back button
  const handleBack = () => {
    if (window.opener) {
      window.close()
    } else {
      router.push(`/sites/${site.id}`)
    }
  }

  // Handle preview button
  const handlePreview = () => {
    const { protocol, hostname, port } = window.location
    const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
    const previewUrl = `${baseUrl}/preview/${site.id}`
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  // Handle publish/save button
  const handlePublishOrSave = async () => {
    if (hasUnsavedChanges) {
      await handleSaveAllChanges()
    } else {
      if (site.status === 'published') {
        const result = await handleUnpublishSite(site.id)
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess('Site unpublished')
          router.refresh()
        }
      } else {
        const result = await handlePublishSite(site.id)
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess('Site published successfully')
          router.refresh()
        }
      }
    }
  }

  const theme = localTheme
  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  const primaryFont = theme?.fontFamily || 'Inter'
  const headingFont = theme?.headingFontFamily || 'Inter'
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  const showPreviewLoader = isLoading && loaderConfig.type !== 'none'

  if (showPreviewLoader) {
    return <SiteLoader config={loaderConfig} />
  }

  return (
    <>
      {/* Floating Top Navbar */}
      <motion.nav
        className="fixed top-2 z-50 rounded-full builder-floating-nav"
        style={{
          left: isMobile ? '1rem' : '15vw',
          width: isMobile ? 'calc(100vw - 2rem)' : '70vw',
          backdropFilter: 'blur(4px) saturate(125%)',
          WebkitBackdropFilter: 'blur(4px) saturate(125%)',
          background: 'rgba(255, 255, 255, 0.4)',
        }}
        initial={{ y: -100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.8 },
          scale: { duration: 1, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        <div className={`flex h-12 items-center ${isMobile ? 'pl-3 pr-2 gap-1' : 'pl-1.5 pr-2'}`}>
            {/* Left - Back button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Back</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to Site Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Center - Tabs */}
            {!isMobile && (
              <div className="absolute left-1/2 -translate-x-1/2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="layout">Layout</TabsTrigger>
                    <TabsTrigger value="styles">Global Styles</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Right - Preview & Publish */}
            <div className={`${isMobile ? '' : 'ml-auto'} flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {!isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreview}
                    >
                      <ExternalLink className="size-4" />
                      <span className="sr-only">Preview</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Preview site in a new tab</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Morphing Publish/Save button */}
              <motion.div
                animate={{ width: buttonBounds.width > 0 ? buttonBounds.width : 'auto' }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 35,
                }}
                className="overflow-visible"
              >
                <Button
                  ref={buttonRef}
                  size={isMobile ? "sm" : "sm"}
                  variant="default"
                  className={`whitespace-nowrap gap-0 [&>span]:inline [&>span]:leading-none [&>span]:m-0 [&>span]:p-0 ${isMobile ? "text-xs px-2" : ""}`}
                  onClick={handlePublishOrSave}
                  disabled={isSaving}
                  style={{ letterSpacing: 0, wordSpacing: 0 }}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {currentButtonText.split('').map((letter, index) => {
                      return (
                        <motion.span
                          key={`${currentButtonText}-${index}-${letter}`}
                          initial={{ opacity: 0, filter: 'blur(2px)' }}
                          animate={{
                            opacity: 1,
                            filter: 'blur(0px)',
                            transition: {
                              type: 'spring',
                              stiffness: 350,
                              damping: 55,
                              delay: index * 0.015,
                            },
                          }}
                          exit={{
                            opacity: 0,
                            filter: 'blur(2px)',
                            transition: {
                              type: 'spring',
                              stiffness: 500,
                              damping: 55,
                            },
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 55,
                          }}
                          className="inline-block"
                          style={{
                            margin: 0,
                            padding: 0,
                            letterSpacing: 0,
                            wordSpacing: 0,
                          }}
                        >
                          {letter}
                          {letter === ' ' ? '\u00A0' : ''}
                        </motion.span>
                      )
                    })}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
        </div>
      </motion.nav>

      {/* Site Content - Window scroll (no overflow wrapper) */}
      {activeTab === 'layout' && (
        <div data-site-wrapper>
          <FontLoader fonts={fonts} />
          <FontTransition font={primaryFont}>
            {/* Global style for headings */}
            <style dangerouslySetInnerHTML={{
              __html: `
                [data-site-wrapper] [data-site-content] h1,
                [data-site-wrapper] [data-site-content] h2,
                [data-site-wrapper] [data-site-content] h3,
                [data-site-wrapper] [data-site-content] h4,
                [data-site-wrapper] [data-site-content] h5,
                [data-site-wrapper] [data-site-content] h6 {
                  font-family: '${headingFont}', system-ui, -apple-system, sans-serif !important;
                }
              `
            }} />
            <div
              data-site-content
              className="site-content"
              style={{ fontFamily: theme?.fontFamily, backgroundColor: theme?.backgroundColor || '#ffffff', color: theme?.textColor }}
            >
              {sections.map((section) => {
                const editing = editingState[section.id]
                const displaySection = editing ? {
                  ...section,
                  variant: editing.variant,
                  data: editing.data,
                  colorScheme: editing.colorScheme,
                } : section

                const sectionKey = section.type === 'hero'
                  ? `${section.id}-${displaySection.variant}`
                  : section.id

                return (
                  <div
                    key={section.id}
                    data-section-id={section.id}
                    ref={(el) => {
                      const sectionElement = el as HTMLDivElement | null
                      registerSectionRef(section.id, sectionElement)
                    }}
                  >
                    {section.type === 'hero' ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={sectionKey}
                          initial={{
                            opacity: 0,
                            x: 50,
                            scale: 0.95,
                            filter: 'blur(4px)'
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            filter: 'blur(0px)'
                          }}
                          exit={{
                            opacity: 0,
                            x: -50,
                            scale: 0.95,
                            filter: 'blur(4px)'
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                            mass: 0.8,
                          }}
                        >
                          <SectionRenderer section={displaySection} theme={theme} colorScheme={displaySection.colorScheme || 'light'} />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <SectionRenderer section={displaySection} theme={theme} colorScheme={displaySection.colorScheme || 'light'} />
                    )}
                  </div>
                )
              })}
            </div>
            <FloatingCTAButton type={ctaType} value={ctaValue} colorScheme={sections?.[0]?.colorScheme || 'light'} />
          </FontTransition>
        </div>
      )}

      {activeTab === 'styles' && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Global Styles</h2>
            <p className="text-muted-foreground">
              Global styling options will be available here soon.
            </p>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar - SectionMorphingIndicator */}
      {activeTab === 'layout' && (
        <SectionMorphingIndicator
          activeSection={activeSection}
          originalSection={sections.find(s => s.id === activeSection?.id) || null}
          onSectionChange={handleSectionChange}
          onEditingStateChange={handleEditingStateChange}
        />
      )}
    </>
  )
}

