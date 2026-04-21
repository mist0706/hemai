// Scraper orchestrator — fans out to Hemnet + Bovision, deduplicates, merges

import { Listing, SearchFilters } from '@/types';
import { scrapeHemnet } from './hemnet';
import { scrapeBovision } from './bovision';
import { get, set, hashQuery } from '../cache';

export interface ScrapeResult {
  listings: Listing[];
  total: number;
  sources: {
    hemnet: number;
    bovision: number;
  };
  fromCache: boolean;
}

export async function scrapeListings(filters: SearchFilters): Promise<ScrapeResult> {
  // Check cache first
  const cacheKey = hashQuery(filters as any);
  const cached = get<ScrapeResult>(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Fan out to both scrapers in parallel
  const [hemnetResults, bovisionResults] = await Promise.allSettled([
    scrapeHemnet(filters),
    scrapeBovision(filters),
  ]);

  const hemnetListings = hemnetResults.status === 'fulfilled' ? hemnetResults.value : [];
  const bovisionListings = bovisionResults.status === 'fulfilled' ? bovisionResults.value : [];

  // Deduplicate by URL (prefer Hemnet if same listing appears on both)
  const seenUrls = new Set<string>();
  const merged: Listing[] = [];

  // Add Hemnet results first (higher priority)
  for (const listing of hemnetListings) {
    const urlKey = normalizeUrl(listing.url);
    if (!seenUrls.has(urlKey)) {
      seenUrls.add(urlKey);
      merged.push(listing);
    }
  }

  // Add Bovision results that aren't duplicates
  for (const listing of bovisionListings) {
    const urlKey = normalizeUrl(listing.url);
    if (!seenUrls.has(urlKey)) {
      seenUrls.add(urlKey);
      merged.push(listing);
    }
  }

  const result: ScrapeResult = {
    listings: merged,
    total: merged.length,
    sources: {
      hemnet: hemnetListings.length,
      bovision: bovisionListings.length,
    },
    fromCache: false,
  };

  // Cache the result
  set(cacheKey, result);

  return result;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slashes and query params for comparison
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export { buildHemnetSearchUrl } from './hemnet';
export { buildBovisionSearchUrl } from './bovision';
export { resolveArea, getAvgPricePerSqm } from './areas';