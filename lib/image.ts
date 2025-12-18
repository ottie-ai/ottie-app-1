/**
 * Image Processing with Sharp.js
 * Handles image optimization for real estate photos
 */

import sharp from 'sharp'

// Real estate photo specs
const MAX_WIDTH = 1920
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const WEBP_QUALITY = 80

export interface ProcessedImage {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number
}

export interface ImageProcessingOptions {
  maxWidth?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

/**
 * Process image buffer with Sharp
 * - Resize to max width (1920px) if larger
 * - Convert to WebP format
 * - Optimize quality (starts at 80, reduces if needed to meet 5MB limit)
 * - Remove EXIF metadata
 * 
 * Uses iterative quality reduction if initial processing exceeds 5MB
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = MAX_WIDTH,
    quality: initialQuality = WEBP_QUALITY,
    format = 'webp',
  } = options

  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image: unable to read dimensions')
    }

    // Calculate new dimensions (only resize if larger than max)
    let width = metadata.width
    let height = metadata.height
    
    if (width > maxWidth) {
      const aspectRatio = height / width
      width = maxWidth
      height = Math.round(maxWidth * aspectRatio)
    }

    // Iterative quality reduction to meet size limit
    // Start with initial quality, reduce by 10 each iteration until we meet the limit
    let currentQuality = initialQuality
    const qualitySteps = [initialQuality, 70, 60, 50, 40, 30, 20]
    let processedBuffer: Buffer | null = null
    let lastError: Error | null = null

    for (const quality of qualitySteps) {
      if (quality > currentQuality) continue // Skip if we already tried higher quality
      
      try {
        // Process image
        let pipeline = sharp(buffer)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .rotate() // Auto-rotate based on EXIF orientation

        // Convert to target format
        if (format === 'webp') {
          pipeline = pipeline.webp({ quality })
        } else if (format === 'jpeg') {
          pipeline = pipeline.jpeg({ quality, mozjpeg: true })
        } else if (format === 'png') {
          pipeline = pipeline.png({ quality })
        }

        // Remove metadata (EXIF, ICC profile, etc.)
        pipeline = pipeline.withMetadata({
          exif: {},
          icc: undefined,
        })

        // Execute processing
        processedBuffer = await pipeline.toBuffer()

        // Check if we meet the size limit
        if (processedBuffer.length <= MAX_FILE_SIZE) {
          // Success! Return the processed image
          return {
            buffer: processedBuffer,
            width,
            height,
            format,
            size: processedBuffer.length,
          }
        }

        // If still too large, continue to next quality step
        lastError = new Error(
          `Processed image exceeds maximum size (${(processedBuffer.length / 1024 / 1024).toFixed(1)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB) even at quality ${quality}`
        )
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to process image')
        // Continue to next quality step
      }
    }

    // If we get here, we couldn't meet the size limit even at minimum quality
    // Return the smallest result we got (or throw if we have no result)
    if (processedBuffer && processedBuffer.length > 0) {
      // Log warning but return the best we could do
      console.warn(
        `Image could not be reduced below ${MAX_FILE_SIZE / 1024 / 1024}MB. ` +
        `Returning ${(processedBuffer.length / 1024 / 1024).toFixed(1)}MB result at quality ${qualitySteps[qualitySteps.length - 1]}.`
      )
      return {
        buffer: processedBuffer,
        width,
        height,
        format,
        size: processedBuffer.length,
      }
    }

    // If we have no result at all, throw error
    throw lastError || new Error('Failed to process image: unable to meet size requirements')
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to process image'
    )
  }
}

/**
 * Validate image buffer
 * Checks if buffer is a valid image format
 */
export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean
  error?: string
  metadata?: {
    format: string
    width: number
    height: number
    size: number
  }
}> {
  try {
    const metadata = await sharp(buffer).metadata()

    if (!metadata.format) {
      return { valid: false, error: 'Invalid image format' }
    }

    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif']
    if (!validFormats.includes(metadata.format)) {
      return { valid: false, error: `Unsupported format: ${metadata.format}` }
    }

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Unable to read image dimensions' }
    }

    // Note: We don't check input buffer size here because Sharp.js will optimize it
    // The input can be up to 30MB, and Sharp.js will reduce it to <5MB

    return {
      valid: true,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate image',
    }
  }
}

/**
 * Process multiple images concurrently
 */
export async function processImages(
  buffers: Buffer[],
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage[]> {
  return Promise.all(
    buffers.map((buffer) => processImage(buffer, options))
  )
}

/**
 * Get image dimensions without processing
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata()
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions')
  }

  return {
    width: metadata.width,
    height: metadata.height,
  }
}
