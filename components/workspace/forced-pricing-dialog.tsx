'use client'

import { useEffect, useState } from 'react'
import { PricingDialog } from './pricing-dialog'
import { useAppData } from '@/contexts/app-context'

interface ForcedPricingDialogProps {
  workspaceId: string
}

export function ForcedPricingDialog({ workspaceId }: ForcedPricingDialogProps) {
  const { currentWorkspace } = useAppData()
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    if (!currentWorkspace) return
    
    const isLocked = currentWorkspace.subscription_status === 'unpaid' || 
                     currentWorkspace.subscription_status === 'canceled' ||
                     (currentWorkspace.seats_used > currentWorkspace.seats_limit)
    
    if (isLocked) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [currentWorkspace])
  
  if (!currentWorkspace) return null
  
  const isLocked = currentWorkspace.subscription_status === 'unpaid' || 
                   currentWorkspace.subscription_status === 'canceled' ||
                   (currentWorkspace.seats_used > currentWorkspace.seats_limit)
  
  if (!isLocked) return null
  
  return (
    <PricingDialog
      currentPlan={currentWorkspace.plan}
      stripeCustomerId={currentWorkspace.stripe_customer_id}
      workspaceId={workspaceId}
      forceOpen={isOpen}
      onOpenChange={(open) => {
        // Prevent closing if workspace is still locked
        if (!open && isLocked) {
          return // Don't allow closing
        }
        setIsOpen(open)
      }}
    >
      {/* Hidden trigger - dialog is controlled programmatically */}
      <div style={{ display: 'none' }} />
    </PricingDialog>
  )
}









