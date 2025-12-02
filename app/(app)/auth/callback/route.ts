import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Route for App Subdomain
 * 
 * This route handles the OAuth callback from providers (Google, etc.)
 * and exchanges the code for a session on the app subdomain.
 * 
 * URL: app.localhost:3000/auth/callback (dev) or app.ottie.com/auth/callback (prod)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const error = requestUrl.searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin))
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
  }

  // Validate redirect URL - only allow internal paths
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin))
}

