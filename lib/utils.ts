import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SubPlan } from "@/types/database"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize plan value - if null/undefined, default to 'free'
 */
export function normalizePlan(plan: SubPlan | null | undefined): SubPlan {
  return plan || 'free'
}

/**
 * Check if a plan supports multiple users (workspace features)
 * Single-user plans: free, starter, growth (user = workspace)
 * Multi-user plans: agency, enterprise (can have multiple users)
 * If plan is null/undefined, it's treated as 'free' (single-user)
 */
export function isMultiUserPlan(plan: SubPlan | null | undefined): boolean {
  const normalizedPlan = normalizePlan(plan)
  return normalizedPlan === 'agency' || normalizedPlan === 'enterprise'
}

/**
 * Check if a plan is single-user (user = workspace)
 * If plan is null/undefined, it's treated as 'free' (single-user)
 */
export function isSingleUserPlan(plan: SubPlan | null | undefined): boolean {
  return !isMultiUserPlan(plan)
}

