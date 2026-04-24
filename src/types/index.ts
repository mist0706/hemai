// HemAI - Shared Types
// All scrapers and components use these types.

// === CORE PROPERTY TYPES ===

export type PropertySource = 'hemnet' | 'bovision' | 'fastighetsbyran' | 'svenskfast' | 'blocket' | 'husmanhagberg' | 'notar' | 'bjurfors' | 'maklarringen';

export type PropertyType = 'lägenhet' | 'hus' | 'radhus' | 'fritidshus';

// Raw scraped property from any broker
export interface ScrapedProperty {
  id: string;
  source: PropertySource;
  url: string;
  address: string;
  area: string;
  city: string;
  price: number;
  rooms: number;
  size: number;
  monthlyFee?: number;
  yearBuilt?: number;
  imageUrl?: string;
  images?: string[];
  description?: string;
  lat?: number;
  lng?: number;
  floor?: string;
  broker?: string;
  brokerUrl?: string;
  scrapedAt: string;
  // Frontend compatibility fields (enriched by route handler)
  title?: string;
  neighborhood?: string;
  housingType?: string;
  housingForm?: string;
}

export interface SearchQuery {
  raw: string;
  parsed: {
    area?: string;
    city?: string;
    rooms?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    size?: { min?: number; max?: number };
    type?: PropertyType;
    features?: string[];
  };
}

export interface EnrichedProperty extends ScrapedProperty {
  matchScore: number;
  matchDetails: {
    locationMatch: number;
    priceMatch: number;
    roomsMatch: number;
    sizeMatch: number;
  };
  summary: string;
  highlights: string[];
  estimatedCommute?: {
    destination: string;
    minutes: number;
    method: 'walking' | 'transit' | 'driving';
  };
}

// === LEGACY / FRONTEND TYPES ===

export enum HousingType {
  Apartment = 'lägenhet',
  House = 'villa',
  Townhouse = 'radhus',
  Cottage = 'stuga',
  Loft = 'loft',
  Studio = 'studio',
}

export enum HousingForm {
  Condominium = 'bostadsrätt',
  Rental = 'hyresrätt',
  TenantOwnership = 'äganderätt',
}

export interface Broker {
  name: string;
  phone?: string;
  email?: string;
  company: string;
  logoUrl?: string;
}

// Full Listing type used by the frontend — extends ScrapedProperty with display fields
export interface Listing {
  id: string;
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
  renovationYear?: number;
  imageUrl: string;
  images: string[];
  description: string;
  lat?: number;
  lng?: number;
  amenities: string[];
  publishedAt: string;
  url: string;
  broker: Broker;
  aiSummary?: string;
  aiScore?: number;
  aiTags?: string[];
  source?: PropertySource;
  area?: string;
  yearBuilt?: number;
  brokerUrl?: string;
  scrapedAt?: string;
}

export interface SearchFilters {
  city?: string;
  neighborhoods?: string[];
  housingType?: HousingType[];
  housingForm?: HousingForm[];
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  minSize?: number;
  maxSize?: number;
  keyword?: string;
  sortBy?: SortOption;
}

export enum SortOption {
  PriceAsc = 'price_asc',
  PriceDesc = 'price_desc',
  SizeAsc = 'size_asc',
  SizeDesc = 'size_desc',
  Newest = 'newest',
  AiScore = 'ai_score',
}

export interface SearchResult {
  listings: Listing[];
  total: number;
  page?: number;
  pageSize?: number;
  facets?: SearchFacets;
  cached?: boolean;
  sources?: string[];
  durationMs?: number;
  errors?: { source: string; error: string }[];
}

export interface SearchFacets {
  cities: { name: string; count: number }[];
  housingTypes: { type: HousingType; count: number }[];
  priceRanges: { min: number; max: number; count: number }[];
  roomCounts: { rooms: number; count: number }[];
}

export interface AISummaryRequest {
  listingId: string;
  url: string;
  focusAreas?: string[];
}

export interface AISummaryResponse {
  listingId: string;
  summary: string;
  score: number;
  tags: string[];
  pros: string[];
  cons: string[];
  commuteInfo?: string;
  neighborhoodInsight?: string;
}