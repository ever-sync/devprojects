// Simple in-process rate limiter using a sliding window counter.
// Per-instance on Vercel serverless, but provides meaningful protection
// against bursts within the same function instance lifetime.

interface WindowEntry {
  count: number
  windowStart: number
}

const store = new Map<string, WindowEntry>()

const WINDOW_MS = 60_000 // 1 minute
const CLEANUP_INTERVAL = 5 * 60_000 // prune stale entries every 5 min

let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key)
  }
}

export function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number } {
  cleanup()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
