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
    // Output is a FileOutput object (ReadableStream with .url() method) or array
    const output = await Promise.race([apiCall, timeoutPromise]) as any
    
    const callDuration = Date.now() - callStartTime
    
    // Debug: Log the actual output to see what we're getting
    console.log(`🔍 [ESRGAN] Output type: ${typeof output}`)
    console.log(`🔍 [ESRGAN] Is array: ${Array.isArray(output)}`)
    console.log(`🔍 [ESRGAN] Has url method: ${typeof output?.url}`)
    console.log(`🔍 [ESRGAN] Constructor: ${output?.constructor?.name}`)
    
    // Handle different output formats from Replicate
    let outputUrl: string | null = null
    
    // Case 1: Array of FileOutput objects (most common)
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0]
      console.log(`🔍 [ESRGAN] First array element type: ${typeof firstOutput}`)
      console.log(`🔍 [ESRGAN] First array element has url: ${typeof firstOutput?.url}`)
      
      // FileOutput has .url() method
      if (typeof firstOutput?.url === 'function') {
        outputUrl = firstOutput.url()
      } else if (typeof firstOutput === 'string') {
        outputUrl = firstOutput
      }
    }
    // Case 2: Single FileOutput object (ReadableStream with url method)
    else if (output && typeof output?.url === 'function') {
      console.log(`🔍 [ESRGAN] Calling output.url()...`)
      const urlResult = output.url()
      console.log(`🔍 [ESRGAN] URL result type: ${typeof urlResult}`)
      console.log(`🔍 [ESRGAN] URL result: ${urlResult}`)
      // Convert to string if needed (URL object has toString)
      outputUrl = typeof urlResult === 'string' ? urlResult : String(urlResult)
      console.log(`🔍 [ESRGAN] Final outputUrl: ${outputUrl}`)
    }
    // Case 3: ReadableStream - might need to read the stream
    else if (output && output.constructor?.name === 'ReadableStream') {
      console.log(`🔍 [ESRGAN] Got ReadableStream, checking for url property...`)
      // Try to access url as property (might be getter)
      if (output.url) {
        outputUrl = typeof output.url === 'function' ? output.url() : output.url
        console.log(`🔍 [ESRGAN] Got URL from stream: ${outputUrl}`)
      }
    }
    // Case 4: Direct string URL
    else if (typeof output === 'string') {
      outputUrl = output
    }
    
    if (outputUrl && typeof outputUrl === 'string') {
      console.log(`✅ [ESRGAN] Upscaling complete (${callDuration}ms)`)
      console.log(`✅ [ESRGAN] Output URL: ${outputUrl.substring(0, 80)}...`)
      return outputUrl
    } else {
      // Log all properties of output for debugging
      const props = output ? Object.getOwnPropertyNames(output) : []
      const protoProps = output ? Object.getOwnPropertyNames(Object.getPrototypeOf(output) || {}) : []
      console.error(`🔍 [ESRGAN] Output properties: ${props.join(', ')}`)
      console.error(`🔍 [ESRGAN] Output prototype properties: ${protoProps.join(', ')}`)
      throw new Error(`Unexpected output format from Replicate. Type: ${typeof output}, IsArray: ${Array.isArray(output)}, Constructor: ${output?.constructor?.name}`)
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

