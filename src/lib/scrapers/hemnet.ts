// Hemnet scraper — Playwright with stealth for Cloudflare bypass
// On-demand scraping: builds URL from filters, scrapes, returns Listing[]

import { Listing, SearchFilters, HousingType, HousingForm } from '@/types';
import { AREA_MAPPINGS } from './areas';

const HEMNET_BASE = 'https://www.hemnet.se';

// Map our HousingType to Hemnet's item_type values
const HOUSING_TYPE_MAP: Record<string, string> = {
  [HousingType.Apartment]: 'apartment',
  [HousingType.House]: 'house',
  [HousingType.Townhouse]: 'townhouse',
  [HousingType.Cottage]: 'cottage',
  [HousingType.Loft]: 'loft',
  [HousingType.Studio]: 'studio',
};

const HOUSING_FORM_MAP: Record<string, string> = {
  [HousingForm.Condominium]: 'bostallsratt',
  [HousingForm.Rental]: 'hyresratt',
  [HousingForm.TenantOwnership]: 'aganderatt',
};

export function buildHemnetSearchUrl(filters: SearchFilters): string {
  const params = new URLSearchParams();

  // Location
  if (filters.city) {
    const cityKey = filters.city.toLowerCase();
    const cityAreas = AREA_MAPPINGS[cityKey];
    if (cityAreas && filters.neighborhoods?.length) {
      // Map to Hemnet location IDs
      for (const area of filters.neighborhoods) {
        const areaKey = area.toLowerCase();
        const mapping = cityAreas[areaKey];
        if (mapping?.hemnetLocationId) {
          params.append('location_ids[]', mapping.hemnetLocationId);
        }
      }
    }
    // If no location IDs matched, just add city name to search
    if (!params.has('location_ids[]')) {
      params.append('key_words', filters.city);
    }
  }

  // Housing type
  if (filters.housingType?.length) {
    for (const type of filters.housingType) {
      const hemnetType = HOUSING_TYPE_MAP[type];
      if (hemnetType) params.append('item_types[]', hemnetType);
    }
  }

  // Housing form
  if (filters.housingForm?.length) {
    for (const form of filters.housingForm) {
      const hemnetForm = HOUSING_FORM_MAP[form];
      if (hemnetForm) params.append('upplatelseformer[]', hemnetForm);
    }
  }

  // Price
  if (filters.minPrice) params.set('price_min', String(filters.minPrice));
  if (filters.maxPrice) params.set('price_max', String(filters.maxPrice));

  // Rooms
  if (filters.minRooms) params.set('rooms_min', String(filters.minRooms));
  if (filters.maxRooms) params.set('rooms_max', String(filters.maxRooms));

  // Size
  if (filters.minSize) params.set('area_min', String(filters.minSize));
  if (filters.maxSize) params.set('area_max', String(filters.maxSize));

  // Sorting
  if (filters.sortBy) {
    const sortMap: Record<string, string> = {
      price_asc: 'price_asc',
      price_desc: 'price_desc',
      newest: 'published_date_desc',
      size_desc: 'area_desc',
      size_asc: 'area_asc',
    };
    const sort = sortMap[filters.sortBy];
    if (sort) params.set('sort', sort);
  }

  return `${HEMNET_BASE}/bostader?${params.toString()}`;
}

interface ScrapedListing {
  url: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  price: number;
  monthlyFee?: number;
  size: number;
  rooms: number;
  floor?: string;
  housingType: HousingType;
  housingForm: HousingForm;
  constructionYear?: number;
  imageUrl: string;
  images: string[];
  description: string;
  broker: { name: string; company: string; phone?: string; email?: string };
  publishedAt: string;
}

