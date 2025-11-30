'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { getInvitationByToken, acceptInvitation } from '@/app/(app)/settings/actions'
import type { Invitation } from '@/types/database'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [token, setToken] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      } else {
        setInvitation(result.invitation)
        setWorkspaceName(result.workspace.name)
      }
      setLoading(false)
    }

    loadInvitation()
  }, [token])

  // Auto-accept if user is logged in
  useEffect(() => {
    async function autoAccept() {
      if (!user || !invitation || accepted || accepting || authLoading) return
      
      setAccepting(true)
      const result = await acceptInvitation(invitation.token, user.id)
      
      if ('error' in result) {
        setError(result.error)
        setAccepting(false)
      } else {
        setAccepted(true)
        // Redirect to overview after a short delay
        setTimeout(() => {
          router.push('/overview')
        }, 2000)
      }
    }

    autoAccept()
  }, [user, invitation, accepted, accepting, authLoading, router])

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

  // Show error state
  if (error) {
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
              <p>Sign in or create an account to accept this invitation.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/login?redirect=/invite/${token}`}>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/signup?redirect=/invite/${token}`}>
                  Create Account
                </Link>
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Invitation sent to {invitation.email}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}

