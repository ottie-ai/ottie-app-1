'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, Users, ArrowRight, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { getInvitationByToken, acceptInvitation } from '@/app/(app)/settings/actions'
import { signOut } from '@/lib/supabase/auth'
import { toast } from 'sonner'
import type { Invitation } from '@/types/database'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [token, setToken] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<(Invitation & { emailHint?: string }) | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'expired' | 'used' | 'invalid' | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  // Unwrap params promise
  useEffect(() => {
    params.then(({ token: t }) => setToken(t))
  }, [params])

  // Load invitation details
  useEffect(() => {
    async function loadInvitation() {
      if (!token) return
      
      setLoading(true)
      const result = await getInvitationByToken(token)
      
      if ('error' in result) {
        setError(result.error)
        setErrorType(result.errorType || null)
      } else {
        setInvitation(result.invitation)
        setWorkspaceName(result.workspace.name)
      }
      setLoading(false)
    }

    loadInvitation()
  }, [token])

  // Check email match and handle auto-accept or sign out
  useEffect(() => {
    async function checkAndAccept() {
      console.log('DEBUG checkAndAccept:', { 
        user: user?.email, 
        invitation: invitation?.email, 
        accepted, 
        accepting, 
        authLoading 
      })
      
      if (!user || !invitation || accepted || accepting || authLoading) {
        console.log('DEBUG: Skipping - conditions not met')
        return
      }
      
      // Check if user email matches invitation email
      const userEmail = user.email?.toLowerCase().trim()
      const inviteEmail = invitation.email.toLowerCase().trim()
      
      console.log('DEBUG: Comparing emails:', { userEmail, inviteEmail })
      
      if (userEmail !== inviteEmail) {
        // Email doesn't match - sign out and redirect to signup (not sign in)
        if (!token) {
          setError('Invalid invitation token')
          setLoading(false)
          return
        }
        
        setLoading(true)
        try {
          await signOut()
          // Store invitation token in sessionStorage for later use
          sessionStorage.setItem('pending_invite_token', token)
          sessionStorage.setItem('pending_invite_email', invitation.email)
          // Redirect to signup with email pre-filled and invite token
          router.push(`/signup?email=${encodeURIComponent(invitation.email)}&redirect=/invite/${token}`)
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
          setError('Please sign out and create an account with the invited email address.')
          setLoading(false)
        }
        return
      }
      
      // Email matches - proceed with auto-accept
      console.log('DEBUG: Emails match, proceeding with auto-accept')
      setAccepting(true)
      
      // Get workspace name for toast
      const inviteResult = await getInvitationByToken(invitation.token)
      const workspaceName = 'error' in inviteResult ? 'the workspace' : inviteResult.workspace.name
      
      console.log('DEBUG: Calling acceptInvitation with:', { token: invitation.token, userId: user.id })
      const result = await acceptInvitation(invitation.token, user.id)
      console.log('DEBUG: acceptInvitation result:', result)
      
      if ('error' in result) {
        setError(result.error)
        setAccepting(false)
        toast.error(result.error)
        console.log('DEBUG: Accept failed:', result.error)
      } else {
        setAccepted(true)
        toast.success(`You've successfully joined ${workspaceName}!`)
        // Fix #9: Clear sessionStorage after successful acceptance
        sessionStorage.removeItem('pending_invite_token')
        sessionStorage.removeItem('pending_invite_email')
        sessionStorage.removeItem('invite_expected_email')
        // Redirect to overview after a short delay
        setTimeout(() => {
          router.push('/overview')
        }, 2000)
      }
    }

    checkAndAccept()
  }, [user, invitation, accepted, accepting, authLoading, router, token])
  
  // Store invitation info in sessionStorage when page loads (for login/signup flow)
  useEffect(() => {
    if (invitation && token) {
      sessionStorage.setItem('pending_invite_token', token)
      sessionStorage.setItem('pending_invite_email', invitation.email)
    }
  }, [invitation, token])
  
  // Handle OAuth return - check if email matches invitation
  useEffect(() => {
    async function handleOAuthReturn() {
      if (!user || !invitation || authLoading) return
      
      // Check if this is a return from OAuth (user just signed up)
      const expectedEmail = sessionStorage.getItem('invite_expected_email')
      if (expectedEmail) {
        sessionStorage.removeItem('invite_expected_email')
        sessionStorage.removeItem('invite_redirect')
        
        // Validate email matches
        const userEmail = user.email?.toLowerCase().trim()
        if (userEmail !== expectedEmail.toLowerCase().trim()) {
          setError(`This invitation was sent to ${expectedEmail}. Please sign in with that email address.`)
          try {
            await signOut()
            router.push(`/signup?email=${encodeURIComponent(invitation.email)}&redirect=/invite/${token}`)
          } catch (signOutError) {
            console.error('Error signing out:', signOutError)
          }
          return
        }
      }
    }
    
    handleOAuthReturn()
  }, [user, invitation, authLoading, router, token])

  // Show loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Fix #5: Show error state with better UX for different error types
  if (error) {
    // Expired invitation - show option to request new one
    if (errorType === 'expired') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Invitation Expired</CardTitle>
              <CardDescription>
                This invitation link has expired. Please contact the workspace administrator to send you a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button variant="outline" asChild>
                <Link href="/overview">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // Already used invitation
    if (errorType === 'used') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Invitation Already Used</CardTitle>
              <CardDescription>
                This invitation has already been accepted. If you're the invited user, you should already have access to the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link href="/overview">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // Generic error
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/overview">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to {workspaceName}!</CardTitle>
            <CardDescription>
              You've successfully joined the workspace as {invitation?.role}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show accepting state
  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <CardTitle>Joining {workspaceName}</CardTitle>
            <CardDescription>Please wait while we add you to the workspace...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show invitation details for non-logged in users
  if (!user && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join <span className="font-medium text-foreground">{workspaceName}</span> as {invitation.role === 'admin' ? 'an' : 'a'}{' '}
              <Badge variant="secondary" className="capitalize">{invitation.role}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Create an account or sign in to accept this invitation.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/signup?email=${encodeURIComponent(invitation.email)}&redirect=/invite/${token}`}>
                  Create Account
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/login?redirect=/invite/${token}`}>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            {/* Fix #3: Show masked email for privacy */}
            <p className="text-xs text-center text-muted-foreground">
              Invitation sent to {invitation.emailHint || invitation.email}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}

