// HemAI Search API Route — SSE (Server-Sent Events) streaming
// POST /api/search
//
// Fires all scrapers in parallel. As each scraper finishes,
// its results are streamed to the client immediately.
// Client sees results trickling in source by source.
//
// Query params:
//   body: { query: string } or { city, area, type, priceMin, priceMax, roomsMin, roomsMax }
//
// SSE events:
//   event: source
//   data: { source: "fastighetsbyran", count: 47, listings: [...] }
//
//   event: meta
//   data: { cached: false, sources: 6, querySig: "..." }
//
//   event: done
//   data: { total: 128, deduped: 105, durationMs: 3200 }
//
//   event: error
//   data: { source: "bjurfors", error: "timeout" }

import { NextRequest } from 'next/server';
import { ScrapedProperty, SearchQuery } from '@/types';
import { SCRAPERS } from '@/lib/scrapers/index';
import { getCached, setCache, querySignature } from '@/lib/cache';
import { inferCity, cityMatches } from '@/lib/city-inference';

// GET /api/search?city=...&minPrice=... — Legacy JSON endpoint (backward-compatible)
// Returns { listings: ScrapedProperty[] } for existing frontend
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const query: SearchQuery = buildQuery({
    query: searchParams.get('q') || undefined,
    city: searchParams.get('city') || undefined,
    area: searchParams.get('area') || undefined,
    type: searchParams.getAll('type')[0] || undefined,
    priceMin: searchParams.get('minPrice') || undefined,
    priceMax: searchParams.get('maxPrice') || undefined,
    roomsMin: searchParams.get('minRooms') || undefined,
    roomsMax: searchParams.get('maxRooms') || undefined,
    sizeMin: searchParams.get('minSize') || undefined,
    sizeMax: searchParams.get('maxSize') || undefined,
  });

  // Check cache first
  const cached = getCached(query);
  if (cached) {
    return Response.json({ listings: cached, total: cached.length, cached: true });
  }

  try {
    const startTime = Date.now();
    const results = await Promise.allSettled(
      SCRAPERS.map(async (scraper) => {
        try {
          return await Promise.race([
            scraper.scrape(query),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), scraper.timeout)
            ),
          ]);
        } catch {
          return [];
        }
      })
    );

    const allListings: ScrapedProperty[] = [];
    const seenUrls = new Set<string>();
    const errors: { source: string; error: string }[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const scraper = SCRAPERS[i];
      if (result.status === 'fulfilled') {
        for (const listing of result.value) {
          if (!seenUrls.has(listing.url)) {
            seenUrls.add(listing.url);
            allListings.push(listing);
          }
        }
      } else {
        errors.push({ source: scraper.source, error: result.reason?.message || 'failed' });
      }
    }

    // Cache combined results
    setCache(query, allListings);

    const durationMs = Date.now() - startTime;
    console.log(`[search] GET completed in ${durationMs}ms: ${allListings.length} listings from ${SCRAPERS.length} sources (${errors.length} errors)`);

    // Post-processing: Enforce city filter as a safety net
    // Some scrapers (e.g., HTML-based ones) may leak listings from other cities
    if (query.parsed.city) {
      const before = allListings.length;
      let i = 0;
      while (i < allListings.length) {
        const listing = allListings[i];
        // Enrich empty city using URL/area inference
        if (!listing.city) {
          listing.city = inferCity(listing);
        }
        if (listing.city && !cityMatches(listing.city, query.parsed.city!)) {
          allListings.splice(i, 1);
        } else {
          i++;
        }
      }
      const removed = before - allListings.length;
      if (removed > 0) {
        console.log(`[search] City filter removed ${removed} listings not matching "${query.parsed.city}"`);
        // Update cache with filtered results
        setCache(query, allListings);
      }
    }

    // Transform ScrapedProperty → Listing (frontend-compatible)
    const enriched = allListings.map(l => {
      const typeMap: Record<string, string> = {
        'lägenhet': 'lägenhet', 'hus': 'hus', 'radhus': 'radhus', 'fritidshus': 'stuga',
        'HousingCooperative': 'lägenhet', 'House': 'hus', 'Condominium': 'lägenhet',
      };
      const rawType = l.housingType || '';
      const mappedType = typeMap[rawType] || (l.source === 'bovision' ? 'lägenhet' : 'lägenhet');
      return {
        ...l,
        id: l.id,
        title: l.title || [l.rooms ? `${l.rooms} rum` : '', l.address, l.area || l.city].filter(Boolean).join(' ') || l.id,
        neighborhood: l.area || l.neighborhood || '',
        postalCode: '',
        housingType: mappedType,
        housingForm: 'Bostadsrätt',
        images: l.images || (l.imageUrl ? [l.imageUrl] : []),
        description: l.description || '',
        amenities: [],
        publishedAt: l.scrapedAt || new Date().toISOString(),
        broker: typeof l.broker === 'string' ? { name: l.broker, company: l.broker } : { name: '', company: '' },
      };
    });

    return Response.json({
      listings: enriched,
      total: enriched.length,
      sources: SCRAPERS.map(s => s.source),
      durationMs,
      cached: false,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[search] GET error:', err);
    return Response.json({ error: err?.message || 'Search failed' }, { status: 500 });
  }
}

