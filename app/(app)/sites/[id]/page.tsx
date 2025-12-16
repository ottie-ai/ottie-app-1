import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteBackendClient } from './site-backend-client'

/**
 * Site Backend Page - Admin view pre site management
 * 
 * URL: /sites/[id]
 * 
 * Tento view zobrazuje backend admin interface s tabs:
 * - Settings (name, slug, password, domain, status, delete)
 * - Analytics (charts, metrics)
 * - Leads (leads table)
 * 
 * Plus mini preview vpravo s linkom na builder.
 */
export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Fetch site data
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !site) {
    notFound()
  }

  // Check permissions
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

  // Fetch workspace members for reassign
  const { data: members } = await supabase
    .from('memberships')
    .select(`
      user_id,
      profile:profiles!memberships_user_id_fkey (
        avatar_url,
        full_name,
        email
      )
    `)
    .eq('workspace_id', site.workspace_id)

  const membersData = members?.map((m: any) => ({
    membership: { user_id: m.user_id },
    profile: {
      avatar_url: m.profile?.avatar_url || null,
      full_name: m.profile?.full_name || null,
      email: m.profile?.email || null,
    },
  })) || []

  return <SiteBackendClient site={site} members={membersData} />
}

