// Svensk Fastighetsförmedling scraper — HTML with embedded ld+json structured data
// URL: https://www.svenskfast.se/bostad/
// Pagination: ?p=1, ?p=2, etc.
// Each listing card contains a <script type="application/ld+json"> with
// RealEstateListing schema.org data (address, price, rooms, size, image).
// No Playwright needed — server-rendered HTML with jQuery.

import { ScrapedProperty, SearchQuery, PropertyType } from '@/types';

const SF_BASE = 'https://www.svenskfast.se';
const SF_LISTING_PATH = '/bostad/';
const MAX_PAGES = 5;

// URL path segment to PropertyType
const PATH_TYPE_MAP: Record<string, PropertyType> = {
  'bostadsratt': 'lägenhet',
  'villa': 'hus',
  'radhus': 'radhus',
  'fritidshus': 'fritidshus',
};

interface SFListingData {
  url: string;
  name: string;
  address: {
    addressLocality: string;    // city
    addressRegion?: string;     // area/neighborhood
    postalCode?: string;
    streetAddress: string;
  };
  numberOfRooms: string;
  price: {
    value: string;              // e.g., "1\u00a0590\u00a0000" (with non-breaking spaces)
    currency: string;
  };
  floorSize: {
    value: string;
    unitCode: string;
  };
  image?: string[];
}

function parseSwedishPrice(value: string): number {
  // Remove non-breaking spaces (\u00a0) and regular spaces, then parse
  const cleaned = value.replace(/[\s\u00a0]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function inferTypeFromUrl(url: string): PropertyType | null {
  const pathSegments = url.split('/').filter(Boolean);
  for (const seg of pathSegments) {
    const lower = seg.toLowerCase();
    if (PATH_TYPE_MAP[lower]) return PATH_TYPE_MAP[lower];
  }
  return null;
}

function mapSFListing(data: SFListingData, query: SearchQuery): ScrapedProperty | null {
  const price = parseSwedishPrice(data.price?.value || '0');
  const rooms = parseInt(data.numberOfRooms || '0', 10);
  const size = parseFloat(data.floorSize?.value || '0');

  // Determine type from URL path
  const propType = inferTypeFromUrl(data.url) || 'lägenhet';

  // Client-side filters
  if (query.parsed.price?.min && price && price < query.parsed.price.min) return null;
  if (query.parsed.price?.max && price && price > query.parsed.price.max) return null;
  if (query.parsed.rooms?.min && rooms && rooms < query.parsed.rooms.min) return null;
  if (query.parsed.rooms?.max && rooms && rooms > query.parsed.rooms.max) return null;
  if (query.parsed.size?.min && size && size < query.parsed.size.min) return null;
  if (query.parsed.size?.max && size && size > query.parsed.size.max) return null;
  if (query.parsed.type && propType !== query.parsed.type) return null;

  // City/area filtering
  const city = data.address?.addressLocality || '';
  const area = data.address?.addressRegion || '';
  if (query.parsed.city) {
    const qCity = query.parsed.city.toLowerCase();
    if (city.toLowerCase() !== qCity) return null;
  }
  if (query.parsed.area) {
    const qArea = query.parsed.area.toLowerCase();
    if (area.toLowerCase() !== qArea) return null;
  }

  // Extract listing ID from URL (last path segment before trailing slash)
  const idMatch = data.url.match(/\/(\d+)\/?$/);
  const listingId = idMatch ? idMatch[1] : '';

  const imageUrl = data.image?.[0] || undefined;

  return {
    id: `sf-${listingId}`,
    source: 'svenskfast',
    url: data.url,
    address: data.address?.streetAddress || '',
    area,
    city,
    price,
    rooms,
    size,
    imageUrl,
    broker: 'Svensk Fastighetsförmedling',
    brokerUrl: data.url,
    scrapedAt: new Date().toISOString(),
  };
}

// Extract ld+json RealEstateListing blocks from HTML
function extractLDJsonBlocks(html: string): SFListingData[] {
  const listings: SFListingData[] = [];
  const regex = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Only process RealEstateListing types
      if (data['@type'] === 'RealEstateListing') {
        listings.push(data as SFListingData);
      }
    } catch {
      // Skip malformed JSON blocks
    }
  }

  return listings;
}

export async function scrapeSvenskFast(query: SearchQuery): Promise<ScrapedProperty[]> {
  const allResults: ScrapedProperty[] = [];
  console.log(`[svenskfast] Starting scrape for query: ${query.raw}`);

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1
        ? `${SF_BASE}${SF_LISTING_PATH}`
        : `${SF_BASE}${SF_LISTING_PATH}?p=${page}`;

      console.log(`[svenskfast] Fetching page ${page}: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept-Language': 'sv-SE,sv;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 429) {
        console.warn('[svenskfast] Rate limited (429)');
        break;
      }

      if (!response.ok) {
        console.warn(`[svenskfast] HTTP ${response.status}`);
        break;
      }

      const html = await response.text();
      const listings = extractLDJsonBlocks(html);
      console.log(`[svenskfast] Page ${page}: ${listings.length} listings`);

      // No listings = no more pages
      if (listings.length === 0) break;

      for (const listing of listings) {
        const mapped = mapSFListing(listing, query);
        if (mapped) allResults.push(mapped);
      }

      // Less than ~15 listings per page = last page
      if (listings.length < 10) break;

      // Small delay between pages
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[svenskfast] Total: ${allResults.length} listings after filters`);
    return allResults;
  } catch (err) {
    console.error('[svenskfast] Error:', err);
    return allResults;
  }
}