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
  
  // Save original Groq key setting
  const originalGroqKey = process.env.GROQ_API_KEY
  
  try {
    // Test Groq (temporarily ensure Groq key is set)
    console.log('\n📊 [Test] Testing Groq (Llama-3.3-70b-versatile)...')
    if (!originalGroqKey) {
      console.warn('⚠️ [Test] GROQ_API_KEY not set, skipping Groq test')
    } else {
      process.env.GROQ_API_KEY = originalGroqKey // Ensure it's set
    }
    const groqStartTime = Date.now()
    let groqResult
    let groqDuration = 0
    try {
      groqResult = await generateStructuredJSON(
        getRealEstateConfigPrompt('text', testData),
        undefined,
        'gpt-4o-mini'
      )
      groqDuration = Date.now() - groqStartTime
    } catch (groqError: any) {
      console.warn('⚠️ [Test] Groq test failed:', groqError?.message)
      groqResult = null
    }
    
    // Test OpenAI (temporarily remove Groq key to force OpenAI)
    console.log('\n📊 [Test] Testing OpenAI (GPT-4o-mini)...')
    delete process.env.GROQ_API_KEY // Force OpenAI usage
    const openaiStartTime = Date.now()
    const openaiResult = await generateStructuredJSON(
      getRealEstateConfigPrompt('text', testData),
      undefined,
      'gpt-4o-mini'
    )
    const openaiDuration = Date.now() - openaiStartTime
    
    // Compare results
    const comparison = {
      openai: {
        duration: openaiDuration,
        usage: openaiResult.usage,
        dataSize: JSON.stringify(openaiResult.data).length,
        fields: Object.keys(openaiResult.data).length,
      },
      groq: groqResult ? {
        duration: groqDuration,
        usage: groqResult.usage,
        dataSize: JSON.stringify(groqResult.data).length,
        fields: Object.keys(groqResult.data).length,
      } : null,
      speedup: groqResult ? `${(openaiDuration / groqDuration).toFixed(2)}x` : 'N/A',
      winner: groqResult && groqDuration < openaiDuration ? 'Groq' : 'OpenAI',
    }
    
    console.log('\n📊 [Test] Comparison Results:')
    console.log('  OpenAI Duration:', openaiDuration, 'ms')
    if (groqResult) {
      console.log('  Groq Duration:', groqDuration, 'ms')
      console.log('  Speed Improvement:', comparison.speedup)
      console.log('  Faster Provider:', comparison.winner)
      console.log('  Groq Tokens:', groqResult.usage?.total_tokens || 'N/A')
    } else {
      console.log('  Groq: Test skipped or failed')
    }
    console.log('  OpenAI Tokens:', openaiResult.usage?.total_tokens || 'N/A')
    
    return {
      success: true,
      comparison,
      openaiResult: openaiResult.data,
      groqResult: groqResult?.data || null,
    }
  } catch (error: any) {
    console.error('❌ [Test] Comparison failed:', error.message)
    return {
      success: false,
      error: error.message,
    }
  } finally {
    // Restore original Groq key setting
    if (originalGroqKey) {
      process.env.GROQ_API_KEY = originalGroqKey
    } else {
      delete process.env.GROQ_API_KEY
    }
  }
}

/**
 * Get current AI provider configuration
 */
export function getCurrentProviderConfig() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGroq = !!process.env.GROQ_API_KEY
  
  // With new logic: Groq is primary (if configured), OpenAI is fallback
  const primaryProvider = hasGroq ? 'groq' : 'openai'
  
  return {
    primaryProvider,
    fallbackProvider: 'openai',
    availableProviders: {
      openai: hasOpenAI,
      groq: hasGroq,
    },
    recommendations: {
      canUseOpenAI: hasOpenAI,
      canUseGroq: hasGroq,
      isOptimalSetup: hasOpenAI && hasGroq, // Best to have both configured (Groq primary, OpenAI fallback)
    },
  }
}

/**
 * Validate provider configuration
 * Throws error if configuration is invalid
 */
export function validateProviderConfig() {
  // OpenAI is always required (for fallback and Call 2)
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required (for fallback and Call 2 - title/highlights generation)')
  }
  
  // Groq is optional (primary provider if configured)
  const hasGroq = !!process.env.GROQ_API_KEY
  
  if (hasGroq) {
    return { 
      valid: true, 
      primaryProvider: 'groq', 
      fallbackProvider: 'openai',
      groqModel: 'llama-3.3-70b-versatile',
      openaiModel: 'gpt-4o-mini'
    }
  } else {
    return { 
      valid: true, 
      primaryProvider: 'openai', 
      fallbackProvider: null,
      openaiModel: 'gpt-4o-mini'
    }
  }
}
