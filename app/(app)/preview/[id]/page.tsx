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
    notFound()
  }

  // Fetch site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('*, workspace_id, creator_id, assigned_agent_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Check permissions: owner, admin, creator, or assigned_agent_id
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isCreator = site.creator_id === user.id
  const isAssignedAgent = site.assigned_agent_id === user.id

  if (!isOwnerOrAdmin && !isCreator && !isAssignedAgent) {
    notFound()
  }

  return <PreviewSitePage site={site} />
}

