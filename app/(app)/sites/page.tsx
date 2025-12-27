'use client'

import Link from 'next/link'
import { PageTitle } from '@/components/page-title'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { 
  Plus, 
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { LottieAddCardIcon } from '@/components/ui/lottie-add-card-icon'
import { LottieSearchIcon } from '@/components/ui/lottie-search-icon'
import { SearchInput } from '@/components/ui/search-input'
import { LottieFilterIcon } from '@/components/ui/lottie-filter-icon'
import { LottieSwapIcon } from '@/components/ui/lottie-swap-icon'
import { LottieResetIcon } from '@/components/ui/lottie-reset-icon'
import { LottieAvatarIcon } from '@/components/ui/lottie-avatar-icon'
import { LottieFlagIcon } from '@/components/ui/lottie-flag-icon'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/glow-card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
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
import { Check, CheckIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SiteCard, type SiteCardData } from '@/components/workspace/site-card'
import { useSites } from '@/hooks/use-sites'
import { useAppData } from '@/contexts/app-context'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { formatDistanceToNow } from 'date-fns'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { Site, SiteInsert, AvailabilityStatus } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSite } from '@/lib/data/site-data'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { checkSlugAvailability, generateAvailableSlug } from '@/lib/data/slug-availability'
import { RESERVED_SLUGS } from '@/lib/data/reserved-slugs'
import { cn } from '@/lib/utils'
import { PricingDialog } from '@/components/workspace/pricing-dialog'
import { AlertTriangle } from 'lucide-react'

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
  return '??'
}

// Helper to convert Site to SiteCardData
function siteToCardData(site: Site, members?: Array<{ membership: { user_id: string }; profile: { avatar_url: string | null; full_name: string | null; email: string | null } }>): SiteCardData {
  // Find assigned agent profile
  // Find assigned user profile if assigned_agent_id exists
  let avatar: string | null = null
  let avatarFallback: string | undefined = undefined

  if (site.assigned_agent_id && members) {
    const assignedMember = members.find(m => m.membership.user_id === site.assigned_agent_id)
    if (assignedMember) {
      avatar = assignedMember.profile.avatar_url
      avatarFallback = getUserInitials(assignedMember.profile.full_name, assignedMember.profile.email)
    }
  }

  return {
    id: site.id,
    title: site.title,
    slug: site.slug,
    status: site.status,
    availability: site.availability,
    views: site.views_count,
    lastEdited: formatDistanceToNow(new Date(site.updated_at), { addSuffix: true }),
    thumbnail: site.thumbnail_url,
    avatar,
    avatarFallback,
    domain: site.domain,
    assigned_agent_id: site.assigned_agent_id,
    password_protected: site.password_protected ?? false,
  }
}

// Mock data for sites (fallback/demo)
const mockSites: SiteCardData[] = [
  {
    id: '1',
    title: '21 Maine Street',
    slug: '21-maine-street',
    status: 'published',
    views: 1234,
    lastEdited: '2 hours ago',
    thumbnail: 'https://images.unsplash.com/photo-1679364297777-1db77b6199be?w=400&q=80',
  },
  {
    id: '2',
    title: 'Luxury Villa Palm Beach',
    slug: 'luxury-villa-palm-beach',
    status: 'draft',
    views: 0,
    lastEdited: '1 day ago',
    thumbnail: null,
  },
  {
    id: '3',
    title: 'Modern Apartment NYC',
    slug: 'modern-apartment-nyc',
    status: 'published',
    views: 567,
    lastEdited: '3 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
  },
  {
    id: '4',
    title: 'Untitled Template',
    slug: 'untitled-template',
    status: 'archived',
    views: 0,
    lastEdited: '1 week ago',
    thumbnail: null,
  },
  {
    id: '5',
    title: 'Downtown Loft Chicago',
    slug: 'downtown-loft-chicago',
    status: 'published',
    views: 892,
    lastEdited: '2 weeks ago',
    thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
  },
  {
    id: '6',
    title: 'Mountain Retreat Aspen',
    slug: 'mountain-retreat-aspen',
    status: 'draft',
    views: 0,
    lastEdited: '3 weeks ago',
    thumbnail: null,
  },
]

