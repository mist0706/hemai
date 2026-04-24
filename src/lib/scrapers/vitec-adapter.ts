// Vitec Direct API adapter — scrapes any broker using Vitec Pattern 1
// (data.{broker}.se/objects or api.{broker}.se/object/api/objects)
//
// Notar uses this pattern. Mäklarringen and others can be added via config.
//
// NOTE: Vitec objects come in two layout variants:
//   Variant A (Notar style): flat fields — address is a string, city/area/lat/lng top-level
//   Variant B (HH style): nested objects — address is {StreetAddress, City, ...}
// This adapter handles both.

import { ScrapedProperty, SearchQuery, PropertySource } from '@/types';

const MAX_OBJECTS = 500;

export interface VitecBrokerConfig {
  broker: string;
  apiUrl: string;
  auth?: string;
  listingUrlPattern?: string;
}

export const VITEC_BROKERS: Record<string, VitecBrokerConfig> = {
  notar: {
    broker: 'notar',
    apiUrl: 'https://data.notar.se/objects',
    auth: 'Basic bm90YXI6OWd6ekRmRGZCVXpjMjJleVhqUG53bU5m',
    listingUrlPattern: 'https://www.notar.se/objekt/{id}',
  },
};

type VitecObj = Record<string, any>;

function getNested(obj: VitecObj, ...keys: string[]): any {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
}

function mapVitecObject(obj: VitecObj, config: VitecBrokerConfig, query: SearchQuery): ScrapedProperty | null {
  // --- Address ---
  // Variant A (Notar): address is a string, city/area top-level
  // Variant B (older Vitec): address is { StreetAddress, City, Geo: { Coordinate: { Latitude, Longitude } } }
  const addressObj = obj.address;
  let streetAddress: string;
  let city: string;
  let area: string;
  let lat: number | undefined;
  let lng: number | undefined;

  if (typeof addressObj === 'string') {
    // Variant A (Notar style)
    streetAddress = addressObj || '';
    city = obj.city || obj.municipality || '';
    area = obj.area || '';
    lat = typeof obj.latitude === 'number' ? obj.latitude : undefined;
    lng = typeof obj.longitude === 'number' ? obj.longitude : undefined;
  } else if (typeof addressObj === 'object' && addressObj !== null) {
    // Variant B (nested)
    streetAddress = addressObj.StreetAddress || addressObj.streetAddress || '';
    city = addressObj.City || addressObj.city || obj.city || '';
    area = addressObj.Area || addressObj.area || obj.area || '';
    lat = addressObj.Geo?.Coordinate?.Latitude;
    lng = addressObj.Geo?.Coordinate?.Longitude;
  } else {
    streetAddress = '';
    city = obj.city || '';
    area = obj.area || '';
  }

  // --- Price ---
  const priceObj = obj.price;
  let price: number;
  if (typeof priceObj === 'object' && priceObj !== null) {
    price = priceObj.startingPrice || priceObj.ContractPriceAmountSEK || priceObj.startingLivingSpacePricePerArea || 0;
  } else {
    price = getNested(obj, 'ContractPriceAmountSEK', 'startingPrice', 'price') || 0;
  }

  // --- Rooms ---
  const rooms = getNested(obj, 'numberOfRooms', 'Rooms', 'rooms') || 0;

  // --- Size ---
  const size = getNested(obj, 'livingSpaceArea', 'LivingArea', 'livingArea') || 0;

  // --- Fee ---
  const monthlyFee = getNested(obj, 'monthlyFee', 'MonthlyFee');

  // --- Type ---
  const typeKey = getNested(obj, 'type', 'entityType', 'estateType') || 'HousingCooperative';
  const typeMap: Record<string, string> = {
    'HousingCooperative': 'lägenhet', 'Condominium': 'lägenhet', 'Apartment': 'lägenhet',
    'House': 'hus', 'Villa': 'hus',
    'Townhouse': 'radhus', 'RowHouse': 'radhus',
    'Cottage': 'fritidshus', 'CountryHouse': 'fritidshus', 'Plot': 'fritidshus',
    'TenantOwnership': 'lägenhet',
  };
  const mappedType = typeMap[typeKey] || 'lägenhet';

  // --- Year Built ---
  const buildYear = getNested(obj, 'buildYear', 'BuildYear');

  // --- Floor ---
  const floor = getNested(obj, 'Floor', 'floor');

  // --- Image ---
  const images = obj.ImageList || obj.images || [];
  let imageUrl: string | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'object') {
      imageUrl = first.Content?.URL || first.url || first.src || undefined;
    } else if (typeof first === 'string') {
      imageUrl = first;
    }
  }

  // --- Agent ---
  const agent = obj.Agent || obj.agent;
  let brokerName: string;
  if (typeof agent === 'object' && agent !== null) {
    brokerName = agent.Name || agent.name || '';
  } else if (typeof agent === 'string') {
    brokerName = agent;
  } else {
    brokerName = config.broker.charAt(0).toUpperCase() + config.broker.slice(1);
  }

  // --- Client-side filters ---
  if (query.parsed.price?.min && price && price < query.parsed.price.min) return null;
  if (query.parsed.price?.max && price && price > query.parsed.price.max) return null;
  if (query.parsed.rooms?.min && rooms && rooms < query.parsed.rooms.min) return null;
  if (query.parsed.rooms?.max && rooms && rooms > query.parsed.rooms.max) return null;
  if (query.parsed.size?.min && size && size < query.parsed.size.min) return null;
  if (query.parsed.size?.max && size && size > query.parsed.size.max) return null;
  if (query.parsed.type && mappedType !== query.parsed.type) return null;

  if (query.parsed.city) {
    const qCity = query.parsed.city.toLowerCase();
    if (city.toLowerCase() !== qCity && (obj.municipality || '').toLowerCase() !== qCity) {
      if (!query.parsed.area || area.toLowerCase() !== query.parsed.area.toLowerCase()) return null;
    }
  }
  if (query.parsed.area && area.toLowerCase() !== query.parsed.area.toLowerCase()) return null;

  // --- Build listing URL ---
  const listingId = obj.id || obj.originalEstateId || obj.entityId || '';
  const listingUrl = config.listingUrlPattern
    ? config.listingUrlPattern.replace('{id}', listingId)
    : obj.url || '';

  return {
    id: `${config.broker}-${listingId}`,
    source: config.broker as PropertySource,
    url: listingUrl,
    address: streetAddress,
    area,
    city,
    price,
    rooms: typeof rooms === 'number' ? rooms : parseFloat(String(rooms)) || 0,
    size: typeof size === 'number' ? size : parseFloat(String(size)) || 0,
    monthlyFee: monthlyFee || undefined,
    yearBuilt: buildYear || undefined,
    imageUrl,
    broker: brokerName,
    brokerUrl: listingUrl,
    scrapedAt: new Date().toISOString(),
  };
}

