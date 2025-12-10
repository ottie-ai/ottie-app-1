/**
 * OpenAI API Client
 * Handles communication with OpenAI API for AI-powered features
 */

import OpenAI from 'openai'
import { getRealEstateConfigSystemMessage } from './prompts'

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
 * Generate text completion using OpenAI
 * 
 * @param prompt - The prompt to send to OpenAI
 * @param model - Model to use (default: 'gpt-4o-mini')
 * @param temperature - Temperature for randomness (0-2, default: 0.7)
 * @returns Generated text
 */
export async function generateText(
  prompt: string,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7
): Promise<string> {
  const client = getOpenAIClient()
  const callStartTime = Date.now()

  console.log('🤖 [OpenAI] Generating text...')
  console.log('🤖 [OpenAI] Model:', model)
  console.log('🤖 [OpenAI] Prompt length:', prompt.length)

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    const duration = Date.now() - callStartTime
    console.log(`✅ [OpenAI] Generated text (${duration}ms)`)

    return content
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
