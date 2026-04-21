import { NextRequest, NextResponse } from "next/server";
import { MOCK_LISTINGS } from "@/app/api/search/mock-data";
import { enrichListing } from "@/lib/ai";
import { SearchFilters } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = MOCK_LISTINGS.find(l => l.id === id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Try to enrich with AI score if not already present
  if (listing.aiScore === undefined) {
    try {
      const enriched = await enrichListing(listing, {});
      listing.aiScore = enriched.aiScore;
      listing.aiTags = enriched.aiTags;
      listing.aiSummary = enriched.aiSummary;
    } catch {
      // Silently fail — listing is still valid without AI enrichment
    }
  }

  return NextResponse.json(listing);
}