/**
 * Simple in-memory rate limiter
 * For production, consider using @upstash/ratelimit with Redis
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory store (resets on server restart)
const store = new Map<string, RateLimitRecord>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  /** Maximum number of requests */
  limit: number
  /** Time window in seconds */
  window: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, window: 60 }
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.window * 1000
  const key = `${identifier}:${config.limit}:${config.window}`

  // Get or create record
  let record = store.get(key)

  // Reset if window expired
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    }
    store.set(key, record)
  }

  // Increment count
  record.count++

  // Check if over limit
  if (record.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetAt,
    }
  }

  return {
    success: true,
    remaining: config.limit - record.count,
    reset: record.resetAt,
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /** 10 requests per minute - for uploads */
  UPLOAD: { limit: 10, window: 60 },
  
  /** 20 requests per minute - for deletes */
  DELETE: { limit: 20, window: 60 },
  
  /** 100 requests per minute - for reads */
  READ: { limit: 100, window: 60 },
  
  /** 5 requests per minute - for sensitive operations */
  SENSITIVE: { limit: 5, window: 60 },
} as const
