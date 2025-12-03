'use client'

import { PageTitle } from '@/components/page-title'
import { 
  Plus, 
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { LottieAddCardIcon } from '@/components/ui/lottie-add-card-icon'
import { LottieSearchIcon } from '@/components/ui/lottie-search-icon'
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
} from '@/components/ui/dropdown-menu'
import { SiteCard, type SiteCardData } from '@/components/workspace/site-card'
import { useSites } from '@/hooks/use-sites'
import { useAppData } from '@/contexts/app-context'
import { formatDistanceToNow } from 'date-fns'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { Site, SiteInsert } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'
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
import { checkSlugAvailability, generateAvailableSlug } from '@/lib/data/slug-availability'
import { RESERVED_SLUGS } from '@/lib/data/reserved-slugs'

// Helper to convert Site to SiteCardData
function siteToCardData(site: Site): SiteCardData {
  return {
    id: site.id,
    title: site.title,
    slug: site.slug,
    status: site.status,
    views: site.views_count,
    lastEdited: formatDistanceToNow(new Date(site.updated_at), { addSuffix: true }),
    thumbnail: site.thumbnail_url,
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
  const { currentWorkspace } = useAppData()
  const { sites, loading, refresh } = useSites(currentWorkspace?.id)
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [sortBy, setSortBy] = useState<'lastEdited' | 'nameAsc' | 'nameDesc' | 'views'>('lastEdited')
  
  // Create site modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
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
      .map(siteToCardData)
      .filter(site => {
        // Search filter
        if (searchQuery && !site.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }
        // Status filter
        if (statusFilter !== 'all' && site.status !== statusFilter) {
          return false
        }
        return true
      })

    // Sort
    switch (sortBy) {
      case 'nameAsc':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'nameDesc':
        filtered.sort((a, b) => b.title.localeCompare(a.title))
        break
      case 'views':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0))
        break
      case 'lastEdited':
      default:
        // Already sorted by updated_at desc from query
        break
    }

    return filtered
  }, [sites, searchQuery, statusFilter, sortBy])

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
      const result = await checkSlugAvailability(trimmedSlug, 'ottie.site')
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
        const availableSlug = await generateAvailableSlug(trimmedSlug, 'ottie.site')
        setFormData(prev => ({ ...prev, slug: availableSlug }))
        // Check the new slug
        const newResult = await checkSlugAvailability(availableSlug, 'ottie.site')
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateModalOpen) {
      setFormData({
        title: '',
        slug: '',
        description: '',
        status: 'draft',
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

      const siteData: SiteInsert = {
        workspace_id: currentWorkspace.id,
        creator_id: user.id,
        assigned_agent_id: null, // Can be assigned later
        title: formData.title.trim(),
        slug: finalSlug,
        description: formData.description.trim() || null,
        status: formData.status,
        config: {}, // Empty config for new site
        domain: 'ottie.site', // Default domain for all sites
        custom_domain: null,
        metadata: {},
        thumbnail_url: null,
        published_at: formData.status === 'published' ? new Date().toISOString() : null,
      }

      const result = await createSite(siteData)

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Site created successfully!')
        setIsCreateModalOpen(false)
        setFormData({
          title: '',
          slug: '',
          description: '',
          status: 'draft',
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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Sites</h1>
        </div>
        <Button size="sm" className="gap-2">
          <LottieAddCardIcon className="size-[18px]" />
          New Site
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Filters & Search - Only show if there are sites */}
        {sites.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <LottieSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search sites..." 
              className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Status
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('published')}>Published</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Draft</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('archived')}>Archived</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Sort by
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('lastEdited')}>Last edited</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('nameAsc')}>Name A-Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('nameDesc')}>Name Z-A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('views')}>Most views</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        {!loading && displaySites.length === 0 && (searchQuery || statusFilter !== 'all') && (
          <div className="text-center py-12 text-muted-foreground">
            No sites found matching your filters.
          </div>
        )}

        {/* Empty State - No sites at all (centered) */}
        {!loading && sites.length === 0 && !searchQuery && statusFilter === 'all' && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <CardContent className="flex flex-col items-center justify-center text-foreground p-8">
                <div className="mb-4">
                  <LottieAddCardIcon size={48} invertTheme={false} autoLoop />
                </div>
                <span className="font-medium mb-1 text-lg">Create Your First Site</span>
                <p className="text-sm text-muted-foreground mb-6 text-center">
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
          {/* New Site Card */}
          <div className="group">
            <GlowCard className="border-dashed bg-transparent !bg-transparent dark:border-muted-foreground/30 keep-border" initialGlow>
              <CardContent className="flex flex-col items-center justify-center aspect-[4/3] text-foreground p-6">
              <div className="mb-4">
                <LottieAddCardIcon size={28} invertTheme={false} />
              </div>
              <span className="font-medium mb-1">Create New Site</span>
              <div className="flex gap-2 mt-4">
                <Button size="sm">
                  Generate from URL
                </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                  Create manually
                </Button>
              </div>
            </CardContent>
          </GlowCard>
            {/* Empty space below to match other cards */}
            <div className="pt-4 pb-1">
              <div className="h-5" />
              <div className="h-4" />
            </div>
          </div>

          {/* Site Cards */}
            {displaySites.map((site) => (
            <SiteCard key={site.id} site={site} href={`/builder/${site.id}`} />
          ))}
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
                !!slugAvailability.error
              }
            >
              {isCreating ? 'Creating...' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
