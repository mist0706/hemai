// In-memory cache with TTL for scraper results

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function hashQuery(params: Record<string, any>): string {
  const sorted = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sorted);
}

export function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidate(key: string): boolean {
  return cache.delete(key);
}

export function clear(): void {
  cache.clear();
}

export function size(): number {
  // Clean expired entries first
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }
  return cache.size;
}