// Fetch Hemnet search results page and parse listings
// NOTE: Hemnet uses Cloudflare protection. In production, this requires Playwright
// with stealth plugin. For MVP, we'll use fetch with proper headers as a first attempt.
export async function scrapeHemnet(filters: SearchFilters): Promise<Listing[]> {
  const searchUrl = buildHemnetSearchUrl(filters);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 429) {
      console.warn('[hemnet] Rate limited (429), backing off');
      return [];
    }

    if (response.status === 403) {
      console.warn('[hemnet] Blocked (403) — likely Cloudflare. Need Playwright.');
      return [];
    }

    if (!response.ok) {
      console.warn(`[hemnet] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseHemnetResults(html);
  } catch (err) {
    console.error('[hemnet] Scrape error:', err);
    return [];
  }
}

function parseHemnetResults(html: string): Listing[] {
  const listings: Listing[] = [];

  // Hemnet renders results in JSON-LD or in data attributes
  // Try to extract from __NEXT_DATA__ or from listing cards
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const searchResults = data?.props?.pageProps?.searchResults || data?.props?.pageProps?.initialState?.searchResults?.results;
      if (Array.isArray(searchResults)) {
        for (const item of searchResults.slice(0, 20)) {
          const listing = mapHemnetResult(item);
          if (listing) listings.push(listing);
        }
        return listings;
      }
    } catch {
      // Fall through to HTML parsing
    }
  }

  // Fallback: parse HTML listing cards
  // This is fragile and depends on Hemnet's current HTML structure
  const listingRegex = /class="[^"]*listing-card[^"]*"[^>]*>[\s\S]*?<\/a>/g;
  const cards = html.match(listingRegex) || [];

  for (const card of cards.slice(0, 20)) {
    try {
      const urlMatch = card.match(/href="([^"]*\/bostad\/\d+)"/);
      const titleMatch = card.match(/class="[^"]*listing-card__title[^"]*"[^>]*>([^<]+)/);
      const addressMatch = card.match(/class="[^"]*listing-card__address[^"]*"[^>]*>([^<]+)/);
      const priceMatch = card.match(/class="[^"]*listing-card__price[^"]*"[^>]*>([^<]+)/);

      if (urlMatch) {
        listings.push({
          id: urlMatch[1].split('/').pop() || `hemnet-${listings.length}`,
          title: titleMatch?.[1]?.trim() || 'Bostad',
          address: addressMatch?.[1]?.trim() || '',
          neighborhood: '',
          city: '',
          postalCode: '',
          price: parseSwedishPrice(priceMatch?.[1] || '0'),
          size: 0,
          rooms: 0,
          housingType: HousingType.Apartment,
          housingForm: HousingForm.Condominium,
          imageUrl: '',
          images: [],
          description: '',
          amenities: [],
          publishedAt: new Date().toISOString(),
          url: urlMatch[1].startsWith('http') ? urlMatch[1] : `${HEMNET_BASE}${urlMatch[1]}`,
          broker: { name: '', company: '' },
        });
      }
    } catch {
      continue;
    }
  }

  return listings;
}

function mapHemnetResult(item: any): Listing | null {
  if (!item?.id) return null;

  const housingType = mapHemnetHousingType(item.propertyType || item.type || '');
  const housingForm = mapHemnetHousingForm(item.upplatelseform || '');

  return {
    id: `hemnet-${item.id}`,
    title: item.headline || item.title || item.address?.street || 'Bostad',
    address: item.address?.street || item.address || '',
    neighborhood: item.address?.area || '',
    city: item.address?.city || '',
    postalCode: item.address?.zipCode || '',
    price: item.price || 0,
    monthlyFee: item.fee || item.monthlyFee || undefined,
    size: item.livingArea || item.area || 0,
    rooms: item.rooms || 0,
    floor: item.floor || undefined,
    housingType,
    housingForm,
    constructionYear: item.constructionYear || undefined,
    imageUrl: item.image?.url || item.images?.[0]?.url || '',
    images: item.images?.map((img: any) => img.url || img).filter(Boolean) || [],
    description: item.description || item.text || '',
    amenities: item.amenities || [],
    publishedAt: item.publishedAt || item.published || new Date().toISOString(),
    url: item.url || `${HEMNET_BASE}/bostad/${item.id}`,
    broker: {
      name: item.broker?.name || '',
      company: item.broker?.company || item.broker?.office || '',
      phone: item.broker?.phone || undefined,
      email: item.broker?.email || undefined,
    },
  };
}

function mapHemnetHousingType(type: string): HousingType {
  const lower = type.toLowerCase();
  if (lower.includes('lägenhet') || lower.includes('apartment')) return HousingType.Apartment;
  if (lower.includes('villa') || lower.includes('house')) return HousingType.House;
  if (lower.includes('radhus') || lower.includes('townhouse')) return HousingType.Townhouse;
  if (lower.includes('stuga') || lower.includes('cottage')) return HousingType.Cottage;
  if (lower.includes('studio') || lower.includes('etta')) return HousingType.Studio;
  return HousingType.Apartment;
}

function mapHemnetHousingForm(form: string): HousingForm {
  const lower = form.toLowerCase();
  if (lower.includes('bostadsrätt') || lower.includes('br')) return HousingForm.Condominium;
  if (lower.includes('hyresrätt') || lower.includes('hyra')) return HousingForm.Rental;
  if (lower.includes('äganderätt') || lower.includes('ägar')) return HousingForm.TenantOwnership;
  return HousingForm.Condominium;
}

function parseSwedishPrice(text: string): number {
  return parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
}