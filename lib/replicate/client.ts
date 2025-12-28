/**
 * Replicate API Client
 * Handles AI model inference via Replicate
 */

import Replicate from 'replicate'

let client: Replicate | null = null

/**
 * Get Replicate client instance
 * Throws error if REPLICATE_API_TOKEN is not configured
 */
export function getReplicateClient(): Replicate {
  if (client) {
    return client
  }

  const apiToken = process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    throw new Error(
      'REPLICATE_API_TOKEN is not configured. Please add it to your environment variables.'
    )
  }

  client = new Replicate({
    auth: apiToken,
  })

  return client
}

/**
 * Upscale image using Real-ESRGAN
 * 
 * @param imageUrl - URL of the image to upscale
 * @param scale - Upscaling factor (2 or 4)
 * @param retryOnFailure - Whether to retry once on failure
 * @returns URL of the upscaled image
 */
export async function upscaleWithESRGAN(
  imageUrl: string,
  scale: 2 | 4 = 2,
  retryOnFailure: boolean = true
): Promise<string> {
  const client = getReplicateClient()
  
  console.log(`🔍 [ESRGAN] Upscaling image with ${scale}x scale...`)
  console.log(`🔍 [ESRGAN] Input: ${imageUrl.substring(0, 80)}...`)
  
  const callStartTime = Date.now()
  
  // Timeout wrapper - 120 seconds max
  const timeoutMs = 120000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Replicate API timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  
  try {
    // Using the official Replicate Real-ESRGAN model
    const apiCall = client.run(
      'daanelson/real-esrgan-a100:499940604f95b416c3939423df5c64a5c95cfd32b464d755dacfe2192a2de7ef',
      {
        input: {
          image: imageUrl,
          scale: scale,
          face_enhance: false, // Keep false for general property images
        }
      }
    ) as Promise<unknown>
    
    const output = await Promise.race([apiCall, timeoutPromise]) as unknown
    
    const callDuration = Date.now() - callStartTime
    
    // Output should be a URL string
    if (typeof output === 'string') {
      console.log(`✅ [ESRGAN] Upscaling complete (${callDuration}ms)`)
      console.log(`✅ [ESRGAN] Output: ${output.substring(0, 80)}...`)
      return output
    } else {
      throw new Error('Unexpected output format from Replicate')
    }
  } catch (error: any) {
    const duration = Date.now() - callStartTime
    console.error(`❌ [ESRGAN] Error after ${duration}ms:`)
    console.error(`❌ [ESRGAN] Error type:`, error?.constructor?.name)
    console.error(`❌ [ESRGAN] Error message:`, error?.message)
    
    // Retry logic
    if (retryOnFailure) {
      console.log(`🔄 [ESRGAN] Retrying upscaling...`)
      try {
        return await upscaleWithESRGAN(imageUrl, scale, false) // No retry on retry
      } catch (retryError: any) {
        console.error(`❌ [ESRGAN] Retry failed:`, retryError?.message)
        throw retryError
      }
    }
    
    throw error
  }
}

