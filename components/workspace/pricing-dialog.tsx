'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { transformPlansToTiers, type PricingTier } from '@/lib/pricing-data'
import { useAppData } from '@/contexts/app-context'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { useSites } from '@/hooks/use-sites'
import { useAuth } from '@/hooks/use-auth'
import { handleDowngradeWorkspacePlan } from '@/app/(app)/settings/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PricingDialogProps {
  children: React.ReactNode
  currentPlan?: string | null // Current plan ID (e.g., 'free', 'starter', 'growth', 'agency', 'enterprise')
  stripeCustomerId?: string | null // Stripe customer ID - if exists, user has already used trial
  defaultSelectedTier?: string | null // Optional: override default selected tier (e.g., 'agency' for team upgrade)
  workspaceId?: string | null // Workspace ID for checking members and sites
  forceOpen?: boolean // If true, dialog is forced open and cannot be closed (for locked workspaces)
  onOpenChange?: (open: boolean) => void // Callback when dialog open state changes
}

export function PricingDialog({ children, currentPlan, stripeCustomerId, defaultSelectedTier, workspaceId, forceOpen, onOpenChange }: PricingDialogProps) {
  // Get plans from database via context
  const { plans, isMultiUserPlan, getMaxUsers, getMaxSites, hasPlanFeature } = useAppData()
  
  // Get current user to identify owner
  const { user } = useAuth()
  const router = useRouter()
  
  // Get workspace members and sites for downgrade warnings
  const { members, loading: membersLoading } = useWorkspaceMembers(workspaceId ?? null)
  const { sites } = useSites(workspaceId ?? null)
  
  // State for dialog open/close
  const [open, setOpen] = useState(forceOpen || false)
  const [isDowngrading, setIsDowngrading] = useState(false)
  
  // Update open state when forceOpen changes
  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpen(forceOpen)
    }
  }, [forceOpen])
  
  // Handle open change
  const handleOpenChange = (newOpen: boolean) => {
    // If forced open, prevent closing
    if (forceOpen && !newOpen) {
      return // Don't allow closing when forced open
    }
    
    setOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }
  
  // Debug: Log members and sites for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('PricingDialog - members:', members.length, 'loading:', membersLoading, 'sites:', sites.length, 'published:', sites.filter(s => s.status === 'published').length)
      console.log('PricingDialog - user:', user?.id, 'workspaceId:', workspaceId)
      console.log('PricingDialog - members data:', members.map(m => ({ 
        userId: m.membership.user_id, 
        role: m.membership.role,
        email: m.profile.email 
      })))
    }
  }, [members, membersLoading, sites, user?.id, workspaceId])
  
  // State for downgrade confirmation dialog
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false)
  const [selectedDowngradeTier, setSelectedDowngradeTier] = useState<string | null>(null)
  
  // Transform database plans to pricing tiers (with prices from database in cents -> dollars)
  const pricingTiers = useMemo(() => transformPlansToTiers(plans), [plans])
  
  // Normalize current plan to match tier IDs
  // Pricing tiers have: 'free', 'starter', 'growth', 'agency', 'enterprise'
  const normalizePlanForPricing = (plan: string | null | undefined): string => {
    if (!plan || plan === '') return 'free'
    // Only return if it's a valid tier ID
    if (['free', 'starter', 'growth', 'agency', 'enterprise'].includes(plan)) {
      return plan
    }
    return 'free' // Default fallback
  }
  
  const normalizedCurrentPlan = normalizePlanForPricing(currentPlan)
  
  // Debug log (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('PricingDialog - currentPlan:', currentPlan, 'normalized:', normalizedCurrentPlan)
  }
  
  // Set initial selected tier to the next available plan after current, or 'growth' as default
  const getInitialSelectedTier = () => {
    if (normalizedCurrentPlan === 'free') return 'starter'
    if (normalizedCurrentPlan === 'starter') return 'growth'
    if (normalizedCurrentPlan === 'growth') return 'agency'
    if (normalizedCurrentPlan === 'agency') return 'enterprise'
    if (normalizedCurrentPlan === 'enterprise') return 'enterprise' // Already on highest tier
    return 'growth' // Default fallback
  }
  
  const [selectedTier, setSelectedTier] = useState(() => {
    // If defaultSelectedTier is provided, use it
    if (defaultSelectedTier && ['free', 'starter', 'growth', 'agency', 'enterprise'].includes(defaultSelectedTier)) {
      return defaultSelectedTier
    }
    // Otherwise use default logic
    if (normalizedCurrentPlan === 'free') return 'starter'
    if (normalizedCurrentPlan === 'starter') return 'growth'
    if (normalizedCurrentPlan === 'growth') return 'agency'
    if (normalizedCurrentPlan === 'agency') return 'enterprise'
    if (normalizedCurrentPlan === 'enterprise') return 'enterprise'
    return 'growth'
  })
  const [isAnnual, setIsAnnual] = useState(true)
  
  // Update selected tier when current plan or defaultSelectedTier changes
  useEffect(() => {
    // If defaultSelectedTier is provided, use it
    if (defaultSelectedTier && ['free', 'starter', 'growth', 'agency', 'enterprise'].includes(defaultSelectedTier)) {
      setSelectedTier(defaultSelectedTier)
      return
    }
    // Otherwise use default logic
    let nextTier = 'growth'
    if (normalizedCurrentPlan === 'free') nextTier = 'starter'
    else if (normalizedCurrentPlan === 'starter') nextTier = 'growth'
    else if (normalizedCurrentPlan === 'growth') nextTier = 'agency'
    else if (normalizedCurrentPlan === 'agency') nextTier = 'enterprise'
    else if (normalizedCurrentPlan === 'enterprise') nextTier = 'enterprise'
    setSelectedTier(nextTier)
  }, [normalizedCurrentPlan, defaultSelectedTier])

  const getPrice = (tier: PricingTier) => {
    if (tier.monthlyPrice === 0) return '$0'
    return isAnnual ? `$${tier.annualPrice}` : `$${tier.monthlyPrice}`
  }

  const getPricePerListing = (tier: PricingTier) => {
    // Use automatically calculated price per listing from database
    const pricePerListing = isAnnual ? tier.annualPricePerListing : tier.monthlyPricePerListing
    return pricePerListing !== null ? pricePerListing.toFixed(2) : null
  }

  const getAnnualSavings = (tier: PricingTier) => {
    if (tier.monthlyPrice === 0) return null
    // Calculate savings per year: (monthly price - annual price) * 12 months
    // This is automatically calculated from database prices
    const savings = (tier.monthlyPrice - tier.annualPrice) * 12
    return Math.round(savings) // Round to whole dollars
  }

  // Get plan order for comparison (lower number = lower tier)
  const getPlanOrder = (planId: string): number => {
    const order: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'growth': 2,
      'agency': 3,
      'enterprise': 4,
    }
    return order[planId] ?? 0
  }

  // Check if tier is lower than current plan
  const isLowerTier = (tierId: string): boolean => {
    if (!normalizedCurrentPlan || normalizedCurrentPlan === 'free') return false
    return getPlanOrder(tierId) < getPlanOrder(normalizedCurrentPlan)
  }

  // Determine which plan should be highlighted based on current plan
  const getHighlightedPlan = (): string | null => {
    if (!normalizedCurrentPlan || normalizedCurrentPlan === 'enterprise') {
      return null // Enterprise or no plan - highlight nothing
    }
    
    const currentOrder = getPlanOrder(normalizedCurrentPlan)
    
    // If on free or starter (order < 2), highlight growth
    if (currentOrder < 2) {
      return 'growth'
    }
    
    // If on growth (order = 2), highlight agency
    if (currentOrder === 2) {
      return 'agency'
    }
    
    // If on agency (order = 3), highlight enterprise
    if (currentOrder === 3) {
      return 'enterprise'
    }
    
    return null
  }

  // Check if user has already used trial (has Stripe customer ID)
  const hasUsedTrial = !!stripeCustomerId
  
  const highlightedPlanId = getHighlightedPlan()
  
  // Calculate downgrade information for a target tier
  const getDowngradeInfo = (targetTierId: string) => {
    const warnings: string[] = []
    const info: string[] = []
    
    if (!workspaceId) {
      // Can't calculate warnings without workspace ID
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('getDowngradeInfo: No workspaceId')
      }
      return { warnings, info }
    }
    
    // Check if downgrading to a plan with fewer users than current member count
    // Note: max_users includes the owner, so we need to check if non-owner members exceed the limit
    const currentMaxUsers = getMaxUsers(normalizedCurrentPlan)
    const targetMaxUsers = getMaxUsers(targetTierId)
    const totalMembers = members.length
    
    // Count non-owner members (owner is always included in max_users)
    const nonOwnerMembers = members.filter(m => m.membership.user_id !== user?.id).length
    // Target plan allows (targetMaxUsers - 1) non-owner members (since owner is always included)
    const targetNonOwnerSlots = targetMaxUsers - 1
    
    // Debug logging
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('getDowngradeInfo:', {
        targetTierId,
        currentMaxUsers,
        targetMaxUsers,
        totalMembers,
        nonOwnerMembers,
        targetNonOwnerSlots,
        userId: user?.id,
        members: members.map(m => ({ id: m.membership.user_id, role: m.membership.role }))
      })
    }
    
    // Warn if we have more non-owner members than the target plan allows
    if (nonOwnerMembers > targetNonOwnerSlots) {
      const usersToLoseAccess = nonOwnerMembers - targetNonOwnerSlots
      warnings.push(
        `Other users (${usersToLoseAccess}) will lose access to the workspace.`
      )
    } else if (targetMaxUsers < currentMaxUsers) {
      // Show info if plan supports fewer users, even if current count is within limit
      info.push(
        `Team seats will be reduced from ${currentMaxUsers === 999 ? 'Unlimited' : currentMaxUsers} to ${targetMaxUsers === 999 ? 'Unlimited' : targetMaxUsers}.`
      )
    }
    
    // Check if downgrading to a plan with fewer sites
    const targetMaxSites = getMaxSites(targetTierId)
    const publishedSites = sites.filter(s => s.status === 'published')
    const totalPublishedSites = publishedSites.length
    
    // Warn ONLY if we have more published sites than the target plan limit
    if (totalPublishedSites > targetMaxSites) {
      const sitesToUnpublish = totalPublishedSites - targetMaxSites
      warnings.push(
        `Published sites above the plan limit (${sitesToUnpublish}) will be unpublished.`
      )
    }
    
    // Check if downgrading to a plan without password protection feature
    const currentHasPasswordFeature = hasPlanFeature(normalizedCurrentPlan, 'feature_password_protection')
    const targetHasPasswordFeature = hasPlanFeature(targetTierId, 'feature_password_protection')
    
    // Check if workspace has password protected sites
    const passwordProtectedSites = sites.filter(s => s.password_protected)
    const passwordProtectedCount = passwordProtectedSites.length
    
    // Warn if losing password protection feature and have password protected sites
    if (currentHasPasswordFeature && !targetHasPasswordFeature && passwordProtectedCount > 0) {
      warnings.push(
        `Password protection will be removed from ${passwordProtectedCount} site${passwordProtectedCount > 1 ? 's' : ''}. All sites will become publicly accessible.`
      )
    }
    
    return { warnings, info }
  }
  
  // Handle downgrade click
  const handleDowngradeClick = (tierId: string) => {
    const { warnings, info } = getDowngradeInfo(tierId)
    
    // Debug: Log warnings for troubleshooting
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('Downgrade info for', tierId, '- warnings:', warnings, 'info:', info)
      console.log('Current plan:', normalizedCurrentPlan, 'maxUsers:', getMaxUsers(normalizedCurrentPlan), 'maxSites:', getMaxSites(normalizedCurrentPlan))
      console.log('Target plan:', tierId, 'maxUsers:', getMaxUsers(tierId), 'maxSites:', getMaxSites(tierId))
      console.log('Members:', members.length, 'Sites:', sites.length, 'Published:', sites.filter(s => s.status === 'published').length)
      console.log('Workspace ID:', workspaceId)
    }
    
    setSelectedDowngradeTier(tierId)
    setDowngradeDialogOpen(true)
  }
  
  // Handle downgrade confirmation
  const handleDowngradeConfirm = async () => {
    if (!selectedDowngradeTier || !workspaceId || !user?.id) {
      toast.error('Missing required information')
      return
    }

    setIsDowngrading(true)
    
    try {
      const result = await handleDowngradeWorkspacePlan(
        workspaceId,
        user.id,
        selectedDowngradeTier
      )

      if ('error' in result) {
        toast.error(result.error)
      } else {
        if (result.passwordRemovedCount && result.passwordRemovedCount > 0) {
          toast.success(
            `Plan downgraded successfully. Password protection removed from ${result.passwordRemovedCount} site${result.passwordRemovedCount > 1 ? 's' : ''}.`
          )
        } else {
          toast.success('Plan downgraded successfully')
        }
        
        // Refresh app data and close dialog
        router.refresh()
    setDowngradeDialogOpen(false)
    setSelectedDowngradeTier(null)
        
        // Close pricing dialog if open
        if (onOpenChange) {
          onOpenChange(false)
        }
        setOpen(false)
      }
    } catch (error) {
      console.error('Error downgrading plan:', error)
      toast.error('An error occurred while downgrading the plan')
    } finally {
      setIsDowngrading(false)
    }
  }
  
  // Dynamic height for header sections to align separators
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)
  const headerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Dynamic height for card wrappers (including trial text) to make all cards same height
  const [cardWrapperHeight, setCardWrapperHeight] = useState<number | null>(null)
  const cardWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Update header height when plans change or window resizes
  useEffect(() => {
    const updateHeaderHeight = () => {
      // Use double requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const heights: number[] = []
          headerRefs.current.forEach((ref) => {
            if (ref) {
              // Temporarily remove fixed height to measure natural height
              const currentHeight = ref.style.height
              ref.style.height = 'auto'
              // Force reflow
              void ref.offsetHeight
              const naturalHeight = ref.offsetHeight
              ref.style.height = currentHeight
              heights.push(naturalHeight)
            }
          })
          if (heights.length > 0) {
            const maxHeight = Math.max(...heights)
            setHeaderHeight(maxHeight)
          }
        })
      })
    }
    
    // Initial calculation
    const initialTimeout = setTimeout(updateHeaderHeight, 0)
    
    // Update when isAnnual changes (with delay for DOM update)
    const changeTimeout = setTimeout(updateHeaderHeight, 100)
    
    // Use ResizeObserver for more accurate tracking
    const observers: ResizeObserver[] = []
    headerRefs.current.forEach((ref) => {
      if (ref) {
        const observer = new ResizeObserver(() => {
          updateHeaderHeight()
        })
        observer.observe(ref)
        observers.push(observer)
      }
    })
    
    window.addEventListener('resize', updateHeaderHeight)
    
    return () => {
      clearTimeout(initialTimeout)
      clearTimeout(changeTimeout)
      window.removeEventListener('resize', updateHeaderHeight)
      observers.forEach(observer => observer.disconnect())
    }
  }, [pricingTiers, isAnnual])
  
  // Update card wrapper height to make all cards same height
  useEffect(() => {
    const updateCardWrapperHeight = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const heights: number[] = []
          cardWrapperRefs.current.forEach((ref) => {
            if (ref) {
              // Temporarily remove fixed height to measure natural height
              const currentHeight = ref.style.height
              ref.style.height = 'auto'
              // Force reflow
              void ref.offsetHeight
              const naturalHeight = ref.offsetHeight
              ref.style.height = currentHeight
              heights.push(naturalHeight)
            }
          })
          if (heights.length > 0) {
            const maxHeight = Math.max(...heights)
            setCardWrapperHeight(maxHeight)
          }
        })
      })
    }
    
    // Initial calculation
    const initialTimeout = setTimeout(updateCardWrapperHeight, 0)
    
    // Update when isAnnual changes (with delay for DOM update)
    const changeTimeout = setTimeout(updateCardWrapperHeight, 100)
    
    // Use ResizeObserver for more accurate tracking
    const observers: ResizeObserver[] = []
    cardWrapperRefs.current.forEach((ref) => {
      if (ref) {
        const observer = new ResizeObserver(() => {
          updateCardWrapperHeight()
        })
        observer.observe(ref)
        observers.push(observer)
      }
    })
    
    window.addEventListener('resize', updateCardWrapperHeight)
    
    return () => {
      clearTimeout(initialTimeout)
      clearTimeout(changeTimeout)
      window.removeEventListener('resize', updateCardWrapperHeight)
      observers.forEach(observer => observer.disconnect())
    }
  }, [pricingTiers, isAnnual])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!forceOpen && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent 
        className="!max-w-[90vw] w-[90vw] max-h-[95vh] flex flex-col overflow-hidden p-0"
        onInteractOutside={(e) => {
          // Prevent closing when forced open
          if (forceOpen) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing when forced open
          if (forceOpen) {
            e.preventDefault()
          }
        }}
      >
        <div className="px-6 pt-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle>Upgrade your plan</DialogTitle>
            <DialogDescription>
              Choose the plan that best fits your needs.{!hasUsedTrial && ' All paid plans include a 14-day free trial.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Mobile Carousel */}
        <div className="md:hidden flex-1 overflow-y-auto py-4">
          <Carousel className="w-full px-2" opts={{ startIndex: 2, align: 'center' }}>
            <CarouselContent className="-ml-4">
              {pricingTiers.map((tier) => {
                const savings = isAnnual ? getAnnualSavings(tier) : null
                const pricePerListing = getPricePerListing(tier)
                const isCurrentPlan = tier.id === normalizedCurrentPlan
                const isDowngrade = isLowerTier(tier.id)
                
                // Determine if this tier should be highlighted
                const isHighlighted = highlightedPlanId === tier.id
                
                // Badge text logic:
                // - If highlighted and current plan < growth: "Most Popular"
                // - If highlighted and current plan >= growth: "Upgrade"
                const currentOrder = getPlanOrder(normalizedCurrentPlan)
                const badgeText = isHighlighted 
                  ? (currentOrder < 2 ? 'Most Popular' : 'Upgrade')
                  : null
                
                // Enterprise plan special handling
                const isEnterprise = tier.id === 'enterprise'
                
                return (
                  <CarouselItem key={tier.id} className="pl-4 basis-[90%] pt-4 pb-1">
                    <div
                      className={cn(
                        'relative flex flex-col rounded-xl p-5 transition-all min-h-[520px]',
                        isHighlighted 
                          ? 'gradient-ottie-card-border'
                          : 'border',
                        (tier.disabled || isCurrentPlan) && 'opacity-50'
                      )}
                    >
                      {isHighlighted && badgeText && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="gradient-ottie text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                            {badgeText}
                          </span>
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      </div>
                      
                      {/* Price */}
                      <div className="mb-2">
                        {isEnterprise ? (
                          <>
                            <span className="text-3xl font-bold">Custom</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Starts from ${tier.monthlyPrice}/month
                            </p>
                          </>
                        ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{getPrice(tier)}</span>
                          {tier.monthlyPrice !== 0 && (
                            <span className="text-sm text-muted-foreground">/month</span>
                          )}
                        </div>
                        {savings && (
                          <p className="text-xs text-green-600 mt-1">
                            Save ${savings}/year
                          </p>
                        )}
                      </>
                        )}
                      </div>
                      
                      {/* Listings & Price per listing */}
                      <div className="mb-4 pb-4 border-b">
                        {isEnterprise ? (
                          <>
                            <p className="text-sm font-medium">
                              100+ Active Listings
                            </p>
                            <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">
                              {tier.listings} Active Listing{tier.listings > 1 ? 's' : ''}
                            </p>
                            {tier.extraListingPrice && (
                              <p className="text-xs text-muted-foreground">
                                + ${tier.extraListingPrice} /month for each additional listing
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                            {pricePerListing && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ${pricePerListing}/listing
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Features */}
                      <ul className="space-y-2 mb-6 flex-1">
                        {tier.includesFrom && (
                          <li className="flex items-start gap-2 text-sm font-medium text-foreground pb-1">
                            <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                            {tier.includesFrom}
                          </li>
                        )}
                        {tier.features.slice(0, tier.includesFrom ? 5 : 6).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{feature.name}</span>
                          </li>
                        ))}
                        {tier.features.length > (tier.includesFrom ? 5 : 6) && (
                          <li className="text-xs text-muted-foreground pt-1">
                            +{tier.features.length - (tier.includesFrom ? 5 : 6)} more features
                          </li>
                        )}
                      </ul>
                      
                      {isDowngrade ? (
                        <button
                          onClick={() => handleDowngradeClick(tier.id)}
                          className="text-sm text-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors mt-auto w-full"
                        >
                          Downgrade
                        </button>
                      ) : (
                        <Button
                          variant={isHighlighted ? 'default' : 'outline'}
                          className="w-full mt-auto"
                          disabled={tier.disabled || isCurrentPlan}
                        >
                          {isCurrentPlan ? 'Current Plan' : tier.cta}
                        </Button>
                      )}
                    </div>
                    {/* Trial text outside card - with fixed height to maintain equal card heights */}
                    <div className="h-5 mt-2">
                      {tier.trial && !hasUsedTrial && (
                        <p className="text-xs text-center text-muted-foreground">
                          14-day free trial • No credit card required
                        </p>
                      )}
                    </div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:block flex-1 overflow-y-auto overflow-x-visible px-6 pb-6">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 py-3">
            <Label htmlFor="billing-toggle" className={cn("text-sm", !isAnnual && "font-medium")}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={cn("text-sm flex items-center gap-2", isAnnual && "font-medium")}>
              Annual
              <Badge variant="secondary" className="text-xs">Save 15%</Badge>
            </Label>
          </div>
          <div className="grid grid-cols-5 gap-4 items-stretch py-4">
          {pricingTiers.map((tier) => {
              const savings = isAnnual ? getAnnualSavings(tier) : null
              const pricePerListing = getPricePerListing(tier)
              const isCurrentPlan = tier.id === normalizedCurrentPlan
              const isDowngrade = isLowerTier(tier.id)
              
              // Determine if this tier should be highlighted
              const isHighlighted = highlightedPlanId === tier.id
              
              // Badge text logic:
              // - If highlighted and current plan < growth: "Most Popular"
              // - If highlighted and current plan >= growth: "Upgrade"
              const currentOrder = getPlanOrder(normalizedCurrentPlan)
              const badgeText = isHighlighted 
                ? (currentOrder < 2 ? 'Most Popular' : 'Upgrade')
                : null
              
              // Enterprise plan special handling
              const isEnterprise = tier.id === 'enterprise'
            
            return (
              <div 
                key={tier.id} 
                ref={(el) => {
                  if (el) {
                    cardWrapperRefs.current.set(tier.id, el)
                  } else {
                    cardWrapperRefs.current.delete(tier.id)
                  }
                }}
                className="flex flex-col"
                style={cardWrapperHeight ? { height: `${cardWrapperHeight}px` } : {}}
              >
              <div
                className={cn(
                    'relative flex flex-col rounded-xl p-5 transition-all flex-1',
                    isHighlighted 
                      ? 'gradient-ottie-card-border'
                      : 'border',
                  (tier.disabled || isCurrentPlan) && 'opacity-50'
                )}
              >
                {isHighlighted && badgeText && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="gradient-ottie text-white text-xs font-medium px-3 py-1 rounded-full">
                      {badgeText}
                    </span>
                  </div>
                )}
                
                {/* Fixed height header section (name, description, price, listings) */}
                <div 
                  ref={(el) => {
                    if (el) {
                      headerRefs.current.set(tier.id, el)
                    } else {
                      headerRefs.current.delete(tier.id)
                    }
                  }}
                  className="flex flex-col shrink-0"
                  style={headerHeight ? { height: `${headerHeight}px` } : { minHeight: '180px' }}
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                  
                  {/* Price */}
                  <div className="mb-2 flex-1 flex flex-col justify-start">
                    {isEnterprise ? (
                      <>
                        <span className="text-3xl font-bold">Custom</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Starts from ${tier.monthlyPrice}/month
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{getPrice(tier)}</span>
                          {tier.monthlyPrice !== 0 && (
                            <span className="text-sm text-muted-foreground">/month</span>
                          )}
                        </div>
                        {savings && (
                          <p className="text-xs text-green-600 mt-1">
                            Save ${savings}/year
                          </p>
                        )}
                      </>
                    )}
                  </div>
                
                  {/* Listings & Price per listing */}
                  <div className="pb-4 border-b">
                    {isEnterprise ? (
                      <>
                        <p className="text-sm font-medium">
                          100+ Active Listings
                        </p>
                        <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          {tier.listings} Active Listing{tier.listings > 1 ? 's' : ''}
                        </p>
                        {tier.extraListingPrice && (
                          <p className="text-xs text-muted-foreground">
                            + ${tier.extraListingPrice} /month for each additional listing
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                        {pricePerListing && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${pricePerListing}/listing
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                  
                  {/* Features - flexible section */}
                  <ul className="space-y-2 mb-6 flex-1 mt-4">
                    {tier.includesFrom && (
                      <li className="flex items-start gap-2 text-sm font-medium text-foreground pb-1">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        {tier.includesFrom}
                      </li>
                    )}
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-auto">
                  {isDowngrade ? (
                    <button
                      onClick={() => handleDowngradeClick(tier.id)}
                      className="text-sm text-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-full"
                    >
                      Downgrade
                    </button>
                  ) : (
                    <Button
                      variant={isHighlighted ? 'default' : 'outline'}
                      className="w-full"
                      disabled={tier.disabled || isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : tier.cta}
                    </Button>
                  )}
                </div>
              </div>
              {/* Trial text outside card - with fixed height to maintain equal card heights */}
              <div className="h-5 mt-2">
                {tier.trial && !hasUsedTrial && (
                  <p className="text-xs text-center text-muted-foreground">
                    14-day free trial
                  </p>
                )}
              </div>
              </div>
            )
          })}
          </div>
        </div>
        
        {/* Downgrade Confirmation Dialog */}
        <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
          <AlertDialogContent>
            {selectedDowngradeTier && (() => {
              const { warnings, info } = getDowngradeInfo(selectedDowngradeTier)
              const targetTier = pricingTiers.find(t => t.id === selectedDowngradeTier)
              
              // Debug: Log warnings in development
              if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                console.log('Rendering downgrade dialog for tier:', selectedDowngradeTier, 'warnings:', warnings, 'info:', info)
              }
              
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirm Downgrade
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {warnings.length > 0 
                        ? `Before downgrading to the ${targetTier?.name} plan, please review the following:`
                        : `You are about to downgrade to the ${targetTier?.name} plan.`
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {/* Warnings (critical issues) */}
                  {warnings.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
                      <ul className="list-disc list-inside space-y-2 text-left text-sm">
                        {warnings.map((warning, index) => (
                          <li key={index} className="text-red-700 dark:text-red-300 font-medium">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Info (plan changes) */}
                  {info.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <p className="text-sm font-medium mb-2">Plan changes:</p>
                      <ul className="list-disc list-inside space-y-1 text-left text-sm text-muted-foreground">
                        {info.map((infoItem, index) => (
                          <li key={index}>
                            {infoItem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )
            })()}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDowngrading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDowngradeConfirm}
                variant="destructive"
                disabled={isDowngrading}
              >
                {isDowngrading ? 'Downgrading...' : 'Confirm Downgrade'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
