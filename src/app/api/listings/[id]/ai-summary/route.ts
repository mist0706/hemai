import { NextRequest, NextResponse } from "next/server";
import { AISummaryResponse } from "@/types";
import { getListingsCached } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = getListingsCached(id);

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  // Return a simple rule-based summary since Ollama may not be available
  const pricePerSqm = listing.size > 0 ? Math.round(listing.price / listing.size) : 0;
  const tags: string[] = [];
  if (listing.rooms >= 3) tags.push('Rymlig');
  if (listing.area) tags.push(listing.area);
  tags.push(listing.source === 'fastighetsbyran' ? 'Fastighetsbyrån' : listing.source);

  const pros: string[] = [];
  const cons: string[] = [];

  if (listing.size > 60) pros.push('God yta');
  if (listing.rooms >= 3) pros.push(`${listing.rooms} rum`);
  if (pricePerSqm > 0 && pricePerSqm < 50000) pros.push('Prisvärd per m²');

  if (listing.monthlyFee && listing.monthlyFee > 5000) cons.push('Hög månadsavgift');
  if (pricePerSqm > 80000) cons.push('Hög pris per m²');

  const summary = `${listing.rooms} rum${listing.housingType ? ` ${listing.housingType}` : ''} på ${listing.address}, ${listing.area || listing.city}. ${listing.size} m² till ${listing.price.toLocaleString('sv-SE')} kr.`;

  return NextResponse.json({
    listingId: id,
    summary,
    score: (listing as any).aiScore || 75,
    tags,
    pros,
    cons,
  } satisfies AISummaryResponse);
}