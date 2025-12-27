/**
 * Orphan Image Cleanup
 * Handles cleanup of images that were removed from site config
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { extractImagePathsFromConfig, deleteImages } from './image-processor'
import type { PageConfig, LegacyPageConfig } from '@/types/builder'

/**
 * Cleanup orphaned images when site config is updated
 * Compares old and new config to find images that were removed
 * @param siteId - Site ID
 * @param oldConfig - Previous site config (can be either PageConfig or LegacyPageConfig)
 * @param newConfig - New site config (can be either PageConfig or LegacyPageConfig)
 * @returns Cleanup result with count of deleted images
 */
export async function cleanupOrphanedImages(
  siteId: string,
  oldConfig: PageConfig | LegacyPageConfig | null,
  newConfig: PageConfig | LegacyPageConfig
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(siteId)) {
      return { success: false, deletedCount: 0, error: 'Invalid site ID' }
    }

    // If no old config, nothing to cleanup
    if (!oldConfig) {
      return { success: true, deletedCount: 0 }
    }

    // Extract image paths from both configs
    const oldImagePaths = extractImagePathsFromConfig(oldConfig)
    const newImagePaths = extractImagePathsFromConfig(newConfig)

    // Find images that were removed (present in old but not in new)
    const orphanedPaths = oldImagePaths.filter(path => 
      !newImagePaths.includes(path) && 
      path.startsWith(`${siteId}/`) // Only delete images from this site's folder
    )

    if (orphanedPaths.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete orphaned images
    const result = await deleteImages(orphanedPaths)
    
    if (result.success) {
      console.log(`✅ Cleaned up ${orphanedPaths.length} orphaned images for site ${siteId}`)
      return { success: true, deletedCount: orphanedPaths.length }
    } else {
      return { success: false, deletedCount: 0, error: result.error }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned images:', error)
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Copy images from one site folder to another
 * Used when duplicating a site
 * @param sourceSiteId - Source site ID
 * @param targetSiteId - Target site ID
 * @param config - Site config containing image references
 * @returns Updated config with new image URLs
 */
export async function copyImagesForSite(
  sourceSiteId: string,
  targetSiteId: string,
  config: PageConfig | Record<string, any>
): Promise<{ success: boolean; updatedConfig?: PageConfig | Record<string, any>; error?: string }> {
  try {
    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sourceSiteId) || !uuidRegex.test(targetSiteId)) {
      return { success: false, error: 'Invalid site ID' }
    }

    const supabase = createAdminClient()
    const BUCKET_NAME = 'site-images'

    // Extract all image paths from config
    const imagePaths = extractImagePathsFromConfig(config)
    
    // Filter only images from source site folder
    const sourceImages = imagePaths.filter(path => path.startsWith(`${sourceSiteId}/`))

    if (sourceImages.length === 0) {
      // No images to copy
      return { success: true, updatedConfig: config }
    }

    // Create mapping of old URLs to new URLs
    const urlMap = new Map<string, string>()

    // Copy each image to target site folder
    for (const sourcePath of sourceImages) {
      try {
        // Download from source path
        const { data: sourceFile, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(sourcePath)

        if (downloadError) {
          console.warn(`Failed to download ${sourcePath}:`, downloadError)
          continue
        }

        // Generate target path (same filename, different folder)
        const filename = sourcePath.split('/').pop()
        if (!filename) continue

        const targetPath = `${targetSiteId}/${filename}`

        // Upload to target path
        const arrayBuffer = await sourceFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(targetPath, buffer, {
            contentType: sourceFile.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) {
          console.warn(`Failed to upload ${targetPath}:`, uploadError)
          continue
        }

        // Create URL mapping
        const { data: sourceUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(sourcePath)
        
        const { data: targetUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(targetPath)

        if (sourceUrlData?.publicUrl && targetUrlData?.publicUrl) {
          urlMap.set(sourceUrlData.publicUrl, targetUrlData.publicUrl)
        }
      } catch (error) {
        console.error(`Error copying image ${sourcePath}:`, error)
        // Continue with other images
      }
    }

    // Update config with new URLs
    const { replaceImageUrlsInConfig } = await import('./image-processor')
    const updatedConfig = replaceImageUrlsInConfig(config, urlMap)

    console.log(`✅ Copied ${urlMap.size} images from site ${sourceSiteId} to ${targetSiteId}`)

    return { success: true, updatedConfig }
  } catch (error) {
    console.error('Error copying images for site:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