// POST /api/search — SSE streaming endpoint for progressive results
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Build SearchQuery from request
  const query: SearchQuery = buildQuery(body);

  // Check cache first
  const cached = getCached(query);
  if (cached) {
    // Return all cached results as a single SSE event
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        send(controller, enc, 'meta', { cached: true, sources: 0, querySig: querySignature(query) });
        send(controller, enc, 'source', { source: 'cache', count: cached.length, listings: cached });
        send(controller, enc, 'done', { total: cached.length, deduped: cached.length, durationMs: 0 });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });
  }

  // Fire all scrapers in parallel, stream results as they complete
  const startTime = Date.now();
  const allListings: ScrapedProperty[] = [];
  const seenUrls = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      send(controller, enc, 'meta', { cached: false, sources: SCRAPERS.length, querySig: querySignature(query) });

      // Launch all scrapers simultaneously, each with its own timeout
      const scraperPromises = SCRAPERS.map(async (scraper) => {
        try {
          // Race each scraper against its configured timeout
          const listings = await Promise.race([
            scraper.scrape(query),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), scraper.timeout)
            ),
          ]);

          // Deduplicate against already-seen URLs
          const dedupedListings = listings.filter(l => {
            if (seenUrls.has(l.url)) return false;
            seenUrls.add(l.url);
            return true;
          });

          allListings.push(...dedupedListings);

          // Stream this source's results immediately
          send(controller, enc, 'source', {
            source: scraper.source,
            count: dedupedListings.length,
            listings: dedupedListings,
          });
        } catch (err: any) {
          const errorMsg = err?.message || 'unknown error';
          console.error(`[search] ${scraper.source} failed: ${errorMsg}`);
          send(controller, enc, 'error', {
            source: scraper.source,
            error: errorMsg === 'timeout' ? 'timeout' : 'failed',
          });
        }
      });

      // Wait for all scrapers to finish (or timeout)
      await Promise.allSettled(scraperPromises);

      const durationMs = Date.now() - startTime;

      // Post-processing: Enforce city filter on cached results
      // (SSE already streamed per-source, but we filter what gets cached)
      if (query.parsed.city) {
        for (const listing of allListings) {
          if (!listing.city) listing.city = inferCity(listing);
        }
        const filtered = allListings.filter(l => !l.city || cityMatches(l.city, query.parsed.city!));
        if (filtered.length !== allListings.length) {
          console.log(`[search SSE] City filter: ${allListings.length} -> ${filtered.length} for "${query.parsed.city}"`);
        }
        setCache(query, filtered);

        send(controller, enc, 'done', {
          total: filtered.length,
          deduped: filtered.length,
          durationMs,
        });
      } else {
        setCache(query, allListings);

        send(controller, enc, 'done', {
          total: allListings.length,
          deduped: allListings.length,
          durationMs,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function send(controller: ReadableStreamDefaultController, enc: TextEncoder, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(enc.encode(payload));
}

function buildQuery(body: any): SearchQuery {
  // Support both natural language and structured input
  if (body.query && typeof body.query === 'string') {
    // Natural language query — AI parser would handle this upstream
    // For now, basic parsing
    return parseNaturalQuery(body.query);
  }

  // Structured query
  // Normalize city names to handle both accented and stripped forms
  const cityMap: Record<string, string> = {
    'goteborg': 'Göteborg', 'gothenburg': 'Göteborg', 'göteborg': 'Göteborg',
    'stockholm': 'Stockholm',
    'malmo': 'Malmö', 'malmö': 'Malmö',
    'uppsala': 'Uppsala', 'lund': 'Lund',
    'linkoping': 'Linköping', 'linköping': 'Linköping',
    'vasteras': 'Västerås', 'västerås': 'Västerås',
    'orebro': 'Örebro', 'örebro': 'Örebro',
    'norrkoping': 'Norrköping', 'norrköping': 'Norrköping',
    'helsingborg': 'Helsingborg',
    'jonkoping': 'Jönköping', 'jönköping': 'Jönköping',
    'umea': 'Umeå', 'umeå': 'Umeå',
    'boras': 'Borås', 'borås': 'Borås',
    'gavle': 'Gävle', 'gävle': 'Gävle',
    'sundsvall': 'Sundsvall', 'karlstad': 'Karlstad',
  };
  const normalizedCity = body.city ? (cityMap[body.city.toLowerCase()] || body.city) : undefined;

  return {
    raw: JSON.stringify(body),
    parsed: {
      city: normalizedCity,
      area: body.area,
      type: body.type,
      price: {
        min: body.priceMin ? Number(body.priceMin) : undefined,
        max: body.priceMax ? Number(body.priceMax) : undefined,
      },
      rooms: {
        min: body.roomsMin ? Number(body.roomsMin) : undefined,
        max: body.roomsMax ? Number(body.roomsMax) : undefined,
      },
      size: {
        min: body.sizeMin ? Number(body.sizeMin) : undefined,
        max: body.sizeMax ? Number(body.sizeMax) : undefined,
      },
      features: body.features,
    },
  };
}

// Basic NL parser — "3 rum i Majorna Göteborg under 3.5M"
function parseNaturalQuery(raw: string): SearchQuery {
  const parsed: SearchQuery['parsed'] = {};
  const lower = raw.toLowerCase();

  // Rooms: "3 rum" or "3-rummare"
  const roomsMatch = lower.match(/(\d+)\s*(?:rum|rummare)/);
  if (roomsMatch) parsed.rooms = { min: parseInt(roomsMatch[1]), max: parseInt(roomsMatch[1]) };

  // Price max: "under 3.5M" or "max 3500000" or "under 3,5 mkr"
  const priceMaxMatch = lower.match(/(?:under|max|till)\s+([\d.,]+)\s*(?:m|mn|mkr|miljon)/);
  if (priceMaxMatch) {
    parsed.price = { ...parsed.price, max: Math.round(parseFloat(priceMaxMatch[1].replace(',', '.')) * 1000000) };
  }
  const priceMaxAbs = lower.match(/(?:under|max)\s+([\d\s]+)\s*kr/);
  if (priceMaxAbs && !parsed.price?.max) {
    parsed.price = { ...parsed.price, max: parseInt(priceMaxAbs[1].replace(/\s/g, ''), 10) };
  }

  // Type: "bostadsrätt", "villa", "lägenhet", "radhus", "fritidshus"
  if (lower.includes('bostadsrätt') || lower.includes('lägenhet')) parsed.type = 'lägenhet';
  else if (lower.includes('villa') || lower.includes('hus')) parsed.type = 'hus';
  else if (lower.includes('radhus')) parsed.type = 'radhus';
  else if (lower.includes('fritidshus') || lower.includes('stuga')) parsed.type = 'fritidshus';

  // City: known Swedish cities
  const cities = ['göteborg', 'gothenburg', 'stockholm', 'malmö', 'uppsala', 'lund', 'linköping', 'västerås', 'örebro', 'norrköping', 'helsingborg', 'jönköping', 'umeå', 'borås', 'gävle', 'sundsvall', 'karlstad'];
  for (const city of cities) {
    if (lower.includes(city)) {
      parsed.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // Area: "i Majorna", "på Södermalm"
  const areaMatch = lower.match(/(?:i|på)\s+([A-ZÅÄÖa-zåäö]+(?:\s+[A-ZÅÄÖa-zåäö]+)*)/);
  if (areaMatch) {
    const areaText = areaMatch[1];
    // Don't set area if it's the city itself
    if (areaText.toLowerCase() !== parsed.city?.toLowerCase()) {
      parsed.area = areaText.charAt(0).toUpperCase() + areaText.slice(1);
    }
  }

  return { raw, parsed };
}