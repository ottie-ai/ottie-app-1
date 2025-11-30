'use client'

import { useState, useEffect, Suspense } from 'react'
import { PageTitle } from '@/components/page-title'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp, signInWithOAuth } from '@/lib/supabase/auth'
import { useAuth } from '@/hooks/use-auth'
import { acceptInvitation, getInvitationByToken } from '@/app/(app)/settings/actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/overview'
  const prefillEmail = searchParams.get('email')
  
  // Pre-fill email if provided in query params (from invite flow)
  useEffect(() => {
    if (prefillEmail && !email) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail, email])

  // Redirect if already authenticated (we're already on app subdomain)
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo)
    }
  }, [user, authLoading, router, redirectTo])

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Check if this is an invite flow and validate email
    const isInviteFlow = redirectTo.includes('/invite/')
    if (isInviteFlow) {
      const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/)
      if (inviteTokenMatch) {
        const inviteToken = inviteTokenMatch[1]
        const inviteResult = await getInvitationByToken(inviteToken)
        
        if ('error' in inviteResult) {
          setError(inviteResult.error)
          setIsLoading(false)
          return
        }
        
        // Validate that the email being registered matches the invitation
        if (email.toLowerCase().trim() !== inviteResult.invitation.email.toLowerCase().trim()) {
          setError(`This invitation was sent to ${inviteResult.invitation.email}. Please register with that email address.`)
          setIsLoading(false)
          return
        }
      }
    }

    const { data, error } = await signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
        },
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Fix #4: Store invitation info for after email confirmation
        if (isInviteFlow) {
          const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/)
          if (inviteTokenMatch) {
            // Use localStorage (not sessionStorage) so it persists after browser close
            localStorage.setItem('pending_invite_after_confirm', JSON.stringify({
              token: inviteTokenMatch[1],
              email: email.toLowerCase().trim(),
            }))
          }
        }
        setSuccess(true)
        setIsLoading(false)
      } else {
        // Auto sign in after registration
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // If this is an invite flow, accept the invitation
        if (isInviteFlow && data.user) {
          const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/)
          if (inviteTokenMatch) {
            const inviteToken = inviteTokenMatch[1]
            
            // Get invitation details for workspace name
            const inviteResult = await getInvitationByToken(inviteToken)
            if ('error' in inviteResult) {
              setError(inviteResult.error)
              setIsLoading(false)
              return
            }
            
            const acceptResult = await acceptInvitation(inviteToken, data.user.id)
            
            if ('error' in acceptResult) {
              setError(acceptResult.error)
              setIsLoading(false)
              return
            } else {
              // Show success toast
              toast.success(`You've successfully joined ${inviteResult.workspace.name}!`)
            }
          }
        }
        
        router.push('/overview')
        router.refresh()
      }
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setError(null)

    // Check if this is an invite flow and validate email
    const isInviteFlow = redirectTo.includes('/invite/')
    if (isInviteFlow && prefillEmail) {
      // Store the expected email and token in sessionStorage for validation after OAuth
      sessionStorage.setItem('invite_expected_email', prefillEmail)
      sessionStorage.setItem('invite_redirect', redirectTo)
      
      // Extract token from redirect URL
      const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/)
      if (inviteTokenMatch) {
        sessionStorage.setItem('pending_invite_token', inviteTokenMatch[1])
        sessionStorage.setItem('pending_invite_email', prefillEmail)
      }
    }

    // Fix #6: Pass email hint to pre-select correct Google account
    const { error } = await signInWithOAuth('google', redirectTo, prefillEmail || undefined)

    if (error) {
      setError(error.message)
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

  // Don't render register form if already authenticated (redirect will happen)
  if (user) {
    return null
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We've sent you a confirmation link to verify your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Please check your inbox and click the confirmation link to complete your registration.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PageTitle 
        title="Sign Up" 
        description="Create your Ottie account and start building beautiful real estate client portals."
      />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
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

          {/* Email Sign Up Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (Optional)</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
