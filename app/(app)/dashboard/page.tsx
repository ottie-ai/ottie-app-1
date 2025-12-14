'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { acceptInvitation, getInvitationByToken } from '@/app/(app)/settings/actions'
import { toast } from 'sonner'
import { toastSuccess } from '@/lib/toast-helpers'
import { PageTitle } from '@/components/page-title'
import { 
  Plus, 
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { LottieViewIcon } from '@/components/ui/lottie-view-icon'
import { LottieAddCardIcon } from '@/components/ui/lottie-add-card-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/glow-card'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { SiteCard, type SiteCardData } from '@/components/workspace/site-card'
import { useSites } from '@/hooks/use-sites'
import { useAppData } from '@/contexts/app-context'
import { formatDistanceToNow } from 'date-fns'
import { useMemo } from 'react'
import type { Site } from '@/types/database'

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
    domain: site.domain,
  }
}


export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useAppData()
  const { sites, loading: sitesLoading, refresh } = useSites(currentWorkspace?.id)

  // Get recent sites (last 4, sorted by updated_at)
  const recentSites = useMemo(() => {
    return sites
      .map(siteToCardData)
      .sort((a, b) => {
        // Sort by updated_at desc
        const dateA = new Date(sites.find(s => s.id === a.id)?.updated_at || 0).getTime()
        const dateB = new Date(sites.find(s => s.id === b.id)?.updated_at || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 4) // Show only 4 most recent
  }, [sites])

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalSites = sites.length
    const publishedSites = sites.filter(s => s.status === 'published').length
    const totalViews = sites.reduce((sum, s) => sum + (s.views_count || 0), 0)
    
    return [
      { label: 'Total Sites', value: totalSites.toString(), change: '', trend: 'up' as const },
      { label: 'Published', value: publishedSites.toString(), change: '', trend: 'up' as const },
      { label: 'Total Views', value: totalViews.toLocaleString(), change: '', trend: 'up' as const },
      { label: 'This Month', value: '0', change: '', trend: 'down' as const }, // TODO: Calculate monthly views
    ]
  }, [sites])

  // Check for pending invitation after login (e.g., from OAuth redirect)
  useEffect(() => {
    async function checkPendingInvitation() {
      if (!user || authLoading) return
      
      // Fix #4: Check localStorage for pending invite after email confirmation
      const pendingInviteAfterConfirm = localStorage.getItem('pending_invite_after_confirm')
      if (pendingInviteAfterConfirm) {
        try {
          const { token, email } = JSON.parse(pendingInviteAfterConfirm)
          const userEmail = user.email?.toLowerCase().trim()
          
          if (userEmail === email.toLowerCase().trim()) {
            // Email matches - accept invitation
            const inviteResult = await getInvitationByToken(token)
            if (!('error' in inviteResult)) {
              const acceptResult = await acceptInvitation(token, user.id)
              if (!('error' in acceptResult)) {
                toastSuccess(`You've successfully joined ${inviteResult.workspace.name}!`)
                // Set the workspace as current workspace in localStorage
                if (typeof window !== 'undefined' && 'workspaceId' in acceptResult) {
                  localStorage.setItem('current_workspace_id', acceptResult.workspaceId)
                }
                // Refresh to load the new workspace
                router.refresh()
              } else {
                toast.error(acceptResult.error)
              }
            }
          }
          // Clear localStorage regardless of result
          localStorage.removeItem('pending_invite_after_confirm')
        } catch (e) {
          console.error('Error processing pending invite after confirm:', e)
          localStorage.removeItem('pending_invite_after_confirm')
        }
      }
      
      const tokenHash = sessionStorage.getItem('pending_invite_token_hash')
      const expectedEmail = sessionStorage.getItem('pending_invite_email')
      
      // On dashboard page, we can't extract the full token from URL, so clear the hash
      // User should visit the invite link directly if they need to accept an invitation
      if (tokenHash) {
        sessionStorage.removeItem('pending_invite_token_hash')
        sessionStorage.removeItem('pending_invite_email')
        sessionStorage.removeItem('invite_expected_email')
      }
    }
    
    checkPendingInvitation()
  }, [user, authLoading])

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
        title="Dashboard" 
        description="View your real estate sites, analytics, and manage your portfolio."
      />
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1 flex items-center gap-2">
          <LottieViewIcon className="size-4" />
          <h1 className="text-base font-semibold">Dashboard</h1>
        </div>
        <Button size="sm" className="gap-2">
          <LottieAddCardIcon className="size-4" />
          New Site
        </Button>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-muted">
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

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted hover:bg-[var(--hover-bg)] transition-colors">
              <CardHeader>
                <CardTitle className="text-base">Generate with AI</CardTitle>
                <CardDescription>
                  Create a new site using AI from your listing data
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-muted hover:bg-[var(--hover-bg)] transition-colors">
              <CardHeader>
                <CardTitle className="text-base">Import from URL</CardTitle>
                <CardDescription>
                  Import property data from Zillow, Realtor, or MLS
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-muted hover:bg-[var(--hover-bg)] transition-colors">
              <CardHeader>
                <CardTitle className="text-base">Browse Templates</CardTitle>
                <CardDescription>
                  Start with a pre-designed template
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Sites Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sites</h2>
              <p className="text-sm text-muted-foreground">
                Manage your property landing sites
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/sites')}>
              View All
            </Button>
          </div>

          {/* Sites Grid */}
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
                <Button variant="secondary" size="sm">
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
            {!sitesLoading && recentSites.length > 0 && recentSites.map((site) => (
              <SiteCard key={site.id} site={site} onStatusChange={refresh} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

