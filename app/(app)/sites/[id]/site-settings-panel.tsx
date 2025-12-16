'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Site } from '@/types/database'
import { 
  handleArchiveSite, 
  handleUnarchiveSite, 
  handleDuplicateSite, 
  handleDeleteSite, 
  handleReassignSite, 
  handleUpdateSiteTitle,
  handleSetSitePassword,
  handleRemoveSitePassword,
  handleReorderSections,
} from '@/app/actions/site-actions'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { Button } from '@/components/ui/button'
import { DestructiveButton } from '@/components/ui/destructive-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { 
  Lock, 
  Eye, 
  Check,
  ArrowRight,
  Edit,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  User,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react'
import { LottieCopyIcon } from '@/components/ui/lottie-copy-icon'
import { LottieTrashIcon } from '@/components/ui/lottie-trash-icon'
import { LottieInboxIcon } from '@/components/ui/lottie-inbox-icon'
import { LottieAccountIcon } from '@/components/ui/lottie-account-icon'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useAppData } from '@/contexts/app-context'
import { useMemo } from 'react'
import { FontSelector } from '@/components/builder/FontSelector'
import type { PageConfig, ThemeConfig, Section, LoaderConfig } from '@/types/builder'

interface SiteSettingsPanelProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
  themeRef?: React.MutableRefObject<ThemeConfig | null>
  onThemeChange?: (theme: ThemeConfig) => void
  saveChangesRef?: React.MutableRefObject<(() => Promise<void>) | null>
  onHasUnsavedChanges?: (hasChanges: boolean) => void
  loaderRef?: React.MutableRefObject<LoaderConfig | null>
  onLoaderChange?: (loader: LoaderConfig) => void
  sectionsRef?: React.MutableRefObject<Section[] | null>
}

// Helper to get user initials
function getUserInitials(fullName: string | null, email: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return 'U'
}

// Sortable Item Component
interface SortableItemProps {
  section: Section
  index: number
  onMove: (index: number, direction: 'up' | 'down') => void
  totalSections: number
  isReordering: boolean
  getSectionTypeLabel: (type: string) => string
}

