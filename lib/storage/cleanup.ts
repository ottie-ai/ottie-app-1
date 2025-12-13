/**
 * Cleanup functions for site images
 * Handles deletion of images when temp previews expire or sites are deleted
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { extractImagePathsFromConfig, deleteImages } from './image-processor'

const BUCKET_NAME = 'site-images'

/**
 * Cleanup images for expired temp previews
 * Should be called after temp_previews are deleted
 * @param previewIds - Array of preview IDs that were deleted
 */
export async function cleanupTempPreviewImages(
  previewIds: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (previewIds.length === 0) {
    return { success: true, deletedCount: 0 }
  }

  try {
    const supabase = createAdminClient()
    
    // List all files in temp-preview/{previewId}/ directories
    const pathsToDelete: string[] = []
    
    for (const previewId of previewIds) {
      const prefix = `temp-preview/${previewId}/`
      
      // List all files with this prefix
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(prefix, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (error) {
        console.error(`Error listing files for preview ${previewId}:`, error)
        continue
      }

      if (files && files.length > 0) {
        // Get full paths
        const fullPaths = files
          .filter(file => !file.name.endsWith('/')) // Exclude directories
          .map(file => `${prefix}${file.name}`)
        
        pathsToDelete.push(...fullPaths)
      }
    }

    if (pathsToDelete.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete all images
    const result = await deleteImages(pathsToDelete)
    
    if (result.success) {
      console.log(`✅ Cleaned up ${pathsToDelete.length} images for ${previewIds.length} expired previews`)
      return { success: true, deletedCount: pathsToDelete.length }
    } else {
      return { success: false, deletedCount: 0, error: result.error }
    }
  } catch (error) {
    console.error('Error cleaning up temp preview images:', error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Cleanup images for a deleted site
 * Extracts image paths from site config and deletes them
 * @param siteId - Site ID that was deleted
 * @param siteConfig - Site config (PageConfig) to extract image paths from
 */
export async function cleanupSiteImages(
  siteId: string,
  siteConfig: any
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    // Extract image paths from config
    const imagePaths = extractImagePathsFromConfig(siteConfig)
    
    // Also delete all files in site/{siteId}/ directory (for manually uploaded images)
    const supabase = createAdminClient()
    const prefix = `${siteId}/`
    
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error(`Error listing files for site ${siteId}:`, error)
    }

    const allPathsToDelete = new Set<string>(imagePaths)
    
    if (files && files.length > 0) {
      files
        .filter(file => !file.name.endsWith('/'))
        .forEach(file => {
          allPathsToDelete.add(`${prefix}${file.name}`)
        })
    }

    if (allPathsToDelete.size === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete all images
    const result = await deleteImages(Array.from(allPathsToDelete))
    
    if (result.success) {
      console.log(`✅ Cleaned up ${allPathsToDelete.size} images for site ${siteId}`)
      return { success: true, deletedCount: allPathsToDelete.size }
    } else {
      return { success: false, deletedCount: 0, error: result.error }
    }
  } catch (error) {
    console.error('Error cleaning up site images:', error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Server action to cleanup expired temp preview images
 * Should be called by cron job or scheduled task
 */
export async function cleanupExpiredPreviewImagesAction(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // Get all expired preview IDs
    const { data: expiredPreviews, error } = await supabase
      .from('temp_previews')
      .select('id')
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error fetching expired previews:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }

    if (!expiredPreviews || expiredPreviews.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    const previewIds = expiredPreviews.map(p => p.id)
    return await cleanupTempPreviewImages(previewIds)
  } catch (error) {
    console.error('Error in cleanupExpiredPreviewImagesAction:', error)
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
