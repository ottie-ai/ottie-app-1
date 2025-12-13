/**
 * OpenAI & Groq API Client
 * Handles communication with OpenAI and Groq APIs for AI-powered features
 */

import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { getRealEstateConfigSystemMessage } from './main-prompt'

/**
 * Get OpenAI client instance
 * Throws error if OPENAI_API_KEY is not configured
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  return new OpenAI({
    apiKey,
  })
}

/**
 * Get Groq client instance
 * Throws error if GROQ_API_KEY is not configured
 */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  return new Groq({
    apiKey,
  })
}

/**
 * Generate structured JSON from text
 * Uses Groq (Llama Versatile) as primary provider with OpenAI as fallback
 * 
 * @param prompt - The prompt to send to AI
 * @param schema - Optional JSON schema for structured output
 * @param model - Model to use for OpenAI fallback (default: 'gpt-4o-mini')
 * @returns Generated JSON object
 */
export async function generateStructuredJSON(
  prompt: string,
  schema?: object,
  model?: string
): Promise<{ data: any; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  // Try Groq first if API key is configured
  const hasGroqKey = !!process.env.GROQ_API_KEY
  
  if (hasGroqKey) {
    try {
      console.log('🔄 [Structured JSON] Attempting Groq (Llama Versatile) first...')
      return await generateStructuredJSONWithGroq(prompt, schema, 'llama-3.3-70b-versatile')
    } catch (groqError: any) {
      console.warn('⚠️ [Structured JSON] Groq failed, falling back to OpenAI...')
      console.warn('⚠️ [Structured JSON] Groq error:', groqError?.message || groqError)
      
      // Fallback to OpenAI
      return await generateStructuredJSONWithOpenAI(prompt, schema, model || 'gpt-4o-mini')
    }
  } else {
    // No Groq key, use OpenAI directly
    console.log('🔄 [Structured JSON] Using OpenAI (Groq not configured)...')
    return await generateStructuredJSONWithOpenAI(prompt, schema, model || 'gpt-4o-mini')
  }
}

/**
 * Generate structured JSON using OpenAI
 */
