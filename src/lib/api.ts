// HemAI API Client

import { SearchFilters, SearchResult, Listing, AISummaryRequest, AISummaryResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function searchListings(filters: SearchFilters): Promise<SearchResult> {
  const params = new URLSearchParams();

  if (filters.city) params.set('city', filters.city);
  if (filters.keyword) params.set('q', filters.keyword);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minRooms !== undefined) params.set('minRooms', String(filters.minRooms));
  if (filters.maxRooms !== undefined) params.set('maxRooms', String(filters.maxRooms));
  if (filters.minSize !== undefined) params.set('minSize', String(filters.minSize));
  if (filters.maxSize !== undefined) params.set('maxSize', String(filters.maxSize));
  if (filters.housingType?.length) {
    filters.housingType.forEach(t => params.append('type', t));
  }
  if (filters.housingForm?.length) {
    filters.housingForm.forEach(f => params.append('form', f));
  }
  if (filters.neighborhoods?.length) {
    filters.neighborhoods.forEach(n => params.append('area', n));
  }
  if (filters.sortBy) params.set('sort', filters.sortBy);

  const res = await fetch(`${API_BASE}/api/search?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getListing(id: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/api/listings/${id}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Listing not found: ${res.status}`);
  }

  return res.json();
}

export async function triggerScrape(url: string): Promise<{ taskId: string }> {
  const res = await fetch(`${API_BASE}/api/listings/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw new Error(`Scrape request failed: ${res.status}`);
  }

  return res.json();
}

export async function getAISummary(request: AISummaryRequest): Promise<AISummaryResponse> {
  const res = await fetch(`${API_BASE}/api/listings/${request.listingId}/ai-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`AI summary failed: ${res.status}`);
  }

  return res.json();
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatSize(size: number): string {
  return `${size.toLocaleString('sv-SE')} m²`;
}