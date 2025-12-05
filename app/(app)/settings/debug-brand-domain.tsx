'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function DebugBrandDomain({ workspaceId }: { workspaceId: string }) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkBrandDomain = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Get workspace with branding config
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('branding_config')
        .eq('id', workspaceId)
        .single()
      
      if (workspaceError) {
        toast.error('Error fetching workspace: ' + workspaceError.message)
        setLoading(false)
        return
      }
      
      const brandingConfig = workspace?.branding_config as any
      const currentBrandDomain = brandingConfig?.custom_brand_domain
      
      // Also check if domain exists in ANY workspace (for debugging)
      const { data: allWorkspaces, error: allWorkspacesError } = await supabase
        .from('workspaces')
        .select('id, branding_config')
        .is('deleted_at', null)
        .limit(100)
      
      // Filter workspaces that have the same brand domain as current workspace (for debugging)
      const workspacesWithDomain = currentBrandDomain 
        ? allWorkspaces?.filter(w => {
            const config = w.branding_config as any
            return config?.custom_brand_domain === currentBrandDomain
          }) || []
        : []
      
      // Get all sites in workspace
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
      
      if (sitesError) {
        toast.error('Error fetching sites: ' + sitesError.message)
        setLoading(false)
        return
      }
      
      const info = {
        brandDomain: brandingConfig?.custom_brand_domain || 'Not set',
        brandDomainVerified: brandingConfig?.custom_brand_domain_verified || false,
        brandingConfigRaw: brandingConfig,
        workspacesWithDomain: workspacesWithDomain.map(w => ({
          id: w.id,
          domain: (w.branding_config as any)?.custom_brand_domain,
          verified: (w.branding_config as any)?.custom_brand_domain_verified,
        })),
        sites: sites?.map(s => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          status: s.status,
          domain: s.domain,
          assigned_agent_id: s.assigned_agent_id,
          published: s.status === 'published',
          correctDomain: s.domain === brandingConfig?.custom_brand_domain,
        })) || [],
        totalSites: sites?.length || 0,
        publishedSites: sites?.filter(s => s.status === 'published').length || 0,
        sitesWithCorrectDomain: sites?.filter(s => s.domain === brandingConfig?.custom_brand_domain).length || 0,
      }
      
      setDebugInfo(info)
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Brand Domain</CardTitle>
        <CardDescription>Check brand domain configuration and site status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkBrandDomain} disabled={loading}>
          {loading ? 'Checking...' : 'Check Status'}
        </Button>
        
        {debugInfo && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div><strong>Brand Domain:</strong> {debugInfo.brandDomain}</div>
              <div><strong>Verified:</strong> {debugInfo.brandDomainVerified ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Total Sites:</strong> {debugInfo.totalSites}</div>
              <div><strong>Published Sites:</strong> {debugInfo.publishedSites}</div>
              <div><strong>Sites with Correct Domain:</strong> {debugInfo.sitesWithCorrectDomain}</div>
              {debugInfo.workspacesWithDomain && debugInfo.workspacesWithDomain.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div><strong>Workspaces with same brand domain ({debugInfo.brandDomain}):</strong></div>
                  {debugInfo.workspacesWithDomain.map((w: any) => (
                    <div key={w.id} className="text-sm">
                      Workspace {w.id}: domain={w.domain}, verified={w.verified ? 'Yes' : 'No'}
                    </div>
                  ))}
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Raw Branding Config</summary>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-auto">
                  {JSON.stringify(debugInfo.brandingConfigRaw, null, 2)}
                </pre>
              </details>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Sites:</h4>
              {debugInfo.sites.map((site: any) => (
                <div key={site.id} className={`p-3 rounded border ${site.published && site.correctDomain ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'}`}>
                  <div className="font-medium">{site.title}</div>
                  <div className="text-sm space-y-1">
                    <div>Slug: <code>{site.slug}</code></div>
                    <div>Status: <code>{site.status}</code> {site.published ? '✅' : '❌'}</div>
                    <div>Domain: <code>{site.domain}</code> {site.correctDomain ? '✅' : '❌'}</div>
                    <div>Assigned Agent: {site.assigned_agent_id ? '✅' : '❌'}</div>
                    <div>URL: <code>https://{site.domain}/{site.slug}</code></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
