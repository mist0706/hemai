// Bjurfors scraper — server-rendered HTML, no anti-bot, ~6,100 listings
// URL: https://www.bjurfors.se/sv/tillsalu/
// Each listing is a .c-object-card with structured data:
//   .c-object-card__link → URL
//   .c-object-card__city-area → "Centrum Uppsala, Uppsala"
//   .c-object-card__address → "Svartbäcksgatan 33A"
//   .c-object-card__meta → ["73,5 kvm", "3 rum", "3 690 000 kr"]
// Pagination: loads more via /sv/tillsalu/?page=2

import { ScrapedProperty, SearchQuery, PropertyType } from '@/types';

const BJ_BASE = 'https://www.bjurfors.se';
const BJ_LISTING_PATH = '/sv/tillsalu/';
const MAX_PAGES = 5;

interface BjCardData {
  url: string;
  cityArea: string;   // e.g., "Centrum Uppsala, Uppsala"
  address: string;     // e.g., "Svartbäcksgatan 33A"
  metas: string[];     // e.g., ["73,5 kvm", "3 rum", "3 690 000 kr"]
}

function parseSwedishNumber(str: string): number {
  // "3 690 000 kr" or "73,5 kvm" → numbers
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePriceFromMetas(metas: string[]): number {
  // Find the meta that ends with "kr" or contains large number
  for (const m of metas) {
    if (m.includes('kr') || m.includes('kr')) {
      // "3 690 000 kr" — remove spaces and kr
      const cleaned = m.replace(/[^\d]/g, '');
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

function parseRoomsFromMetas(metas: string[]): number {
  for (const m of metas) {
    const match = m.match(/(\d+(?:[,.]\d+)?)\s*rum/i);
    if (match) return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

function parseSizeFromMetas(metas: string[]): number {
  for (const m of metas) {
    const match = m.match(/(\d+(?:[,.]\d+)?)\s*kvm/i);
    if (match) return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

function inferTypeFromUrl(url: string, metas: string[]): PropertyType {
  const lower = url.toLowerCase();
  if (lower.includes('villa') || lower.includes('hus/')) return 'hus';
  if (lower.includes('radhus')) return 'radhus';
  if (lower.includes('fritidshus')) return 'fritidshus';
  // Default to lägenhet (bostadsrätt)
  return 'lägenhet';
}

function mapBjCard(card: BjCardData, query: SearchQuery): ScrapedProperty | null {
  const price = parsePriceFromMetas(card.metas);
  const rooms = parseRoomsFromMetas(card.metas);
  const size = parseSizeFromMetas(card.metas);
  const propType = inferTypeFromUrl(card.url, card.metas);

  // Client-side filters
  if (query.parsed.price?.min && price && price < query.parsed.price.min) return null;
  if (query.parsed.price?.max && price && price > query.parsed.price.max) return null;
  if (query.parsed.rooms?.min && rooms && rooms < query.parsed.rooms.min) return null;
  if (query.parsed.rooms?.max && rooms && rooms > query.parsed.rooms.max) return null;
  if (query.parsed.size?.min && size && size < query.parsed.size.min) return null;
  if (query.parsed.size?.max && size && size > query.parsed.size.max) return null;
  if (query.parsed.type && propType !== query.parsed.type) return null;

  // Parse city and area from "Area, City" format
  const parts = card.cityArea.split(',').map(s => s.trim());
  const area = parts[0] || '';
  const city = parts[1] || parts[0] || '';

  // City/area filtering
  if (query.parsed.city) {
    const qCity = query.parsed.city.toLowerCase();
    if (city.toLowerCase() !== qCity && area.toLowerCase() !== qCity) return null;
  }

  // Extract listing ID from URL
  const idMatch = card.url.match(/\/([^/]+)\/$/);
  const listingId = idMatch ? idMatch[1] : card.url.split('/').filter(Boolean).pop() || '';

  return {
    id: `bj-${listingId}`,
    source: 'bjurfors',
    url: `${BJ_BASE}${card.url}`,
    address: card.address || '',
    area,
    city,
    price,
    rooms,
    size,
    broker: 'Bjurfors',
    brokerUrl: `${BJ_BASE}${card.url}`,
    scrapedAt: new Date().toISOString(),
  };
}

function extractCardsFromHtml(html: string): BjCardData[] {
  const cards: BjCardData[] = [];

  // Split HTML by card markers — each .c-object-card contains a link, city-area, address, and meta items
  const cardRegex = /<div class="c-object-card[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let cardMatch;

  while ((cardMatch = cardRegex.exec(html)) !== null) {
    const cardHtml = cardMatch[1];

    // Extract link href
    const linkMatch = cardHtml.match(/<a[^>]*class="c-object-card__link"[^>]*href="([^"]+)"/);
    if (!linkMatch) continue;
    const url = linkMatch[1];

    // Extract city-area
    const cityAreaMatch = cardHtml.match(/<span class="c-object-card__city-area"[^>]*>([^<]+)<\/span>/);
    const cityArea = cityAreaMatch ? decodeHTMLEntities(cityAreaMatch[1]) : '';

    // Extract address
    const addressMatch = cardHtml.match(/<span class="c-object-card__address"[^>]*>([^<]+)<\/span>/);
    const address = addressMatch ? decodeHTMLEntities(addressMatch[1]) : '';

    // Extract meta items
    const metaRegex = /<li class="c-object-card__meta"[^>]*>([\s\S]*?)<\/li>/g;
    const metas: string[] = [];
    let metaMatch;
    while ((metaMatch = metaRegex.exec(cardHtml)) !== null) {
      metas.push(decodeHTMLEntities(metaMatch[1].trim()));
    }

    cards.push({ url, cityArea, address, metas });
  }

  return cards;
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&#xE4;/g, 'ä')
    .replace(/&#xF6;/g, 'ö')
    .replace(/&#xE5;/g, 'å')
    .replace(/&#xC4;/g, 'Ä')
    .replace(/&#xD6;/g, 'Ö')
    .replace(/&#xC5;/g, 'Å')
    .replace(/&#xA0;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function scrapeBjurfors(query: SearchQuery): Promise<ScrapedProperty[]> {
  const allResults: ScrapedProperty[] = [];
  console.log(`[bjurfors] Starting scrape for query: ${query.raw}`);

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1
        ? `${BJ_BASE}${BJ_LISTING_PATH}`
        : `${BJ_BASE}${BJ_LISTING_PATH}?page=${page}`;

      console.log(`[bjurfors] Fetching page ${page}: ${url}`);

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
        console.warn('[bjurfors] Rate limited (429)');
        break;
      }

      if (!response.ok) {
        console.warn(`[bjurfors] HTTP ${response.status}`);
        break;
      }

      const html = await response.text();
      const cards = extractCardsFromHtml(html);
      console.log(`[bjurfors] Page ${page}: ${cards.length} cards`);

      if (cards.length === 0) break;

      for (const card of cards) {
        const mapped = mapBjCard(card, query);
        if (mapped) allResults.push(mapped);
      }

      // Less than full page = last page (Bjurfors shows ~30 per page)
      if (cards.length < 20) break;

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[bjurfors] Total: ${allResults.length} listings after filters`);
    return allResults;
  } catch (err) {
    console.error('[bjurfors] Error:', err);
    return allResults;
  }
}