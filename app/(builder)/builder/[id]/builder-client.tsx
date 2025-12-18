'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
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
import { LenisProvider } from '@/components/providers/LenisProvider'
import { handlePublishSite, handleUnpublishSite } from '@/app/actions/site-actions'

interface BuilderClientProps {
  site: Site
}

/**
 * Builder Client - Full-screen layout editor
 * 
 * Renderuje site priamo s admin controls on top:
 * - Floating top navbar (Back, Logo + Title, Preview, Publish)
 * - Site content (window scroll - aby highlights fungovalo)
 * - Floating bottom bar (SectionMorphingIndicator)
 */
export function BuilderClient({ site }: BuilderClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [buttonRef, buttonBounds] = useMeasure()
  const [isUIVisible, setIsUIVisible] = useState(true)
  const router = useRouter()
  const isMobile = useIsMobile()
  
  // Detect platform for keyboard shortcut display
  const isMac = typeof window !== 'undefined' && (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
  
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

  // Keyboard shortcut: Ctrl+E / Cmd+E to toggle UI visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault()
        e.stopPropagation()
        setIsUIVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true)
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

  // Handle section changes - auto-save to database
  const handleSectionChange = async (sectionId: string, updates: { variant?: string; data?: any; colorScheme?: ColorScheme }) => {
    // Update local state immediately
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          variant: updates.variant ?? s.variant,
          data: updates.data ?? s.data,
          colorScheme: updates.colorScheme ?? s.colorScheme,
        }
      }
      return s
    })
    
    setSections(updatedSections)
    
    // Clear editing state for this section
    setEditingState(prev => {
      const next = { ...prev }
      delete next[sectionId]
      return next
    })
    
    // Auto-save to database
    try {
      const supabase = createClient()
      const updatedConfig: PageConfig = {
        ...siteConfig,
        sections: updatedSections,
      }
      
      const { error } = await supabase
        .from('sites')
        .update({ config: updatedConfig })
        .eq('id', site.id)
      
      if (error) {
        console.error('[handleSectionChange] Error saving to database:', error)
        toast.error(`Failed to save: ${error.message}`)
      } else {
        console.log('[handleSectionChange] Successfully saved to database')
      }
    } catch (error) {
      console.error('[handleSectionChange] Error saving to database:', error)
      toast.error('Failed to save changes')
    }
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
      <AnimatePresence>
        {isUIVisible && (
          <motion.nav
            className="fixed top-2 z-50 rounded-full builder-floating-nav"
            style={{
              left: isMobile ? '1rem' : '15vw',
              width: isMobile ? 'calc(100vw - 2rem)' : '70vw',
              background: 'rgba(255, 255, 255, 1)',
              border: '1px solid rgba(230, 230, 230, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            } as React.CSSProperties}
            initial={{ y: -100, opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ y: -100, opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.8 },
              scale: { duration: 1, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
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
                  className="rounded-full h-9 w-9"
                  style={{
                    background: 'rgba(255, 255, 255, 1)',
                  }}
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Back</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to Site Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Center - Logo + Title */}
            {!isMobile && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
                <svg width="60" height="22" viewBox="0 0 389 145" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4">
                  <path d="M283.836 90.992C283.836 84.224 285.027 77.7067 287.408 71.44C289.789 65.048 293.236 59.408 297.748 54.52C302.26 49.632 307.712 45.7467 314.104 42.864C320.496 39.9814 327.703 38.54 335.724 38.54C343.62 38.54 350.827 39.9187 357.344 42.676C363.861 45.308 369.439 49.0054 374.076 53.768C378.713 58.5307 382.285 64.2334 384.792 70.876C387.424 77.5187 388.74 84.788 388.74 92.684C388.74 93.812 388.74 94.752 388.74 95.504C388.74 96.256 388.677 97.196 388.552 98.324H308.088C309.341 105.844 312.537 111.609 317.676 115.62C322.815 119.505 328.956 121.448 336.1 121.448C342.116 121.448 347.192 120.508 351.328 118.628C355.464 116.748 359.663 113.991 363.924 110.356L381.784 125.208C379.528 127.715 376.896 130.096 373.888 132.352C370.88 134.483 367.496 136.425 363.736 138.18C359.976 139.809 355.777 141.125 351.14 142.128C346.628 143.131 341.615 143.632 336.1 143.632C328.204 143.632 320.997 142.253 314.48 139.496C308.088 136.739 302.573 133.041 297.936 128.404C293.424 123.641 289.915 118.064 287.408 111.672C285.027 105.155 283.836 98.2614 283.836 90.992ZM309.216 78.584H363.548C361.793 72.6934 358.472 68.1187 353.584 64.86C348.696 61.476 342.868 59.784 336.1 59.784C329.833 59.784 324.381 61.3507 319.744 64.484C315.232 67.492 311.723 72.192 309.216 78.584Z" fill="currentColor" className="text-foreground"/>
                  <path d="M238.797 141V41.172H263.801V141H238.797ZM235.225 15.228C235.225 10.8413 236.791 7.20667 239.925 4.324C243.058 1.44133 246.818 0 251.205 0C255.717 0 259.477 1.62933 262.485 4.888C265.618 8.14667 267.185 12.032 267.185 16.544C267.185 20.9307 265.618 24.6907 262.485 27.824C259.351 30.9573 255.591 32.524 251.205 32.524C246.567 32.524 242.745 30.832 239.737 27.448C236.729 23.9387 235.225 19.8653 235.225 15.228Z" fill="currentColor" className="text-foreground"/>
                  <path d="M172.469 41.172H185.253V4.32397H210.257V41.172H225.109V62.792H210.257V141H185.253V62.792H172.469V41.172Z" fill="currentColor" className="text-foreground"/>
                  <path d="M113.352 41.172H126.136V4.32397H151.14V41.172H165.992V62.792H151.14V141H126.136V62.792H113.352V41.172Z" fill="currentColor" className="text-foreground"/>
                  <path d="M0 91.452C0 84.0573 1.37867 77.164 4.136 70.772C6.89333 64.38 10.6533 58.8653 15.416 54.228C20.304 49.4653 25.8813 45.768 32.148 43.136C38.54 40.3787 45.308 39 52.452 39C59.596 39 66.3013 40.3787 72.568 43.136C78.96 45.768 84.5373 49.4653 89.3 54.228C94.188 58.8653 98.0107 64.38 100.768 70.772C103.525 77.164 104.904 84.0573 104.904 91.452C104.904 98.7213 103.588 105.552 100.956 111.944C98.324 118.336 94.6267 123.913 89.864 128.676C85.2267 133.439 79.712 137.199 73.32 139.956C66.928 142.713 59.972 144.092 52.452 144.092C44.932 144.092 37.976 142.713 31.584 139.956C25.192 137.199 19.6147 133.439 14.852 128.676C10.2147 123.913 6.58 118.336 3.948 111.944C1.316 105.552 0 98.7213 0 91.452ZM25.192 91.64C25.192 96.0267 25.8813 99.9747 27.26 103.484C28.764 106.993 30.7067 110.001 33.088 112.508C35.5947 115.015 38.4773 116.957 41.736 118.336C45.12 119.715 48.692 120.404 52.452 120.404C56.212 120.404 59.7213 119.715 62.98 118.336C66.364 116.957 69.2467 115.015 71.628 112.508C74.1347 110.001 76.0773 106.993 77.456 103.484C78.96 99.9747 79.712 96.0267 79.712 91.64C79.712 87.3787 79.0227 83.4933 77.644 79.984C76.3907 76.4747 74.5733 73.4667 72.192 70.96C69.8107 68.328 66.928 66.3227 63.544 64.944C60.16 63.44 56.4627 62.688 52.452 62.688C48.4413 62.688 44.744 63.44 41.36 64.944C37.976 66.3227 35.0933 68.328 32.712 70.96C30.3307 73.4667 28.4507 76.4747 27.072 79.984C25.8187 83.4933 25.192 87.3787 25.192 91.64Z" fill="currentColor" className="text-foreground"/>
                </svg>
                <span className="text-xs text-muted-foreground ml-1">×</span>
                <span className="text-sm font-medium text-foreground ml-2">{site.title}</span>
              </div>
            )}

            {/* Right - Preview & Publish */}
            <div className={`${isMobile ? '' : 'ml-auto'} flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {!isMobile && (
                <>
                  <span className="text-xs text-muted-foreground/60 px-2">
                    {isMac ? '⌘+E to hide' : 'Ctrl+E to hide'}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreview}
                        className="rounded-full h-9 w-9"
                        style={{
                          background: 'rgba(255, 255, 255, 1)',
                        }}
                      >
                        <ExternalLink className="size-4" />
                        <span className="sr-only">Preview</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preview site in a new tab</p>
                    </TooltipContent>
                  </Tooltip>
                </>
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
        )}
      </AnimatePresence>

      {/* Site Content - Window scroll (no overflow wrapper) */}
      {(
        <LenisProvider>
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
        </LenisProvider>
      )}

      {/* Floating Bottom Bar - SectionMorphingIndicator */}
      {(
        <SectionMorphingIndicator
          activeSection={activeSection}
          originalSection={sections.find(s => s.id === activeSection?.id) || null}
          onSectionChange={handleSectionChange}
          onEditingStateChange={handleEditingStateChange}
          isVisible={isUIVisible}
          siteId={site.id}
        />
      )}
    </>
  )
}

