import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings, profile, workspace, and preferences.",
}

/**
 * Settings Page - Server Component (Optimized)
 * 
 * OPTIMIZATION: No server-side data fetching - all data comes from:
 * - App context (profile, workspace, membership) - already loaded in layout
 * - React Query hooks (team data) - loaded client-side with loading states
 * 
 * This eliminates duplicate DB calls and makes navigation instant.
 * The page renders immediately with loading states for async data.
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Get user from server session (only for user metadata)
  // App data (profile, workspace) is already loaded in layout via AppProvider
  const { data: { user } } = await supabase.auth.getUser()
  
  // Extract user metadata for fallback
  const userMetadata = {
    fullName: user?.user_metadata?.full_name || '',
    avatarUrl: '', // Will be set from profile in client component
    email: user?.email || '',
    isGoogleSignIn: user?.app_metadata?.provider === 'google' || 
                    user?.identities?.some((identity: any) => identity.provider === 'google') || 
                    false,
  }

  // Create a serializable user object (only pass what's needed)
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
      userMetadata={userMetadata}
    />
  )
}
