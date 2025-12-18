'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PricingDialog } from './pricing-dialog'
import { useAppData } from '@/contexts/app-context'

interface WorkspaceLockBannerProps {
  workspaceId: string
}

export function WorkspaceLockBanner({ workspaceId }: WorkspaceLockBannerProps) {
  const { currentWorkspace } = useAppData()
  
  if (!currentWorkspace) return null
  
  const isLocked = currentWorkspace.subscription_status === 'unpaid' || 
                   currentWorkspace.subscription_status === 'canceled' ||
                   (currentWorkspace.seats_used > currentWorkspace.seats_limit)
  
  if (!isLocked) return null
  
  const isOverSeatLimit = currentWorkspace.seats_used > currentWorkspace.seats_limit
  
  return (
    <Alert variant="destructive" className="m-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Workspace Locked</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {isOverSeatLimit
            ? `Your current plan allows ${currentWorkspace.seats_limit} user. Only the owner can access the workspace. To invite more users again, upgrade to Agency.`
            : 'Your subscription has expired. Please choose a plan to continue.'}
        </span>
        <PricingDialog
          currentPlan={currentWorkspace.plan}
          stripeCustomerId={currentWorkspace.stripe_customer_id}
          workspaceId={workspaceId}
        >
          <Button size="sm">Choose Plan</Button>
        </PricingDialog>
      </AlertDescription>
    </Alert>
  )
}










