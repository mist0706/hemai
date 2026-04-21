import { NextRequest, NextResponse } from "next/server";
import { searchMockListings } from "./mock-data";
import { scrapeListings } from "@/lib/scrapers";
import { parseQuery } from "@/lib/ai/query-parser";
import { enrichListings } from "@/lib/ai";
import { SearchFilters, SearchResult, Listing } from "@/types";

const USE_LIVE_SCRAPERS = process.env.HEMAI_LIVE_SCRAPERS === "true";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawFilters: SearchFilters = {
    keyword: searchParams.get("q") || undefined,
    city: searchParams.get("city") || undefined,
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    minRooms: searchParams.get("minRooms") ? Number(searchParams.get("minRooms")) : undefined,
    maxRooms: searchParams.get("maxRooms") ? Number(searchParams.get("maxRooms")) : undefined,
    minSize: searchParams.get("minSize") ? Number(searchParams.get("minSize")) : undefined,
    maxSize: searchParams.get("maxSize") ? Number(searchParams.get("maxSize")) : undefined,
    housingType: searchParams.getAll("type").length ? (searchParams.getAll("type") as any[]) : undefined,
    housingForm: searchParams.getAll("form").length ? (searchParams.getAll("form") as any[]) : undefined,
    neighborhoods: searchParams.getAll("area").length ? searchParams.getAll("area") : undefined,
    sortBy: (searchParams.get("sort") as any) || undefined,
  };

  try {
    let listings: Listing[];

    if (USE_LIVE_SCRAPERS) {
      // Live mode: scrape real listings from Hemnet + Bovision
      const scrapeResult = await scrapeListings(rawFilters);
      listings = scrapeResult.listings;
    } else {
      // Dev mode: use mock data
      listings = searchMockListings(rawFilters);
    }

    // Enrich with AI scoring (always, even for mock data)
    const enriched = await enrichListings(listings, rawFilters, 5);

    const result: SearchResult = {
      listings: enriched,
      total: enriched.length,
      page: 1,
      pageSize: 20,
      facets: {
        cities: [],
        housingTypes: [],
        priceRanges: [],
        roomCounts: [],
      },
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/search] Error:", err);
    return NextResponse.json(
      { error: "Search failed", message: err.message },
      { status: 500 }
    );
  }
}

// POST endpoint for natural language queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || body.q || "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Parse natural language → structured filters
    const parsed = await parseQuery(query);

    // 2. Get listings (live or mock)
    let listings: Listing[];
    if (USE_LIVE_SCRAPERS) {
      const scrapeResult = await scrapeListings(parsed.filters);
      listings = scrapeResult.listings;
    } else {
      listings = searchMockListings(parsed.filters);
    }

    // 3. Enrich with AI scoring + summaries
    const enriched = await enrichListings(listings, parsed.filters, 5);

    const result: SearchResult = {
      listings: enriched,
      total: enriched.length,
      page: 1,
      pageSize: 20,
      facets: {
        cities: [],
        housingTypes: [],
        priceRanges: [],
        roomCounts: [],
      },
    };

    return NextResponse.json({
      ...result,
      _meta: {
        parsedFilters: parsed.filters,
        confidence: parsed.confidence,
      },
    });
  } catch (err: any) {
    console.error("[api/search] POST error:", err);
    return NextResponse.json(
      { error: "Search failed", message: err.message },
      { status: 500 }
    );
  }
}