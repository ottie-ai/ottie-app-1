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
 * Generate structured JSON from text using OpenAI or Groq
 * Provider is determined by CALL1_AI_PROVIDER env variable (default: 'openai')
 * 
 * @param prompt - The prompt to send to AI
 * @param schema - Optional JSON schema for structured output
 * @param model - Model to use (default: 'gpt-4o-mini' for OpenAI, 'llama-3.1-8b-instant' for Groq)
 * @returns Generated JSON object
 */
export async function generateStructuredJSON(
  prompt: string,
  schema?: object,
  model?: string
): Promise<{ data: any; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  // Determine provider from env variable (default: 'openai')
  // Options: 'openai' or 'groq'
  const provider = (process.env.CALL1_AI_PROVIDER || 'openai').toLowerCase()
  
  if (provider === 'groq') {
    // If Groq provider, ignore passed model and use Groq default model
    // This prevents passing OpenAI model names (like 'gpt-4o-mini') to Groq
    return generateStructuredJSONWithGroq(prompt, schema, 'llama-3.3-70b-versatile')
  } else {
    // For OpenAI, use passed model or default to 'gpt-4o-mini'
    return generateStructuredJSONWithOpenAI(prompt, schema, model || 'gpt-4o-mini')
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
      response_format: { type: 'json_object' },
    })

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
    console.error(`❌ [Groq] Error after ${duration}ms:`, error.message)

    if (error.status === 401) {
      throw new Error('Groq API key is invalid')
    }
    if (error.status === 429) {
      throw new Error('Groq API rate limit exceeded')
    }

    throw new Error(`Groq error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate title and highlights for real estate listing using OpenAI
 * Uses higher temperature (0.8) for more creative, lifestyle-focused titles
 * Returns JSON with title and highlights
 * 
 * @param propertyData - The property data (JSON stringified config from first OpenAI call)
 * @param currentTitle - Optional current title to improve/regenerate
 * @param currentHighlights - Optional current highlights to improve/regenerate
 * @param model - Model to use (default: 'gpt-4o-mini')
 * @returns Generated JSON object with title and highlights
 */
export async function generateTitle(
  propertyData: string,
  currentTitle?: string,
  currentHighlights?: any[],
  model: string = 'gpt-4o-mini',
  language?: string
): Promise<{ title: string; highlights: any[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; callDuration: number }> {
  const { getTitleGenerationPrompt } = await import('./title-prompts')
  const prompt = getTitleGenerationPrompt(propertyData, currentTitle, currentHighlights, language)
  
  const client = getOpenAIClient()
  const callStartTime = Date.now()

  console.log('🤖 [OpenAI] Generating title and highlights...')
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
      if (!result.highlights || !Array.isArray(result.highlights)) {
        throw new Error('Invalid JSON: missing or invalid highlights field')
      }

      console.log(`✅ [OpenAI] Generated title: "${result.title}" with ${result.highlights.length} highlights (${callDuration}ms)`)

      return {
        title: result.title.trim(),
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
