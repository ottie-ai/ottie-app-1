'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Site } from '@/types/database'
import { SiteSettingsPanel } from './site-settings-panel'
import { SiteMiniPreview } from './site-mini-preview'
import { LeadsTable } from '@/components/workspace/leads-table'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { ExternalLink, Pencil } from 'lucide-react'

interface SiteBackendClientProps {
  site: Site
  members: Array<{
    membership: { user_id: string }
    profile: { avatar_url: string | null; full_name: string | null; email: string | null }
  }>
}

/**
 * Site Backend Client - Backend admin view pre site
 * 
 * Obsahuje:
 * - Header s tlačidlami (Open Layout Editor, View Live Site)
 * - Tabs (Settings, Analytics, Leads)
 * - Mini preview vpravo (sticky)
 */
export function SiteBackendClient({ site, members }: SiteBackendClientProps) {
  const [activeTab, setActiveTab] = useState('settings')
  const router = useRouter()

  // Get public URL
  const getPublicUrl = () => {
    const { protocol, hostname, port } = window.location
    const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
    
    // TODO: Handle custom domains
    if (site.domain && site.domain !== 'ottie.site') {
      return `https://${site.domain}`
    }
    
    // Default: use slug on current domain
    return `${baseUrl}/${site.slug}`
  }

  const handleOpenBuilder = () => {
    window.open(`/builder/${site.id}`, '_blank', 'noopener,noreferrer')
  }

  const handleViewLiveSite = () => {
    window.open(getPublicUrl(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Sidebar Trigger */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex-1">
          <h1 className="text-base font-semibold">{site.title}</h1>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto py-8 px-4 md:px-8">
          {/* Site Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{site.title}</h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-sm">/{site.slug}</p>
                {site.status === 'published' && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Published
                  </span>
                )}
                {site.status === 'draft' && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                    Draft
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleOpenBuilder} size="default">
                <Pencil className="mr-2 size-4" />
                Open Layout Editor
              </Button>
              <Button variant="outline" onClick={handleViewLiveSite}>
                <ExternalLink className="mr-2 size-4" />
                View Live Site
              </Button>
            </div>
          </div>

          {/* Content - 2 columns (3:1 ratio on large screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Tabs (2/3 width) */}
            <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6">
              <SiteSettingsPanel 
                site={site} 
                members={members}
                // Backend view doesn't need theme/loader/sections refs
                themeRef={undefined}
                onThemeChange={undefined}
                loaderRef={undefined}
                onLoaderChange={undefined}
                sectionsRef={undefined}
                saveChangesRef={undefined}
                onHasUnsavedChanges={undefined}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="rounded-lg border bg-card p-8">
                <div className="flex flex-col items-center justify-center space-y-4 text-center min-h-[400px]">
                  <div className="rounded-full bg-muted p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-6 text-muted-foreground"
                    >
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold">Analytics</h2>
                  <p className="text-muted-foreground max-w-sm">
                    Analytics data will be displayed here. Track views, engagement, and conversion metrics.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leads" className="mt-6">
              <LeadsTable siteId={site.id} siteSlug={site.slug} showAddButton={true} />
            </TabsContent>
          </Tabs>
            </div>

            {/* Right - Preview (1/3 width, sticky) */}
            <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground">Site Preview</h3>
            <SiteMiniPreview site={site} />
            
            {/* Quick Info */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{site.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {new Date(site.created_at).toLocaleDateString()}
                </span>
              </div>
              {site.published_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published:</span>
                  <span className="font-medium">
                    {new Date(site.published_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

