'use client'

import { PageTitle } from '@/components/page-title'
import { 
  Plus, 
  SlidersHorizontal,
  ChevronDown,
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
import { useMemo, useState } from 'react'
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
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  // Handle title change and auto-generate slug
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title), // Only auto-generate if slug is empty
    }))
  }

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

    if (!formData.slug.trim()) {
      toast.error('Slug is required')
      return
    }

    setIsCreating(true)

    try {
      const siteData: SiteInsert = {
        workspace_id: currentWorkspace.id,
        creator_id: user.id,
        assigned_agent_id: null, // Can be assigned later
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        config: {}, // Empty config for new site
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
                <div className="relative aspect-[4/3] bg-muted rounded-2xl overflow-hidden">
                  <Skeleton className="w-full h-full" />
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
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="e.g., 21-maine-street"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier for your site
              </p>
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
              disabled={isCreating || !formData.title.trim() || !formData.slug.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
