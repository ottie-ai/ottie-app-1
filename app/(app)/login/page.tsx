'use client'

import { useState, useEffect, Suspense } from 'react'
import { PageTitle } from '@/components/page-title'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn, signInWithOAuth, normalizeAuthError } from '@/lib/supabase/auth'
import { useAuth } from '@/hooks/use-auth'
import { acceptInvitation, getInvitationByToken } from '@/app/(app)/settings/actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirect') || '/overview'

  // Check for pending invitation and auto-accept after login
  useEffect(() => {
    async function checkPendingInvitation() {
      if (!user || authLoading) return
      
      // Fix #4: Check localStorage for pending invite after email confirmation
      const pendingInviteAfterConfirm = localStorage.getItem('pending_invite_after_confirm')
      if (pendingInviteAfterConfirm) {
        try {
          const { token, email } = JSON.parse(pendingInviteAfterConfirm)
          const userEmail = user.email?.toLowerCase().trim()
          
          if (userEmail === email.toLowerCase().trim()) {
            // Email matches - accept invitation
            const inviteResult = await getInvitationByToken(token)
            if (!('error' in inviteResult)) {
              const acceptResult = await acceptInvitation(token, user.id)
              if (!('error' in acceptResult)) {
                toast.success(`You've successfully joined ${inviteResult.workspace.name}!`)
              } else {
                toast.error(acceptResult.error)
              }
            }
          }
          // Clear localStorage regardless of result
          localStorage.removeItem('pending_invite_after_confirm')
        } catch (e) {
          console.error('Error processing pending invite after confirm:', e)
          localStorage.removeItem('pending_invite_after_confirm')
        }
      }
      
      const tokenHash = sessionStorage.getItem('pending_invite_token_hash')
      const expectedEmail = sessionStorage.getItem('pending_invite_email')
      const inviteExpectedEmail = sessionStorage.getItem('invite_expected_email')
      
      // Use invite_expected_email if available (from OAuth), otherwise use pending_invite_email
      const emailToCheck = inviteExpectedEmail || expectedEmail
      
      // Extract full token from redirect URL if it's an invite flow
      let pendingToken: string | null = null
      if (redirectTo.includes('/invite/')) {
        const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/)
        if (inviteTokenMatch) {
          pendingToken = inviteTokenMatch[1]
          // Verify token hash matches (security check)
          if (tokenHash && btoa(pendingToken.slice(0, 8)) !== tokenHash) {
            // Hash mismatch - clear and skip
            sessionStorage.removeItem('pending_invite_token_hash')
            sessionStorage.removeItem('pending_invite_email')
            sessionStorage.removeItem('invite_expected_email')
            return
          }
        }
      }
      
      if (pendingToken && emailToCheck) {
        // Validate email matches
        const userEmail = user.email?.toLowerCase().trim()
        if (userEmail !== emailToCheck.toLowerCase().trim()) {
          // Email doesn't match - sign out, clear sessionStorage and show error
          const { signOut } = await import('@/lib/supabase/auth')
          await signOut()
          sessionStorage.removeItem('pending_invite_token_hash')
          sessionStorage.removeItem('pending_invite_email')
          sessionStorage.removeItem('invite_expected_email')
          toast.error(`This invitation was sent to ${emailToCheck}. Please sign in with that email address.`)
          // Redirect back to invite page
          if (redirectTo.includes('/invite/')) {
            router.push(redirectTo)
          }
          return
        }
        
        // Email matches - accept invitation
        try {
          const inviteResult = await getInvitationByToken(pendingToken)
          if ('error' in inviteResult) {
            toast.error(inviteResult.error)
            sessionStorage.removeItem('pending_invite_token_hash')
            sessionStorage.removeItem('pending_invite_email')
            sessionStorage.removeItem('invite_expected_email')
            return
          }
          
          const acceptResult = await acceptInvitation(pendingToken, user.id)
          if ('error' in acceptResult) {
            toast.error(acceptResult.error)
          } else {
            toast.success(`You've successfully joined ${inviteResult.workspace.name}!`)
            // Set the workspace as current workspace in localStorage
            if (typeof window !== 'undefined' && 'workspaceId' in acceptResult) {
              localStorage.setItem('current_workspace_id', acceptResult.workspaceId)
            }
            // If redirectTo is invite page, redirect to overview instead
            if (redirectTo.includes('/invite/')) {
              router.replace('/overview')
              router.refresh()
              return
            }
          }
          
          // Clear sessionStorage
          sessionStorage.removeItem('pending_invite_token_hash')
          sessionStorage.removeItem('pending_invite_email')
          sessionStorage.removeItem('invite_expected_email')
        } catch (error) {
          console.error('Error accepting invitation:', error)
          toast.error('Failed to accept invitation. Please try again.')
        }
      }
      
      // Redirect after handling invitation
      if (redirectTo && !redirectTo.includes('/invite/')) {
      console.log('[Login Page] User authenticated, redirecting to:', redirectTo)
      router.replace(redirectTo)
      } else if (!redirectTo || redirectTo.includes('/invite/')) {
        // Default to overview if no redirect or if redirect is invite page
        router.replace('/overview')
        router.refresh()
      }
    }
    
    checkPendingInvitation()
  }, [user, authLoading, router, redirectTo])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Check if this is an invite flow and validate email
    const tokenHash = sessionStorage.getItem('pending_invite_token_hash')
    const expectedEmail = sessionStorage.getItem('pending_invite_email')
    
    if (tokenHash && expectedEmail) {
      // Validate email matches invitation before signing in
      if (email.toLowerCase().trim() !== expectedEmail.toLowerCase().trim()) {
        setError(`This invitation was sent to ${expectedEmail}. Please sign in with that email address.`)
        setIsLoading(false)
        return
      }
    }

    console.log('[Login] Attempting sign in with:', email)
    const { data, error } = await signIn({ email, password })
    console.log('[Login] Sign in result:', { data, error })

    if (error) {
      console.error('[Login] Error:', error.message)
      // Fix #7: Use generic error message to prevent email enumeration
      setError(normalizeAuthError(error) || 'An error occurred during sign in')
      setIsLoading(false)
    } else if (data?.session) {
      console.log('[Login] Session created:', data.session.user.email)
      console.log('[Login] Access token exists:', !!data.session.access_token)
      
      // Wait for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('[Login] Redirecting to:', redirectTo)
      // Force a full page reload
      window.location.href = redirectTo
    } else {
      console.log('[Login] No session returned - might need email confirmation')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    // Check if this is an invite flow - email will be validated after OAuth return
    const tokenHash = sessionStorage.getItem('pending_invite_token_hash')
    const expectedEmail = sessionStorage.getItem('pending_invite_email')
    
    if (tokenHash && expectedEmail) {
      // Store expected email for validation after OAuth
      sessionStorage.setItem('invite_expected_email', expectedEmail)
    }

    // Fix #6: Pass email hint to pre-select correct Google account
    const { error } = await signInWithOAuth('google', redirectTo, expectedEmail || undefined)

    if (error) {
      // Fix #7: Use generic error message to prevent email enumeration
      setError(normalizeAuthError(error) || 'An error occurred during sign in')
      setIsLoading(false)
    }
    // OAuth redirect will happen automatically
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Don't render login form if already authenticated (redirect will happen)
  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PageTitle 
        title="Login" 
        description="Sign in to your Ottie account to manage your real estate sites."
      />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
