/**
 * Image Processing Utilities
 * Handles downloading images from URLs and uploading them to Supabase Storage
 */

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET_NAME = 'site-images'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export interface ImageUploadResult {
  success: true
  url: string
  path: string
} | {
  success: false
  error: string
}

/**
 * Download image from URL and upload to Supabase Storage
 * @param imageUrl - Original image URL
 * @param targetPath - Path in bucket (e.g., 'temp-preview/{previewId}/{filename}' or '{siteId}/{filename}')
 * @returns Upload result with new public URL or error
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  targetPath: string
): Promise<ImageUploadResult> {
  try {
    // Validate URL
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      return { success: false, error: 'Invalid image URL' }
    }

    // Skip if already in our bucket
    if (imageUrl.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
      // Extract path from URL and return as-is
      const urlMatch = imageUrl.match(new RegExp(`/${BUCKET_NAME}/(.+)$`))
      if (urlMatch) {
        return { 
          success: true, 
          url: imageUrl,
          path: urlMatch[1]
        }
      }
    }

    // Download image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OttieBot/1.0)',
      },
    })

    if (!response.ok) {
      return { success: false, error: `Failed to download image: ${response.statusText}` }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      return { success: false, error: 'URL does not point to an image' }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check size
    if (buffer.length > MAX_IMAGE_SIZE) {
      return { success: false, error: `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)` }
    }

    // Determine file extension from content type or URL
    let extension = 'jpg'
    if (contentType.includes('png')) extension = 'png'
    else if (contentType.includes('gif')) extension = 'gif'
    else if (contentType.includes('webp')) extension = 'webp'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg'
    else {
      // Try to get extension from URL
      const urlMatch = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)
      if (urlMatch) {
        extension = urlMatch[1].toLowerCase()
      }
    }

    // Generate unique filename if targetPath doesn't include extension
    const finalPath = targetPath.includes('.') 
      ? targetPath 
      : `${targetPath}.${extension}`

    // Upload to Supabase Storage
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(finalPath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true, // Allow overwriting
      })

    if (error) {
      console.error('Error uploading image to Supabase:', error)
      return { success: false, error: `Failed to upload image: ${error.message}` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(finalPath)

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' }
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: finalPath,
    }
  } catch (error) {
    console.error('Error processing image:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing image' 
    }
  }
}

/**
 * Process multiple images concurrently
 * @param imageUrls - Array of image URLs to process
 * @param basePath - Base path in bucket (e.g., 'temp-preview/{previewId}' or '{siteId}')
 * @param maxConcurrent - Maximum concurrent downloads (default: 5)
 * @returns Map of original URL to new URL
 */
export async function processImages(
  imageUrls: string[],
  basePath: string,
  maxConcurrent: number = 5
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  
  // Process in batches
  for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
    const batch = imageUrls.slice(i, i + maxConcurrent)
    const results = await Promise.allSettled(
      batch.map(async (url, index) => {
        const filename = `img-${Date.now()}-${i + index}`
        const targetPath = `${basePath}/${filename}`
        const result = await downloadAndUploadImage(url, targetPath)
        
        if (result.success) {
          return { originalUrl: url, newUrl: result.url }
        } else {
          console.warn(`Failed to process image ${url}:`, result.error)
          // Return original URL as fallback (but we should avoid using it)
          return { originalUrl: url, newUrl: url }
        }
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        urlMap.set(result.value.originalUrl, result.value.newUrl)
      }
    })
  }

  return urlMap
}

/**
 * Extract all image URLs from PageConfig
 * Recursively finds all image URLs in the config structure
 */
export function extractImageUrlsFromConfig(config: any): string[] {
  const urls: string[] = []
  
  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item))
      return
    }
    
    // Check common image fields
    if (typeof obj === 'string') {
      // Check if it's a URL
      if (obj.startsWith('http://') || obj.startsWith('https://')) {
        // Check if it looks like an image URL
        if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(obj) || 
            obj.includes('/image') || 
            obj.includes('/photo') ||
            obj.includes('/img')) {
          urls.push(obj)
        }
      }
      return
    }
    
    // Common image field names
    const imageFields = [
      'url', 'src', 'image', 'imageUrl', 'image_url', 
      'photo', 'photoUrl', 'photo_url',
      'propertyImage', 'backgroundImage',
      'floorplan_url', 'virtual_tour_url'
    ]
    
    for (const [key, value] of Object.entries(obj)) {
      if (imageFields.includes(key.toLowerCase()) && typeof value === 'string') {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          urls.push(value)
        }
      } else {
        traverse(value)
      }
    }
  }
  
  traverse(config)
  return [...new Set(urls)] // Remove duplicates
}

