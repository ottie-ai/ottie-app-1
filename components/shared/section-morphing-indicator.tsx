'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import useMeasure from 'react-use-measure'
import { AnimatePresence, motion } from 'framer-motion'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/utils'
import type { Section, HeroSectionData, FeaturesSectionData, HighlightsSectionData, ColorScheme } from '@/types/builder'
import { HeroRemixPanel } from '@/components/builder/settings/PageSettings'
import { FeaturesRemixPanel } from '@/components/builder/settings/FeaturesSettings'
import { HighlightsRemixPanel } from '@/components/builder/settings/HighlightsSettings'
import { LottieSettingsIcon } from '@/components/ui/lottie-settings-icon'

interface SectionMorphingIndicatorProps {
  activeSection: Section | null
  originalSection?: Section | null // Original section values to compare against
  onSectionChange?: (sectionId: string, updates: { variant?: string; data?: any; colorScheme?: ColorScheme }) => void
  onEditingStateChange?: (sectionId: string, editingState: { variant: string; data: any; colorScheme: ColorScheme }) => void
  isPublicSite?: boolean // Explicit flag to prevent rendering on public sites (default: false)
  isVisible?: boolean // Control visibility via keyboard shortcut (default: true)
}

const FEEDBACK_WIDTH = 360
const FEEDBACK_HEIGHT = 400
const SPEED = 1

const LOGO_SPRING = {
  type: 'spring',
  stiffness: 350 / SPEED,
  damping: 35,
} as const

/**
 * Sticky morphing indicator that shows current section name
 * Positioned at the bottom center of the screen
 * Includes Settings button that opens section-specific settings panel
 * 
 * SECURITY: This is an ADMIN-ONLY component. It must NEVER render on public sites.
 * It only renders in admin/editor contexts (e.g., /preview/[id] with canEdit=true).
 */
