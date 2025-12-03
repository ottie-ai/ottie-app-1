import type { Plan } from '@/types/database'

export interface PricingFeature {
  name: string
}

export interface PricingTier {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  listings: number
  extraListingPrice?: number
  teamSeats: string
  description: string
  includesFrom?: string // e.g., "Everything in Starter"
  features: PricingFeature[]
  cta: string
  disabled?: boolean
  popular?: boolean
  trial?: boolean
  // Automatically calculated price per listing (null for free plan)
  monthlyPricePerListing: number | null
  annualPricePerListing: number | null
}

// Static feature descriptions for each plan (UI-only)
// Note: name, description, teamSeats and listings are now from database
// Only features, CTA, and UI flags are defined here
const planFeatures: Record<string, {
  includesFrom?: string
  features: PricingFeature[]
  cta: string
  popular?: boolean
  trial?: boolean
  extraListingPrice?: number
}> = {
  free: {
    features: [
      { name: 'Real-time Editor' },
      { name: 'Fast & Secure Hosting' },
    ],
    cta: 'Get Started',
  },
  starter: {
    features: [
      { name: 'Real-time Editor' },
      { name: 'Fast & Secure Hosting' },
      { name: 'Lead management' },
      { name: 'Visitor Analytics / Basic' },
      { name: '3D Tours & Video Embed' },
      { name: 'Listing Status Labels' },
      { name: 'Social Media Kit Generator' },
      { name: 'QR Code Generator' },
    ],
    cta: 'Start 14-day trial',
    trial: true,
  },
  growth: {
    includesFrom: 'Everything in Starter',
    features: [
      { name: 'Visitor Analytics / Detailed' },
      { name: 'White label' },
      { name: 'Custom domain' },
      { name: 'Password protected site' },
      { name: 'Advanced templates' },
      { name: 'Lead sync (HubSpot, Pipedrive)' },
      { name: 'Visitor Check-in App' },
      { name: 'Viewing Scheduler' },
      { name: 'Content Lock for Leads' },
    ],
    cta: 'Start 14-day trial',
    popular: true,
    trial: true,
  },
  agency: {
    includesFrom: 'Everything in Growth',
    features: [
      { name: 'Unlimited Team Seats' },
      { name: 'Lead routing to agents' },
      { name: 'Team management' },
    ],
    cta: 'Start 14-day trial',
    trial: true,
    extraListingPrice: 5,
  },
  enterprise: {
    includesFrom: 'Everything in Agency',
    features: [
      { name: 'API access' },
      { name: 'Dedicated account manager' },
      { name: 'Custom integrations' },
      { name: 'SLA guarantee' },
    ],
    cta: 'Contact Sales',
  },
}

/**
 * Helper function to format team seats from max_users
 * Values >= 999 are considered "Unlimited"
 */
function formatTeamSeats(maxUsers: number): string {
  if (maxUsers >= 999) {
    return 'Unlimited Team Seats'
  }
  if (maxUsers === 1) {
    return '1 Team Seat'
  }
  return `${maxUsers} Team Seats`
}

/**
 * Transforms database Plan objects into PricingTier objects for display
 * Converts price_cents to dollars and calculates annual pricing (15% discount)
 * Uses max_sites for listings and max_users for team seats (999+ = unlimited)
 * Uses name and description directly from database
 * 
 * @param plans - Array of Plan objects from database
 * @returns Array of PricingTier objects ready for display
 */
