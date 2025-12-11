/**
 * Test/Debug Helper for AI Provider Testing
 * 
 * This file provides helper functions to test and compare OpenAI vs Groq providers
 * Usage: Import in your API routes or server actions for testing
 */

import { generateStructuredJSON } from './client'
import { getRealEstateConfigPrompt } from './main-prompt'

/**
 * Test both providers with the same prompt and compare results
 * Useful for development and quality comparison
 * 
 * @param testData - Sample property data (text format)
 * @returns Comparison results from both providers
 */
export async function compareProviders(testData: string) {
  console.log('🔬 [Provider Test] Starting comparison test...')
  console.log('🔬 [Provider Test] Test data length:', testData.length, 'characters')
  
  // Save original provider setting
  const originalProvider = process.env.CALL1_AI_PROVIDER
  
  try {
    // Test OpenAI
    console.log('\n📊 [Test] Testing OpenAI (GPT-4o-mini)...')
    process.env.CALL1_AI_PROVIDER = 'openai'
    const openaiStartTime = Date.now()
    const openaiResult = await generateStructuredJSON(
      getRealEstateConfigPrompt('text', testData),
      undefined,
      'gpt-4o-mini'
    )
    const openaiDuration = Date.now() - openaiStartTime
    
    // Test Groq
    console.log('\n📊 [Test] Testing Groq (Llama-3.1-8b-instant)...')
    process.env.CALL1_AI_PROVIDER = 'groq'
    const groqStartTime = Date.now()
    const groqResult = await generateStructuredJSON(
      getRealEstateConfigPrompt('text', testData),
      undefined,
      'llama-3.1-8b-instant'
    )
    const groqDuration = Date.now() - groqStartTime
    
    // Compare results
    const comparison = {
      openai: {
        duration: openaiDuration,
        usage: openaiResult.usage,
        dataSize: JSON.stringify(openaiResult.data).length,
        fields: Object.keys(openaiResult.data).length,
      },
      groq: {
        duration: groqDuration,
        usage: groqResult.usage,
        dataSize: JSON.stringify(groqResult.data).length,
        fields: Object.keys(groqResult.data).length,
      },
      speedup: `${(openaiDuration / groqDuration).toFixed(2)}x`,
      winner: groqDuration < openaiDuration ? 'Groq' : 'OpenAI',
    }
    
    console.log('\n📊 [Test] Comparison Results:')
    console.log('  OpenAI Duration:', openaiDuration, 'ms')
    console.log('  Groq Duration:', groqDuration, 'ms')
    console.log('  Speed Improvement:', comparison.speedup)
    console.log('  Faster Provider:', comparison.winner)
    console.log('  OpenAI Tokens:', openaiResult.usage?.total_tokens || 'N/A')
    console.log('  Groq Tokens:', groqResult.usage?.total_tokens || 'N/A')
    
    return {
      success: true,
      comparison,
      openaiResult: openaiResult.data,
      groqResult: groqResult.data,
    }
  } catch (error: any) {
    console.error('❌ [Test] Comparison failed:', error.message)
    return {
      success: false,
      error: error.message,
    }
  } finally {
    // Restore original provider setting
    process.env.CALL1_AI_PROVIDER = originalProvider
  }
}

/**
 * Get current AI provider configuration
 */
export function getCurrentProviderConfig() {
  const provider = (process.env.CALL1_AI_PROVIDER || 'openai').toLowerCase()
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGroq = !!process.env.GROQ_API_KEY
  
  return {
    currentProvider: provider,
    availableProviders: {
      openai: hasOpenAI,
      groq: hasGroq,
    },
    recommendations: {
      canUseOpenAI: hasOpenAI,
      canUseGroq: hasGroq,
      isOptimalSetup: hasOpenAI && hasGroq, // Best to have both configured
    },
  }
}

/**
 * Validate provider configuration
 * Throws error if configuration is invalid
 */
export function validateProviderConfig() {
  const provider = (process.env.CALL1_AI_PROVIDER || 'openai').toLowerCase()
  
  // OpenAI is always required for Call 2
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required (for Call 2 - title/highlights generation)')
  }
  
  // Check Call 1 provider
  if (provider === 'openai') {
    // Already checked above
    return { valid: true, provider: 'openai', model: 'gpt-4o-mini' }
  } else if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Either set it or change CALL1_AI_PROVIDER to "openai"')
    }
    return { valid: true, provider: 'groq', model: 'llama-3.1-8b-instant' }
  } else {
    throw new Error(`Invalid CALL1_AI_PROVIDER: "${provider}". Must be "openai" or "groq"`)
  }
}
