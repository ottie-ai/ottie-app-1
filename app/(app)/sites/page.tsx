'use client'

import { PageTitle } from '@/components/page-title'
import { 
  Plus, 
  Search,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
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

// Mock data for sites
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
    status: 'draft',
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
          <h1 className="text-lg font-semibold">My Sites</h1>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          New Site
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search sites..." 
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="size-4" />
                  Status
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>Published</DropdownMenuItem>
                <DropdownMenuItem>Draft</DropdownMenuItem>
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
                <DropdownMenuItem>Last edited</DropdownMenuItem>
                <DropdownMenuItem>Name A-Z</DropdownMenuItem>
                <DropdownMenuItem>Name Z-A</DropdownMenuItem>
                <DropdownMenuItem>Most views</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New Site Card */}
          <div className="group">
            <GlowCard className="border-dashed hover:border-transparent transition-colors cursor-pointer" initialGlow>
              <CardContent className="flex flex-col items-center justify-center aspect-[4/3] text-muted-foreground group-hover:text-primary transition-colors p-0">
                <div className="size-12 rounded-full border-2 border-dashed flex items-center justify-center mb-4 group-hover:border-primary transition-colors">
                  <Plus className="size-6" />
                </div>
                <span className="font-medium">Create New Site</span>
                <span className="text-xs mt-1">Start from scratch or use AI</span>
              </CardContent>
            </GlowCard>
            {/* Empty space below to match other cards */}
            <div className="pt-4 pb-1">
              <div className="h-5" />
              <div className="h-4" />
            </div>
          </div>

          {/* Site Cards */}
          {mockSites.map((site) => (
            <SiteCard key={site.id} site={site} href={`/builder/${site.id}`} />
          ))}
        </div>
      </main>
    </div>
  )
}
