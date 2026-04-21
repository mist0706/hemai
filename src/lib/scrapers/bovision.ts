// Bovision scraper — simpler HTML fetch + cheerio parsing (no Cloudflare)

import { Listing, SearchFilters, HousingType, HousingForm } from '@/types';
import { AREA_MAPPINGS } from './areas';

const BOVISION_BASE = 'https://www.bovision.se';

const HOUSING_TYPE_MAP: Record<string, string> = {
  [HousingType.Apartment]: 'lagenhet',
  [HousingType.House]: 'villa',
  [HousingType.Townhouse]: 'radhus',
  [HousingType.Cottage]: 'stuga',
  [HousingType.Loft]: 'loft',
  [HousingType.Studio]: 'studio',
};

export function buildBovisionSearchUrl(filters: SearchFilters): string {
  const parts: string[] = [];

  // City/area
  if (filters.city) {
    const citySlug = filters.city.toLowerCase().replace(/ /g, '-');
    parts.push(citySlug);

    if (filters.neighborhoods?.length) {
      const cityKey = filters.city.toLowerCase();
      const cityAreas = AREA_MAPPINGS[cityKey];
      if (cityAreas) {
        for (const area of filters.neighborhoods) {
          const areaKey = area.toLowerCase();
          const mapping = cityAreas[areaKey];
          if (mapping?.bovisionArea) {
            parts.push(mapping.bovisionArea.toLowerCase().replace(/ /g, '-'));
          }
        }
      }
    }
  }

  const queryParams = new URLSearchParams();

  // Housing type
  if (filters.housingType?.length) {
    for (const type of filters.housingType) {
      const bvType = HOUSING_TYPE_MAP[type];
      if (bvType) queryParams.append('type', bvType);
    }
  }

  // Price range
  if (filters.minPrice) queryParams.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) queryParams.set('maxPrice', String(filters.maxPrice));

  // Rooms
  if (filters.minRooms) queryParams.set('minRooms', String(filters.minRooms));
  if (filters.maxRooms) queryParams.set('maxRooms', String(filters.maxRooms));

  // Size
  if (filters.minSize) queryParams.set('minArea', String(filters.minSize));
  if (filters.maxSize) queryParams.set('maxArea', String(filters.maxSize));

  const path = parts.length ? `/${parts.join('/')}` : '';
  const qs = queryParams.toString();
  return `${BOVISION_BASE}/bostader${path}${qs ? `?${qs}` : ''}`;
}

export async function scrapeBovision(filters: SearchFilters): Promise<Listing[]> {
  const searchUrl = buildBovisionSearchUrl(filters);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'sv-SE,sv;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 429) {
      console.warn('[bovision] Rate limited (429)');
      return [];
    }

    if (!response.ok) {
      console.warn(`[bovision] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseBovisionResults(html);
  } catch (err) {
    console.error('[bovision] Scrape error:', err);
    return [];
  }
}

function parseBovisionResults(html: string): Listing[] {
  const listings: Listing[] = [];

  // Try JSON-LD structured data first
  const jsonLdPattern = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  const jsonLdMatches = [...html.matchAll(jsonLdPattern)].map(m => m[0]);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match.replace(/<\/?script[^>]*>/g, ''));
      if (data['@type'] === 'Residence' || data['@type'] === 'Offer') {
        const listing = mapBovisionJsonLd(data);
        if (listing) listings.push(listing);
      }
    } catch { continue; }
  }

  if (listings.length > 0) return listings;

  // Fallback: parse HTML listing cards
  // Bovision uses data attributes on listing cards
  const cardPattern = /<article[^>]*class="[^"]*property-card[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let match;

  while ((match = cardPattern.exec(html)) !== null && listings.length < 20) {
    const card = match[1];
    try {
      const urlMatch = card.match(/href="([^"]+)"/);
      const titleMatch = card.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/);
      const priceMatch = card.match(/class="[^"]*price[^"]*"[^>]*>([^<]+)/);
      const areaMatch = card.match(/(\d+)\s*m[²²]/);
      const roomsMatch = card.match(/(\d+)\s*rum/);
      const addressMatch = card.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)/);

      if (urlMatch) {
        listings.push({
          id: `bv-${Date.now()}-${listings.length}`,
          title: titleMatch?.[1]?.trim() || 'Bostad',
          address: addressMatch?.[1]?.trim() || '',
          neighborhood: '',
          city: '',
          postalCode: '',
          price: parseSwedishPrice(priceMatch?.[1] || '0'),
          size: areaMatch ? parseInt(areaMatch[1], 10) : 0,
          rooms: roomsMatch ? parseInt(roomsMatch[1], 10) : 0,
          housingType: HousingType.Apartment,
          housingForm: HousingForm.Condominium,
          imageUrl: '',
          images: [],
          description: '',
          amenities: [],
          publishedAt: new Date().toISOString(),
          url: urlMatch[1].startsWith('http') ? urlMatch[1] : `${BOVISION_BASE}${urlMatch[1]}`,
          broker: { name: '', company: '' },
        });
      }
    } catch { continue; }
  }

  return listings;
}

function mapBovisionJsonLd(data: any): Listing | null {
  try {
    const address = data.address || data.location?.address || {};
    const price = data.offers?.price || data.price || 0;

    return {
      id: `bv-${data.identifier || data.url?.split('/').pop() || Date.now()}`,
      title: data.name || address.streetAddress || 'Bostad',
      address: address.streetAddress || '',
      neighborhood: address.addressLocality || '',
      city: address.addressRegion || address.addressLocality || '',
      postalCode: address.postalCode || '',
      price: typeof price === 'number' ? price : parseSwedishPrice(String(price)),
      monthlyFee: data.monthlyFee || undefined,
      size: Math.round(parseFloat(data.floorSize?.value || data.floorSize || '0')) || 0,
      rooms: data.numberOfRooms || 0,
      housingType: mapBovisionType(data['@type'] || ''),
      housingForm: HousingForm.Condominium,
      constructionYear: data.yearBuilt ? parseInt(data.yearBuilt, 10) : undefined,
      imageUrl: data.image?.url || data.image || '',
      images: Array.isArray(data.image) ? data.image.map((i: any) => i.url || i).filter(Boolean) : [],
      description: data.description || '',
      amenities: data.amenityFeature?.map((a: any) => a.name || a.value || '').filter(Boolean) || [],
      publishedAt: data.datePosted || new Date().toISOString(),
      url: data.url || '',
      broker: {
        name: data.seller?.name || '',
        company: data.seller?.organization?.name || '',
      },
    };
  } catch {
    return null;
  }
}

function mapBovisionType(type: string): HousingType {
  const lower = type.toLowerCase();
  if (lower.includes('apartment') || lower.includes('lägenhet')) return HousingType.Apartment;
  if (lower.includes('house') || lower.includes('villa')) return HousingType.House;
  if (lower.includes('townhouse') || lower.includes('radhus')) return HousingType.Townhouse;
  return HousingType.Apartment;
}

function parseSwedishPrice(text: string): number {
  return parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
}