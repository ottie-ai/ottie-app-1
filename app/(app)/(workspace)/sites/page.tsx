'use client'

import Link from 'next/link'
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Copy,
  Globe,
  Clock,
  Search,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/glow-card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mock data for sites
const mockSites = [
  {
    id: '1',
    title: '21 Maine Street',
    status: 'published',
    views: 1234,
    lastEdited: '2 hours ago',
    thumbnail: 'https://images.unsplash.com/photo-1679364297777-1db77b6199be?w=400&q=80',
  },
  {
    id: '2',
    title: 'Luxury Villa Palm Beach',
    status: 'draft',
    views: 0,
    lastEdited: '1 day ago',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  },
  {
    id: '3',
    title: 'Modern Apartment NYC',
    status: 'published',
    views: 567,
    lastEdited: '3 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
  },
  {
    id: '4',
    title: 'Beachfront Condo Miami',
    status: 'draft',
    views: 0,
    lastEdited: '1 week ago',
    thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
  },
  {
    id: '5',
    title: 'Downtown Loft Chicago',
    status: 'published',
    views: 892,
    lastEdited: '2 weeks ago',
    thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
  },
  {
    id: '6',
    title: 'Mountain Retreat Aspen',
    status: 'draft',
    views: 0,
    lastEdited: '3 weeks ago',
    thumbnail: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=80',
  },
]

export default function SitesPage() {
  return (
    <div className="flex flex-col h-full">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-2 -m-2">
          {/* New Site Card */}
          <GlowCard className="border-dashed hover:border-transparent transition-colors cursor-pointer group" initialGlow>
            <CardContent className="flex flex-col items-center justify-center h-[280px] text-muted-foreground group-hover:text-primary transition-colors">
              <div className="size-12 rounded-full border-2 border-dashed flex items-center justify-center mb-4 group-hover:border-primary transition-colors">
                <Plus className="size-6" />
              </div>
              <span className="font-medium">Create New Site</span>
              <span className="text-xs mt-1">Start from scratch or use AI</span>
            </CardContent>
          </GlowCard>

          {/* Site Cards */}
          {mockSites.map((site) => (
            <Link key={site.id} href={`/builder/${site.id}`}>
              <GlowCard className="group cursor-pointer">
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] bg-muted overflow-hidden rounded-t-lg">
                <img 
                  src={site.thumbnail} 
                  alt={site.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                {/* Status Badge */}
                <Badge 
                  variant={site.status === 'published' ? 'default' : 'secondary'}
                  className="absolute top-2 left-2"
                >
                  {site.status === 'published' ? (
                    <>
                      <Globe className="size-3 mr-1" />
                      Published
                    </>
                  ) : (
                    'Draft'
                  )}
                </Badge>
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Eye className="size-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm">
                    <Pencil className="size-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              {/* Content */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{site.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" />
                        {site.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {site.lastEdited}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="size-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="size-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </GlowCard>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
