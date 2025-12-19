import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BuilderClient } from './builder-client'

/**
 * Builder Page - Full-screen layout editor
 * 
 * URL: /builder/[id]
 * 
 * Tento view je určený len pre editáciu layoutu webu.
 * Má vlastný full-screen layout bez app sidebaru/navigation.
 * 
 * Note: Background color is set in layout.tsx based on loader config.
 */
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[BuilderPage] Auth error:', authError)
    notFound()
  }

  console.log('[BuilderPage] User authenticated:', user.id)

  // Fetch site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('*, workspace_id, creator_id, assigned_agent_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (siteError || !site) {
    console.error('[BuilderPage] Error fetching site:', siteError)
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
    console.error('[BuilderPage] Error fetching membership:', membershipError)
  }

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isCreator = site.creator_id === user.id
  const isAssignedAgent = site.assigned_agent_id === user.id

  if (!isOwnerOrAdmin && !isCreator && !isAssignedAgent) {
    console.log('[BuilderPage] User does not have permission:', {
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

  return <BuilderClient site={site} />
}




