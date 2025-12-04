import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreviewSitePage } from './preview-site-page'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Site Preview',
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[PreviewPage] Auth error:', authError)
    notFound()
  }
  
  console.log('[PreviewPage] User authenticated:', user.id)

  // Fetch site (include password_protected for reference, but preview bypasses password for authorized users)
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('*, workspace_id, creator_id, assigned_agent_id, password_protected')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (siteError || !site) {
    console.error('[PreviewPage] Error fetching site:', siteError)
    notFound()
  }

  // Check permissions: owner, admin, creator, or assigned_agent_id
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError) {
    console.error('[PreviewPage] Error fetching membership:', membershipError)
  }

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isCreator = site.creator_id === user.id
  const isAssignedAgent = site.assigned_agent_id === user.id

  if (!isOwnerOrAdmin && !isCreator && !isAssignedAgent) {
    console.log('[PreviewPage] User does not have permission:', { 
      userId: user.id, 
      siteId: id, 
      workspaceId: site.workspace_id,
      isOwnerOrAdmin,
      isCreator,
      isAssignedAgent,
      membershipRole: membership?.role
    })
    notFound()
  }

  // Preview bypasses password protection for authorized users
  // This allows viewing draft/archived/password-protected sites in preview
  return <PreviewSitePage site={site} />
}

