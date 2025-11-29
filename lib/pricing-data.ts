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
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    listings: 1,
    teamSeats: '1 Team Seat',
    description: 'Perfect for trying out',
    features: [
      { name: 'Real-time Editor' },
      { name: 'Fast & Secure Hosting' },
    ],
    cta: 'Get Started',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 39,
    annualPrice: 33,
    listings: 3,
    teamSeats: '1 Team Seat',
    description: 'For individual agents',
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
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 99,
    annualPrice: 84,
    listings: 10,
    teamSeats: '1 Team Seat',
    description: 'For top-performing agents',
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
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 199,
    annualPrice: 169,
    listings: 25,
    extraListingPrice: 5,
    teamSeats: 'Unlimited Team Seats',
    description: 'For agencies & teams',
    includesFrom: 'Everything in Growth',
    features: [
      { name: 'Unlimited Team Seats' },
      { name: 'Lead routing to agents' },
      { name: 'Team management' },
    ],
    cta: 'Start 14-day trial',
    trial: true,
  },
]

