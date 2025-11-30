'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageTitle } from '@/components/page-title'
import { 
  Plus, 
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/glow-card'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
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
    title: 'Beachfront Condo Miami',
    slug: 'beachfront-condo-miami',
    status: 'draft',
    views: 0,
    lastEdited: '1 week ago',
    thumbnail: null,
  },
]

// Mock stats
const stats = [
  { label: 'Total Sites', value: '4', change: '+2', trend: 'up' },
  { label: 'Published', value: '2', change: '+1', trend: 'up' },
  { label: 'Total Views', value: '1,801', change: '+12%', trend: 'up' },
  { label: 'This Month', value: '432', change: '-5%', trend: 'down' },
]

export default function DashboardPage() {
  const router = useRouter()

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      router.refresh()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [router])

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Overview" 
        description="View your real estate sites, analytics, and manage your portfolio."
      />
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          New Site
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {stat.trend === 'up' ? (
                  <TrendingUp className="size-4 text-green-500" />
                ) : (
                  <TrendingDown className="size-4 text-red-500" />
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

        {/* Sites Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">My Sites</h2>
              <p className="text-sm text-muted-foreground">
                Manage your property landing sites
              </p>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
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
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">Generate with AI</CardTitle>
                <CardDescription>
                  Create a new site using AI from your listing data
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">Import from URL</CardTitle>
                <CardDescription>
                  Import property data from Zillow, Realtor, or MLS
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors">
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

