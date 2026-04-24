// HemAI Search Cache — In-memory with TTL + query signature hashing
// 30-minute cache per query. Deduplicates identical searches.

import { ScrapedProperty, SearchQuery } from '@/types';

interface CacheEntry {
  results: ScrapedProperty[];
  timestamp: number;
  querySig: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 200; // Max cached queries

const cache = new Map<string, CacheEntry>();

// Build a deterministic key from the parsed query
export function querySignature(query: SearchQuery): string {
  const p = query.parsed;
  const parts = [
    p.city || '',
    p.area || '',
    p.type || '',
    p.price?.min || '', p.price?.max || '',
    p.rooms?.min || '', p.rooms?.max || '',
    p.size?.min || '', p.size?.max || '',
    (p.features || []).sort().join(','),
  ];
  return parts.join('|').toLowerCase();
}

export function getCached(query: SearchQuery): ScrapedProperty[] | null {
  const sig = querySignature(query);
  const entry = cache.get(sig);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(sig);
    return null;
  }

  console.log(`[cache] HIT for sig="${sig}" (${entry.results.length} results, ${Math.round(age/1000)}s old)`);
  return entry.results;
}

export function setCache(query: SearchQuery, results: ScrapedProperty[]): void {
  const sig = querySignature(query);

  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(sig, { results, timestamp: Date.now(), querySig: sig });
  console.log(`[cache] STORED sig="${sig}" (${results.length} results)`);
}

export function cacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE, ttlMinutes: CACHE_TTL_MS / 60000 };
}

// Look up a single listing by ID across all cached results
export function getListingsCached(id: string): ScrapedProperty | null {
  const now = Date.now();
  for (const [, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) continue;
    const found = entry.results.find(l => l.id === id);
    if (found) return found;
  }
  return null;
}