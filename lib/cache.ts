const cache = new Map<string, { data: unknown; expires: number }>()
const TTL = 60 * 60 * 1000 // 1 hour

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + TTL })
}

export function cacheKey(prefix: string, days: number, filter?: string): string {
  return `${prefix}:${days}:${filter ?? 'all'}`
}
