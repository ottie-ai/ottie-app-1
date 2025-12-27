/**
 * Image Upscaling with Replicate ESRGAN
 * Handles checking image dimensions and upscaling if needed
 */

import sharp from 'sharp'
import { upscaleWithESRGAN } from './client'
import { downloadAndUploadImage } from '@/lib/storage/image-processor'

const TARGET_WIDTH = 1920
const FETCH_TIMEOUT = 30000 // 30 seconds

/**
 * Get image dimensions from URL
 * Downloads the image and uses Sharp to read metadata
 */
export async function getImageDimensionsFromUrl(
  imageUrl: string
): Promise<{ width: number; height: number } | null> {
  try {
    console.log(`📐 [Upscale] Getting dimensions for: ${imageUrl.substring(0, 80)}...`)
    
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
        console.error('❌ [Upscale] Download timeout')
        return null
      }
      throw fetchError
    }

    if (!response.ok) {
      console.error(`❌ [Upscale] Failed to download image: ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get metadata using Sharp
    const metadata = await sharp(buffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      console.error('❌ [Upscale] Unable to read image dimensions')
      return null
    }

    console.log(`✅ [Upscale] Dimensions: ${metadata.width}x${metadata.height}`)
    
    return {
      width: metadata.width,
      height: metadata.height,
    }
  } catch (error) {
    console.error('❌ [Upscale] Error getting image dimensions:', error)
    return null
  }
}

/**
 * Calculate optimal upscale factor for target width
 * ESRGAN supports 2x and 4x upscaling
 * 
 * @param currentWidth - Current image width in pixels
 * @returns Scale factor (2 or 4) or null if no upscaling needed
 */
export function calculateScaleFactor(currentWidth: number): 2 | 4 | null {
  if (currentWidth >= TARGET_WIDTH) {
    return null // No upscaling needed
  }
  
  const idealScale = TARGET_WIDTH / currentWidth
  
  // If we need more than 4x, use 4x (maximum supported)
  if (idealScale >= 4) {
    return 4
  }
  
  // If we need more than 2x, use 4x (better to have higher resolution)
  if (idealScale > 2) {
    return 4
  }
  
  // Otherwise use 2x
  return 2
}

/**
 * Upscale hero image if it's smaller than 1920px width
 * 
 * @param imageUrl - URL of the hero image to check and potentially upscale
 * @param storagePath - Base path in Supabase Storage (e.g., 'temp-preview/{previewId}')
 * @returns New upscaled image URL, or original URL if upscaling fails/not needed
 */
export async function upscaleHeroImageIfNeeded(
  imageUrl: string,
  storagePath: string
): Promise<string> {
  try {
    console.log('🚀 [Upscale] Starting hero image upscaling check...')
    
    // Step 1: Get current image dimensions
    const dimensions = await getImageDimensionsFromUrl(imageUrl)
    
    if (!dimensions) {
      console.warn('⚠️ [Upscale] Could not get image dimensions, using original')
      return imageUrl
    }
    
    // Step 2: Check if upscaling is needed
    const scale = calculateScaleFactor(dimensions.width)
    
    if (!scale) {
      console.log(`✅ [Upscale] Image is already ${dimensions.width}px wide (>= ${TARGET_WIDTH}px), no upscaling needed`)
      return imageUrl
    }
    
    console.log(`🔍 [Upscale] Image is ${dimensions.width}px wide, upscaling with ${scale}x factor...`)
    
    // Step 3: Call Replicate ESRGAN
    let upscaledUrl: string
    try {
      upscaledUrl = await upscaleWithESRGAN(imageUrl, scale, true)
    } catch (esrganError) {
      console.error('❌ [Upscale] ESRGAN upscaling failed:', esrganError)
      console.warn('⚠️ [Upscale] Falling back to original image')
      return imageUrl
    }
    
    // Step 4: Download upscaled image and upload to Supabase Storage
    console.log('📥 [Upscale] Downloading and uploading upscaled image to storage...')
    
    const uploadResult = await downloadAndUploadImage(upscaledUrl, storagePath)
    
    if (!uploadResult.success) {
      console.error(`❌ [Upscale] Failed to upload upscaled image: ${uploadResult.error}`)
      console.warn('⚠️ [Upscale] Falling back to original image')
      return imageUrl
    }
    
    console.log(`✅ [Upscale] Hero image successfully upscaled from ${dimensions.width}px to ~${dimensions.width * scale}px`)
    console.log(`✅ [Upscale] New URL: ${uploadResult.url}`)
    
    return uploadResult.url
  } catch (error) {
    console.error('❌ [Upscale] Unexpected error during upscaling:', error)
    console.warn('⚠️ [Upscale] Falling back to original image')
    return imageUrl
  }
}

