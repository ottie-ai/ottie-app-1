import { createClient } from '@/lib/supabase/server'
import { loadAppData } from '@/lib/data/app-data'
import { AppLayoutClient } from './app-layout-client'
import type { Profile, Workspace, Membership } from '@/types/database'

/**
 * Server component wrapper that loads app data and passes it to client layout
 * This ensures workspace name and plan are available immediately on page load
 */
export async function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load app data server-side for immediate availability
  let initialAppData: {
    profile: Profile | null
    currentWorkspace: Workspace | null
    currentMembership: Membership | null
    allWorkspaces: Array<{ workspace: Workspace; role: string }>
  } = {
    profile: null,
    currentWorkspace: null,
    currentMembership: null,
    allWorkspaces: [],
  }

  if (user?.id) {
    try {
      initialAppData = await loadAppData(user.id)
    } catch (error) {
      console.error('Error loading app data:', error)
      // Continue with empty data - client will refetch
    }
  }

  return (
    <AppLayoutClient initialAppData={initialAppData}>
      {children}
    </AppLayoutClient>
  )
}

