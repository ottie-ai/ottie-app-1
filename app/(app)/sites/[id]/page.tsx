import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteDetailClient } from './site-detail-client'

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

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

  return <SiteDetailClient site={site} members={membersData} />
}

