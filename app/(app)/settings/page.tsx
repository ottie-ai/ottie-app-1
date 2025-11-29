import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'
import type { Profile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

/**
 * Settings Page - Server Component
 * 
 * This page uses server-side data fetching for optimal performance:
 * - Data is fetched on the server before rendering (faster initial load)
 * - Next.js automatically caches server requests (reduces DB calls)
 * - No client-side waterfall (data is ready immediately)
 * - Better SEO and performance
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Get user from server session (automatically cached by Next.js)
  // Note: AuthGuard in layout.tsx handles redirects for unauthenticated users
  // We always render here - if user is not available, we'll use fallback values
  // and client-side auth will handle the redirect via AuthGuard
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Fetch profile data if user exists (automatically cached by Next.js React Cache)
  // This reduces DB calls significantly as Next.js deduplicates requests
  let profile: Profile | null = null
  if (user && !authError) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    profile = profileData || null
  }

  // Prepare initial data for client component
  // Use fallback values if server-side session is not available
  // AuthGuard will handle redirect if user is not authenticated
  const initialProfile: Profile | null = profile || null
  
  // Extract user metadata for fallback
  // Only pass serializable data to client component
  const userMetadata = {
    fullName: user?.user_metadata?.full_name || '',
    avatarUrl: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '',
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
      user={serializableUser as User}
      initialProfile={initialProfile}
      userMetadata={userMetadata}
    />
  )
}
