// AI module public API

import { SearchFilters, Listing, AISummaryResponse } from '@/types';
import { parseQuery, ParsedQuery } from './query-parser';
import { scoreListing, ScoreBreakdown } from './scorer';
import { summarizeListing } from './summarizer';

export { parseQuery } from './query-parser';
export { scoreListing } from './scorer';
export { summarizeListing } from './summarizer';

export interface EnrichmentResult {
  aiSummary?: string;
  aiScore: number;
  aiTags: string[];
  scoreBreakdown?: ScoreBreakdown;
}

export async function enrichListing(
  listing: Listing,
  query: SearchFilters
): Promise<EnrichmentResult> {
  // 1. Score the listing (fast, rule-based)
  const breakdown = scoreListing(listing, query);

  // 2. Generate AI summary (uses LLM, slower)
  try {
    const summary = await summarizeListing(listing, query, breakdown.overall);
    return {
      aiSummary: summary.summary,
      aiScore: summary.score,
      aiTags: summary.tags,
      scoreBreakdown: breakdown,
    };
  } catch {
    // Fall back to just the score
    return {
      aiScore: breakdown.overall,
      aiTags: [],
      scoreBreakdown: breakdown,
    };
  }
}

export async function enrichListings(
  listings: Listing[],
  query: SearchFilters,
  maxConcurrent: number = 3
): Promise<Listing[]> {
  // Score all listings first (fast)
  const scored = listings.map(listing => ({
    listing,
    score: scoreListing(listing, query),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score.overall - a.score.overall);

  // Enrich top results with AI summaries (limit to save API calls)
  const toEnrich = scored.slice(0, maxConcurrent);

  const enrichmentPromises = toEnrich.map(async ({ listing, score }) => {
    try {
      const summary = await summarizeListing(listing, query, score.overall);
      return {
        ...listing,
        aiSummary: summary.summary,
        aiScore: summary.score,
        aiTags: summary.tags,
      };
    } catch {
      return {
        ...listing,
        aiScore: score.overall,
        aiTags: [],
      };
    }
  });

  const enrichedResults = await Promise.allSettled(enrichmentPromises);

  // Build final enriched listings
  const enrichedMap = new Map<string, Listing>();
  let idx = 0;
  for (const result of enrichedResults) {
    if (result.status === 'fulfilled') {
      enrichedMap.set(toEnrich[idx].listing.id, result.value);
    }
    idx++;
  }

  // Merge: use enriched version if available, otherwise just add score
  return scored.map(({ listing, score }) => {
    const enriched = enrichedMap.get(listing.id);
    if (enriched) return enriched;
    return {
      ...listing,
      aiScore: score.overall,
      aiTags: [],
    };
  });
}