export function SectionMorphingIndicator({ activeSection, originalSection, onSectionChange, onEditingStateChange, isPublicSite = false, isVisible = true }: SectionMorphingIndicatorProps) {
  const pathname = usePathname()
  const [isPublishedSite, setIsPublishedSite] = React.useState(false)
  
  // SECURITY: Never render on public sites
  // This ensures the morphing indicator is NEVER visible to public visitors
  
  // Check 1: Explicit prop flag
  if (isPublicSite) {
    return null
  }
  
  // Check 2: Detect published site marker in DOM (runs after mount)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const checkPublishedSite = () => {
        const publishedSiteElement = document.querySelector('[data-published-site]')
        if (publishedSiteElement) {
          console.warn('[SectionMorphingIndicator] SECURITY: Detected published site context. This admin component should never be used on public sites.')
          setIsPublishedSite(true)
        }
      }
      
      // Check immediately
      checkPublishedSite()
      
      // Also watch for changes (in case DOM updates)
      const observer = new MutationObserver(checkPublishedSite)
      observer.observe(document.body, { childList: true, subtree: true })
      
      return () => observer.disconnect()
    }
  }, [])
  
  // Check 3: Pathname-based detection (synchronous check)
  if (typeof window !== 'undefined' && pathname) {
    const isAdminRoute = pathname.startsWith('/preview/') || 
                        pathname.startsWith('/builder/') || 
                        pathname.startsWith('/overview') ||
                        pathname.startsWith('/sites') ||
                        pathname.startsWith('/settings') ||
                        pathname.startsWith('/client-portals') ||
                        pathname.startsWith('/login') ||
                        pathname.startsWith('/signup')
    
    // If we're not on an admin route, check for published site marker synchronously
    if (!isAdminRoute && typeof document !== 'undefined') {
      const hasPublishedSiteMarker = document.querySelector('[data-published-site]') !== null
      if (hasPublishedSiteMarker) {
        return null
      }
    }
  }
  
  // Check 4: State-based check (after DOM check completes)
  if (isPublishedSite) {
    return null
  }
  
  const [ref, bounds] = useMeasure()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [contentHeight, setContentHeight] = React.useState(0)

  // Editing state for current section
  const [editingVariant, setEditingVariant] = React.useState<string>(activeSection?.variant || '')
  const [editingData, setEditingData] = React.useState<any>(activeSection?.data || {})
  const [editingColorScheme, setEditingColorScheme] = React.useState<ColorScheme>(
    activeSection?.colorScheme || 'light'
  )

  // Update editing state when active section changes (but not when variant changes from within)
  const isInternalChange = React.useRef(false)
  
  React.useEffect(() => {
    if (activeSection && !isInternalChange.current) {
      setEditingVariant(activeSection.variant)
      setEditingData(activeSection.data)
      setEditingColorScheme(activeSection.colorScheme || 'light')
    }
    isInternalChange.current = false
  }, [activeSection?.id]) // Only update when section ID changes, not when variant changes


  // Close settings when section changes (don't save)
  React.useEffect(() => {
    if (activeSection && showSettings) {
      setShowSettings(false)
    }
  }, [activeSection?.id])

  function closeSettings() {
    // Don't save when closing - just close
    setShowSettings(false)
  }

  function openSettings() {
    setShowSettings(true)
  }

  function onSave() {
    console.log('[SectionMorphingIndicator] onSave called:', {
      activeSection: activeSection?.id,
      hasOnSectionChange: !!onSectionChange,
      editingVariant,
      editingData,
      editingColorScheme,
    })
    
    // Save changes
    if (activeSection && onSectionChange) {
      console.log('[SectionMorphingIndicator] Calling onSectionChange with:', {
        sectionId: activeSection.id,
        variant: editingVariant,
        data: editingData,
        colorScheme: editingColorScheme,
      })
      onSectionChange(activeSection.id, {
        variant: editingVariant,
        data: editingData,
        colorScheme: editingColorScheme,
      })
    } else {
      console.warn('[SectionMorphingIndicator] Cannot save - missing activeSection or onSectionChange:', {
        activeSection: !!activeSection,
        onSectionChange: !!onSectionChange,
      })
    }
    closeSettings()
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
    }, 1500)
  }

  useClickOutside(rootRef, closeSettings)

  // Get section display name
  const getSectionName = (section: Section | null): string => {
    if (!section) return ''
    
    // Try to get title from section data
    const data = section.data as any
    if (data?.title) return data.title
    
    // Fallback to capitalized section type
    const typeMap: Record<string, string> = {
      hero: 'Hero',
      features: 'Features',
      gallery: 'Gallery',
      agent: 'Agent',
      contact: 'Contact',
      testimonials: 'Testimonials',
      pricing: 'Pricing',
      faq: 'FAQ',
    }
    
    return typeMap[section.type] || section.type.charAt(0).toUpperCase() + section.type.slice(1)
  }

  const sectionName = getSectionName(activeSection)

  if (!sectionName) return null

  // Get settings panel for current section type
  const getSettingsPanel = () => {
    if (!activeSection) return null

    if (activeSection.type === 'hero') {
      return (
        <HeroRemixPanel
          variant={editingVariant}
          data={editingData as HeroSectionData}
          colorScheme={editingColorScheme}
          onVariantChange={(variant) => {
            isInternalChange.current = true
            setEditingVariant(variant)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant,
                data: editingData,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onDataChange={(data) => {
            console.log('[SectionMorphingIndicator] onDataChange called (hero):', {
              sectionId: activeSection?.id,
              newData: data,
              headline: data?.headline,
              subheadline: data?.subheadline,
            })
            setEditingData(data)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onColorSchemeChange={(colorScheme) => {
            setEditingColorScheme(colorScheme)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data: editingData,
                colorScheme,
              })
            }
          }}
        />
      )
    }

    if (activeSection.type === 'features') {
      return (
        <FeaturesRemixPanel
          variant={editingVariant}
          data={editingData as FeaturesSectionData}
          colorScheme={editingColorScheme}
          onVariantChange={(variant) => {
            isInternalChange.current = true
            setEditingVariant(variant)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant,
                data: editingData,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onDataChange={(data) => {
            console.log('[SectionMorphingIndicator] onDataChange called (features):', {
              sectionId: activeSection?.id,
              newData: data,
            })
            setEditingData(data)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onColorSchemeChange={(colorScheme) => {
            setEditingColorScheme(colorScheme)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data: editingData,
                colorScheme,
              })
            }
          }}
        />
      )
    }

    if (activeSection.type === 'highlights') {
      return (
        <HighlightsRemixPanel
          variant={editingVariant}
          data={editingData as HighlightsSectionData}
          colorScheme={editingColorScheme}
          onVariantChange={(variant) => {
            isInternalChange.current = true
            setEditingVariant(variant)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant,
                data: editingData,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onDataChange={(data) => {
            console.log('[SectionMorphingIndicator] onDataChange called (highlights):', {
              sectionId: activeSection?.id,
              newData: data,
            })
            setEditingData(data)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data,
                colorScheme: editingColorScheme,
              })
            }
          }}
          onColorSchemeChange={(colorScheme) => {
            setEditingColorScheme(colorScheme)
            if (activeSection && onEditingStateChange) {
              onEditingStateChange(activeSection.id, {
                variant: editingVariant,
                data: editingData,
                colorScheme,
              })
            }
          }}
        />
      )
    }

    return null
  }

  const settingsPanel = getSettingsPanel()

  // Calculate max height (90vh)
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 600

  // Measure content height when settings panel opens
  React.useEffect(() => {
    if (showSettings && contentRef.current) {
      const measureHeight = () => {
        if (contentRef.current) {
          // Use scrollHeight to get full content height
          const height = contentRef.current.scrollHeight
          setContentHeight(height)
        }
      }

      // Initial measurement after render
      const timeoutId = setTimeout(measureHeight, 50)

      // Watch for content changes
      const resizeObserver = new ResizeObserver(() => {
        measureHeight()
      })
      
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current)
      }
      
      return () => {
        clearTimeout(timeoutId)
        resizeObserver.disconnect()
      }
    } else {
      setContentHeight(0)
    }
  }, [showSettings, settingsPanel])

  // Calculate actual height: content height + header (44px) + padding, but max 90vh
  const headerHeight = 44
  const padding = 8 // p-1 = 4px top + 4px bottom
  const calculatedHeight = showSettings && contentHeight > 0 
    ? Math.min(contentHeight + headerHeight + padding, maxHeight)
    : 48

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="flex items-end justify-center"
            style={{
              width: showSettings ? FEEDBACK_WIDTH : 'auto',
            }}
          >
            <motion.div
              ref={rootRef}
              className={cn(
                'border border-border relative flex flex-col items-center overflow-hidden pointer-events-auto builder-floating-nav-button'
              )}
              style={{
                background: 'rgba(255, 255, 255, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
              initial={{ y: 100, opacity: 0, filter: 'blur(20px)' }}
              animate={{
                y: 0,
                opacity: 1,
                filter: 'blur(0px)',
                width: showSettings ? FEEDBACK_WIDTH : 'auto',
                height: calculatedHeight,
                borderRadius: showSettings ? 14 : 9999, // Pill shape when closed, rounded when open
              }}
              exit={{ y: 100, opacity: 0, filter: 'blur(20px)' }}
              transition={{
                type: 'spring',
                stiffness: 550 / SPEED,
                damping: 45,
                mass: 0.7,
                delay: showSettings ? 0 : 0.08,
                y: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.8 },
                filter: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                borderRadius: { 
                  duration: 0.25, 
                  ease: [0.16, 1, 0.3, 1],
                  delay: showSettings ? 0 : 0
                },
                width: { 
                  duration: 0.3, 
                  ease: [0.16, 1, 0.3, 1],
                  delay: showSettings ? 0.15 : 0 // Start after borderRadius starts changing
                },
                height: { 
                  type: 'spring',
                  stiffness: 400,
                  damping: 40,
                  mass: 0.8,
                  delay: showSettings ? 0.15 : 0 // Start after borderRadius starts changing
                },
              }}
            >
          {/* Dock with section name and settings button */}
          <footer className="flex items-center justify-center select-none whitespace-nowrap mt-auto h-12">
            <div className="flex items-center justify-center gap-6 pl-1.5 pr-2">
              <AnimatePresence mode="wait">
                {!showSettings && (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: 1,
                      width: bounds.width > 0 ? bounds.width : 'auto'
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 35,
                    }}
                  >
                    <div ref={ref} className="flex items-center gap-2 w-fit [&>svg]:w-5 [&>svg]:h-5">
                      <motion.div
                        className="w-5 h-5 gradient-ottie rounded-full"
                        layoutId="morph-surface-dot"
                        transition={LOGO_SPRING}
                      >
                        <AnimatePresence>
                          {success && (
                            <motion.div
                              key="check"
                              exit={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              initial={{ opacity: 0, scale: 0.5 }}
                              transition={{
                                type: 'spring',
                                stiffness: 500 / SPEED,
                                damping: 22,
                                delay: success ? 0.3 : 0,
                              }}
                              className="m-[2px]"
                            >
                              <IconCheck />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <div className="text-[14px] text-foreground">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {sectionName.split('').map((letter, index) => {
                            return (
                              <motion.div
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
                                key={`${sectionName}-${index}-${letter}`}
                                className="inline-block"
                              >
                                {letter}
                                {letter === ' ' ? '\u00A0' : ''}
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!showSettings && (
                  <motion.div
                    key="settings-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 35,
                    }}
                    className="flex items-center z-2"
                  >
                    <button
                      className="rounded-full h-9 pl-2 pr-2 flex items-center gap-1.5 border border-border bg-white"
                      style={{
                        background: 'rgba(255, 255, 255, 1)',
                      }}
                      onClick={openSettings}
                    >
                      <LottieSettingsIcon className="size-4 shrink-0" forceLightMode={true} />
                      <span className="text-[14px] max-w-[20ch] truncate">Section Settings</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </footer>

          {/* Settings Panel */}
          {settingsPanel && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSave()
              }}
              className="absolute bottom-0 w-full"
              style={{
                width: showSettings ? FEEDBACK_WIDTH : 0,
                height: showSettings ? 'auto' : 0,
                maxHeight: showSettings ? maxHeight : 'none',
                pointerEvents: showSettings ? 'all' : 'none',
              }}
              onKeyDown={(e) => {
                // If target is an input/textarea, allow all keyboard shortcuts to work naturally
                const target = e.target as HTMLElement;
                const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                
                // For input elements, only handle Escape and Cmd/Ctrl+Enter
                if (isInputElement) {
                  if (e.key === 'Escape') {
                    closeSettings()
                    return;
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    onSave()
                    return;
                  }
                  // For all other keys (including Ctrl+A), let them work naturally
                  return;
                }
                
                // For non-input elements, handle normally
                if (e.key === 'Escape') {
                  closeSettings()
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  onSave()
                }
              }}
            >
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 550 / SPEED,
                      damping: 45,
                      mass: 0.7,
                    }}
                    className="p-1 flex flex-col"
                  >
                    <div className="flex justify-between items-center py-1">
                      <p className="flex gap-[6px] text-sm items-center text-muted-foreground select-none z-2 ml-[25px]">
                        Section Settings
                      </p>
                      <button
                        type="submit"
                        className="mt-1 flex items-center gap-1 text-sm -translate-y-[3px] text-muted-foreground hover:text-foreground right-4 text-center bg-transparent select-none rounded-[12px] cursor-pointer user-select-none pr-1"
                      >
                        <Kbd>⌘</Kbd>
                        <Kbd className="w-fit">Enter</Kbd>
                      </button>
                    </div>
                    <textarea
                      placeholder="What's on your mind?"
                      name="message"
                      className="resize-none w-full h-full scroll-py-2 text-base outline-0 p-4 bg-muted rounded-xl"
                      required
                      spellCheck={false}
                      style={{ 
                        display: 'none',
                        caretColor: '#fda90f'
                      }}
                    />
                    <div 
                      ref={contentRef}
                      className={cn(
                        "p-4",
                        contentHeight > maxHeight - headerHeight - padding ? "overflow-y-auto scroll-py-2" : ""
                      )}
                      style={{ 
                        maxHeight: contentHeight > maxHeight - headerHeight - padding ? `${maxHeight - headerHeight - padding}px` : 'none'
                      }}
                    >
                      {settingsPanel}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {showSettings && (
                <motion.div
                  layoutId="morph-surface-dot"
                  className="w-2 h-2 gradient-ottie rounded-full absolute top-[18.5px] left-4"
                  transition={LOGO_SPRING}
                />
              )}
            </form>
          )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

function IconCheck() {
  return (
    <svg
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      color="white"
    >
      <path
        d="M5 13L9 17L19 7"
        stroke="white"
        strokeWidth="2px"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Kbd({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'h-6 bg-muted text-muted-foreground rounded-md flex items-center justify-center font-sans px-1.5 text-xs',
        className
      )}
    >
      {children}
    </kbd>
  )
}

