import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types/database'

/**
 * Server-side function to load all plans from the database
 * Plans are public (RLS allows SELECT) and rarely change
 * 
 * @returns Array of Plan objects
 */
export async function loadPlansServer(): Promise<Plan[]> {
  const supabase = await createClient()

  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_cents', { ascending: true })

  if (error) {
    console.error('Error loading plans:', error)
    return []
  }

  return plans || []
}

/**
 * Get a plan by name
 * 
 * @param plans - Array of plans
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
 * Check if a feature is available for a plan
 * 
 * @param plans - Array of plans
 * @param planName - Plan name to check
 * @param feature - Feature name (e.g., 'feature_custom_brand_domain')
 * @returns true if feature is enabled for this plan
 */
export function hasFeature(
  plans: Plan[], 
  planName: string | null | undefined, 
  feature: keyof Pick<Plan, 
    'feature_lead_generation' | 
    'feature_custom_brand_domain' | 
    'feature_custom_property_domain' | 
    'feature_analytics' | 
    'feature_api_access' | 
    'feature_priority_support' | 
    'feature_3d_tours' | 
    'feature_pdf_flyers' | 
    'feature_crm_sync' |
    'feature_password_protection'
  >
): boolean {
  const plan = getPlanByName(plans, planName)
  return plan?.[feature] ?? false
}

/**
 * Find the first plan that has a specific feature enabled
 * Plans are ordered by price_cents ascending, so this returns the cheapest plan with the feature
 * 
 * @param plans - Array of plans
 * @param feature - Feature name to check
 * @returns Plan object or null if no plan has this feature
 */
export function getFirstPlanWithFeature(
  plans: Plan[],
  feature: keyof Pick<Plan, 
    'feature_lead_generation' | 
    'feature_custom_brand_domain' | 
    'feature_custom_property_domain' | 
    'feature_analytics' | 
    'feature_api_access' | 
    'feature_priority_support' | 
    'feature_3d_tours' | 
    'feature_pdf_flyers' | 
    'feature_crm_sync' |
    'feature_password_protection'
  >
): Plan | null {
  // Plans should already be ordered by price_cents ascending
  // Find the first plan that has this feature enabled
  return plans.find(plan => plan[feature] === true) || null
}

