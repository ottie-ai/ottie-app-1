/**
 * Database Types
 * 
 * These types match your Supabase database schema
 */

// ==========================================
// ENUMS
// ==========================================

export type UserRole = 'owner' | 'admin' | 'agent'
export type SubPlan = 'free' | 'starter' | 'growth' | 'agency' | 'enterprise'
export type SiteStatus = 'draft' | 'published' | 'archived'
export type InviteStatus = 'pending' | 'accepted' | 'expired'
export type AvailabilityStatus = 'available' | 'under_offer' | 'reserved' | 'sold' | 'off_market'
export type MembershipStatus = 'active' | 'inactive' | 'suspended'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'grace_period'

// ==========================================
// TABLES
// ==========================================

export interface Profile {
  id: string // uuid
  email: string | null
  full_name: string | null
  avatar_url: string | null
  preferences: Record<string, any> // jsonb
  created_at: string // timestamp
  deleted_at: string | null // timestamp (soft delete)
}

export interface Workspace {
  id: string // uuid
  name: string
  slug: string
  logo_url: string | null
  plan: SubPlan | null // null/empty plan is treated as 'free'
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus // Subscription status tracking
  seats_limit: number // Maximum number of active users allowed (from plan)
  seats_used: number // Current number of active users
  grace_period_ends_at: string | null // When grace period ends (14 days after payment failure)
  subscription_locked_at: string | null // When workspace was locked due to subscription issues
  branding_config: Record<string, any> // jsonb
  usage_stats: {
    sites_created?: number
    ai_credits_used?: number
    storage_mb?: number
  } // jsonb
  metadata: Record<string, any> // jsonb
  created_at: string // timestamp
  deleted_at: string | null // timestamp (soft delete)
}

export interface Membership {
  id: string // uuid
  workspace_id: string // uuid
  user_id: string // uuid
  role: UserRole
  status: MembershipStatus // Membership status: active (can access), inactive (lost access due to plan), suspended (temporarily disabled)
  last_active_at: string // timestamp
  created_at: string // timestamp
}

export interface Invitation {
  id: string // uuid
  workspace_id: string // uuid
  email: string
  role: UserRole
  token: string
  status: InviteStatus
  invited_by: string | null // uuid
  created_at: string // timestamp
  expires_at: string // timestamp
}

export interface Site {
  id: string // uuid
  workspace_id: string // uuid
  creator_id: string | null // uuid
  assigned_agent_id: string | null // uuid
  title: string
  slug: string
  status: SiteStatus
  availability: AvailabilityStatus // Property availability status
  description: string | null
  config: Record<string, any> // jsonb (SiteConfig/PageConfig)
  domain: string // Domain where site is hosted (default: 'ottie.site', can be custom domain)
  thumbnail_url: string | null
  views_count: number
  metadata: Record<string, any> // jsonb
  password_protected: boolean // Whether site requires password to access
  password_hash: string | null // Bcrypt hash of password (never plaintext)
  created_at: string // timestamp
  updated_at: string // timestamp
  published_at: string | null // timestamp (when site was published)
  deleted_at: string | null // timestamp (soft delete)
}

export interface Integration {
  id: string // uuid
  workspace_id: string // uuid
  provider: string // 'hubspot', 'pipedrive', 'zapier_webhook'
  config: Record<string, any> // jsonb
  is_active: boolean
  created_at: string // timestamp
}

export interface Plan {
  id: number // serial
  name: string // 'free' | 'starter' | 'growth' | 'agency' | 'enterprise'
  description: string | null
  max_users: number
  max_sites: number
  feature_lead_generation: boolean
  feature_custom_brand_domain: boolean
  feature_custom_property_domain: boolean
  feature_analytics: boolean
  feature_api_access: boolean
  feature_priority_support: boolean
  feature_3d_tours: boolean
  feature_pdf_flyers: boolean
  feature_crm_sync: boolean
  feature_password_protection: boolean
  feature_premium_fonts: boolean
  feature_custom_cursor: boolean
  feature_text_animations: boolean
  price_cents: number // Monthly price in cents
  annual_price_cents: number // Monthly price in cents when paid annually (with 15% discount)
  created_at: string // timestamp
  updated_at: string // timestamp
}

/**
 * Extract all feature keys from Plan interface
 * This type automatically includes all fields that start with 'feature_'
 */
export type PlanFeature = keyof Pick<Plan, 
  'feature_lead_generation' | 
  'feature_custom_brand_domain' | 
  'feature_custom_property_domain' | 
  'feature_analytics' | 
  'feature_api_access' | 
  'feature_priority_support' | 
  'feature_3d_tours' | 
  'feature_pdf_flyers' | 
  'feature_crm_sync' |
  'feature_password_protection' |
  'feature_premium_fonts' |
  'feature_custom_cursor' |
  'feature_text_animations'
>

// ==========================================
// INSERT TYPES (for creating new records)
// ==========================================

export type ProfileInsert = Omit<Profile, 'id' | 'created_at'>
export type WorkspaceInsert = Omit<Workspace, 'id' | 'created_at' | 'deleted_at'>
export type MembershipInsert = Omit<Membership, 'id' | 'created_at' | 'last_active_at'>
export type InvitationInsert = Omit<Invitation, 'id' | 'created_at' | 'expires_at' | 'status' | 'token'>
export type SiteInsert = Omit<Site, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'views_count'>
export type IntegrationInsert = Omit<Integration, 'id' | 'created_at'>
export type PlanInsert = Omit<Plan, 'id' | 'created_at' | 'updated_at'>

// ==========================================
// UPDATE TYPES (for updating records)
// ==========================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
export type WorkspaceUpdate = Partial<Omit<Workspace, 'id' | 'created_at'>>
export type MembershipUpdate = Partial<Omit<Membership, 'id' | 'created_at' | 'workspace_id' | 'user_id'>>
export type InvitationUpdate = Partial<Omit<Invitation, 'id' | 'created_at' | 'workspace_id' | 'token'>>
export type SiteUpdate = Partial<Omit<Site, 'id' | 'created_at' | 'workspace_id'>>
export type IntegrationUpdate = Partial<Omit<Integration, 'id' | 'created_at' | 'workspace_id'>>
export type PlanUpdate = Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>

