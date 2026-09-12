// lib/ratelimit.ts
// Simple in-memory rate limiter for AI API routes
// Limits: 10 AI calls per IP per minute
// Note: resets on server restart — use Redis for production-grade limiting

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS  = 60 * 1000  // 1 minute
const MAX_CALLS  = 10          // per IP per window

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export function rateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    }
    store.set(ip, newEntry)
    return { allowed: true, remaining: MAX_CALLS - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= MAX_CALLS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return {
    allowed: true,
    remaining: MAX_CALLS - entry.count,
    resetAt: entry.resetAt,
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
