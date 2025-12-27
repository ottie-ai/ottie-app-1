'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Site } from '@/types/database'
import type { 
  PageConfig, 
  Section, 
  ColorScheme, 
  ThemeConfig, 
  LoaderConfig,
  SiteContent,
  SectionSettings,
  LegacyPageConfig,
} from '@/types/builder'
import { 
  ensureV2Config, 
  getV1Config,
} from '@/lib/config-migration'
import { toastSuccess } from '@/lib/toast-helpers'
import { SectionRenderer } from '@/components/templates/SectionRenderer'
import { FontLoader } from '@/components/builder/FontLoader'
import { FontTransition } from '@/components/builder/FontTransition'
import { FloatingCTAButton } from '@/components/shared/whatsapp-button'
import { SectionMorphingIndicator } from '@/components/shared/section-morphing-indicator'
import { LenisProvider } from '@/components/providers/LenisProvider'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

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
    id: 'highlights-1',
    type: 'highlights',
    variant: 'cards',
    colorScheme: 'light',
    data: {
      title: 'Property Highlights',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      highlights: [
        {
          title: 'COVERAGE',
          text: 'Access 100M+ candidates from verified job boards, niche sites, and professional networks. We ensure your job gets seen, remembered, and chosen by the top talent.',
          number: '1',
          image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        },
        {
          title: 'CUSTOMIZATION',
          text: 'No generic templates. Every job posting is tailored to your company culture, role requirements, and target audience for maximum impact.',
          number: '2',
          image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        },
        {
          title: 'ANALYTICS',
          text: 'Track performance with detailed analytics. See which channels drive the best candidates and optimize your recruitment strategy in real-time.',
          number: '3',
          image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        },
        {
          title: 'SUPPORT',
          text: 'Dedicated account manager and 24/7 support to help you find the perfect candidates and streamline your hiring process from start to finish.',
          number: '4',
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        },
      ],
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
]

interface PreviewSitePageProps {
  site: Site
  canEdit?: boolean
  onHasUnsavedChanges?: (hasChanges: boolean) => void
  saveChangesRef?: React.MutableRefObject<(() => Promise<void>) | null>
  onThemeChange?: (theme: ThemeConfig) => void
  themeRef?: React.MutableRefObject<ThemeConfig | null>
  loaderRef?: React.MutableRefObject<LoaderConfig | null>
  sectionsRef?: React.MutableRefObject<Section[] | null>
}

/**
 * Clean Preview Site Page - NO Admin Elements
 * 
 * This is a clean preview without:
 * - WorkspaceNavbar
 * - Remix buttons
 * - Section editors
 * - Settings panels
 * 
 * Archived version with admin elements: preview-site-page-archived-with-admin.tsx
 */
