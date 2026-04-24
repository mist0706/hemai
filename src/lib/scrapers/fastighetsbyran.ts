// Fastighetsbyrån scraper — JSON API, no auth required
// POST https://www.fastighetsbyran.com/HemsidanAPI/api/v1/soek/objekt/{page}/{flag}/
// Returns paginated results with 100 listings per page, ~22K total
//
// OPTIMIZED: All pages fetched in parallel (not sequential)

import { ScrapedProperty, SearchQuery } from '@/types';
import { inferCityFromUrl, cityMatches, normalize } from '@/lib/city-inference';

const FB_API = 'https://www.fastighetsbyran.com/HemsidanAPI/api/v1/soek/objekt';
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

interface FBResult {
  maeklarObjektId: number;
  bildUrl: string;
  bildUrlLista: string[];
  litenRubrik: string;
  storRubrik: string;
  metaData: string[];
  xKoordinat: number;
  yKoordinat: number;
  paaGang: boolean;
  budgivningPagaar: boolean;
  aerNyproduktion: boolean;
  bostadsTyp: string;
  boendeform: number;
  url: string;
  senasteTidObjektetBlevTillSalu: string | null;
}

interface FBResponse {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  rowCount: number;
  results: FBResult[];
}

function parseMetaData(meta: string[]): { price: number; rooms: number; size: number } {
  let price = 0, rooms = 0, size = 0;
  for (const item of meta) {
    const priceMatch = item.match(/([\d\s]+)\s*kr/);
    if (priceMatch) price = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
    const roomsMatch = item.match(/(\d+)\s*rum/);
    if (roomsMatch) rooms = parseInt(roomsMatch[1], 10);
    const sizeMatch = item.match(/([\d/]+)\s*kvm/);
    if (sizeMatch) size = parseInt(sizeMatch[1].split('/')[0], 10);
  }
  return { price, rooms, size };
}

function mapFBResult(result: FBResult, query: SearchQuery): ScrapedProperty | null {
  const { price, rooms, size } = parseMetaData(result.metaData || []);

  if (query.parsed.price?.min && price && price < query.parsed.price.min) return null;
  if (query.parsed.price?.max && price && price > query.parsed.price.max) return null;
  if (query.parsed.rooms?.min && rooms && rooms < query.parsed.rooms.min) return null;
  if (query.parsed.rooms?.max && rooms && rooms > query.parsed.rooms.max) return null;
  if (query.parsed.size?.min && size && size < query.parsed.size.min) return null;
  if (query.parsed.size?.max && size && size > query.parsed.size.max) return null;

  const areaParts = result.litenRubrik?.split(' - ') || [];
  const area = areaParts.length > 1 ? areaParts[1]?.trim() || result.litenRubrik || '' : result.litenRubrik || '';

  // Extract city from URL path (/till-salu/{county}/{municipality}/)
  const city = inferCityFromUrl(result.url || '');

  // Filter by city if query specifies one
  if (query.parsed.city && !cityMatches(city, query.parsed.city)) return null;

  return {
    id: `fb-${result.maeklarObjektId}`,
    source: 'fastighetsbyran',
    url: result.url || `https://www.fastighetsbyran.com/sv/sverige/till-salu/objekt/?objektID=${result.maeklarObjektId}`,
    address: result.storRubrik?.trim() || '',
    area,
    city,
    price,
    rooms,
    size,
    imageUrl: result.bildUrl || undefined,
    broker: 'Fastighetsbyrån',
    brokerUrl: result.url,
    scrapedAt: new Date().toISOString(),
  };
}

// Fetch a single page
async function fetchPage(page: number): Promise<FBResponse | null> {
  try {
    const response = await fetch(`${FB_API}/${page}/false/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'sv-SE,sv;q=0.9',
      },
      body: '{}',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function scrapeFastighetsbyran(query: SearchQuery): Promise<ScrapedProperty[]> {
  console.log(`[fastighetsbyran] Starting scrape for: "${query.raw}"`);

  try {
    // Phase 1: Fetch page 1 to discover total pages
    const firstPage = await fetchPage(1);
    if (!firstPage) {
      console.warn('[fastighetsbyran] Failed to fetch first page');
      return [];
    }

    const totalPages = Math.min(firstPage.pageCount || 1, MAX_PAGES);
    const allResults: ScrapedProperty[] = [];

    // Process first page
    for (const r of firstPage.results || []) {
      const mapped = mapFBResult(r, query);
      if (mapped) allResults.push(mapped);
    }

    console.log(`[fastighetsbyran] Page 1: ${firstPage.results?.length || 0} raw, ${allResults.length} after filters (${totalPages} total pages)`);

    // Phase 2: If more pages, fetch them ALL IN PARALLEL
    if (totalPages > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(fetchPage(p));
      }

      const pages = await Promise.allSettled(pagePromises);
      for (const result of pages) {
        if (result.status === 'fulfilled' && result.value) {
          for (const r of result.value.results || []) {
            const mapped = mapFBResult(r, query);
            if (mapped) allResults.push(mapped);
          }
        }
      }
    }

    console.log(`[fastighetsbyran] Total: ${allResults.length} listings after filters`);
    return allResults;
  } catch (err) {
    console.error('[fastighetsbyran] Error:', err);
    return [];
  }
}