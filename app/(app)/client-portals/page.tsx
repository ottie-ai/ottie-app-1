'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTitle } from '@/components/page-title'
import { Check } from 'lucide-react'
import { LottieViewQuiltIcon } from '@/components/ui/lottie-view-quilt-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { useAppData } from '@/contexts/app-context'
import { requestClientPortalsEarlyAccess } from './actions'
import { toast } from 'sonner'

export default function ClientPortalsPage() {
  const { user } = useAuth()
  const { profile, refreshProfile } = useAppData()
  const [isRequested, setIsRequested] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if user already requested early access
  useEffect(() => {
    if (profile?.preferences?.clientPortalsEarlyAccess === true) {
      setIsRequested(true)
    }
  }, [profile?.preferences])

  const handleGetEarlyAccess = async () => {
    if (!user?.id) {
      toast.error('Please log in to request early access')
      return
    }

    if (isRequested) {
      return // Already requested, don't allow duplicate requests
    }

    setIsLoading(true)
    const result = await requestClientPortalsEarlyAccess(user.id)
    setIsLoading(false)

    if ('error' in result) {
      toast.error(result.error)
    } else {
      setIsRequested(true)
      // Refresh profile to get updated preferences
      await refreshProfile()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageTitle 
        title="Client Portals" 
        description="Manage client portals and team collaboration."
      />
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Client Portals</h1>
          <Badge className="gradient-ottie hover:opacity-90 text-white border-0">Coming Soon</Badge>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="size-24 rounded-full border-2 border-border flex items-center justify-center">
              <LottieViewQuiltIcon size={48} invertTheme={false} autoLoop />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Client Portals
            </h2>
            <p className="text-xl text-muted-foreground">
              Planned for <span className="font-semibold text-foreground">Q2 2026</span>
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create polished client portals for every deal. Let clients view documents, 
              message you, and see what's happening in one secure, branded space.
            </p>
          </div>

          {/* Early Access Form */}
          <AnimatePresence mode="wait">
            {isRequested ? (
              <motion.div
                key="alert"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
              >
                <Alert>
                  <Check className="size-4" />
                  <AlertDescription>
                    Request recorded! We'll contact you when the beta is ready.
                  </AlertDescription>
                </Alert>
              </motion.div>
            ) : (
              <motion.div
                key="card"
                initial={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
              >
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <CardTitle className="text-base mb-1">Get Early Access</CardTitle>
                        <CardDescription>
                          Be the first to try Client Portals before launch.
                        </CardDescription>
                      </div>
                      <Button onClick={handleGetEarlyAccess} disabled={isLoading || isRequested}>
                        {isLoading ? 'Requesting...' : 'Request Early Access'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