export function PreviewSitePage({ site, canEdit = false, onHasUnsavedChanges, saveChangesRef, onThemeChange, themeRef, loaderRef, sectionsRef }: PreviewSitePageProps) {
  // Add site-route class before hydration to avoid admin background flash
  const siteRouteScript = (
    <Script
      id="preview-site-route-class"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof document !== 'undefined') {
            document.body.classList.add('site-route');
            document.documentElement.classList.add('site-route');
          }
        `,
      }}
    />
  )

  // Fallback: ensure class stays during client lifecycle
  useEffect(() => {
    document.body.classList.add('site-route')
    document.documentElement.classList.add('site-route')
    return () => {
      document.body.classList.remove('site-route')
      document.documentElement.classList.remove('site-route')
    }
  }, [])

  // Site config - always use v2 format internally
  const v2Config = useMemo(() => ensureV2Config(site.config), [site.config])
  
  // Get legacy format for components that still use Section[] with embedded data
  const legacyConfig = useMemo(() => getV1Config(site.config), [site.config])
  
  // Site content state (v2)
  const [siteContent, setSiteContent] = useState<SiteContent>(v2Config.siteContent)
  
  // For backward compatibility with current components
  const siteConfig: LegacyPageConfig = legacyConfig
  
  // Alias for legacy code that references 'config' directly
  const config = legacyConfig

  // Loader config for preview (default none if missing)
  const loaderConfig = siteConfig.loader || { type: 'none', colorScheme: 'light' }

  // Cache loader config to localStorage for loading.tsx
  useEffect(() => {
    try {
      localStorage.setItem(`loader-config-${site.id}`, JSON.stringify(loaderConfig))
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [loaderConfig, site.id])

  // Use local theme state that can be updated without saving
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

  // Expose theme via ref
  useEffect(() => {
    if (themeRef) {
      themeRef.current = localTheme
    }
  }, [localTheme, themeRef])

  // Handle theme changes from settings panel
  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(localTheme)
    }
  }, [localTheme, onThemeChange])

  // Update local theme when config changes (after save)
  useEffect(() => {
    if (config?.theme) {
      setLocalTheme(config.theme)
    }
  }, [config?.theme])

  // Initialize loader ref with config value - update whenever config changes
  useEffect(() => {
    if (loaderRef) {
      // Always set loaderRef from config, even if it's undefined (will use default in save)
      const loaderFromConfig = config?.loader || siteConfig.loader || {
        type: 'none',
        colorScheme: 'light',
      }
      loaderRef.current = loaderFromConfig
    }
  }, [loaderRef, config?.loader, siteConfig.loader])

  const theme = localTheme
  const { sections: initialSections } = siteConfig
  const ctaType = theme?.ctaType || 'none'
  const ctaValue = theme?.ctaValue || ''

  // Get actual sections from config (prioritize config over default)
  // If no sections, use test sections (hardcoded for testing)
  const actualSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
    ? config.sections 
    : (initialSections && initialSections.length > 0 ? initialSections : testSections)

  const [sections, setSections] = useState<Section[]>(actualSections)
  const [activeSection, setActiveSection] = useState<Section | null>(sections[0] || null)
  
  // Update sections when config changes (after refresh or migration)
  useEffect(() => {
    const newSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
      ? config.sections 
      : (initialSections && initialSections.length > 0 ? initialSections : testSections)
    
    if (JSON.stringify(newSections) !== JSON.stringify(sections)) {
      setSections(newSections)
      if (newSections.length > 0 && (!activeSection || !newSections.find(s => s.id === activeSection.id))) {
        setActiveSection(newSections[0])
      }
    }
  }, [config?.sections, initialSections])
  
  // Use ref to store sections for stable scroll detection callback
  const sectionsForScrollRef = useRef<Section[]>(sections)
  useEffect(() => {
    sectionsForScrollRef.current = sections
  }, [sections])
  
  // Track site config to detect changes after refresh
  const [lastConfig, setLastConfig] = useState<string>(JSON.stringify(config))
  const [editingState, setEditingState] = useState<Record<string, { variant: string; data: any; colorScheme: ColorScheme }>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const router = useRouter()

  // Handle editing state changes (for preview only, not saved yet)
  const handleEditingStateChange = (sectionId: string, editingState: { variant: string; data: any; colorScheme: ColorScheme }) => {
    setEditingState(prev => ({
      ...prev,
      [sectionId]: editingState,
    }))
  }

  // Track unsaved changes globally across all sections and theme
  useEffect(() => {
    // Check if any section has unsaved changes
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
    
    // Check if theme has changed
    const themeChanged = themeRef?.current && JSON.stringify(themeRef.current) !== JSON.stringify(siteConfig.theme)
    const hasChanges = hasAnyChanges || !!themeChanged
    
    setHasUnsavedChanges(hasChanges)
    
    // Call parent callback if provided (direct rendering)
    if (onHasUnsavedChanges) {
      onHasUnsavedChanges(hasChanges)
    }
    
    // Notify parent window (if in iframe - for backward compatibility)
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ type: 'UNSAVED_CHANGES', hasChanges }, '*')
    }
  }, [editingState, sections, onHasUnsavedChanges, themeRef, siteConfig.theme])

  // Save all unsaved changes (use useCallback to make it stable)
  const handleSaveAllChanges = useCallback(async () => {
    // Check if theme has changed
    const themeChanged = themeRef?.current && JSON.stringify(themeRef.current) !== JSON.stringify(siteConfig.theme)
    // Check if loader has changed - compare with current config or default
    const currentLoaderInConfig = siteConfig.loader || { type: 'none', colorScheme: 'light' }
    const loaderChanged = loaderRef?.current && JSON.stringify(loaderRef.current) !== JSON.stringify(currentLoaderInConfig)
    
    if (!canEdit || (!hasUnsavedChanges && !themeChanged && !loaderChanged) || isSaving) return
    
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
    
    // Check if sections order was changed in SiteSettingsPanel
    if (sectionsRef?.current) {
      const reorderedSections = sectionsRef.current
      // Verify that all section IDs match (just reordered)
      const currentIds = new Set(updatedSections.map(s => s.id))
      const reorderedIds = new Set(reorderedSections.map(s => s.id))
      const idsMatch = currentIds.size === reorderedIds.size && 
        [...currentIds].every(id => reorderedIds.has(id))
      
      if (idsMatch) {
        // Use reordered sections from SiteSettingsPanel
        updatedSections = reorderedSections
      }
    }
    
    setSections(updatedSections)
    setEditingState({})
    setHasUnsavedChanges(false)
    
    // Save to database in v2 format
    const supabase = createClient()
    // Get loader config - prioritize loaderRef, fallback to siteConfig.loader, then default
    const loaderToSave = loaderRef?.current ?? siteConfig.loader ?? {
      type: 'none',
      colorScheme: 'light',
    }
    
    // Convert to v2 format
    const updatedSectionSettings: SectionSettings[] = updatedSections.map(s => ({
      id: s.id,
      type: s.type,
      variant: s.variant,
      colorScheme: s.colorScheme,
    }))
    
    const updatedV2Config: PageConfig = {
      _version: 2,
      siteSettings: {
        theme: themeRef?.current || localTheme,
        loader: loaderToSave,
      },
      sectionSettings: updatedSectionSettings,
      siteContent: siteContent,
    }
    
    const { error } = await supabase
      .from('sites')
      .update({ config: updatedV2Config })
      .eq('id', site.id)
    
    if (error) {
      console.error('Error saving changes:', error)
      setIsSaving(false)
      return
    }
    
    toastSuccess('Changes saved successfully')
    router.refresh()
    setIsSaving(false)
  }, [canEdit, hasUnsavedChanges, isSaving, editingState, sections, siteConfig, site.id, router, themeRef, loaderRef, localTheme, v2Config, siteContent])

  // Expose save function to parent via ref
  useEffect(() => {
    if (saveChangesRef) {
      saveChangesRef.current = handleSaveAllChanges
      return () => {
        saveChangesRef.current = null
      }
    }
  }, [handleSaveAllChanges, saveChangesRef])

  // Listen for save message from parent (for iframe compatibility)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SAVE_CHANGES') {
        handleSaveAllChanges()
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleSaveAllChanges])

  // Handle section updates from settings panel (save to database)
  const handleSectionChange = async (sectionId: string, updates: { variant?: string; data?: any; colorScheme?: ColorScheme }) => {
    console.log('[handleSectionChange] Called with:', {
      sectionId,
      updates,
      canEdit,
      siteId: site.id,
    })
    
    // Get current editing state or use updates
    const currentEditing = editingState[sectionId]
    const finalUpdates = {
      variant: updates.variant !== undefined ? updates.variant : (currentEditing?.variant ?? sections.find(s => s.id === sectionId)?.variant),
      data: updates.data !== undefined ? updates.data : (currentEditing?.data ?? sections.find(s => s.id === sectionId)?.data),
      colorScheme: updates.colorScheme !== undefined ? updates.colorScheme : (currentEditing?.colorScheme ?? sections.find(s => s.id === sectionId)?.colorScheme),
    }

    console.log('[handleSectionChange] Final updates:', {
      sectionId,
      updates,
      currentEditing,
      finalUpdates,
      dataHeadline: finalUpdates.data?.headline,
      dataSubheadline: finalUpdates.data?.subheadline,
    })

    // Update local state
    const updatedSections = sections.map(section => {
      if (section.id !== sectionId) return section
      return {
        ...section,
        variant: finalUpdates.variant ?? section.variant,
        data: finalUpdates.data ?? section.data,
        colorScheme: finalUpdates.colorScheme ?? section.colorScheme,
      }
    })
    
    setSections(updatedSections)
    
    // Clear editing state for this section
    setEditingState(prev => {
      const newState = { ...prev }
      delete newState[sectionId]
      return newState
    })
    
    // Update active section if it's the one being edited
    if (activeSection?.id === sectionId) {
      setActiveSection(prev => prev ? {
        ...prev,
        variant: finalUpdates.variant ?? prev.variant,
        data: finalUpdates.data ?? prev.data,
        colorScheme: finalUpdates.colorScheme ?? prev.colorScheme,
      } : null)
    }

    // Save to database in v2 format
    console.log('[handleSectionChange] Checking canEdit:', canEdit)
    if (canEdit) {
      console.log('[handleSectionChange] canEdit is true, saving to database...')
      const supabase = createClient()
      
      // Convert to v2 format
      const updatedSectionSettings: SectionSettings[] = updatedSections.map(s => ({
        id: s.id,
        type: s.type,
        variant: s.variant,
        colorScheme: s.colorScheme,
      }))
      
      const updatedV2Config: PageConfig = {
        _version: 2,
        siteSettings: v2Config.siteSettings,
        sectionSettings: updatedSectionSettings,
        siteContent: siteContent,
      }
      
      console.log('[handleSectionChange] Saving to database:', {
        siteId: site.id,
        updatedConfig: JSON.stringify(updatedV2Config, null, 2),
        sectionData: finalUpdates.data,
        updatedSectionsCount: updatedSections.length,
      })
      
      const { error, data } = await supabase
        .from('sites')
        .update({ config: updatedV2Config })
        .eq('id', site.id)
        .select()
      
      if (error) {
        console.error('[handleSectionChange] Error saving section changes:', error)
        alert(`Error saving: ${error.message}`)
        return
      }
      
      console.log('[handleSectionChange] Successfully saved to database:', data)
      
      // Force refresh to get latest data
      // Use router.refresh() to reload server components
      router.refresh()
      
      // Also update local state immediately with saved data
      // This ensures UI updates even if refresh is slow
      if (data && data[0]?.config) {
        const savedConfig = getV1Config(data[0].config)
        if (savedConfig.sections) {
          setSections(savedConfig.sections)
          // Update active section if it's the one we just saved
          if (activeSection?.id === sectionId) {
            const updatedSection = savedConfig.sections.find(s => s.id === sectionId)
            if (updatedSection) {
              setActiveSection(updatedSection)
            }
          }
        }
      }
    } else {
      console.warn('[handleSectionChange] Cannot save - canEdit is false')
      alert('Cannot save - you do not have edit permissions')
    }

    // Refresh ScrollTrigger after section change to recalculate scroll positions
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        ScrollTrigger.refresh()
      }, 100) // Small delay to ensure DOM is updated
    }
  }

  // Refresh ScrollTrigger when sections change
  useEffect(() => {
    if (typeof window !== 'undefined' && sections.length > 0) {
      // Use a small delay to ensure DOM is fully updated
      const timeoutId = setTimeout(() => {
        ScrollTrigger.refresh()
      }, 150)
      
      return () => clearTimeout(timeoutId)
    }
  }, [sections])

  // Update sections when site.config changes (after refresh)
  useEffect(() => {
    const currentConfigStr = JSON.stringify(config)
    
    // Check if config actually changed
    if (currentConfigStr !== lastConfig) {
      console.log('[PreviewSitePage] Config changed, updating sections')
      setLastConfig(currentConfigStr)
      
    const newSections = (config?.sections && Array.isArray(config.sections) && config.sections.length > 0) 
      ? config.sections 
      : (initialSections && initialSections.length > 0 ? initialSections : testSections)
    
    if (newSections.length > 0) {
        console.log('[PreviewSitePage] Updating sections from config:', {
          oldSections: sections,
          newSections,
        })
      setSections(newSections)
        
        // Update active section if it exists in new sections
        if (activeSection) {
          const updatedActiveSection = newSections.find(s => s.id === activeSection.id)
          if (updatedActiveSection) {
            console.log('[PreviewSitePage] Updating active section:', updatedActiveSection)
            setActiveSection(updatedActiveSection)
          } else if (newSections.length > 0) {
            setActiveSection(newSections[0])
          }
        } else if (newSections.length > 0) {
        setActiveSection(newSections[0])
        }
      }
    }
  }, [config, lastConfig, initialSections, sections, activeSection])

  // Register section refs
  const registerSectionRef = (sectionId: string, element: HTMLDivElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element)
    } else {
      sectionRefs.current.delete(sectionId)
    }
  }

  // Scroll detection for active section
  const handleScrollDetection = useCallback(() => {
    if (sectionRefs.current.size === 0) return
    
    // Find the scroll container (parent with overflow-y-auto or window)
    const findScrollContainer = (): HTMLElement | Window | null => {
      if (sectionRefs.current.size === 0) return null
      
      const firstSection = Array.from(sectionRefs.current.values())[0]
      if (!firstSection) return window
      
      let parent: HTMLElement | null = firstSection.parentElement
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent
        }
        parent = parent.parentElement
      }
      return window
    }
    
    const scrollContainer = findScrollContainer()
    if (!scrollContainer) return
    
    // Calculate viewport center - for container scroll, need to account for container's position
    let viewportCenter: number
    if (scrollContainer === window) {
      viewportCenter = window.innerHeight * 0.5
    } else {
      const container = scrollContainer as HTMLElement
      const containerRect = container.getBoundingClientRect()
      viewportCenter = containerRect.top + container.clientHeight * 0.5
    }
    
    let activeSectionId: string | null = null
    let minDistance = Infinity
    
    // Find the section closest to viewport center using getBoundingClientRect
    // This works for both window scroll and container scroll
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
    
    // Fallback: if no section is in viewport center, find the closest one
    if (!activeSectionId) {
      for (const [id, element] of sectionRefs.current.entries()) {
        const rect = element.getBoundingClientRect()
        const elementCenter = rect.top + rect.height / 2
        const distance = Math.abs(viewportCenter - elementCenter)
        
        // Only consider sections that are at least partially visible
        if (rect.bottom > 0 && rect.top < (scrollContainer === window ? window.innerHeight : (scrollContainer as HTMLElement).clientHeight)) {
          if (distance < minDistance) {
            minDistance = distance
            activeSectionId = id
          }
        }
      }
    }
    
    if (activeSectionId) {
      setActiveSection(prev => {
        // Only update if the section actually changed
        if (prev?.id === activeSectionId) return prev
        const section = sectionsForScrollRef.current.find(s => s.id === activeSectionId)
        if (section) {
          console.log('[PreviewSitePage] Active section changed:', {
            from: prev?.type,
            to: section?.type,
            sectionId: activeSectionId
          })
        }
        return section || prev
      })
    }
  }, []) // Empty deps - use ref for sections to avoid re-creating callback

  useEffect(() => {
    // Find the scroll container (parent with overflow-y-auto or window)
    const findScrollContainer = (): HTMLElement | Window | null => {
      if (sectionRefs.current.size === 0) return null
      
      const firstSection = Array.from(sectionRefs.current.values())[0]
      if (!firstSection) return window
      
      let parent: HTMLElement | null = firstSection.parentElement
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return parent
        }
        parent = parent.parentElement
      }
      return window
    }
    
    // Listen to both window and scroll container
    window.addEventListener('scroll', handleScrollDetection, { passive: true })
    
    // Also listen to scroll container if it exists
    let scrollContainer: HTMLElement | Window | null = null
    const timeoutId = setTimeout(() => {
      scrollContainer = findScrollContainer()
      if (scrollContainer && scrollContainer !== window) {
        scrollContainer.addEventListener('scroll', handleScrollDetection, { passive: true })
      }
      handleScrollDetection() // Initial check
    }, 100)
    
    handleScrollDetection() // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScrollDetection)
      clearTimeout(timeoutId)
      if (scrollContainer && scrollContainer !== window) {
        scrollContainer.removeEventListener('scroll', handleScrollDetection)
      }
    }
  }, [handleScrollDetection])

  const fonts = [theme?.fontFamily, theme?.headingFontFamily].filter(Boolean) as string[]
  const primaryFont = theme?.fontFamily || 'Inter'

  // If no sections, show a placeholder message
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

  // Get heading font for global CSS
  const headingFont = theme?.headingFontFamily || 'Inter'

  return (
    <>
      {/* Force white background immediately */}
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            background-color: #ffffff !important;
            background-image: none !important;
          }
          html {
            background-color: #ffffff !important;
          }
        `
      }} />
      {siteRouteScript}
      <LenisProvider>
        <div data-site-wrapper>
        <FontLoader fonts={fonts} />
        <FontTransition font={primaryFont}>
          {/* Global style for all headings - ONLY applies to site content, not admin UI */}
          {/* Using scoped style with unique ID to prevent affecting admin UI */}
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
            {sections?.map((section: Section) => {
              // Use editing state if available (for preview), otherwise use saved section
              const editing = editingState[section.id]
              const displaySection = editing ? {
                ...section,
                variant: editing.variant,
                data: editing.data,
                colorScheme: editing.colorScheme,
              } : section
              
              // Create unique key that includes variant for hero sections to trigger animation
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
          {/* ADMIN-ONLY: Morphing indicator is only visible when embedded in editor (has onHasUnsavedChanges/saveChangesRef), not in standalone preview */}
          {canEdit && (onHasUnsavedChanges || saveChangesRef) && (
            <SectionMorphingIndicator 
              activeSection={activeSection}
              originalSection={sections.find(s => s.id === activeSection?.id) || null}
              onSectionChange={handleSectionChange}
              onEditingStateChange={handleEditingStateChange}
              siteId={site.id}
            />
          )}
        </FontTransition>
        </div>
      </LenisProvider>
    </>
  )
}
