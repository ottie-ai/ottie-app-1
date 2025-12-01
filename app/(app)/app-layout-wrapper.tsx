import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { loadAppData } from '@/lib/data/app-data'
import { AppLayoutClient } from './app-layout-client'
import type { Profile, Workspace, Membership } from '@/types/database'

/**
 * Cached function to load app data per user
 * React cache() ensures the same user's data is only fetched once per request
 * This prevents duplicate fetches when layout re-renders during navigation
 */
const getCachedAppData = cache(async (userId: string) => {
  try {
    return await loadAppData(userId)
  } catch (error) {
    console.error('Error loading app data:', error)
    return {
      profile: null,
      currentWorkspace: null,
      currentMembership: null,
      allWorkspaces: [],
    }
  }
})

/**
 * Server component wrapper that loads app data and passes it to client layout
 * 
 * OPTIMIZATION: Uses React cache() to prevent duplicate fetches during navigation
 * - Data is fetched once per request, even if layout re-renders
 * - React Query cache on client-side prevents refetching if data is fresh
 * - This ensures instant navigation between pages
 */
export async function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load app data server-side (cached per request)
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
    initialAppData = await getCachedAppData(user.id)
  }

  return (
    <AppLayoutClient initialAppData={initialAppData}>
      {children}
    </AppLayoutClient>
  )
}

