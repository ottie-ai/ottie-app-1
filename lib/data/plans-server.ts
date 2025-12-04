'use server'

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

