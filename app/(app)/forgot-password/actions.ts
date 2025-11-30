'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Reset password for email (server action)
 * 
 * Email Enumeration Prevention: Always returns success to prevent
 * attackers from discovering which emails are registered.
 * Supabase will silently not send email if user doesn't exist or uses OAuth.
 */
export async function resetPasswordAction(email: string) {
  const supabase = await createClient()
  
  // Get the app subdomain URL for redirect
  const getAppOrigin = () => {
    // In production, use app subdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ottie.com'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const port = process.env.NODE_ENV === 'production' ? '' : ':3000'
    
    if (process.env.NODE_ENV === 'production') {
      return `${protocol}://app.${rootDomain}`
    }
    return `${protocol}://app.localhost${port}`
  }
  
  const appOrigin = getAppOrigin()
  const redirectTo = `${appOrigin}/reset-password`
  
  // Always attempt to send reset email
  // Supabase will silently not send email if:
  // - User doesn't exist
  // - User only has OAuth provider (no password)
  // This prevents email enumeration attacks
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  
  // ALWAYS return success - regardless of whether email was sent
  // This prevents attackers from discovering which emails are registered
  return {
    success: true,
  }
}