export default function SitesPage() {
  const { currentWorkspace, isMultiUserPlan, getMaxSites } = useAppData()
  const { sites, loading, refresh } = useSites(currentWorkspace?.id)
  const { user } = useAuth()
  const { members } = useWorkspaceMembers(currentWorkspace?.id ?? null)
  const isMultiUser = isMultiUserPlan(currentWorkspace?.plan ?? null)
  
  // Get max sites for current plan
  const maxSites = getMaxSites(currentWorkspace?.plan ?? null)
  const isFreePlan = currentWorkspace?.plan === 'free' || !currentWorkspace?.plan
  
  // Calculate sites count based on plan
  // For free plan: count ALL sites (including archived) - limit is 1 total
  // For other plans: count only published + draft (not archived)
  const sitesCount = useMemo(() => {
    if (isFreePlan) {
      return sites.length // Count all sites for free plan
    }
    return sites.filter(s => s.status === 'published' || s.status === 'draft').length
  }, [sites, isFreePlan])
  
  // Sort members so current user is always first
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aIsCurrent = a.membership.user_id === user?.id
      const bIsCurrent = b.membership.user_id === user?.id
      if (aIsCurrent && !bIsCurrent) return -1
      if (!aIsCurrent && bIsCurrent) return 1
      return 0
    })
  }, [members, user?.id])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<('published' | 'draft' | 'archived')[]>(['published', 'draft', 'archived'])
  const [assignedToFilter, setAssignedToFilter] = useState<string[]>([]) // Array of user IDs - will be initialized with all members
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityStatus[]>(['available', 'under_offer', 'reserved', 'sold', 'off_market']) // Array of availability values - default to all
  const [sortBy, setSortBy] = useState<'createdDesc' | 'editedDesc' | 'nameAsc' | 'viewsDesc'>('createdDesc')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [isAssignedToComboboxOpen, setIsAssignedToComboboxOpen] = useState(false)
  const [isAvailabilityDropdownOpen, setIsAvailabilityDropdownOpen] = useState(false)
  const [assignedToSearchQuery, setAssignedToSearchQuery] = useState('')
  
  // Create site modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    assignedAgentId: '' as string, // Only used in multi-user workspaces
  })
  const [slugAvailability, setSlugAvailability] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
  }>({ checking: false, available: null, error: null })
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convert sites to card data and apply filters/sorting
  const displaySites = useMemo(() => {
    let filtered = sites
      .map(site => siteToCardData(site, members))
      .filter(site => {
        // Search filter - search in title and slug
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const titleMatch = site.title.toLowerCase().includes(query)
          const slugMatch = site.slug.toLowerCase().includes(query)
          if (!titleMatch && !slugMatch) {
          return false
          }
        }
        // Status filter (multi-select)
        if (statusFilter.length > 0 && !statusFilter.includes(site.status)) {
          return false
        }
        // Assigned to filter (multi-select) - only for multi-user workspaces
        // If all members are selected (default), show all sites
        // If some members are selected, filter by those members
        if (isMultiUser && assignedToFilter.length > 0 && assignedToFilter.length < members.length) {
          const siteData = sites.find(s => s.id === site.id)
          if (!siteData || !siteData.assigned_agent_id || !assignedToFilter.includes(siteData.assigned_agent_id)) {
            return false
          }
        }
        // Availability filter (multi-select)
        if (availabilityFilter.length > 0 && availabilityFilter.length < 5) {
          const siteData = sites.find(s => s.id === site.id)
          if (!siteData || !siteData.availability || !availabilityFilter.includes(siteData.availability)) {
            return false
          }
        }
        return true
      })

    // Sort
    switch (sortBy) {
      case 'createdDesc':
        // Sort by created_at desc (newest first)
        filtered.sort((a, b) => {
          const siteA = sites.find(s => s.id === a.id)
          const siteB = sites.find(s => s.id === b.id)
          if (!siteA || !siteB) return 0
          return new Date(siteB.created_at).getTime() - new Date(siteA.created_at).getTime()
        })
        break
      case 'editedDesc':
        // Sort by updated_at desc (latest edited first)
        filtered.sort((a, b) => {
          const siteA = sites.find(s => s.id === a.id)
          const siteB = sites.find(s => s.id === b.id)
          if (!siteA || !siteB) return 0
          return new Date(siteB.updated_at).getTime() - new Date(siteA.updated_at).getTime()
        })
        break
      case 'nameAsc':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'viewsDesc':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0))
        break
      default:
        // Default to createdDesc
        filtered.sort((a, b) => {
          const siteA = sites.find(s => s.id === a.id)
          const siteB = sites.find(s => s.id === b.id)
          if (!siteA || !siteB) return 0
          return new Date(siteB.created_at).getTime() - new Date(siteA.created_at).getTime()
        })
        break
    }

    return filtered
  }, [sites, members, searchQuery, statusFilter, assignedToFilter, availabilityFilter, isMultiUser, sortBy])

  // Generate slug from title
  const generateSlug = (title: string) => {
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    
    // Ensure minimum length (pad if needed)
    if (slug.length < 5) {
      slug = slug + '-site'
  }

    // Ensure maximum length (truncate if needed)
    if (slug.length > 63) {
      slug = slug.substring(0, 63)
      // Remove trailing hyphen if truncation created one
      slug = slug.replace(/-+$/, '')
    }
    
    return slug
  }

  // Reserved words are imported from shared constant

  // Validate slug format
  const validateSlug = (slug: string): string | null => {
    const trimmedSlug = slug.trim().toLowerCase()
    
    if (!trimmedSlug) {
      return null // Empty is OK, will be validated on submit
    }
    
    // Check minimum length
    if (trimmedSlug.length < 5) {
      return 'Slug must be at least 5 characters long'
    }
    
    // Check maximum length (DNS subdomain limit)
    if (trimmedSlug.length > 63) {
      return 'Slug must be at most 63 characters long'
    }
    
    // Check format: only lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$/.test(trimmedSlug)) {
      if (trimmedSlug[0] === '-' || trimmedSlug[trimmedSlug.length - 1] === '-') {
        return 'Slug cannot start or end with a hyphen'
      }
      if (!/^[a-z0-9]/.test(trimmedSlug)) {
        return 'Slug must start with a letter or number'
      }
      if (!/[a-z0-9]$/.test(trimmedSlug)) {
        return 'Slug must end with a letter or number'
      }
      return 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
    
    // Check reserved words
    if (RESERVED_SLUGS.includes(trimmedSlug)) {
      return `"${trimmedSlug}" is a reserved word and cannot be used`
    }
    
    return null
  }

  // Check slug availability with debounce
  const checkSlug = async (slug: string) => {
    const trimmedSlug = slug.trim()
    
    if (!trimmedSlug) {
      setSlugAvailability({ checking: false, available: null, error: null })
      return
    }

    // Validate slug format first
    const validationError = validateSlug(trimmedSlug)
    if (validationError) {
      setSlugAvailability({ checking: false, available: false, error: validationError })
      return
    }

    setSlugAvailability({ checking: true, available: null, error: null })

    try {
      const result = await checkSlugAvailability(trimmedSlug, currentWorkspace?.id || '')
      setSlugAvailability({ 
        checking: false, 
        available: result.available, 
        error: result.error || null 
      })
      
      // If there's a format/reserved word error, don't auto-generate
      if (result.error) {
        return
      }
      
      // If not available (taken), auto-generate an available slug
      if (!result.available) {
        const availableSlug = await generateAvailableSlug(trimmedSlug, currentWorkspace?.id || '')
        setFormData(prev => ({ ...prev, slug: availableSlug }))
        // Check the new slug
        const newResult = await checkSlugAvailability(availableSlug, currentWorkspace?.id || '')
        setSlugAvailability({ 
          checking: false, 
          available: newResult.available, 
          error: newResult.error || null 
        })
      }
    } catch (error) {
      console.error('Error checking slug availability:', error)
      setSlugAvailability({ checking: false, available: null, error: null })
    }
  }

  // Handle title change (don't generate slug yet)
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
    }))
  }

  // Handle title blur - generate slug when user finishes typing
  const handleTitleBlur = async () => {
    // Only generate slug if slug field is empty
    if (!formData.slug.trim() && formData.title.trim()) {
      const newSlug = generateSlug(formData.title)
      setFormData(prev => ({ ...prev, slug: newSlug }))
      
      // Check availability of the generated slug
      await checkSlug(newSlug)
    }
  }

  // Handle slug change
  const handleSlugChange = (slug: string) => {
    setFormData(prev => ({ ...prev, slug }))
    
    // Clear previous timeout
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current)
    }
    
    // Validate immediately for instant feedback
    const validationError = validateSlug(slug)
    if (validationError) {
      setSlugAvailability({ checking: false, available: false, error: validationError })
      return
    }
    
    // Reset availability state if valid
    setSlugAvailability({ checking: false, available: null, error: null })
    
    // Debounce slug check
    slugCheckTimeoutRef.current = setTimeout(() => {
      checkSlug(slug)
    }, 500)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current)
      }
    }
  }, [])

  // Initialize assignedToFilter with all members when members are loaded (for multi-user workspaces)
  useEffect(() => {
    if (isMultiUser && members.length > 0 && assignedToFilter.length === 0) {
      const allMemberIds = members.map(m => m.membership.user_id)
      setAssignedToFilter(allMemberIds)
    }
  }, [isMultiUser, members, assignedToFilter.length])

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateModalOpen) {
      setFormData({
        title: '',
        slug: '',
        description: '',
        status: 'draft',
        assignedAgentId: '',
      })
      setSlugAvailability({ checking: false, available: null, error: null })
    }
  }, [isCreateModalOpen])

  // Handle create site
  const handleCreateSite = async () => {
    if (!currentWorkspace?.id || !user?.id) {
      toast.error('Workspace or user not found')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    const trimmedSlug = formData.slug.trim()
    
    if (!trimmedSlug) {
      toast.error('Slug is required')
      return
    }

    // Validate assigned agent for multi-user workspaces
    if (isMultiUser && !formData.assignedAgentId) {
      toast.error('Please assign an agent')
      return
    }

    // Validate slug length
    const validationError = validateSlug(trimmedSlug)
    if (validationError) {
      toast.error(validationError)
      setSlugAvailability(prev => ({ ...prev, error: validationError }))
      return
    }

    setIsCreating(true)

    try {
      // Ensure slug is available before creating
      const finalSlug = slugAvailability.available 
        ? trimmedSlug 
        : await generateAvailableSlug(trimmedSlug, 'ottie.site')

      // In single-user workspaces, automatically assign current user
      // In multi-user workspaces, use selected agent
      const assignedAgentId = isMultiUser 
        ? formData.assignedAgentId 
        : user.id

      // Validate: Cannot publish site without assigned agent
      if (formData.status === 'published' && !assignedAgentId) {
        toast.error('Site cannot be published without an assigned agent. Please assign an agent first.')
        setIsCreating(false)
        return
      }

      const siteData: SiteInsert = {
        workspace_id: currentWorkspace.id,
        creator_id: user.id,
        assigned_agent_id: assignedAgentId || null,
        availability: 'available',
        title: formData.title.trim(),
        slug: finalSlug,
        description: formData.description.trim() || null,
        status: formData.status,
        config: {}, // Empty config for new site
        domain: 'ottie.site', // Default domain for all sites (can be changed to custom domain)
        metadata: {},
        thumbnail_url: null,
        published_at: formData.status === 'published' ? new Date().toISOString() : null,
        password_protected: false,
        password_hash: null,
      }

      // Check limit before creating
      if (sitesCount >= maxSites) {
        setIsCreateModalOpen(false)
        setIsUpgradeModalOpen(true)
        setIsCreating(false)
        return
      }

      const result = await createSite(siteData, maxSites, currentWorkspace?.plan ?? null)

      if ('error' in result) {
        if (result.limitExceeded) {
          // Limit exceeded - show upgrade modal
          setIsCreateModalOpen(false)
          setIsUpgradeModalOpen(true)
        } else {
          toast.error(result.error)
        }
      } else {
        toastSuccess('Site created successfully!')
        setIsCreateModalOpen(false)
        setFormData({
          title: '',
          slug: '',
          description: '',
          status: 'draft',
          assignedAgentId: '',
        })
        // Refresh sites list
        await refresh()
      }
    } catch (error) {
      console.error('Error creating site:', error)
      toast.error('Failed to create site')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Sites" 
        description="Manage your real estate sites, create new listings, and track performance."
      />
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs
          items={[
            { label: 'Sites', href: '/sites' },
          ]}
        />
        <div className="flex-1" />
        <Button size="sm" className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <LottieAddCardIcon className="size-4" />
          New Site
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Filters & Search - Only show if there are sites */}
        {sites.length > 0 && (
        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <SearchInput
                value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search sites..."
              desktopWidth="md:w-80"
              />
            <div className="flex flex-wrap gap-1.5 md:gap-2 items-center w-full md:w-auto">
              <div className="relative inline-flex items-center">
                <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`gap-1.5 md:gap-2 transition-colors shrink-0 ${
                        statusFilter.length < 3 
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30 hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/40' 
                          : ''
                      }`}
                    >
                      <LottieFilterIcon size={18} className="shrink-0" />
                      <span className="whitespace-nowrap hidden md:inline">Status</span>
                      {statusFilter.length < 3 && (
                        <span className="ml-0.5 md:ml-1 h-5 px-1 md:px-1.5 text-xs capitalize rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium max-w-[120px] md:max-w-none truncate" style={{ color: 'white' }}>
                          {statusFilter.length === 1 
                            ? statusFilter[0] 
                            : statusFilter.sort().join(', ')}
                        </span>
                      )}
                      {statusFilter.length === 3 && <ChevronDown className="size-3 shrink-0 hidden md:inline" />}
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes('published')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, 'published'])
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== 'published'))
                      }
                    }}
                    onSelect={(e) => e.preventDefault()}
                  >
                    Published
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes('draft')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, 'draft'])
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== 'draft'))
                      }
                    }}
                    onSelect={(e) => e.preventDefault()}
                  >
                    Draft
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes('archived')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, 'archived'])
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== 'archived'))
                      }
                    }}
                    onSelect={(e) => e.preventDefault()}
                  >
                    Archived
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
              {isMultiUser && (
                <div className="relative inline-flex items-center">
                  <Popover 
                    open={isAssignedToComboboxOpen} 
                    onOpenChange={(open) => {
                      setIsAssignedToComboboxOpen(open)
                      if (!open) {
                        setAssignedToSearchQuery('')
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`gap-1.5 md:gap-2 transition-colors shrink-0 ${
                        assignedToFilter.length > 0 && assignedToFilter.length < members.length
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30 hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/40' 
                          : ''
                      }`}
                      >
                        <LottieAvatarIcon size={18} className="shrink-0" />
                        <span className="whitespace-nowrap hidden md:inline">Assigned to</span>
                        {assignedToFilter.length > 0 && assignedToFilter.length < members.length && (
                          <span className="ml-0.5 md:ml-1 h-5 px-1 md:px-1.5 text-xs rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium max-w-[100px] md:max-w-none truncate" style={{ color: 'white' }}>
                            {assignedToFilter.length === 1 
                              ? members.find(m => m.membership.user_id === assignedToFilter[0])?.profile.full_name ?? assignedToFilter[0]
                              : `${assignedToFilter.length} users`}
                          </span>
                        )}
                        {(assignedToFilter.length === 0 || assignedToFilter.length === members.length) && <ChevronDown className="size-3 shrink-0 hidden md:inline" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-1" align="end">
                      <Command className="rounded-md">
                        <CommandInput 
                          placeholder="Search members..." 
                          value={assignedToSearchQuery}
                          onValueChange={setAssignedToSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup>
                            {sortedMembers
                              .filter((member) => {
                                if (!assignedToSearchQuery) return true
                                const query = assignedToSearchQuery.toLowerCase()
                                const fullName = member.profile.full_name?.toLowerCase() || ''
                                const email = member.profile.email?.toLowerCase() || ''
                                return fullName.includes(query) || email.includes(query)
                              })
                              .map((member) => {
                                const isSelected = assignedToFilter.includes(member.membership.user_id)
                                return (
                                  <CommandItem
                          key={member.membership.user_id}
                                    onSelect={() => {
                                      if (isSelected) {
                              setAssignedToFilter(assignedToFilter.filter(id => id !== member.membership.user_id))
                                      } else {
                                        setAssignedToFilter([...assignedToFilter, member.membership.user_id])
                            }
                          }}
                                    className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-foreground"
                        >
                                    <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                                      {isSelected && <CheckIcon className="size-4" />}
                                    </span>
                          <Avatar className="size-6 shrink-0">
                            <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.full_name || member.profile.email || 'Unknown'} />
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
              )}
              <div className="relative inline-flex items-center">
                <DropdownMenu open={isAvailabilityDropdownOpen} onOpenChange={setIsAvailabilityDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`gap-1.5 md:gap-2 transition-colors shrink-0 ${
                        availabilityFilter.length > 0 && availabilityFilter.length < 5
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30 hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/40' 
                          : ''
                      }`}
                    >
                      <LottieFlagIcon size={18} className="shrink-0" />
                      <span className="whitespace-nowrap hidden md:inline">Availability</span>
                      {availabilityFilter.length > 0 && availabilityFilter.length < 5 && (
                        <span className="ml-0.5 md:ml-1 h-5 px-1 md:px-1.5 text-xs rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium max-w-[120px] md:max-w-none truncate" style={{ color: 'white' }}>
                          {availabilityFilter.length === 1 
                            ? availabilityFilter[0].replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                            : availabilityFilter.sort().map(s => s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}
                        </span>
                      )}
                      {(availabilityFilter.length === 0 || availabilityFilter.length === 5) && <ChevronDown className="size-3 shrink-0 hidden md:inline" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuCheckboxItem
                      checked={availabilityFilter.includes('available')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityFilter([...availabilityFilter, 'available'])
                        } else {
                          setAvailabilityFilter(availabilityFilter.filter(s => s !== 'available'))
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/15">
                        Available
                      </Badge>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={availabilityFilter.includes('under_offer')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityFilter([...availabilityFilter, 'under_offer'])
                        } else {
                          setAvailabilityFilter(availabilityFilter.filter(s => s !== 'under_offer'))
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15">
                        Under offer
                      </Badge>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={availabilityFilter.includes('reserved')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityFilter([...availabilityFilter, 'reserved'])
                        } else {
                          setAvailabilityFilter(availabilityFilter.filter(s => s !== 'reserved'))
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/15">
                        Reserved
                      </Badge>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={availabilityFilter.includes('sold')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityFilter([...availabilityFilter, 'sold'])
                        } else {
                          setAvailabilityFilter(availabilityFilter.filter(s => s !== 'sold'))
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/15">
                        Sold
                      </Badge>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={availabilityFilter.includes('off_market')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityFilter([...availabilityFilter, 'off_market'])
                        } else {
                          setAvailabilityFilter(availabilityFilter.filter(s => s !== 'off_market'))
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/15">
                        Off market
                      </Badge>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="relative inline-flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`gap-1.5 md:gap-2 transition-colors shrink-0 ${
                        sortBy !== 'createdDesc' 
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30 hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/40' 
                          : ''
                      }`}
                    >
                      <LottieSwapIcon size={18} className="shrink-0" />
                      <span className="whitespace-nowrap hidden md:inline">Sort</span>
                      {sortBy !== 'createdDesc' && (
                        <span className="ml-0.5 md:ml-1 h-5 px-1 md:px-1.5 text-xs rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium max-w-[100px] md:max-w-none truncate" style={{ color: 'white' }}>
                          {sortBy === 'editedDesc' ? 'Updated (newest)' : 
                           sortBy === 'nameAsc' ? 'Name (A–Z)' : 
                           sortBy === 'viewsDesc' ? 'Most views' : ''}
                        </span>
                      )}
                      <ChevronDown className="size-3 shrink-0 hidden md:inline" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setSortBy('createdDesc')}
                    className={sortBy === 'createdDesc' ? 'bg-accent' : ''}
                  >
                    <span className="flex-1">Created (newest first)</span>
                    {sortBy === 'createdDesc' && (
                      <span className="ml-2 h-5 px-1.5 text-xs rounded-full border-transparent bg-[#7c3aed] inline-flex items-center justify-center font-medium" style={{ color: 'white' }}>
                        Default
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('editedDesc')}
                    className={sortBy === 'editedDesc' ? 'bg-accent' : ''}
                  >
                    Updated (newest first)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('nameAsc')}
                    className={sortBy === 'nameAsc' ? 'bg-accent' : ''}
                  >
                    Name (A–Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('viewsDesc')}
                    className={sortBy === 'viewsDesc' ? 'bg-accent' : ''}
                  >
                    Most views
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
              {(statusFilter.length < 3 || sortBy !== 'createdDesc' || searchQuery || (isMultiUser && assignedToFilter.length > 0 && assignedToFilter.length < members.length) || (availabilityFilter.length > 0 && availabilityFilter.length < 5)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => {
                        setStatusFilter(['published', 'draft', 'archived'])
                        setSortBy('createdDesc')
                        setSearchQuery('')
                        // Reset assignedToFilter to all members (default)
                        if (isMultiUser && members.length > 0) {
                          setAssignedToFilter(members.map(m => m.membership.user_id))
                        } else {
                          setAssignedToFilter([])
                        }
                        // Reset availabilityFilter to all availability options (default)
                        setAvailabilityFilter(['available', 'under_offer', 'reserved', 'sold', 'off_market'])
                      }}
                      className="p-1.5 rounded-full hover:bg-muted/50 transition-colors shrink-0"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 10,
                      }}
                    >
                      <LottieResetIcon size={18} />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset filters</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

        </div>
        )}

        {/* Loading State - Skeleton Cards */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="group">
                {/* Skeleton Card */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <Skeleton className="w-full h-full rounded-2xl" />
                  {/* Skeleton Avatar */}
                  <div className="absolute top-3 left-3 z-10">
                    <Skeleton className="size-12 rounded-full" />
                  </div>
                  {/* Skeleton Views Badge */}
                  <div className="absolute bottom-3 right-3 z-10">
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                </div>
                {/* Skeleton Title and Status */}
                <div className="pt-4 pb-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State - No sites match filters */}
        {!loading && displaySites.length === 0 && (searchQuery || statusFilter.length < 3) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12 text-muted-foreground dark:text-muted-foreground/60"
          >
            No sites found matching your filters.
          </motion.div>
        )}

        {/* Empty State - No sites at all (centered) */}
        {!loading && sites.length === 0 && !searchQuery && statusFilter.length === 3 && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <CardContent className="flex flex-col items-center justify-center text-foreground p-8">
                <div className="mb-4">
                  <LottieAddCardIcon size={48} invertTheme={false} autoLoop />
                </div>
                <span className="font-medium mb-1 text-lg">Create Your First Site</span>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mb-6 text-center">
                  Get started by generating a site from a URL or creating one manually.
                </p>
                <div className="flex gap-2">
                  <Button size="default">
                    Generate from URL
                  </Button>
                  <Button variant="secondary" size="default" onClick={() => setIsCreateModalOpen(true)}>
                    Create manually
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        )}

        {/* Sites Grid - Show when there are sites */}
        {!loading && sites.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {/* New Site Card - Only show when no filters are active */}
            {!searchQuery && statusFilter.length === 3 && sortBy === 'createdDesc' && (isMultiUser ? (assignedToFilter.length === 0 || assignedToFilter.length === members.length) : assignedToFilter.length === 0) && (availabilityFilter.length === 0 || availabilityFilter.length === 5) && (
              <motion.div
                key="new-site-card"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="group hidden md:block"
              >
                <GlowCard className="border-dashed bg-transparent !bg-transparent dark:border-white/10 keep-border" initialGlow>
                  <CardContent className="flex flex-col items-center justify-center aspect-[4/3] text-foreground p-6">
                  <div className="mb-4">
                    <LottieAddCardIcon size={28} invertTheme={false} />
                  </div>
                  <span className="font-medium mb-1">Create New Site</span>
                  <div className="flex flex-col gap-2 mt-4 w-full">
                    <Button size="sm" className="w-full">
                      Generate from URL
                    </Button>
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setIsCreateModalOpen(true)
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                    >
                      Create manually
                    </Link>
                  </div>
                </CardContent>
              </GlowCard>
                {/* Empty space below to match other cards */}
                <div className="pt-4 pb-1">
                  <div className="h-5" />
                  <div className="h-4" />
                </div>
              </motion.div>
            )}

            {/* Site Cards */}
            {displaySites.map((site, index) => (
              <motion.div
                key={site.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ 
                  duration: 0.3, 
                  ease: [0.4, 0, 0.2, 1],
                  layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                  delay: index * 0.02 // Stagger effect
                }}
              >
                <SiteCard 
                  site={site} 
                  onStatusChange={refresh}
                  members={members}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
      </main>

      {/* Create Site Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Site</DialogTitle>
            <DialogDescription>
              Create a new real estate site. You can customize it later in the builder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., 21 Maine Street"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="relative">
              <Input
                id="slug"
                placeholder="e.g., 21-maine-street"
                value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                disabled={isCreating}
                  className={slugAvailability.checking ? 'pr-10' : slugAvailability.available === false ? 'pr-10 border-destructive' : slugAvailability.available === true ? 'pr-10 border-green-500' : 'pr-10'}
                />
                {slugAvailability.checking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
                {!slugAvailability.checking && slugAvailability.available === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-green-500" />
                )}
                {!slugAvailability.checking && slugAvailability.available === false && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-destructive" />
                )}
              </div>
              <div className="space-y-1">
                {slugAvailability.checking && (
                  <p className="text-xs text-muted-foreground">Checking availability...</p>
                )}
                {!slugAvailability.checking && slugAvailability.error && (
                  <p className="text-xs text-destructive">
                    ✗ {slugAvailability.error}
                  </p>
                )}
                {!slugAvailability.checking && !slugAvailability.error && slugAvailability.available === true && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Available {formData.slug}.ottie.site
                  </p>
                )}
                {!slugAvailability.checking && !slugAvailability.error && slugAvailability.available === false && (
                  <p className="text-xs text-destructive">
                    ✗ This slug is already taken. We'll suggest an available one.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the property..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isCreating}
                rows={3}
              />
            </div>

            {isMultiUser && (
              <div className="space-y-2">
                <Label htmlFor="assignedAgent">Assigned Agent *</Label>
                <Select
                  value={formData.assignedAgentId}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, assignedAgentId: value }))
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger id="assignedAgent" className="w-full">
                    <SelectValue placeholder="Select an agent">
                      {formData.assignedAgentId && (() => {
                        const selectedMember = members.find(m => m.membership.user_id === formData.assignedAgentId)
                        if (!selectedMember) return null
                        return (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5 shrink-0">
                              <AvatarImage src={selectedMember.profile.avatar_url || undefined} alt={selectedMember.profile.full_name || selectedMember.profile.email || 'Unknown'} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(selectedMember.profile.full_name, selectedMember.profile.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{selectedMember.profile.full_name || selectedMember.profile.email || 'Unknown'}</span>
                          </div>
                        )
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.membership.user_id} value={member.membership.user_id} className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.full_name || member.profile.email || 'Unknown'} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(member.profile.full_name, member.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{member.profile.full_name || member.profile.email || 'Unknown'}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published' | 'archived') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
                disabled={isCreating}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSite}
              disabled={
                isCreating || 
                !formData.title.trim() || 
                !formData.slug.trim() || 
                formData.slug.trim().length < 5 ||
                slugAvailability.available === false ||
                !!slugAvailability.error ||
                (isMultiUser && !formData.assignedAgentId)
              }
            >
              {isCreating ? 'Creating...' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal for Site Limit */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Site Limit Reached</DialogTitle>
                <DialogDescription className="mt-1">
                  You've reached the maximum number of active sites for your plan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Plan Limit:</span>
                  <span className="font-medium">{maxSites} active site{maxSites !== 1 ? 's' : ''}</span>
                </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isFreePlan ? 'Total Sites' : 'Active Sites'}:</span>
                    <span className="font-medium">{sitesCount} / {maxSites}</span>
                  </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              To create more sites, you can either:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Upgrade to a plan with more sites</li>
              <li>Archive existing sites to free up space</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <PricingDialog
              currentPlan={currentWorkspace?.plan ?? null}
              workspaceId={currentWorkspace?.id ?? null}
              defaultSelectedTier={null}
            >
              <Button className="w-full sm:w-auto">
                Upgrade Plan
              </Button>
            </PricingDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