async function generateStructuredJSONWithOpenAI(
  prompt: string,
  schema?: object,
  model: string = 'gpt-4o-mini'
): Promise<{ data: any; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  const client = getOpenAIClient()
  const callStartTime = Date.now()

  console.log('🤖 [OpenAI] Generating structured JSON...')
  console.log('🤖 [OpenAI] Model:', model)
  console.log('🤖 [OpenAI] Prompt length:', prompt.length)

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: schema
            ? `You are a helpful assistant that generates valid JSON. Return only valid JSON matching the provided schema.`
            : getRealEstateConfigSystemMessage(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      response_format: schema
        ? { type: 'json_schema', json_schema: { name: 'response', schema: schema as any } }
        : { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    console.log(`✅ [OpenAI] Generated JSON (${callDuration}ms)`)
    
    // Extract usage info
    const usage = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    } : undefined

    if (usage) {
      console.log(`📊 [OpenAI] Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total tokens`)
    }

    // Parse JSON from response
    try {
      const data = JSON.parse(content)
      return { data, usage, callDuration }
    } catch (parseError) {
      console.error('❌ [OpenAI] Failed to parse JSON:', parseError)
      throw new Error(`Invalid JSON in OpenAI response: ${parseError}`)
    }
  } catch (error: any) {
    const duration = Date.now() - callStartTime
    console.error(`❌ [OpenAI] Error after ${duration}ms:`, error.message)

    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid')
    }
    if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded')
    }

    throw new Error(`OpenAI error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate structured JSON using Groq
 */
async function generateStructuredJSONWithGroq(
  prompt: string,
  schema?: object,
  model: string = 'llama-3.3-70b-versatile'
): Promise<{ data: any; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  const client = getGroqClient()
  const callStartTime = Date.now()

  console.log('🤖 [Groq] Generating structured JSON...')
  console.log('🤖 [Groq] Model:', model)
  console.log('🤖 [Groq] Prompt length:', prompt.length)

  // Timeout wrapper - 60 seconds max
  const timeoutMs = 60000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Groq API timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    const apiCall = client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: schema
            ? `You are a helpful assistant that generates valid JSON. Return only valid JSON matching the provided schema.`
            : getRealEstateConfigSystemMessage(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      response_format: { type: 'json_object' },
      max_tokens: 8192, // 8k tokens for large JSON responses
    })

    const response = await Promise.race([apiCall, timeoutPromise])

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in Groq response')
    }

    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    console.log(`✅ [Groq] Generated JSON (${callDuration}ms)`)
    
    // Extract usage info
    const usage = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    } : undefined

    if (usage) {
      console.log(`📊 [Groq] Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total tokens`)
    }

    // Parse JSON from response
    try {
      const data = JSON.parse(content)
      return { data, usage, callDuration }
    } catch (parseError) {
      console.error('❌ [Groq] Failed to parse JSON:', parseError)
      throw new Error(`Invalid JSON in Groq response: ${parseError}`)
    }
  } catch (error: any) {
    const duration = Date.now() - callStartTime
    console.error(`❌ [Groq] Error after ${duration}ms:`)
    console.error(`❌ [Groq] Error type:`, error?.constructor?.name)
    console.error(`❌ [Groq] Error message:`, error?.message)
    console.error(`❌ [Groq] Error status:`, error?.status)
    console.error(`❌ [Groq] Error code:`, error?.code)

    // Re-throw to trigger fallback to OpenAI
    throw error
  }
}

/**
 * Generate title and highlights for real estate listing using Groq (Llama Versatile)
 * Uses higher temperature (0.8) for more creative, lifestyle-focused titles
 * Returns JSON with title, subtitle and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param language - Optional language code (ISO 2-letter)
 * @returns Generated JSON object with title, subtitle and highlights
 */
async function generateTitleWithGroq(
  propertyData: string,
  language?: string
): Promise<{ title: string; subtitle: string; highlights: any[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  const { getTitleGenerationPrompt } = await import('./title-prompts')
  const prompt = getTitleGenerationPrompt(propertyData, language)
  
  const client = getGroqClient()
  const callStartTime = Date.now()

  console.log('🤖 [Groq] Generating title, subtitle and highlights...')
  console.log('🤖 [Groq] Model: llama-3.3-70b-versatile')
  console.log('🤖 [Groq] Temperature: 0.8')

  // Timeout wrapper - 60 seconds max
  const timeoutMs = 60000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Groq API timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    const apiCall = client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Higher temperature for more creative titles
      response_format: { type: 'json_object' },
      max_tokens: 8192, // 8k tokens for title, subtitle and highlights
    })

    const response = await Promise.race([apiCall, timeoutPromise])

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in Groq response')
    }

    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    
    // Extract usage info
    const usage = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    } : undefined

    if (usage) {
      console.log(`📊 [Groq] Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total tokens`)
    }

    // Parse JSON from response
    try {
      const result = JSON.parse(content)
      
      // Validate structure
      if (!result.title || typeof result.title !== 'string') {
        throw new Error('Invalid JSON: missing or invalid title field')
      }
      if (!result.subtitle || typeof result.subtitle !== 'string') {
        throw new Error('Invalid JSON: missing or invalid subtitle field')
      }
      if (!result.highlights || !Array.isArray(result.highlights)) {
        throw new Error('Invalid JSON: missing or invalid highlights field')
      }

      console.log(`✅ [Groq] Generated title: "${result.title}" with subtitle and ${result.highlights.length} highlights (${callDuration}ms)`)

      return {
        title: result.title.trim(),
        subtitle: result.subtitle.trim(),
        highlights: result.highlights,
        usage,
        callDuration,
      }
    } catch (parseError) {
      console.error('❌ [Groq] Failed to parse JSON:', parseError)
      throw new Error(`Invalid JSON in Groq response: ${parseError}`)
    }
  } catch (error: any) {
    const duration = Date.now() - callStartTime
    console.error(`❌ [Groq] Title generation error after ${duration}ms:`)
    console.error(`❌ [Groq] Error type:`, error?.constructor?.name)
    console.error(`❌ [Groq] Error message:`, error?.message)

    // Re-throw to trigger fallback
    throw error
  }
}

/**
 * Generate title and highlights for real estate listing using OpenAI
 * Uses higher temperature (0.8) for more creative, lifestyle-focused titles
 * Returns JSON with title, subtitle and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param model - Model to use (default: 'gpt-4o-mini')
 * @param language - Optional language code (ISO 2-letter)
 * @returns Generated JSON object with title, subtitle and highlights
 */
async function generateTitleWithOpenAI(
  propertyData: string,
  model: string = 'gpt-4o-mini',
  language?: string
): Promise<{ title: string; subtitle: string; highlights: any[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  const { getTitleGenerationPrompt } = await import('./title-prompts')
  const prompt = getTitleGenerationPrompt(propertyData, language)
  
  const client = getOpenAIClient()
  const callStartTime = Date.now()

  console.log('🤖 [OpenAI] Generating title, subtitle and highlights...')
  console.log('🤖 [OpenAI] Model:', model)
  console.log('🤖 [OpenAI] Temperature: 0.8')

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Higher temperature for more creative titles
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    
    // Extract usage info
    const usage = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    } : undefined

    if (usage) {
      console.log(`📊 [OpenAI] Usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total tokens`)
    }

    // Parse JSON from response
    try {
      const result = JSON.parse(content)
      
      // Validate structure
      if (!result.title || typeof result.title !== 'string') {
        throw new Error('Invalid JSON: missing or invalid title field')
      }
      if (!result.subtitle || typeof result.subtitle !== 'string') {
        throw new Error('Invalid JSON: missing or invalid subtitle field')
      }
      if (!result.highlights || !Array.isArray(result.highlights)) {
        throw new Error('Invalid JSON: missing or invalid highlights field')
      }

      console.log(`✅ [OpenAI] Generated title: "${result.title}" with subtitle and ${result.highlights.length} highlights (${callDuration}ms)`)

      return {
        title: result.title.trim(),
        subtitle: result.subtitle.trim(),
        highlights: result.highlights,
        usage,
        callDuration,
      }
    } catch (parseError) {
      console.error('❌ [OpenAI] Failed to parse JSON:', parseError)
      throw new Error(`Invalid JSON in OpenAI response: ${parseError}`)
    }
  } catch (error: any) {
    const duration = Date.now() - callStartTime
    console.error(`❌ [OpenAI] Title generation error after ${duration}ms:`, error.message)

    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid')
    }
    if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded')
    }

    throw new Error(`OpenAI title generation error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate title, subtitle and highlights for real estate listing
 * Uses Groq (Llama Versatile) as primary provider with OpenAI as fallback
 * Returns JSON with title, subtitle and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param model - Model to use for OpenAI fallback (default: 'gpt-4o-mini')
 * @param language - Optional language code (ISO 2-letter)
 * @returns Generated JSON object with title, subtitle and highlights
 */
export async function generateTitle(
  propertyData: string,
  model: string = 'gpt-4o-mini',
  language?: string
): Promise<{ title: string; subtitle: string; highlights: any[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  // Try Groq first if API key is configured
  const hasGroqKey = !!process.env.GROQ_API_KEY
  
  if (hasGroqKey) {
    try {
      console.log('🔄 [Title Generation] Attempting Groq (Llama Versatile) first...')
      return await generateTitleWithGroq(propertyData, language)
    } catch (groqError: any) {
      console.warn('⚠️ [Title Generation] Groq failed, falling back to OpenAI...')
      console.warn('⚠️ [Title Generation] Groq error:', groqError?.message || groqError)
      
      // Fallback to OpenAI
      return await generateTitleWithOpenAI(propertyData, model, language)
    }
  } else {
    // No Groq key, use OpenAI directly
    console.log('🔄 [Title Generation] Using OpenAI (Groq not configured)...')
    return await generateTitleWithOpenAI(propertyData, model, language)
  }
}
