/**
 * OpenAI API Client
 * Handles communication with OpenAI API for AI-powered features
 */

import OpenAI from 'openai'
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
 * Generate structured JSON from text using OpenAI
 * 
 * @param prompt - The prompt to send to OpenAI
 * @param schema - Optional JSON schema for structured output
 * @param model - Model to use (default: 'gpt-4o-mini')
 * @returns Generated JSON object
 */
export async function generateStructuredJSON(
  prompt: string,
  schema?: object,
  model: string = 'gpt-4o-mini'
): Promise<any> {
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

    const duration = Date.now() - callStartTime
    console.log(`✅ [OpenAI] Generated JSON (${duration}ms)`)

    // Parse JSON from response
    try {
      return JSON.parse(content)
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
  model: string = 'gpt-4o-mini'
): Promise<{ title: string; highlights: any[] }> {
  const { getTitleGenerationPrompt } = await import('./title-prompts')
  const prompt = getTitleGenerationPrompt(propertyData, currentTitle, currentHighlights)
  
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

      const duration = Date.now() - callStartTime
      console.log(`✅ [OpenAI] Generated title: "${result.title}" with ${result.highlights.length} highlights (${duration}ms)`)

      return {
        title: result.title.trim(),
        highlights: result.highlights,
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
