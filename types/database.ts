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
  description: string | null
  config: Record<string, any> // jsonb (SiteConfig/PageConfig)
  domain: string // Domain where site is hosted (default: 'ottie.site')
  custom_domain: string | null
  thumbnail_url: string | null
  views_count: number
  metadata: Record<string, any> // jsonb
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

// ==========================================
// INSERT TYPES (for creating new records)
// ==========================================

export type ProfileInsert = Omit<Profile, 'id' | 'created_at'>
export type WorkspaceInsert = Omit<Workspace, 'id' | 'created_at' | 'deleted_at'>
export type MembershipInsert = Omit<Membership, 'id' | 'created_at' | 'last_active_at'>
export type InvitationInsert = Omit<Invitation, 'id' | 'created_at' | 'expires_at' | 'status' | 'token'>
export type SiteInsert = Omit<Site, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'views_count'>
export type IntegrationInsert = Omit<Integration, 'id' | 'created_at'>

// ==========================================
// UPDATE TYPES (for updating records)
// ==========================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
export type WorkspaceUpdate = Partial<Omit<Workspace, 'id' | 'created_at'>>
export type MembershipUpdate = Partial<Omit<Membership, 'id' | 'created_at' | 'workspace_id' | 'user_id'>>
export type InvitationUpdate = Partial<Omit<Invitation, 'id' | 'created_at' | 'workspace_id' | 'token'>>
export type SiteUpdate = Partial<Omit<Site, 'id' | 'created_at' | 'workspace_id'>>
export type IntegrationUpdate = Partial<Omit<Integration, 'id' | 'created_at' | 'workspace_id'>>

