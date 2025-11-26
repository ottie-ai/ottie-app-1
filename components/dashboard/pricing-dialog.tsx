'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
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

const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Perfect for getting started',
    features: [
      'Up to 3 pages',
      'Basic analytics',
      'Ottie branding',
      'Email support',
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    description: 'For individual agents',
    features: [
      'Up to 10 pages',
      'Advanced analytics',
      'Remove Ottie branding',
      'Custom domain',
      'Priority support',
    ],
    cta: 'Upgrade',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    description: 'For growing teams',
    features: [
      'Unlimited pages',
      'Advanced analytics',
      'Remove Ottie branding',
      'Custom domain',
      'Priority support',
      'Team collaboration',
      'API access',
    ],
    cta: 'Upgrade',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

interface PricingDialogProps {
  children: React.ReactNode
}

export function PricingDialog({ children }: PricingDialogProps) {
  const [selectedTier, setSelectedTier] = useState('pro')
  const [isAnnual, setIsAnnual] = useState(true)

  const getPrice = (monthlyPrice: number | null) => {
    if (monthlyPrice === null) return 'Custom'
    if (monthlyPrice === 0) return '$0'
    if (isAnnual) {
      // 10 months price for annual (2 months free)
      const annualTotal = monthlyPrice * 10
      const monthlyEquivalent = Math.round(annualTotal / 12)
      return `$${monthlyEquivalent}`
    }
    return `$${monthlyPrice}`
  }

  const getAnnualSavings = (monthlyPrice: number | null) => {
    if (monthlyPrice === null || monthlyPrice === 0) return null
    return monthlyPrice * 2 // 2 months free
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your needs
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
            <Badge variant="secondary" className="text-xs">Save 17%</Badge>
          </Label>
        </div>
        
        {/* Mobile Carousel */}
        <div className="md:hidden flex-1 overflow-y-auto py-4">
          <Carousel className="w-full px-2" opts={{ startIndex: 2, align: 'center' }}>
            <CarouselContent className="-ml-4">
              {pricingTiers.map((tier) => {
                const savings = isAnnual ? getAnnualSavings(tier.monthlyPrice) : null
                
                return (
                  <CarouselItem key={tier.id} className="pl-4 basis-[90%] pt-4 pb-1">
                    <div
                      onClick={() => !tier.disabled && setSelectedTier(tier.id)}
                      className={cn(
                        'relative flex flex-col rounded-xl border p-5 transition-all min-h-[420px]',
                        !tier.disabled && 'cursor-pointer',
                        selectedTier === tier.id && !tier.disabled
                          ? 'border-foreground ring-1 ring-foreground'
                          : !tier.disabled && 'hover:border-foreground/30',
                        tier.disabled && 'opacity-50 cursor-default'
                      )}
                    >
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                            Popular
                          </span>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-3xl font-bold">{getPrice(tier.monthlyPrice)}</span>
                        {tier.monthlyPrice !== null && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                        {savings && (
                          <p className="text-xs text-green-600 mt-1">
                            Save ${savings}/year
                          </p>
                        )}
                      </div>
                      
                      <ul className="space-y-2.5 mb-6 flex-1">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button
                        variant={tier.popular ? 'default' : 'outline'}
                        className="w-full mt-auto"
                        disabled={tier.disabled}
                      >
                        {tier.cta}
                      </Button>
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
        <div className="hidden md:grid grid-cols-4 gap-4 pt-6">
          {pricingTiers.map((tier) => {
            const savings = isAnnual ? getAnnualSavings(tier.monthlyPrice) : null
            
            return (
              <div
                key={tier.id}
                onClick={() => !tier.disabled && setSelectedTier(tier.id)}
                className={cn(
                  'relative flex flex-col rounded-xl border p-5 transition-all',
                  !tier.disabled && 'cursor-pointer',
                  selectedTier === tier.id && !tier.disabled
                    ? 'border-foreground ring-1 ring-foreground'
                    : !tier.disabled && 'hover:border-foreground/30',
                  tier.disabled && 'opacity-50 cursor-default'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                
                <div className="mb-4">
                  <span className="text-3xl font-bold">{getPrice(tier.monthlyPrice)}</span>
                  {tier.monthlyPrice !== null && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                  {savings && (
                    <p className="text-xs text-green-600 mt-1">
                      Save ${savings}/year
                    </p>
                  )}
                </div>
                
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  variant={tier.popular ? 'default' : 'outline'}
                  className="w-full"
                  disabled={tier.disabled}
                >
                  {tier.cta}
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

