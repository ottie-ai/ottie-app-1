'use server'

import { cleanupExpiredPreviewImagesAction, cleanupSiteImages } from '@/lib/storage/cleanup'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server action to cleanup expired temp preview images
 * Can be called by cron job or scheduled task
 */
export async function cleanupExpiredPreviewImages() {
  return await cleanupExpiredPreviewImagesAction()
}

/**
 * Server action to cleanup images for a deleted site
 * Should be called when a site is soft deleted
 */
export async function cleanupSiteImagesAction(siteId: string) {
  try {
    const supabase = createAdminClient()
    
    // Get site config before deletion
    const { data: site, error } = await supabase
      .from('sites')
      .select('config')
      .eq('id', siteId)
      .single()

    if (error || !site) {
      console.error('Error fetching site for cleanup:', error)
      return { success: false, error: 'Site not found' }
    }

    return await cleanupSiteImages(siteId, site.config)
  } catch (error) {
    console.error('Error in cleanupSiteImagesAction:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
