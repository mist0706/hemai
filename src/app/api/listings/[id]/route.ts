import { NextRequest, NextResponse } from "next/server";
import { getListingsCached } from "@/lib/cache";
import { ScrapedProperty, Listing, HousingType, HousingForm } from "@/types";

// Map string housing type to HousingType enum
function mapHousingType(type?: string): HousingType {
  if (!type) return HousingType.Apartment;
  const lower = type.toLowerCase();
  if (lower.includes('villa') || lower.includes('hus')) return HousingType.House;
  if (lower.includes('radhus')) return HousingType.Townhouse;
  return HousingType.Apartment;
}

function mapHousingForm(form?: string): HousingForm {
  if (!form) return HousingForm.Condominium;
  const lower = form.toLowerCase();
  if (lower.includes('hyres')) return HousingForm.Rental;
  if (lower.includes('ägar')) return HousingForm.TenantOwnership;
  return HousingForm.Condominium;
}

// Convert ScrapedProperty to Listing for the detail page
function toListing(sp: ScrapedProperty): Listing {
  return {
    id: sp.id,
    title: sp.title || [sp.rooms ? `${sp.rooms} rum` : '', sp.address, sp.city].filter(Boolean).join(' '),
    address: sp.address,
    city: sp.city,
    neighborhood: sp.area || sp.city,
    price: sp.price,
    monthlyFee: sp.monthlyFee,
    rooms: sp.rooms,
    size: sp.size,
    floor: sp.floor,
    housingType: mapHousingType(sp.housingType || sp.housingForm),
    housingForm: mapHousingForm(sp.housingForm),
    url: sp.url,
    imageUrl: sp.imageUrl || '',
    images: sp.imageUrl ? [sp.imageUrl] : [],
    broker: typeof sp.broker === 'string'
      ? { name: sp.broker, company: sp.broker }
      : (sp.broker || { name: '', company: '' }),
    description: sp.description || '',
    amenities: [],
    source: sp.source,
    publishedAt: sp.scrapedAt || new Date().toISOString(),
    postalCode: '',
    constructionYear: sp.yearBuilt,
    renovationYear: undefined,
    aiScore: (sp as any).aiScore,
    aiTags: (sp as any).aiTags,
    aiSummary: (sp as any).aiSummary,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const scraped = getListingsCached(id);

  if (!scraped) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  const listing = toListing(scraped);
  return NextResponse.json(listing);
}