export async function scrapeVitec(config: VitecBrokerConfig, query: SearchQuery): Promise<ScrapedProperty[]> {
  console.log(`[vitec/${config.broker}] Starting scrape for: "${query.raw}"`);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'sv-SE,sv;q=0.9',
  };

  if (config.auth) {
    headers['Authorization'] = config.auth;
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 429) {
      console.warn(`[vitec/${config.broker}] Rate limited (429)`);
      return [];
    }

    if (!response.ok) {
      console.warn(`[vitec/${config.broker}] HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const objects: VitecObj[] = Array.isArray(data) ? data : (data.objects || data.estates || data.results || []);

    console.log(`[vitec/${config.broker}] Got ${objects.length} total objects`);

    const results: ScrapedProperty[] = [];
    const limit = Math.min(objects.length, MAX_OBJECTS);

    for (let i = 0; i < limit; i++) {
      const mapped = mapVitecObject(objects[i], config, query);
      if (mapped) results.push(mapped);
    }

    console.log(`[vitec/${config.broker}] Total: ${results.length} listings after filters`);
    return results;
  } catch (err) {
    console.error(`[vitec/${config.broker}] API error:`, err);
    return [];
  }
}

export async function scrapeNotar(query: SearchQuery): Promise<ScrapedProperty[]> {
  return scrapeVitec(VITEC_BROKERS.notar, query);
}