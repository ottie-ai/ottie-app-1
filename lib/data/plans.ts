'use client'

import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/types/database'

/**
 * Cached plans data
 * Plans rarely change, so we cache them in memory
 */
let cachedPlans: Plan[] | null = null

/**
 * @deprecated Plans are now loaded via get_user_dashboard_data RPC function
 * This function is kept for backward compatibility but is no longer used
 * Plans are loaded together with app data in a single RPC call
 * 
 * Load all plans from the database
 * Plans are public (RLS allows SELECT) and rarely change
 * Results are cached in memory for the session
 * 
 * @returns Array of Plan objects
 */
export async function loadPlans(): Promise<Plan[]> {
  // Return cached plans if available
  if (cachedPlans !== null) {
    return cachedPlans
  }

  const supabase = createClient()

  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_cents', { ascending: true })

  if (error) {
    console.error('Error loading plans:', error)
    return []
  }

  // Cache the results
  cachedPlans = plans || []
  return cachedPlans
}

/**
 * Get a plan by name
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to look up
 * @returns Plan object or null if not found
 */
export function getPlanByName(plans: Plan[], planName: string | null | undefined): Plan | null {
  if (!planName) {
    // Default to 'free' if no plan specified
    return plans.find(p => p.name === 'free') || null
  }
  return plans.find(p => p.name === planName) || null
}

/**
 * Check if a plan supports multiple users based on max_users from database
 * This is the single source of truth for multi-user functionality
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to check
 * @returns true if plan allows more than 1 user
 */
export function isMultiUserPlanFromDB(plans: Plan[], planName: string | null | undefined): boolean {
  const plan = getPlanByName(plans, planName)
  if (!plan) {
    // If plan not found, default to single-user (safe default)
    return false
  }
  return plan.max_users > 1
}

/**
 * Check if a plan is single-user based on max_users from database
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to check
 * @returns true if plan allows only 1 user
 */
export function isSingleUserPlanFromDB(plans: Plan[], planName: string | null | undefined): boolean {
  return !isMultiUserPlanFromDB(plans, planName)
}

/**
 * Get max users allowed for a plan
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to check
 * @returns max_users value or 1 if plan not found
 */
export function getMaxUsersForPlan(plans: Plan[], planName: string | null | undefined): number {
  const plan = getPlanByName(plans, planName)
  return plan?.max_users ?? 1
}

/**
 * Get max sites allowed for a plan
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to check
 * @returns max_sites value or 1 if plan not found
 */
export function getMaxSitesForPlan(plans: Plan[], planName: string | null | undefined): number {
  const plan = getPlanByName(plans, planName)
  return plan?.max_sites ?? 1
}

/**
 * Check if a feature is available for a plan
 * 
 * @param plans - Array of plans (from context)
 * @param planName - Plan name to check
 * @param feature - Feature name (e.g., 'lead_generation', 'custom_domain')
 * @returns true if feature is enabled for this plan
 */
export function hasFeature(
  plans: Plan[], 
  planName: string | null | undefined, 
  feature: keyof Pick<Plan, 
    'feature_lead_generation' | 
    'feature_custom_domain' | 
    'feature_analytics' | 
    'feature_api_access' | 
    'feature_priority_support' | 
    'feature_3d_tours' | 
    'feature_pdf_flyers' | 
    'feature_crm_sync'
  >
): boolean {
  const plan = getPlanByName(plans, planName)
  return plan?.[feature] ?? false
}

/**
 * Clear the cached plans (useful after admin updates)
 */
export function clearPlansCache(): void {
  cachedPlans = null
}