/**
 * Replace image URLs in PageConfig with new URLs from map
 */
export function replaceImageUrlsInConfig(
  config: any,
  urlMap: Map<string, string>
): any {
  if (!config || typeof config !== 'object') {
    return config
  }
  
  if (Array.isArray(config)) {
    return config.map(item => replaceImageUrlsInConfig(item, urlMap))
  }
  
  const result: any = {}
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      // Check if it's an image URL that needs replacement
      if (urlMap.has(value)) {
        result[key] = urlMap.get(value)!
      } else {
        result[key] = value
      }
    } else if (value && typeof value === 'object') {
      result[key] = replaceImageUrlsInConfig(value, urlMap)
    } else {
      result[key] = value
    }
  }
  
  return result
}

/**
 * Delete images from storage by their paths
 * @param paths - Array of storage paths to delete
 */
export async function deleteImages(paths: string[]): Promise<{ success: boolean; error?: string }> {
  if (paths.length === 0) {
    return { success: true }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths)

    if (error) {
      console.error('Error deleting images:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting images:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error deleting images' 
    }
  }
}

/**
 * Extract image paths from PageConfig
 * Returns array of storage paths that can be used for deletion
 */
export function extractImagePathsFromConfig(config: any): string[] {
  const paths: string[] = []
  
  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item))
      return
    }
    
    if (typeof obj === 'string') {
      // Check if it's a URL from our bucket
      const match = obj.match(/\/storage\/v1\/object\/public\/site-images\/(.+)$/)
      if (match) {
        paths.push(match[1])
      }
      return
    }
    
    for (const value of Object.values(obj)) {
      traverse(value)
    }
  }
  
  traverse(config)
  return [...new Set(paths)] // Remove duplicates
}

/**
 * Move images from temp-preview/{previewId}/ to {siteId}/
 * Updates config with new paths
 * Called when a temp preview is claimed and converted to a site
 */
export async function moveTempPreviewImagesToSite(
  previewId: string,
  siteId: string,
  config: any
): Promise<{ success: boolean; updatedConfig?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    const prefix = `temp-preview/${previewId}/`
    
    // List all files in temp-preview directory
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (listError) {
      console.error('Error listing temp preview images:', listError)
      return { success: false, error: listError.message }
    }

    if (!files || files.length === 0) {
      // No images to move
      return { success: true, updatedConfig: config }
    }

    // Create mapping of old paths to new paths
    const pathMap = new Map<string, string>()
    
    for (const file of files) {
      if (file.name.endsWith('/')) continue // Skip directories
      
      const oldPath = `${prefix}${file.name}`
      const newPath = `${siteId}/${file.name}`
      pathMap.set(oldPath, newPath)
    }

    // Copy files to new location (Supabase doesn't have move, so we copy then delete)
    for (const [oldPath, newPath] of pathMap.entries()) {
      // Download from old path
      const { data: oldFile, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(oldPath)

      if (downloadError) {
        console.warn(`Failed to download ${oldPath}:`, downloadError)
        continue
      }

      // Upload to new path
      const arrayBuffer = await oldFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(newPath, buffer, {
          contentType: oldFile.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.warn(`Failed to upload ${newPath}:`, uploadError)
        continue
      }

      // Delete old file
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([oldPath])
    }

    // Update config with new URLs
    const urlMap = new Map<string, string>()
    for (const [oldPath, newPath] of pathMap.entries()) {
      const { data: oldUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(oldPath)
      const { data: newUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(newPath)
      
      if (oldUrlData?.publicUrl && newUrlData?.publicUrl) {
        urlMap.set(oldUrlData.publicUrl, newUrlData.publicUrl)
      }
    }

    const updatedConfig = replaceImageUrlsInConfig(config, urlMap)

    return { success: true, updatedConfig }
  } catch (error) {
    console.error('Error moving temp preview images to site:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
