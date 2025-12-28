import Stripe from 'stripe'

// Server-side Stripe client
// Using latest API version (auto-upgrades to latest stable)
// For webhook compatibility, pin to major version: '2024-11-20' instead of 'acacia'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20',
  typescript: true,
})

// Price ID mapping
export const STRIPE_PRICE_IDS = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL!,
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY!,
    annual: process.env.STRIPE_PRICE_GROWTH_ANNUAL!,
  },
  agency: {
    monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
    annual: process.env.STRIPE_PRICE_AGENCY_ANNUAL!,
  },
} as const

export type PlanId = keyof typeof STRIPE_PRICE_IDS
export type BillingPeriod = 'monthly' | 'annual'

export function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ?? true
}

/**
 * Get Stripe Price ID for a plan and billing period
 */
export function getPriceId(planId: PlanId, billingPeriod: BillingPeriod): string {
  return STRIPE_PRICE_IDS[planId][billingPeriod]
}

