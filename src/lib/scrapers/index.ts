// HemAI Scraper Index — Unified interface to all scrapers
// Import the scraper you need, or use scrapeAll() for parallel execution.

import { ScrapedProperty, SearchQuery, HousingType } from '@/types';

// Individual scraper imports
import { scrapeFastighetsbyran } from './fastighetsbyran';
import { scrapeHusmanHagberg } from './husmanhagberg';
import { scrapeNotar, VITEC_BROKERS, VitecBrokerConfig } from './vitec-adapter';
import { scrapeBovision } from './bovision';
import { scrapeSvenskFast } from './svenskfast';
import { scrapeBjurfors } from './bjurfors';

export { scrapeFastighetsbyran } from './fastighetsbyran';
export { scrapeHusmanHagberg } from './husmanhagberg';
export { scrapeVitec, scrapeNotar, VITEC_BROKERS as VITEC_BROKERS } from './vitec-adapter';
export { scrapeSvenskFast } from './svenskfast';
export { scrapeBjurfors } from './bjurfors';

// Bovision uses legacy SearchFilters — adapt
import { SearchFilters } from '@/types';

async function scrapeBovisionLegacy(query: SearchQuery): Promise<ScrapedProperty[]> {
  const filters: SearchFilters = {
    city: query.parsed.city,
    neighborhoods: query.parsed.area ? [query.parsed.area] : undefined,
    minPrice: query.parsed.price?.min,
    maxPrice: query.parsed.price?.max,
    minRooms: query.parsed.rooms?.min,
    maxRooms: query.parsed.rooms?.max,
    minSize: query.parsed.size?.min,
    maxSize: query.parsed.size?.max,
    housingType: query.parsed.type
      ? [query.parsed.type === 'lägenhet' ? HousingType.Apartment
         : query.parsed.type === 'hus' ? HousingType.House
         : query.parsed.type === 'radhus' ? HousingType.Townhouse
         : HousingType.Cottage]
      : undefined,
  };
  return scrapeBovision(filters) as unknown as ScrapedProperty[];
}

interface ScraperEntry {
  name: string;
  source: string;
  scrape: (query: SearchQuery) => Promise<ScrapedProperty[]>;
  timeout: number;  // ms
}

export const SCRAPERS: ScraperEntry[] = [
  // Tier 1: JSON APIs — fastest, most reliable
  { name: 'Fastighetsbyrån',   source: 'fastighetsbyran',  scrape: scrapeFastighetsbyran,   timeout: 6000 },
  { name: 'HusmanHagberg',    source: 'husmanhagberg',   scrape: scrapeHusmanHagberg,     timeout: 6000 },
  { name: 'Notar (Vitec)',    source: 'notar',           scrape: scrapeNotar,             timeout: 8000 },
  { name: 'Bovision',         source: 'bovision',        scrape: scrapeBovisionLegacy,    timeout: 6000 },
  // Tier 2: HTML scraping — slightly slower
  { name: 'Svensk Fast',      source: 'svenskfast',      scrape: scrapeSvenskFast,        timeout: 8000 },
  { name: 'Bjurfors',         source: 'bjurfors',        scrape: scrapeBjurfors,          timeout: 8000 },
];