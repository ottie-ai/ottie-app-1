import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'
import { loadSettingsData } from '@/lib/supabase/queries'
import type { Profile, Workspace, Membership, Invitation } from '@/types/database'

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings, profile, workspace, and preferences.",
}

/**
 * Settings Page - Server Component
 * 
 * This page uses server-side data fetching for optimal performance:
 * - All data is fetched in parallel (profile, workspace, members, invitations)
 * - Next.js automatically caches server requests (reduces DB calls)
 * - No client-side waterfall (data is ready immediately)
 * - Eliminates duplicate DB calls (from 7+ to 4 parallel calls)
 * - Better SEO and performance
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Get user from server session (automatically cached by Next.js)
  // Note: AuthGuard in layout.tsx handles redirects for unauthenticated users
  // We always render here - if user is not available, we'll use fallback values
  // and client-side auth will handle the redirect via AuthGuard
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Load all settings data in parallel (profile, workspace, members, invitations)
  // This replaces multiple sequential client-side fetches
  let settingsData = {
    profile: null as Profile | null,
    workspace: null as Workspace | null,
    membership: null as Membership | null,
    members: [] as Array<{ membership: Membership; profile: Profile }>,
    invitations: [] as Invitation[],
  }

  if (user && !authError) {
    settingsData = await loadSettingsData(user.id)
  }

  // Prepare initial data for client component
  // Use fallback values if server-side session is not available
  // AuthGuard will handle redirect if user is not authenticated
  const initialProfile = settingsData.profile
  const workspace = settingsData.workspace
  const membership = settingsData.membership
  
  // Extract user metadata for fallback
  // Only pass serializable data to client component
  // IMPORTANT: avatarUrl should ONLY come from profile.avatar_url, never from user_metadata
  // This prevents Google avatar from appearing after profile updates
  const userMetadata = {
    fullName: user?.user_metadata?.full_name || '',
    avatarUrl: settingsData.profile?.avatar_url || '', // ONLY use profile avatar, never Google avatar
    email: user?.email || '',
    isGoogleSignIn: user?.app_metadata?.provider === 'google' || 
                    user?.identities?.some((identity: any) => identity.provider === 'google') || 
                    false,
  }

  // Create a serializable user object (only pass what's needed)
  // Use fallback if user is not available from server
  const serializableUser = user ? {
    id: user.id,
    email: user.email || '',
    user_metadata: {
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      picture: user.user_metadata?.picture || null,
    },
    app_metadata: {
      provider: user.app_metadata?.provider || null,
    },
    identities: user.identities?.map((identity: any) => ({
      provider: identity.provider,
    })) || [],
  } : {
    id: '',
    email: '',
    user_metadata: {
      full_name: null,
      avatar_url: null,
      picture: null,
    },
    app_metadata: {
      provider: null,
    },
    identities: [],
  }

  return (
    <SettingsClient 
      user={serializableUser}
      initialProfile={initialProfile}
      userMetadata={userMetadata}
      initialWorkspace={workspace}
      initialMembership={membership}
      initialMembers={settingsData.members}
      initialInvitations={settingsData.invitations}
    />
  )
}
