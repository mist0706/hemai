// HemAI - Swedish Home Search Platform Types

export interface Listing {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  price: number;
  monthlyFee?: number;          // månadsavgift (bostadsrätt)
  size: number;                 // kvm
  rooms: number;
  floor?: string;
  housingType: HousingType;
  housingForm: HousingForm;     // upplåtelseform
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
  aiSummary?: string;           // AI-generated Swedish summary
  aiScore?: number;             // AI value score 0-100
  aiTags?: string[];            // AI-generated tags
}

export enum HousingType {
  Apartment = 'lägenhet',
  House = 'villa',
  Townhouse = 'radhus',
  Cottage = 'stuga',
  Loft = 'loft',
  Studio = 'studio',
}

export enum HousingForm {
  Condominium = 'bostadsrätt',     // ownership
  Rental = 'hyresrätt',            // rental
  TenantOwnership = 'äganderätt',   // freehold
}

export interface Broker {
  name: string;
  phone?: string;
  email?: string;
  company: string;
  logoUrl?: string;
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
  page: number;
  pageSize: number;
  facets: SearchFacets;
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
  focusAreas?: string[];  // e.g., ['commute', 'schools', 'value']
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