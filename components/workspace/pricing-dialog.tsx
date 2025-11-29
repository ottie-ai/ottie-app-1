'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { pricingTiers, type PricingTier } from '@/lib/pricing-data'

interface PricingDialogProps {
  children: React.ReactNode
  currentPlan?: string | null // Current plan ID (e.g., 'free', 'starter', 'growth', 'agency', 'enterprise')
  stripeCustomerId?: string | null // Stripe customer ID - if exists, user has already used trial
  defaultSelectedTier?: string | null // Optional: override default selected tier (e.g., 'agency' for team upgrade)
}

export function PricingDialog({ children, currentPlan, stripeCustomerId, defaultSelectedTier }: PricingDialogProps) {
  // Normalize current plan to match tier IDs
  // Pricing tiers have: 'free', 'starter', 'growth', 'agency'
  // Map 'enterprise' to 'agency' (highest available tier)
  const normalizePlanForPricing = (plan: string | null | undefined): string => {
    if (!plan || plan === '') return 'free'
    if (plan === 'enterprise') return 'agency'
    // Only return if it's a valid tier ID
    if (['free', 'starter', 'growth', 'agency'].includes(plan)) {
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
    if (normalizedCurrentPlan === 'agency') return 'agency' // Already on highest tier
    return 'growth' // Default fallback
  }
  
  const [selectedTier, setSelectedTier] = useState(() => {
    // If defaultSelectedTier is provided, use it
    if (defaultSelectedTier && ['free', 'starter', 'growth', 'agency'].includes(defaultSelectedTier)) {
      return defaultSelectedTier
    }
    // Otherwise use default logic
    if (normalizedCurrentPlan === 'free') return 'starter'
    if (normalizedCurrentPlan === 'starter') return 'growth'
    if (normalizedCurrentPlan === 'growth') return 'agency'
    if (normalizedCurrentPlan === 'agency') return 'agency'
    return 'growth'
  })
  const [isAnnual, setIsAnnual] = useState(true)
  
  // Update selected tier when current plan or defaultSelectedTier changes
  useEffect(() => {
    // If defaultSelectedTier is provided, use it
    if (defaultSelectedTier && ['free', 'starter', 'growth', 'agency'].includes(defaultSelectedTier)) {
      setSelectedTier(defaultSelectedTier)
      return
    }
    // Otherwise use default logic
    let nextTier = 'growth'
    if (normalizedCurrentPlan === 'free') nextTier = 'starter'
    else if (normalizedCurrentPlan === 'starter') nextTier = 'growth'
    else if (normalizedCurrentPlan === 'growth') nextTier = 'agency'
    else if (normalizedCurrentPlan === 'agency') nextTier = 'agency'
    setSelectedTier(nextTier)
  }, [normalizedCurrentPlan, defaultSelectedTier])

  const getPrice = (tier: PricingTier) => {
    if (tier.monthlyPrice === 0) return '$0'
    return isAnnual ? `$${tier.annualPrice}` : `$${tier.monthlyPrice}`
  }

  const getPricePerListing = (tier: PricingTier) => {
    if (tier.monthlyPrice === 0) return null
    const price = isAnnual ? tier.annualPrice : tier.monthlyPrice
    return (price / tier.listings).toFixed(2)
  }

  const getAnnualSavings = (tier: PricingTier) => {
    if (tier.monthlyPrice === 0) return null
    return (tier.monthlyPrice - tier.annualPrice) * 12
  }

  // Get plan order for comparison (lower number = lower tier)
  const getPlanOrder = (planId: string): number => {
    const order: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'growth': 2,
      'agency': 3,
      'enterprise': 3, // enterprise maps to agency
    }
    return order[planId] ?? 0
  }

  // Check if tier is lower than current plan
  const isLowerTier = (tierId: string): boolean => {
    if (!normalizedCurrentPlan || normalizedCurrentPlan === 'free') return false
    return getPlanOrder(tierId) < getPlanOrder(normalizedCurrentPlan)
  }

  // Check if user has already used trial (has Stripe customer ID)
  const hasUsedTrial = !!stripeCustomerId

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your needs.{!hasUsedTrial && ' All paid plans include a 14-day free trial.'}
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 py-2 shrink-0">
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
        
        {/* Mobile Carousel */}
        <div className="md:hidden flex-1 overflow-y-auto py-4">
          <Carousel className="w-full px-2" opts={{ startIndex: 2, align: 'center' }}>
            <CarouselContent className="-ml-4">
              {pricingTiers.map((tier) => {
                const savings = isAnnual ? getAnnualSavings(tier) : null
                const pricePerListing = getPricePerListing(tier)
                const isCurrentPlan = tier.id === normalizedCurrentPlan
                const isDowngrade = isLowerTier(tier.id)
                // If current plan is growth, mark agency as most popular instead of growth
                const isMostPopular = normalizedCurrentPlan === 'growth' 
                  ? tier.id === 'agency' 
                  : tier.popular || false
                // Badge text: "Upgrade" if growth -> agency, otherwise "Most Popular"
                const badgeText = normalizedCurrentPlan === 'growth' && tier.id === 'agency' 
                  ? 'Upgrade' 
                  : 'Most Popular'
                
                return (
                  <CarouselItem key={tier.id} className="pl-4 basis-[90%] pt-4 pb-1">
                    <div
                      onClick={() => !tier.disabled && !isCurrentPlan && setSelectedTier(tier.id)}
                      className={cn(
                        'relative flex flex-col rounded-xl p-5 transition-all min-h-[520px]',
                        !tier.disabled && !isCurrentPlan && 'cursor-pointer',
                        isMostPopular 
                          ? 'gradient-ottie-card-border'
                          : cn(
                              'border',
                        selectedTier === tier.id && !tier.disabled && !isCurrentPlan
                          ? 'border-foreground ring-1 ring-foreground'
                                : !tier.disabled && !isCurrentPlan && 'hover:border-foreground/30'
                            ),
                        (tier.disabled || isCurrentPlan) && 'opacity-50 cursor-default'
                      )}
                    >
                      {isMostPopular && (
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
                        <span className="text-3xl font-bold">{getPrice(tier)}</span>
                        {tier.monthlyPrice !== 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                        {savings && (
                          <p className="text-xs text-green-600 mt-1">
                            Save ${savings}/year
                          </p>
                        )}
                      </div>
                      
                      {/* Listings & Price per listing */}
                      <div className="mb-4 pb-4 border-b">
                        <p className="text-sm font-medium">
                          {tier.listings} Active Listing{tier.listings > 1 ? 's' : ''}
                          {tier.extraListingPrice && (
                            <span className="text-muted-foreground font-normal"> + ${tier.extraListingPrice}/extra</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                        {pricePerListing && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${pricePerListing}/listing
                          </p>
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
                      
                      <Button
                        variant={isMostPopular ? 'default' : 'outline'}
                        className="w-full mt-auto"
                        disabled={tier.disabled || isCurrentPlan}
                      >
                        {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Downgrade' : tier.cta}
                      </Button>
                      {tier.trial && !hasUsedTrial && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
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

          {/* Enterprise Section - Mobile */}
          <div className="mx-2 mt-4 rounded-xl border p-5">
            <h3 className="font-semibold text-lg mb-1">Enterprise</h3>
            <p className="text-sm text-muted-foreground mb-3">For large brokerages and franchises</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600 shrink-0" />
                Starts from 100 listings
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600 shrink-0" />
                Everything in Pro
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600 shrink-0" />
                API access
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600 shrink-0" />
                Dedicated account manager
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:block pt-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
          {pricingTiers.map((tier) => {
              const savings = isAnnual ? getAnnualSavings(tier) : null
              const pricePerListing = getPricePerListing(tier)
              const isCurrentPlan = tier.id === normalizedCurrentPlan
              const isDowngrade = isLowerTier(tier.id)
              // If current plan is growth, mark agency as most popular instead of growth
              const isMostPopular = normalizedCurrentPlan === 'growth' 
                ? tier.id === 'agency' 
                : tier.popular || false
              // Badge text: "Upgrade" if growth -> agency, otherwise "Most Popular"
              const badgeText = normalizedCurrentPlan === 'growth' && tier.id === 'agency' 
                ? 'Upgrade' 
                : 'Most Popular'
            
            return (
              <div
                key={tier.id}
                onClick={() => !tier.disabled && !isCurrentPlan && setSelectedTier(tier.id)}
                className={cn(
                    'relative flex flex-col rounded-xl p-5 transition-all',
                  !tier.disabled && !isCurrentPlan && 'cursor-pointer',
                    isMostPopular 
                      ? 'gradient-ottie-card-border'
                      : cn(
                          'border',
                  selectedTier === tier.id && !tier.disabled && !isCurrentPlan
                    ? 'border-foreground ring-1 ring-foreground'
                            : !tier.disabled && !isCurrentPlan && 'hover:border-foreground/30'
                        ),
                  (tier.disabled || isCurrentPlan) && 'opacity-50 cursor-default'
                )}
              >
                {isMostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="gradient-ottie text-white text-xs font-medium px-3 py-1 rounded-full">
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
                    <span className="text-3xl font-bold">{getPrice(tier)}</span>
                    {tier.monthlyPrice !== 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                  {savings && (
                    <p className="text-xs text-green-600 mt-1">
                      Save ${savings}/year
                    </p>
                  )}
                </div>
                
                  {/* Listings & Price per listing */}
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm font-medium">
                      {tier.listings} Active Listing{tier.listings > 1 ? 's' : ''}
                      {tier.extraListingPrice && (
                        <span className="text-muted-foreground font-normal"> + ${tier.extraListingPrice}/extra</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{tier.teamSeats}</p>
                    {pricePerListing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${pricePerListing}/listing
                      </p>
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
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  variant={isMostPopular ? 'default' : 'outline'}
                  className="w-full"
                  disabled={tier.disabled || isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Downgrade' : tier.cta}
                </Button>
                  {tier.trial && !hasUsedTrial && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      14-day free trial
                    </p>
                  )}
              </div>
            )
          })}
          </div>

          {/* Enterprise Section - Full Width */}
          <div className="mt-4 rounded-xl border p-5 hover:border-foreground/30 transition-all">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Enterprise</h3>
                <p className="text-sm text-muted-foreground mb-3">For large brokerages and franchises with custom needs</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    Starts from 100 listings
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    Everything in Pro
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    API access
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    Dedicated account manager
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    Custom integrations
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 shrink-0" />
                    SLA guarantee
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <Button variant="outline">
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
