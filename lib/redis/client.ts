/**
 * Upstash Redis Client Configuration
 * Used for queue management and caching
 * 
 * Supports both manual env vars and Vercel Upstash integration vars:
 * - Manual: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * - Vercel: KV_REST_API_URL, KV_REST_API_TOKEN (or REDIS_URL, KV_REST_API_TOKEN)
 */

import { Redis } from '@upstash/redis'

// Get Redis URL from various possible env vars (Vercel integration uses different names)
const redisUrl = 
  process.env.KV_REST_API_URL ||           // Vercel Upstash KV integration
  process.env.REDIS_URL ||                 // Alternative Vercel format
  process.env.UPSTASH_REDIS_REST_URL ||   // Manual setup
  process.env.KV_URL                       // Another Vercel format

// Get Redis token from various possible env vars
const redisToken = 
  process.env.KV_REST_API_TOKEN ||         // Vercel Upstash KV integration (read-write)
  process.env.KV_REST_API_READ_ONLY_TOKEN || // Vercel read-only token (fallback)
  process.env.UPSTASH_REDIS_REST_TOKEN    // Manual setup

if (!redisUrl || !redisToken) {
  throw new Error(
    'Missing Upstash Redis credentials. ' +
    'Set one of: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel) or ' +
    'UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (manual)'
  )
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

// Queue key prefixes
export const QUEUE_KEYS = {
  SCRAPE_QUEUE: 'queue:scrape',
  SCRAPE_PROCESSING: 'queue:scrape:processing',
  SCRAPE_STATS: 'queue:scrape:stats',
} as const
