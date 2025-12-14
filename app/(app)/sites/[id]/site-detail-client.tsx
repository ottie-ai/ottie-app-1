'use client'

import { useEffect, useRef, useState } from 'react'
import useMeasure from 'react-use-measure'
import { motion, AnimatePresence } from 'framer-motion'
import { Site } from '@/types/database'
import { PreviewSitePage } from '@/app/(app)/preview/[id]/preview-site-page'
import { SiteSettingsPanel } from './site-settings-panel'
import { LeadsTable } from '@/components/workspace/leads-table'
import { handlePublishSite, handleUnpublishSite } from '@/app/actions/site-actions'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { AnimatedTabsList } from '@/components/ui/animated-tabs-list'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronsUpDown, ChevronDown, ExternalLink } from 'lucide-react'
import { normalizePlan } from '@/lib/utils'
import { useAppData, useUserProfile, useWorkspace } from '@/contexts/app-context'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ThemeConfig } from '@/types/builder'
import * as React from 'react'

const SIDEBAR_RESTORE_KEY = 'site_detail_restore_sidebar'

// Mobile Tabs Selector with Morphing Animation
function MobileTabsSelector({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localActiveTab, setLocalActiveTab] = useState(activeTab)
  const rootRef = useRef<HTMLDivElement>(null)
  const [ref, bounds] = useMeasure()
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalActiveTab(activeTab)
  }, [activeTab])
  
  const tabs = [
    { value: 'website', label: 'Website' },
    { value: 'settings', label: 'Settings' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'leads', label: 'Leads' },
  ]
  
  const activeTabLabel = tabs.find(t => t.value === localActiveTab)?.label || 'Website'
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  const MOBILE_TABS_WIDTH = 180
  
  return (
    <div className="flex-1 flex justify-center">
      <div ref={rootRef} className="relative">
        {/* Active Tab Button */}
        <button
          ref={ref}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-2 px-3 py-2 h-9 min-w-[100px] bg-background border rounded-[18px] shadow-xl"
        >
          <div className="text-sm font-medium">
            <AnimatePresence mode="popLayout" initial={false}>
              {activeTabLabel.split('').map((letter, index) => {
                return (
                  <motion.span
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
                    key={`${activeTabLabel}-${index}-${letter}`}
                    className="inline-block"
                  >
                    {letter}
                    {letter === ' ' ? '\u00A0' : ''}
                  </motion.span>
                )
              })}
            </AnimatePresence>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </button>
        
        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[180px] bg-background border rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="py-1">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      delay: index * 0.05,
                    }}
                    onClick={() => {
                      setLocalActiveTab(tab.value)
                      onTabChange(tab.value)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full px-4 py-2 text-left text-sm
                      transition-colors
                      ${localActiveTab === tab.value 
                        ? 'bg-accent text-accent-foreground font-medium' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <AnimatePresence mode="wait">
                      {localActiveTab === tab.value && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 22,
                          }}
                          className="inline-block mr-2"
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {tab.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface SiteDetailClientProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
}


export function SiteDetailClient({ site, members }: SiteDetailClientProps) {
  const [activeTab, setActiveTab] = useState('website')
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [buttonRef, buttonBounds] = useMeasure()
  const router = useRouter()
  const sidebar = useSidebar()
  const isMobile = useIsMobile()
  const saveChangesRef = useRef<(() => Promise<void>) | null>(null)
  const themeRef = useRef<ThemeConfig | null>(null)
  
  // Determine current button text
  const currentButtonText = hasUnsavedChanges 
    ? (isSaving ? 'Saving...' : 'Save Changes')
    : (site.status === 'published' ? 'Unpublish' : 'Publish')
  const hasInitializedRef = useRef(false)
  const { userName, userEmail, userAvatar } = useUserProfile()
  const { workspace } = useWorkspace()
  const { isMultiUserPlan } = useAppData()

  // Get display name and plan
  const displayName = workspace && isMultiUserPlan(workspace.plan)
    ? workspace.name
    : (userName || 'Real Estate Co.')
  const displayPlan = workspace ? normalizePlan(workspace.plan) : 'free'

  // On mount: store previous state and collapse sidebar
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    // Store current state to restore later
    sessionStorage.setItem(SIDEBAR_RESTORE_KEY, JSON.stringify({
      open: sidebar.open,
      openMobile: sidebar.openMobile,
    }))
    console.log('[SiteDetail] Stored state:', { open: sidebar.open, openMobile: sidebar.openMobile })

    // Collapse sidebar
    setTimeout(() => {
      if (!sidebar.isMobile) {
        sidebar.setOpen(false)
      } else {
        sidebar.setOpenMobile(false)
      }
    }, 50)

    // On unmount: mark that we need to restore
    return () => {
      // Set flag to restore on next page
      const stored = sessionStorage.getItem(SIDEBAR_RESTORE_KEY)
      if (stored) {
        sessionStorage.setItem(SIDEBAR_RESTORE_KEY + '_pending', stored)
      }
      sessionStorage.removeItem(SIDEBAR_RESTORE_KEY)
    }
  }, [sidebar])

  return (
    <div className="flex h-full">
      {/* Floating Navbar with Reveal Effect - OUTSIDE of overflow container for backdrop-filter to work */}
      <motion.nav
          className="fixed top-2 z-50"
          style={{ 
            left: isMobile 
              ? '1rem'
              : (sidebar.state === 'expanded' 
              ? 'calc(var(--sidebar-width, 16rem) + 15vw)' 
                : 'calc(var(--sidebar-width-icon, 3rem) + 15vw)'), 
            width: isMobile 
              ? 'calc(100vw - 2rem)' 
              : (sidebar.state === 'expanded'
                ? 'calc(70vw - var(--sidebar-width, 16rem))'
                : 'calc(70vw - var(--sidebar-width-icon, 3rem))')
          }}
          initial={{ y: -100, opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            opacity: { duration: 0.8 },
            scale: { duration: 1, ease: [0.16, 1, 0.3, 1] },
            filter: { duration: 0.6 }
          }}
        >
          <div 
            className={`bg-background border flex h-12 items-center rounded-full shadow-xl ${isMobile ? 'pl-3 pr-2 gap-1' : 'pl-4 pr-2'}`}
          >
            {!isMobile && (
              <Breadcrumbs
                items={[
                      { label: 'Back to Sites', href: '/sites' },
                  { label: site.title, href: `/sites/${site.id}` },
                ]}
              />
            )}
            
            {/* Center - Tabs */}
            {!isMobile ? (
            <div className="absolute left-1/2 -translate-x-1/2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <AnimatedTabsList activeValue={activeTab}>
                    <TabsTrigger value="website">Website</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                </AnimatedTabsList>
              </Tabs>
            </div>
            ) : (
              <MobileTabsSelector activeTab={activeTab} onTabChange={setActiveTab} />
            )}

            {/* Right side - Actions */}
            <div className={`${isMobile ? '' : 'ml-auto'} flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      // Always use current origin to ensure cookies/session are shared
                      // For localhost, preserve the port number
                      const { protocol, hostname, port } = window.location
                      const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
                      const previewUrl = `${baseUrl}/preview/${site.id}`
                      window.open(previewUrl, '_blank', 'noopener,noreferrer')
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
              )}
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
                  onClick={async () => {
                    if (hasUnsavedChanges) {
                      setIsSaving(true)
                      // Call save function from PreviewSitePage
                      if (saveChangesRef.current) {
                        try {
                          await saveChangesRef.current()
                          setIsSaving(false)
                          setHasUnsavedChanges(false)
                        } catch (error) {
                          console.error('Error saving changes:', error)
                          setIsSaving(false)
                        }
                      } else {
                        console.warn('Save function not available')
                        setIsSaving(false)
                      }
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
                  }}
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

      {/* Fullscreen Preview */}
      <div className="flex-1 relative flex flex-col min-h-0">
        {/* Tab Content */}
        <div className="flex-1 relative min-h-0">
          {/* Placeholder to maintain height when all tabs are hidden */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />
          
          {/* Website Tab */}
          <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'website' ? 'z-10' : 'hidden'}`}>
            <PreviewSitePage 
              site={site} 
              canEdit={true} 
              onHasUnsavedChanges={setHasUnsavedChanges}
              saveChangesRef={saveChangesRef}
              themeRef={themeRef}
            />
          </div>
          {/* Settings Tab */}
          <div className={`absolute inset-0 overflow-y-auto pt-24 ${activeTab === 'settings' ? 'z-10' : 'hidden'}`}>
            <SiteSettingsPanel 
              site={site} 
              members={members}
              themeRef={themeRef}
              onThemeChange={(theme) => {
                themeRef.current = theme
                setHasUnsavedChanges(true)
              }}
            />
          </div>
          {/* Analytics Tab */}
          <div className={`absolute inset-0 flex items-center justify-center pt-24 p-8 ${activeTab === 'analytics' ? 'z-10' : 'hidden'}`}>
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Analytics</h2>
              <p className="text-muted-foreground">Analytics data will be displayed here.</p>
            </div>
          </div>
          {/* Leads Tab */}
          <div className={`absolute inset-0 overflow-y-auto pt-24 p-6 ${activeTab === 'leads' ? 'z-10' : 'hidden'}`}>
            <LeadsTable siteId={site.id} siteSlug={site.slug} showAddButton={true} />
          </div>
        </div>
      </div>
    </div>
  )
}

