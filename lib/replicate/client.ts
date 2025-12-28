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
    // Using nightmareai/real-esrgan with specific version
    // https://replicate.com/nightmareai/real-esrgan
    // Note: Using latest version hash - check model page for updates
    const apiCall = client.run(
      'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
      {
        input: {
          image: imageUrl,
          scale: scale,
          face_enhance: false, // Keep false for general property images
        }
      }
    )
    
    // Wait for completion with timeout
    const output = await Promise.race([apiCall, timeoutPromise]) as unknown
    
    const callDuration = Date.now() - callStartTime
    
    // Debug: Log the actual output to see what we're getting
    console.log(`🔍 [ESRGAN] Output type: ${typeof output}`)
    console.log(`🔍 [ESRGAN] Output value:`, JSON.stringify(output))
    
    // Output can be a string URL or an object with 'output' property
    let outputUrl: string | null = null
    
    if (typeof output === 'string') {
      outputUrl = output
    } else if (output && typeof output === 'object' && 'output' in output) {
      // Handle object response with output property
      const outputData = (output as any).output
      if (typeof outputData === 'string') {
        outputUrl = outputData
      } else if (Array.isArray(outputData) && outputData.length > 0) {
        outputUrl = outputData[0]
      }
    } else if (Array.isArray(output) && output.length > 0) {
      // Handle array response
      outputUrl = output[0]
    }
    
    if (outputUrl && typeof outputUrl === 'string') {
      console.log(`✅ [ESRGAN] Upscaling complete (${callDuration}ms)`)
      console.log(`✅ [ESRGAN] Output: ${outputUrl.substring(0, 80)}...`)
      return outputUrl
    } else {
      throw new Error(`Unexpected output format from Replicate. Type: ${typeof output}, Value: ${JSON.stringify(output)}`)
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

