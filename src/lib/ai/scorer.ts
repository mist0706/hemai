// Property Scorer — weighted rule-based scoring 0-100

import { Listing, SearchFilters } from '@/types';
import { getAvgPricePerSqm } from '../scrapers/areas';

export interface ScoreBreakdown {
  overall: number;      // 0-100
  locationMatch: number; // 0-1
  priceMatch: number;    // 0-1
  roomMatch: number;    // 0-1
  sizeMatch: number;     // 0-1
  valueForMoney: number; // 0-1
}

const WEIGHTS = {
  location: 0.25,
  price: 0.30,
  rooms: 0.15,
  size: 0.15,
  value: 0.15,
};

export function scoreListing(listing: Listing, query: SearchFilters): ScoreBreakdown {
  const locationMatch = calcLocationMatch(listing, query);
  const priceMatch = calcPriceMatch(listing, query);
  const roomMatch = calcRoomMatch(listing, query);
  const sizeMatch = calcSizeMatch(listing, query);
  const valueForMoney = calcValueForMoney(listing, query);

  const overall = Math.round(
    (locationMatch * WEIGHTS.location +
     priceMatch * WEIGHTS.price +
     roomMatch * WEIGHTS.rooms +
     sizeMatch * WEIGHTS.size +
     valueForMoney * WEIGHTS.value) * 100
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    locationMatch,
    priceMatch,
    roomMatch,
    sizeMatch,
    valueForMoney,
  };
}

function calcLocationMatch(listing: Listing, query: SearchFilters): number {
  if (!query.city && !query.neighborhoods?.length) return 0.7; // neutral

  let score = 0;

  if (query.city) {
    score += listing.city.toLowerCase() === query.city.toLowerCase() ? 0.5 : 0;
  }

  if (query.neighborhoods?.length) {
    const listingArea = listing.neighborhood.toLowerCase();
    const matchFound = query.neighborhoods.some(
      n => listingArea.includes(n.toLowerCase()) || n.toLowerCase().includes(listingArea)
    );
    score += matchFound ? 0.5 : 0.1; // partial credit for nearby areas
  }

  return Math.min(1, score);
}

function calcPriceMatch(listing: Listing, query: SearchFilters): number {
  if (!query.minPrice && !query.maxPrice) return 0.7;

  // Perfect match = within budget
  if (query.maxPrice && listing.price <= query.maxPrice) {
    // Closer to max budget = slightly less ideal but still good
    const ratio = listing.price / query.maxPrice;
    if (ratio < 0.5) return 1.0;    // Well under budget - great deal
    if (ratio < 0.8) return 0.9;
    if (ratio < 0.95) return 0.8;
    return 0.7; // Close to budget
  }

  if (query.maxPrice && listing.price > query.maxPrice) {
    // Over budget - penalize proportionally
    const overRatio = (listing.price - query.maxPrice) / query.maxPrice;
    if (overRatio < 0.05) return 0.6; // Slightly over
    if (overRatio < 0.15) return 0.4;
    return 0.2; // Way over budget
  }

  if (query.minPrice && listing.price >= query.minPrice) return 0.8;
  return 0.5;
}

function calcRoomMatch(listing: Listing, query: SearchFilters): number {
  if (!query.minRooms && !query.maxRooms) return 0.7;

  const rooms = listing.rooms;
  const min = query.minRooms || 0;
  const max = query.maxRooms || Infinity;

  if (rooms >= min && rooms <= max) return 1.0;

  // Slightly outside range
  if (rooms < min) {
    const diff = min - rooms;
    if (diff === 1) return 0.6;
    if (diff === 2) return 0.3;
    return 0.1;
  }

  // More rooms than requested (usually ok)
  const extra = rooms - (max === Infinity ? rooms : max);
  if (extra === 1) return 0.8;
  if (extra === 2) return 0.6;
  return 0.4;
}

function calcSizeMatch(listing: Listing, query: SearchFilters): number {
  if (!query.minSize && !query.maxSize) return 0.7;

  const min = query.minSize || 0;
  const max = query.maxSize || Infinity;

  if (listing.size >= min && listing.size <= max) return 1.0;

  if (listing.size < min) {
    const ratio = listing.size / min;
    if (ratio > 0.85) return 0.7;
    if (ratio > 0.7) return 0.4;
    return 0.2;
  }

  // Larger than max - usually fine
  const ratio = listing.size / max;
  if (ratio < 1.2) return 0.8;
  return 0.6;
}

function calcValueForMoney(listing: Listing, query: SearchFilters): number {
  const city = listing.city || query.city || '';
  const avgPricePerSqm = getAvgPricePerSqm(city, listing.neighborhood);

  if (!avgPricePerSqm || !listing.size) return 0.5;

  const listingPricePerSqm = listing.price / listing.size;
  const ratio = listingPricePerSqm / avgPricePerSqm;

  // Below average = good value
  if (ratio < 0.8) return 1.0;  // Great deal
  if (ratio < 0.95) return 0.8;
  if (ratio < 1.05) return 0.6;  // Average
  if (ratio < 1.2) return 0.4;  // Slightly overpriced
  return 0.2; // Overpriced
}