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
  const next = requestUrl.searchParams.get('next') ?? '/overview'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the requested page or overview (stays on app subdomain)
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

