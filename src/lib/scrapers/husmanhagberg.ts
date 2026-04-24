// HusmanHagberg scraper — Vitec direct API, no auth required
// GET https://api.husmanhagberg.se/object/api/objects
// OPTIMIZED: Parallel page fetching

import { ScrapedProperty, SearchQuery } from '@/types';

const HH_API = 'https://api.husmanhagberg.se/object/api/objects';
const PAGE_LIMIT = 100;
const MAX_OFFSET = 500; // max total objects per query (5 pages x 100)

const CITY_MAP: Record<string, string> = {
  'göteborg': 'Goteborg', 'gothenburg': 'Goteborg', 'goteborg': 'Goteborg',
  'stockholm': 'Stockholm', 'malmö': 'Malmo', 'malmo': 'Malmo',
  'uppsala': 'Uppsala', 'linköping': 'Linkoping', 'linkoping': 'Linkoping',
  'västerås': 'Vasteras', 'vasteras': 'Vasteras',
  'örebro': 'Orebro', 'orebro': 'Orebro',
  'norrköping': 'Norrkoping', 'norrkoping': 'Norrkoping',
  'helsingborg': 'Helsingborg',
  'jönköping': 'Jönkoping', 'jonkoping': 'Jönkoping',
  'umeå': 'Umea', 'lund': 'Lund',
  'borås': 'Boras', 'boras': 'Boras',
};

const HH_TYPE_MAP: Record<string, ScrapedProperty['source']> = {};

interface HHAddress {
  latitude: string; longitude: string;
  streetAddress: string; city: string; municipality: string; area: string;
}

interface HHEstate {
  objectReference: string;
  estateType: string;
  address: HHAddress;
  livingSpace: number;
  numberOfRooms: number;
  startingPrice: number;
  monthlyFee: number | null;
  bidding: boolean;
  statusId: string;
  showAsComing: boolean;
  newConstruction: boolean;
  plotSize: number | null;
  thumb?: { list?: { url: string }; source?: { url: string }; wide?: { url: string } };
  details?: {
    assignment?: { responsibleBroker?: string };
    floorAndElevator?: { floor?: number };
    price?: { finalPrice?: number };
  };
}

interface HHResponse { estates: HHEstate[]; }

function mapHHEstate(estate: HHEstate, query: SearchQuery): ScrapedProperty | null {
  const { address, startingPrice, livingSpace, numberOfRooms, monthlyFee } = estate;

  if (query.parsed.price?.min && startingPrice < query.parsed.price.min) return null;
  if (query.parsed.price?.max && startingPrice > query.parsed.price.max) return null;
  if (query.parsed.rooms?.min && numberOfRooms < query.parsed.rooms.min) return null;
  if (query.parsed.rooms?.max && numberOfRooms > query.parsed.rooms.max) return null;
  if (query.parsed.size?.min && livingSpace < query.parsed.size.min) return null;
  if (query.parsed.size?.max && livingSpace > query.parsed.size.max) return null;

  // Type filtering
  const typeMap: Record<string, string> = {
    'HousingCooperative': 'lägenhet', 'Condominium': 'lägenhet',
    'House': 'hus', 'Villa': 'hus',
    'Townhouse': 'radhus', 'RowHouse': 'radhus',
    'Cottage': 'fritidshus', 'CountryHouse': 'fritidshus',
  };
  const mappedType = typeMap[estate.estateType] || 'lägenhet';
  if (query.parsed.type && mappedType !== query.parsed.type) return null;

  // City filtering
  const city = address.city || address.municipality || '';
  if (query.parsed.city) {
    const qCity = query.parsed.city.toLowerCase();
    if (city.toLowerCase() !== qCity && (address.municipality || '').toLowerCase() !== qCity) {
      if (!query.parsed.area || (address.area || '').toLowerCase() !== query.parsed.area.toLowerCase()) return null;
    }
  }

  const imageUrl = estate.thumb?.list?.url || estate.thumb?.source?.url || undefined;
  const finalPrice = estate.details?.price?.finalPrice;

  return {
    id: `hh-${estate.objectReference}`,
    source: 'husmanhagberg',
    url: `https://www.husmanhagberg.se/objekt/${estate.objectReference}`,
    address: address.streetAddress || '',
    area: address.area || '',
    city,
    price: finalPrice || startingPrice || 0,
    rooms: numberOfRooms || 0,
    size: livingSpace || 0,
    monthlyFee: monthlyFee || undefined,
    imageUrl,
    broker: 'HusmanHagberg',
    brokerUrl: `https://www.husmanhagberg.se/objekt/${estate.objectReference}`,
    scrapedAt: new Date().toISOString(),
  };
}

// Fetch a single offset chunk
async function fetchOffset(params: URLSearchParams, offset: number): Promise<HHEstate[]> {
  try {
    const p = new URLSearchParams(params);
    p.set('offset', String(offset));
    const response = await fetch(`${HH_API}?${p.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'sv-SE,sv;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const data: HHResponse = await response.json();
    return data.estates || [];
  } catch {
    return [];
  }
}

export async function scrapeHusmanHagberg(query: SearchQuery): Promise<ScrapedProperty[]> {
  console.log(`[husmanhagberg] Starting scrape for: "${query.raw}"`);

  const params = new URLSearchParams();
  params.set('limit', String(PAGE_LIMIT));
  if (query.parsed.city) {
    const apiCity = CITY_MAP[query.parsed.city.toLowerCase()] || query.parsed.city;
    params.set('city', apiCity);
  }

  try {
    // Phase 1: Fetch first page to see how many exist
    const firstBatch = await fetchOffset(params, 0);
    if (firstBatch.length === 0) {
      console.log('[husmanhagberg] No results');
      return [];
    }

    const results: ScrapedProperty[] = [];
    for (const e of firstBatch) {
      const mapped = mapHHEstate(e, query);
      if (mapped) results.push(mapped);
    }

    console.log(`[husmanhagberg] Page 1: ${firstBatch.length} raw, ${results.length} after filters`);

    // Phase 2: If full page, fetch remaining pages IN PARALLEL
    if (firstBatch.length >= PAGE_LIMIT) {
      const offsets = [];
      for (let o = PAGE_LIMIT; o < MAX_OFFSET; o += PAGE_LIMIT) {
        offsets.push(o);
      }
      const batches = await Promise.allSettled(offsets.map(o => fetchOffset(params, o)));
      for (const batch of batches) {
        if (batch.status === 'fulfilled') {
          for (const e of batch.value) {
            const mapped = mapHHEstate(e, query);
            if (mapped) results.push(mapped);
          }
        }
      }
    }

    console.log(`[husmanhagberg] Total: ${results.length} listings after filters`);
    return results;
  } catch (err) {
    console.error('[husmanhagberg] Error:', err);
    return [];
  }
}