export function transformPlansToTiers(plans: Plan[]): PricingTier[] {
  // Include all plans we have UI definitions for (free, starter, growth, agency, enterprise)
  const displayPlans = ['free', 'starter', 'growth', 'agency', 'enterprise']
  
  return plans
    .filter(plan => displayPlans.includes(plan.name))
    .map(plan => {
      const featureConfig = planFeatures[plan.name] || {
        features: [],
        cta: 'Get Started',
      }
      
      // Convert cents to dollars
      const monthlyPrice = plan.price_cents / 100
      // Annual price from database (monthly price when paid annually with 15% discount)
      const annualPrice = plan.annual_price_cents / 100
      
      // Use database values for listings and team seats
      // For enterprise (9999), show as "100+" in UI, otherwise cap at 999
      const listings = plan.max_sites >= 9999 ? 100 : (plan.max_sites >= 999 ? 999 : plan.max_sites)
      const teamSeats = formatTeamSeats(plan.max_users)
      
      // Automatically calculate price per listing from database prices (in cents for precision)
      // Monthly: price_cents / max_sites
      // Annual: annual_price_cents / max_sites
      const monthlyPricePerListingCents = plan.price_cents === 0 ? null : plan.price_cents / plan.max_sites
      const annualPricePerListingCents = plan.annual_price_cents === 0 ? null : plan.annual_price_cents / plan.max_sites
      
      // Convert to dollars and round to 2 decimal places
      const monthlyPricePerListing = monthlyPricePerListingCents !== null 
        ? Number((monthlyPricePerListingCents / 100).toFixed(2))
        : null
      const annualPricePerListing = annualPricePerListingCents !== null
        ? Number((annualPricePerListingCents / 100).toFixed(2))
        : null
      
      // Capitalize plan name for display (e.g., 'starter' -> 'Starter')
      const displayName = plan.name.charAt(0).toUpperCase() + plan.name.slice(1)
      
      return {
        id: plan.name,
        name: displayName, // Capitalized from database name
        monthlyPrice,
        annualPrice,
        listings, // From database (max_sites)
        teamSeats, // From database (max_users)
        description: plan.description || '', // From database
        includesFrom: featureConfig.includesFrom,
        features: featureConfig.features,
        cta: featureConfig.cta,
        popular: featureConfig.popular,
        trial: featureConfig.trial,
        extraListingPrice: featureConfig.extraListingPrice,
        monthlyPricePerListing, // Automatically calculated from database (price_cents / max_sites)
        annualPricePerListing, // Automatically calculated from database (annual_price_cents / max_sites)
      }
    })
}

/**
 * Legacy hardcoded tiers for backwards compatibility
 * @deprecated Use transformPlansToTiers() with database plans instead
 * 
 * Note: These values should match the database defaults:
 * - free: 0 cents monthly, 0 cents annual, 1 user, 3 sites, description: 'Free to try'
 * - starter: 3900 cents ($39) monthly, 3300 cents ($33) annual, 2 users, 10 sites, description: 'Basic plan for individuals'
 * - growth: 9900 cents ($99) monthly, 8400 cents ($84) annual, 5 users, 50 sites, description: 'For small agencies'
 * - agency: 19900 cents ($199) monthly, 16900 cents ($169) annual, 20 users, 200 sites, description: 'For real estate companies'
 */
export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    listings: 3, // max_sites from DB
    teamSeats: '1 Team Seat', // max_users = 1
    description: 'Free to try', // From database
    features: [
      { name: 'Real-time Editor' },
      { name: 'Fast & Secure Hosting' },
    ],
    cta: 'Get Started',
    monthlyPricePerListing: null, // Free plan - no price per listing
    annualPricePerListing: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 39,
    annualPrice: 33,
    listings: 10, // max_sites from DB
    teamSeats: '2 Team Seats', // max_users = 2
    description: 'Basic plan for individuals', // From database
    features: [
      { name: 'Real-time Editor' },
      { name: 'Fast & Secure Hosting' },
      { name: 'Lead management' },
      { name: 'Visitor Analytics / Basic' },
      { name: '3D Tours & Video Embed' },
      { name: 'Listing Status Labels' },
      { name: 'Social Media Kit Generator' },
      { name: 'QR Code Generator' },
    ],
    cta: 'Start 14-day trial',
    trial: true,
    monthlyPricePerListing: 3.9, // $39 / 10 listings
    annualPricePerListing: 3.3, // $33 / 10 listings
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 99,
    annualPrice: 84,
    listings: 50, // max_sites from DB
    teamSeats: '5 Team Seats', // max_users = 5
    description: 'For small agencies', // From database
    includesFrom: 'Everything in Starter',
    features: [
      { name: 'Visitor Analytics / Detailed' },
      { name: 'White label' },
      { name: 'Custom domain' },
      { name: 'Password protected site' },
      { name: 'Advanced templates' },
      { name: 'Lead sync (HubSpot, Pipedrive)' },
      { name: 'Visitor Check-in App' },
      { name: 'Viewing Scheduler' },
      { name: 'Content Lock for Leads' },
    ],
    cta: 'Start 14-day trial',
    popular: true,
    trial: true,
    monthlyPricePerListing: 1.98, // $99 / 50 listings
    annualPricePerListing: 1.68, // $84 / 50 listings
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 199,
    annualPrice: 169,
    listings: 200, // max_sites from DB
    extraListingPrice: 5,
    teamSeats: '20 Team Seats', // max_users = 20
    description: 'For real estate companies', // From database
    includesFrom: 'Everything in Growth',
    features: [
      { name: 'Unlimited Team Seats' },
      { name: 'Lead routing to agents' },
      { name: 'Team management' },
    ],
    cta: 'Start 14-day trial',
    trial: true,
    monthlyPricePerListing: 1.0, // $199 / 200 listings (rounded)
    annualPricePerListing: 0.85, // $169 / 200 listings (rounded)
  },
]

