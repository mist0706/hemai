import { NextRequest, NextResponse } from "next/server";
import { AISummaryResponse, Listing, SearchFilters } from "@/types";
import { summarizeListing } from "@/lib/ai/summarizer";
import { MOCK_LISTINGS } from "@/app/api/search/mock-data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = MOCK_LISTINGS.find(l => l.id === id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    const summary = await summarizeListing(listing, {}, listing.aiScore || 50);
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI summary failed", message: err.message },
      { status: 500 }
    );
  }
}