function SortableItem({ section, index, onMove, totalSections, isReordering, getSectionTypeLabel }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium capitalize">
        {getSectionTypeLabel(section.type)} - {section.variant}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation()
            onMove(index, 'up')
          }}
          disabled={index === 0 || isReordering}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation()
            onMove(index, 'down')
          }}
          disabled={index === totalSections - 1 || isReordering}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function SiteSettingsPanel({ site, members, themeRef, onThemeChange, saveChangesRef, onHasUnsavedChanges, loaderRef, onLoaderChange, sectionsRef }: SiteSettingsPanelProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { currentWorkspace, isMultiUserPlan, hasPlanFeature } = useAppData()
  const isMultiUser = currentWorkspace ? isMultiUserPlan(currentWorkspace.plan) : false
  const hasPasswordFeature = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_password_protection')
    : false
  const hasPremiumFonts = currentWorkspace 
    ? hasPlanFeature(currentWorkspace.plan, 'feature_premium_fonts')
    : false
  const [isSaving, setIsSaving] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(site.title)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isUnarchiving, setIsUnarchiving] = useState(false)
  const [isAssignedToComboboxOpen, setIsAssignedToComboboxOpen] = useState(false)
  const [assignedToSearchQuery, setAssignedToSearchQuery] = useState('')
  const [isReordering, setIsReordering] = useState(false)
  
  // Get sections from config
  const siteConfig = site.config as PageConfig | null
  const initialSections = siteConfig?.sections || []
  
  // Local state for sections order (will be saved on Save Changes)
  const [localSections, setLocalSections] = useState<Section[]>(initialSections)
  
  // Update local sections when site config changes
  useEffect(() => {
    const currentSections = siteConfig?.sections || []
    setLocalSections(currentSections)
  }, [siteConfig?.sections])

  // Sync localSections with sectionsRef so PreviewSitePage can access it
  useEffect(() => {
    if (sectionsRef) {
      sectionsRef.current = localSections
    }
  }, [localSections, sectionsRef])

  // Sync loaderRef with site config when it changes (after save/refresh)
  useEffect(() => {
    if (loaderRef) {
      loaderRef.current = siteConfig?.loader || {
        type: 'none',
        colorScheme: 'light',
      }
    }
  }, [loaderRef, siteConfig?.loader])
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort members so current user is first
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aIsCurrent = a.membership.user_id === user?.id
      const bIsCurrent = b.membership.user_id === user?.id
      if (aIsCurrent && !bIsCurrent) return -1
      if (!aIsCurrent && bIsCurrent) return 1
      return 0
    })
  }, [members, user?.id])

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === site.title) {
      setIsRenameDialogOpen(false)
      return
    }

    setIsSaving(true)
    const result = await handleUpdateSiteTitle(site.id, renameValue.trim())
    setIsSaving(false)

    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site renamed successfully')
      setIsRenameDialogOpen(false)
      router.refresh()
    }
  }

  const handlePasswordSave = async () => {
    if (isPasswordSaving) return

    setIsPasswordSaving(true)
    try {
      if (passwordValue.trim()) {
        const result = await handleSetSitePassword(site.id, passwordValue.trim())
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess(site.password_protected ? 'Password updated successfully' : 'Password protection enabled')
          setIsPasswordDialogOpen(false)
          setPasswordValue('')
          router.refresh()
        }
      } else if (site.password_protected) {
        const result = await handleRemoveSitePassword(site.id)
        if ('error' in result) {
          toast.error(result.error)
        } else {
          toastSuccess('Password protection removed')
          setIsPasswordDialogOpen(false)
          setPasswordValue('')
          router.refresh()
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsPasswordSaving(false)
    }
  }

  const handleReassign = async (agentId: string | null) => {
    if (isReassigning) return
    
    setIsReassigning(true)
    const result = await handleReassignSite(site.id, agentId)
    setIsReassigning(false)
    setIsUnassignDialogOpen(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site reassigned successfully')
      router.refresh()
    }
  }

  const handleUnassign = async () => {
    if (site.status === 'published') {
      setIsUnassignDialogOpen(true)
      return
    }
    await handleReassign(null)
  }

  const handleDuplicate = async () => {
    if (isDuplicating) return
    
    setIsDuplicating(true)
    const result = await handleDuplicateSite(site.id)
    setIsDuplicating(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site duplicated successfully')
      router.push('/sites')
    }
  }

  const handleArchive = async () => {
    if (isArchiving) return
    
    setIsArchiving(true)
    const result = await handleArchiveSite(site.id)
    setIsArchiving(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site archived successfully')
      router.refresh()
    }
  }

  const handleUnarchive = async () => {
    if (isUnarchiving) return
    
    setIsUnarchiving(true)
    const result = await handleUnarchiveSite(site.id)
    setIsUnarchiving(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site unarchived successfully')
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    
    setIsDeleting(true)
    const result = await handleDeleteSite(site.id)
    setIsDeleting(false)
    setIsDeleteDialogOpen(false)
    
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toastSuccess('Site deleted successfully')
      router.push('/sites')
    }
  }

  const handleCopyUrl = async () => {
    // For custom domains, slug is in the path: https://customdomain.com/slug
    // For ottie.site, slug is in subdomain: https://slug.ottie.site
    const fullUrl = site.domain && site.domain !== 'ottie.site'
      ? `https://${site.domain}/${site.slug}`
      : `https://${site.slug}.ottie.site`
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      toastSuccess('URL copied to clipboard', {
        description: fullUrl,
      })
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  // Get current font and title case from themeRef or site config
  const currentTheme = themeRef?.current || siteConfig?.theme || {
    fontFamily: 'Inter',
    headingFontFamily: 'Inter',
    headingFontSize: 1,
    headingLetterSpacing: 0,
    titleCase: 'sentence' as const,
    primaryColor: '#000000',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderRadius: 'md' as const,
    ctaType: 'none' as const,
    ctaValue: '',
  }
  const currentFont = currentTheme.headingFontFamily || 'Inter'
  const currentTitleCase = currentTheme.titleCase || 'sentence'
  const currentAnimation = currentTheme.animationStyle || 'word-reveal'

  // Get current loader config
  const currentLoaderConfig: LoaderConfig = loaderRef?.current || siteConfig?.loader || {
    type: 'none',
    colorScheme: 'light',
  }

  const handleFontChange = (font: string) => {
    if (onThemeChange) {
      onThemeChange({
        ...currentTheme,
        headingFontFamily: font,
      })
    }
  }

  const handleTitleCaseChange = (titleCase: 'uppercase' | 'title' | 'sentence') => {
    if (onThemeChange) {
      onThemeChange({
        ...currentTheme,
        titleCase,
      })
    }
  }

  const handleAnimationChange = (animation: 'word-reveal' | 'fade-in' | 'slide-up' | 'none') => {
    if (onThemeChange) {
      onThemeChange({
        ...currentTheme,
        animationStyle: animation,
      })
    }
  }

  const handleLoaderTypeChange = (type: 'circle' | 'none') => {
    const newLoader: LoaderConfig = {
      ...currentLoaderConfig,
      type,
    }
    if (loaderRef) {
      loaderRef.current = newLoader
    }
    if (onLoaderChange) {
      onLoaderChange(newLoader)
    }
    onHasUnsavedChanges?.(true)
  }

  const handleLoaderColorSchemeChange = (colorScheme: 'light' | 'dark') => {
    const newLoader: LoaderConfig = {
      ...currentLoaderConfig,
      colorScheme,
    }
    if (loaderRef) {
      loaderRef.current = newLoader
    }
    if (onLoaderChange) {
      onLoaderChange(newLoader)
    }
    onHasUnsavedChanges?.(true)
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (localSections.length === 0) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= localSections.length) return
    
    const newSections = [...localSections]
    const [movedSection] = newSections.splice(index, 1)
    newSections.splice(newIndex, 0, movedSection)
    
    setLocalSections(newSections)
    onHasUnsavedChanges?.(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localSections.findIndex(s => s.id === active.id)
      const newIndex = localSections.findIndex(s => s.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(localSections, oldIndex, newIndex)
        setLocalSections(newSections)
        onHasUnsavedChanges?.(true)
      }
    }
  }

  // Save function that will be called from parent
  const saveSectionsOrder = useCallback(async () => {
    if (localSections.length === 0) return
    
    setIsReordering(true)
    try {
      const sectionIds = localSections.map(s => s.id)
      const result = await handleReorderSections(site.id, sectionIds)
      
      if ('error' in result) {
        toast.error(result.error || 'Failed to reorder sections')
        return false
      } else {
        toastSuccess('Sections reordered successfully')
        onHasUnsavedChanges?.(false)
        router.refresh()
        return true
      }
    } catch (error) {
      console.error('Error reordering sections:', error)
      toast.error('Failed to reorder sections')
      return false
    } finally {
      setIsReordering(false)
    }
  }, [localSections, site.id, onHasUnsavedChanges, router])

  // Note: We don't register saveSectionsOrder to saveChangesRef anymore
  // Instead, sections order is saved as part of the main save in PreviewSitePage via sectionsRef

  const getSectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hero: 'Hero',
      features: 'Features',
      gallery: 'Gallery',
      agent: 'Agent',
      contact: 'Contact',
      highlights: 'Highlights',
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getAvailabilityBadgeClass = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/15'
      case 'under_offer':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15'
      case 'reserved':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/15'
      case 'sold':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/15'
      case 'off_market':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/15'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'under_offer':
        return 'Under offer'
      case 'off_market':
        return 'Off market'
      default:
        return availability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'gradient-ottie hover:opacity-90 text-white border-0'
      case 'archived':
        return 'bg-muted/50 text-muted-foreground/60 border-muted-foreground/20'
      default:
        return ''
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published'
      case 'archived':
        return 'Archived'
      default:
        return 'Draft'
    }
  }

  const assignedMember = members.find(m => m.membership.user_id === site.assigned_agent_id)

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-6 overflow-y-auto max-w-[800px] mx-auto w-full">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Site Title</Label>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold flex-1">{site.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRenameValue(site.title)
                  setIsRenameDialogOpen(true)
                }}
              >
                <Edit className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Slug</Label>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
                {site.slug}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyUrl}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
            <Badge className={getStatusBadgeClass(site.status)}>
              {getStatusLabel(site.status)}
            </Badge>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Availability</Label>
            <Badge className={getAvailabilityBadgeClass(site.availability)}>
              {getAvailabilityLabel(site.availability)}
            </Badge>
          </div>

          {site.views_count !== undefined && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Views</Label>
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{site.views_count.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Assigned To - only for multi-user workspaces */}
        {isMultiUser && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Assigned To</Label>
          <Popover open={isAssignedToComboboxOpen} onOpenChange={(open) => {
            setIsAssignedToComboboxOpen(open)
            if (!open) {
              setAssignedToSearchQuery('')
            }
          }}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
              >
                {assignedMember ? (
                  <>
                    <Avatar className="size-5 mr-2">
                      <AvatarImage src={assignedMember.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(assignedMember.profile.full_name, assignedMember.profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left">
                      {assignedMember.profile.full_name || assignedMember.profile.email || 'Unknown'}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="size-4 mr-2" />
                    <span className="flex-1 text-left text-muted-foreground">Unassigned</span>
                  </>
                )}
                <ArrowRight className="ml-auto size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-1" align="start">
              <Command className="rounded-md">
                <CommandInput 
                  placeholder="Search members..." 
                  value={assignedToSearchQuery}
                  onValueChange={setAssignedToSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No members found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleUnassign()}
                      className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                    >
                      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                        {!site.assigned_agent_id && <Check className="size-4 [&_svg:not([class*='text-'])]:text-foreground" />}
                      </span>
                      <span className="text-muted-foreground">Unassigned</span>
                    </CommandItem>
                    {members.length > 0 && <Separator className="my-1" />}
                    {sortedMembers
                      .filter((member) => {
                        if (!assignedToSearchQuery) return true
                        const query = assignedToSearchQuery.toLowerCase()
                        const fullName = member.profile.full_name?.toLowerCase() || ''
                        const email = member.profile.email?.toLowerCase() || ''
                        return fullName.includes(query) || email.includes(query)
                      })
                      .map((member) => {
                        const isSelected = site.assigned_agent_id === member.membership.user_id
                        return (
                          <CommandItem
                            key={member.membership.user_id}
                            onSelect={() => {
                              if (!isSelected) {
                                handleReassign(member.membership.user_id)
                              }
                            }}
                            className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                          >
                            <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                              {isSelected && <Check className="size-4 [&_svg:not([class*='text-'])]:text-foreground" />}
                            </span>
                            <Avatar className="size-5 shrink-0">
                              <AvatarImage src={member.profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(member.profile.full_name, member.profile.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{member.profile.full_name || member.profile.email || 'Unknown'}</span>
                          </CommandItem>
                        )
                      })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          </div>
          </>
        )}

        {/* Font Selection */}
        <Separator />
        <div className="space-y-4">
        <div className="space-y-2">
          <Label>Heading Font</Label>
          <FontSelector 
            value={currentFont}
            onChange={handleFontChange}
          />
          </div>

          <div className="space-y-2">
            <Label>Title Case</Label>
            <Select 
              value={currentTitleCase}
              onValueChange={(value: 'uppercase' | 'title' | 'sentence') => handleTitleCaseChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select title case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sentence">Sentence Case</SelectItem>
                <SelectItem value="title">Title Case</SelectItem>
                <SelectItem value="uppercase">Uppercase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Section Animations</Label>
            <Select
              value={currentAnimation}
              onValueChange={(value: 'word-reveal' | 'fade-in' | 'slide-up' | 'none') => handleAnimationChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select animation style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="word-reveal">Word Reveal (default)</SelectItem>
                <SelectItem value="fade-in">Fade In</SelectItem>
                <SelectItem value="slide-up">Slide Up</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Affects section reveal effects (e.g. titles, highlights).</p>
          </div>
        </div>

        {/* Loader Settings */}
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Loading Animation</Label>
            <Select 
              value={currentLoaderConfig.type}
              onValueChange={(value: 'circle' | 'none') => handleLoaderTypeChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loader type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {currentLoaderConfig.type !== 'none' && (
            <div className="space-y-2">
              <Label>Loader Color Scheme</Label>
              <Select 
                value={currentLoaderConfig.colorScheme}
                onValueChange={(value: 'light' | 'dark') => handleLoaderColorSchemeChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Password Protection */}
        {hasPasswordFeature && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Password Protection</Label>
            <div className="flex items-center gap-2">
              {site.password_protected && (
                <Lock className="size-4 text-muted-foreground" />
              )}
              <Button
                variant="outline"
                className="flex-1 justify-start"
                onClick={() => {
                  setPasswordValue('')
                  setIsPasswordDialogOpen(true)
                }}
              >
                {site.password_protected ? 'Change Password' : 'Set Password'}
              </Button>
            </div>
          </div>
        </>
        )}

        {/* Sections Order */}
        {localSections.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Sections Order</Label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localSections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {localSections.map((section, index) => (
                      <SortableItem
                        key={section.id}
                        section={section}
                        index={index}
                        onMove={handleMoveSection}
                        totalSections={localSections.length}
                        isReordering={isReordering}
                        getSectionTypeLabel={getSectionTypeLabel}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Label>Actions</Label>
          <div className="space-y-1.5">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              <LottieCopyIcon className="size-4 mr-2" />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>

            {site.status === 'archived' ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleUnarchive}
                disabled={isUnarchiving}
              >
                <ArchiveRestore className="size-4 mr-2" />
                {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                <Archive className="size-4 mr-2" />
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            )}

            <DestructiveButton
              className="w-full justify-start"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <LottieTrashIcon className="size-4 mr-2" destructive={true} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DestructiveButton>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={(open) => {
        setIsRenameDialogOpen(open)
        if (!open) {
          setRenameValue(site.title)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Site</DialogTitle>
            <DialogDescription>
              Enter a new name for this site.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Site title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename()
                } else if (e.key === 'Escape') {
                  setRenameValue(site.title)
                  setIsRenameDialogOpen(false)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameValue(site.title)
                setIsRenameDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isSaving || !renameValue.trim() || renameValue === site.title}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open)
        if (!open) {
          setPasswordValue('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {site.password_protected ? 'Change Password' : 'Set Password Protection'}
            </DialogTitle>
            <DialogDescription>
              {site.password_protected 
                ? 'Enter a new password for this site. Leave empty to remove password protection.'
                : 'Set a password to protect this site from public access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-password">Password</Label>
              <Input
                id="site-password"
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Enter password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordValue.trim()) {
                    handlePasswordSave()
                  } else if (e.key === 'Escape') {
                    setPasswordValue('')
                    setIsPasswordDialogOpen(false)
                  }
                }}
              />
              {site.password_protected && (
                <p className="text-sm text-muted-foreground">
                  Leave empty to remove password protection
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordValue('')
                setIsPasswordDialogOpen(false)
              }}
              disabled={isPasswordSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSave}
              disabled={isPasswordSaving || (!passwordValue.trim() && !site.password_protected)}
            >
              {isPasswordSaving 
                ? 'Saving...' 
                : passwordValue.trim() 
                  ? (site.password_protected ? 'Update Password' : 'Set Password')
                  : 'Remove Protection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Warning Dialog */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Published Site</AlertDialogTitle>
            <AlertDialogDescription>
              This site is published. Unassigning it will change its status to draft and make it no longer publicly accessible. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleReassign(null)
              }}
              disabled={isReassigning}
            >
              {isReassigning ? 'Unassigning...' : 'Unassign & Change to Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{site.title}"? This action cannot be undone. The site will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

