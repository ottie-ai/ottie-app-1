/**
 * Image Processing Utilities
 * Handles downloading images from URLs and uploading them to Supabase Storage
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  sanitizePath,
  isValidImageExtension,
  isValidImageMimeType,
  validateImageMagicBytes,
  sanitizeFilename,
  generateSecureFilename,
  isValidImageUrl,
} from './security'

const BUCKET_NAME = 'site-images'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const FETCH_TIMEOUT = 30000 // 30 seconds

export type ImageUploadResult =
  | {
      success: true
      url: string
      path: string
    }
  | {
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
    // Validate URL format
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      return { success: false, error: 'Invalid image URL' }
    }

    // Validate URL is safe (not localhost, private IPs, etc.)
    if (!isValidImageUrl(imageUrl)) {
      return { success: false, error: 'Invalid image URL' }
    }

    // Sanitize and validate target path
    const sanitizedPath = sanitizePath(targetPath)
    if (!sanitizedPath) {
      return { success: false, error: 'Invalid target path' }
    }

    // Skip if already in our bucket
    if (imageUrl.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
      // Extract path from URL and validate it
      const urlMatch = imageUrl.match(new RegExp(`/${BUCKET_NAME}/(.+)$`))
      if (urlMatch && sanitizePath(urlMatch[1])) {
        return { 
          success: true, 
          url: imageUrl,
          path: urlMatch[1]
        }
      }
    }

    // Download image with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    let response: Response
    try {
      response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OttieBot/1.0)',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { success: false, error: 'Download timeout' }
      }
      throw fetchError
    }

    if (!response.ok) {
      return { success: false, error: 'Failed to download image' }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !isValidImageMimeType(contentType)) {
      return { success: false, error: 'Invalid image type' }
    }

    // Read response
    const arrayBuffer = await response.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    // Validate magic bytes to prevent MIME type spoofing
    const magicBytesCheck = validateImageMagicBytes(buffer)
    if (!magicBytesCheck.valid) {
      return { success: false, error: 'Invalid image file' }
    }

    // Use detected type from magic bytes if available, otherwise use content-type
    const detectedType = magicBytesCheck.detectedType || contentType
    const extension = detectedType.split('/')[1]?.split(';')[0] || 'jpg'
    
    if (!isValidImageExtension(extension)) {
      return { success: false, error: 'Invalid image format' }
    }

    // Optimize image if too large (> 5MB)
    if (buffer.length > MAX_IMAGE_SIZE) {
      console.log(`📦 [Image] Image too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB), optimizing...`)
      try {
        // Dynamic import to avoid bundling sharp in client code
        const { default: sharp } = await import('sharp')
        // Optimize with progressive quality reduction until under 5MB
        let quality = 85
        let optimizedBuffer: Buffer = Buffer.from(buffer)
        
        while (optimizedBuffer.length > MAX_IMAGE_SIZE && quality > 50) {
          optimizedBuffer = await sharp(optimizedBuffer)
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer()
          
          console.log(`📦 [Image] Quality ${quality}: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`)
          
          if (optimizedBuffer.length <= MAX_IMAGE_SIZE) {
            console.log(`✅ [Image] Optimized to ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`)
            break
          }
          
          quality -= 10
        }
        
        if (optimizedBuffer.length <= MAX_IMAGE_SIZE) {
          buffer = optimizedBuffer
        }

        // If still too large, resize
        if (buffer.length > MAX_IMAGE_SIZE) {
          console.log(`📦 [Image] Still too large, resizing...`)
          buffer = await sharp(buffer)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true, mozjpeg: true })
            .toBuffer()
          console.log(`✅ [Image] Resized to ${(buffer.length / 1024 / 1024).toFixed(2)}MB`)
        }
        
        // Final check
        if (buffer.length > MAX_IMAGE_SIZE) {
          return { success: false, error: `Image too large even after optimization (${(buffer.length / 1024 / 1024).toFixed(2)}MB)` }
        }
      } catch (optimizeError) {
        console.error('❌ [Image] Optimization failed:', optimizeError)
        return { success: false, error: `Image too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB) and optimization failed` }
      }
    }

    // Generate secure filename
    const filename = generateSecureFilename(extension)
    const finalPath = `${sanitizedPath}/${filename}`

    // Validate final path again
    const finalSanitizedPath = sanitizePath(finalPath)
    if (!finalSanitizedPath) {
      return { success: false, error: 'Invalid file path' }
    }

    // Upload to Supabase Storage
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(finalSanitizedPath, buffer, {
        contentType: detectedType,
        cacheControl: '3600',
        upsert: true, // Allow overwriting - Supabase will add suffix if needed
      })

    if (error) {
      console.error('Error uploading image to Supabase:', error)
      // Don't expose internal error details
      return { success: false, error: 'Failed to upload image' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(finalSanitizedPath)

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get image URL' }
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: finalSanitizedPath,
    }
  } catch (error) {
    console.error('Error processing image:', error)
    // Don't expose internal error details
    return { 
      success: false, 
      error: 'Failed to process image' 
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
  
  // Validate basePath
  const sanitizedBasePath = sanitizePath(basePath)
  if (!sanitizedBasePath) {
    console.error('Invalid basePath:', basePath)
    return urlMap
  }

  // Filter out invalid URLs
  const validUrls = imageUrls.filter(url => isValidImageUrl(url))
  if (validUrls.length !== imageUrls.length) {
    console.warn(`Filtered out ${imageUrls.length - validUrls.length} invalid URLs`)
  }

  // Process in batches
  for (let i = 0; i < validUrls.length; i += maxConcurrent) {
    const batch = validUrls.slice(i, i + maxConcurrent)
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        // Use sanitized basePath - filename will be generated securely in downloadAndUploadImage
        const result = await downloadAndUploadImage(url, sanitizedBasePath)
        
        if (result.success) {
          return { originalUrl: url, newUrl: result.url }
        } else {
          console.warn(`Failed to process image:`, result.error)
          // Don't return original URL - fail silently to avoid using external URLs
          return null
        }
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
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
    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(previewId) || !uuidRegex.test(siteId)) {
      return { success: false, error: 'Invalid preview or site ID' }
    }

    const supabase = createAdminClient()
    const basePath = `temp-preview/${previewId}`
    
    // Validate and sanitize base path
    const sanitizedBasePath = sanitizePath(basePath)
    if (!sanitizedBasePath) {
      return { success: false, error: 'Invalid preview path' }
    }

    // List all files in temp-preview directory
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(sanitizedBasePath, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (listError) {
      console.error('Error listing temp preview images:', listError)
      return { success: false, error: 'Failed to list images' }
    }

    if (!files || files.length === 0) {
      // No images to move
      return { success: true, updatedConfig: config }
    }

    // Validate site path
    const siteBasePath = sanitizePath(siteId)
    if (!siteBasePath) {
      return { success: false, error: 'Invalid site path' }
    }

    // Create mapping of old paths to new paths
    const pathMap = new Map<string, string>()
    
    for (const file of files) {
      if (file.name.endsWith('/')) continue // Skip directories
      
      // Validate filename
      if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
        console.warn(`Skipping invalid filename: ${file.name}`)
        continue
      }

      const oldPath = `${sanitizedBasePath}/${file.name}`
      const newPath = `${siteBasePath}/${file.name}`
      
      // Validate both paths
      if (sanitizePath(oldPath) && sanitizePath(newPath)) {
        pathMap.set(oldPath, newPath)
      }
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
