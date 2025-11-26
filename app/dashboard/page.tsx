'use client'

import { 
  Plus, 
  DotsThree, 
  Eye, 
  PencilSimple, 
  Trash, 
  Copy,
  Globe,
  Clock,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mock data for pages
const mockPages = [
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
]

// Mock stats
const stats = [
  { label: 'Total Pages', value: '4', change: '+2', trend: 'up' },
  { label: 'Published', value: '2', change: '+1', trend: 'up' },
  { label: 'Total Views', value: '1,801', change: '+12%', trend: 'up' },
  { label: 'This Month', value: '432', change: '-5%', trend: 'down' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" weight="bold" />
          New Page
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {stat.trend === 'up' ? (
                  <ArrowUp className="size-4 text-green-500" weight="bold" />
                ) : (
                  <ArrowDown className="size-4 text-red-500" weight="bold" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pages Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">My Pages</h2>
              <p className="text-sm text-muted-foreground">
                Manage your property landing pages
              </p>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          {/* Pages Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* New Page Card */}
            <Card className="border-dashed hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer group">
              <CardContent className="flex flex-col items-center justify-center h-[280px] text-muted-foreground group-hover:text-primary transition-colors">
                <div className="size-12 rounded-full border-2 border-dashed flex items-center justify-center mb-4 group-hover:border-primary transition-colors">
                  <Plus className="size-6" />
                </div>
                <span className="font-medium">Create New Page</span>
                <span className="text-xs mt-1">Start from scratch or use AI</span>
              </CardContent>
            </Card>

            {/* Page Cards */}
            {mockPages.map((page) => (
              <Card key={page.id} className="overflow-hidden group">
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  <img 
                    src={page.thumbnail} 
                    alt={page.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Status Badge */}
                  <Badge 
                    variant={page.status === 'published' ? 'default' : 'secondary'}
                    className="absolute top-2 left-2"
                  >
                    {page.status === 'published' ? (
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
                      <PencilSimple className="size-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                {/* Content */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{page.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" />
                          {page.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {page.lastEdited}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <DotsThree className="size-4" weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="size-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <PencilSimple className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="size-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Generate with AI</CardTitle>
                <CardDescription>
                  Create a new page using AI from your listing data
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Import from URL</CardTitle>
                <CardDescription>
                  Import property data from Zillow, Realtor, or MLS
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Browse Templates</CardTitle>
                <CardDescription>
                  Start with a pre-designed template
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

