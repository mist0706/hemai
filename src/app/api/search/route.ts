import { NextRequest, NextResponse } from "next/server";
import { SearchFilters, SearchResult, Listing, HousingType, HousingForm, SortOption } from "@/types";

// Mock data for development — will be replaced by scraper agent
const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Vacker 3:a i Majorna med havsutsikt",
    address: "Stigbergsliden 12",
    neighborhood: "Majorna",
    city: "Göteborg",
    postalCode: "414 71",
    price: 2850000,
    monthlyFee: 4200,
    size: 78,
    rooms: 3,
    floor: "3",
    housingType: HousingType.Apartment,
    housingForm: HousingForm.Condominium,
    constructionYear: 1925,
    renovationYear: 2019,
    imageUrl: "",
    images: [],
    description: "Vacker trea i charmiga Majorna med fantastisk havsutsikt. Renoverat kök och badrum 2019. Bästa läget i Göteborg med nära till både havet och stan. Hela 78 kvm med generösa rum och hög takhöjd.",
    amenities: ["Balkong", "Hiss", "Förråd", "Tvättstuga"],
    publishedAt: "2026-04-18T10:00:00Z",
    url: "https://example.com/1",
    broker: { name: "Anna Svensson", phone: "070-1234567", email: "anna@exempel.se", company: "Mäklarfirman AB" },
    aiScore: 82,
    aiTags: ["Havsutsikt", "Majorna", "Renoverad"],
  },
  {
    id: "2",
    title: "Modern studio i centralt läge",
    address: "Kungsportsplatsen 5",
    neighborhood: "Centrum",
    city: "Göteborg",
    postalCode: "411 03",
    price: 1950000,
    monthlyFee: 3100,
    size: 32,
    rooms: 1,
    floor: "5",
    housingType: HousingType.Studio,
    housingForm: HousingForm.Condominium,
    constructionYear: 2018,
    imageUrl: "",
    images: [],
    description: "Modern och fin etta i nyproduktion mitt i stan. Öppen planlösning med smakfulla materialval. Närhet till allt.",
    amenities: ["Hiss", "P-plats", "Cykelförråd"],
    publishedAt: "2026-04-19T08:00:00Z",
    url: "https://example.com/2",
    broker: { name: "Erik Johansson", company: "Svensk Fastighetsförmedling" },
    aiScore: 71,
    aiTags: ["Nyproduktion", "Centrum", "Etta"],
  },
  {
    id: "3",
    title: "Familjevilla i Askim med trädgård",
    address: "Askimsbacken 22",
    neighborhood: "Askim",
    city: "Göteborg",
    postalCode: "436 31",
    price: 6450000,
    size: 165,
    rooms: 6,
    housingType: HousingType.House,
    housingForm: HousingForm.TenantOwnership,
    constructionYear: 1992,
    renovationYear: 2021,
    imageUrl: "",
    images: [],
    description: "Underbar villa i Askim med stor trädgård och uteplatser. Perfekt för familjen med 6 rum och generösa ytor. Renoverad 2021 med nytt kök och badrum. Garage och carport.",
    amenities: ["Trädgård", "Garage", "Uterum", "Öppen spis"],
    publishedAt: "2026-04-20T14:00:00Z",
    url: "https://example.com/3",
    broker: { name: "Maria Lind", phone: "031-987654", email: "maria@exempel.se", company: "Länsförsäkringar Fastighetsförmedling" },
    aiScore: 88,
    aiTags: ["Villa", "Trädgård", "Askim", "Familj"],
  },
  {
    id: "4",
    title: "Charmig 2:a i Linné — ompossible",
    address: "Linnégatan 45",
    neighborhood: "Linné",
    city: "Göteborg",
    postalCode: "413 04",
    price: 2200000,
    monthlyFee: 3800,
    size: 55,
    rooms: 2,
    floor: "2",
    housingType: HousingType.Apartment,
    housingForm: HousingForm.Condominium,
    constructionYear: 1938,
    imageUrl: "",
    images: [],
    description: "Charmig tvåa i Linné med originaldetaljer. Bra planlösning med potential att öppna upp köket. Nära Linnéplatsen och all stadsliv.",
    amenities: ["Balkong", "Förråd"],
    publishedAt: "2026-04-21T09:30:00Z",
    url: "https://example.com/4",
    broker: { name: "Johan Berg", company: "Fastighetsbyrån" },
    aiScore: 65,
    aiTags: ["Linné", "Ompossible", "Charmig"],
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters: SearchFilters = {
    keyword: searchParams.get("q") || undefined,
    city: searchParams.get("city") || undefined,
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    minRooms: searchParams.get("minRooms") ? Number(searchParams.get("minRooms")) : undefined,
    maxRooms: searchParams.get("maxRooms") ? Number(searchParams.get("maxRooms")) : undefined,
    minSize: searchParams.get("minSize") ? Number(searchParams.get("minSize")) : undefined,
    maxSize: searchParams.get("maxSize") ? Number(searchParams.get("maxSize")) : undefined,
    housingType: searchParams.getAll("type").length ? (searchParams.getAll("type") as HousingType[]) : undefined,
    housingForm: searchParams.getAll("form").length ? (searchParams.getAll("form") as HousingForm[]) : undefined,
    neighborhoods: searchParams.getAll("area").length ? searchParams.getAll("area") : undefined,
    sortBy: (searchParams.get("sort") as SortOption) || SortOption.Newest,
  };

  // Filter mock data — will be replaced by DB/scaper queries
  let filtered = [...MOCK_LISTINGS];

  if (filters.keyword) {
    const q = filters.keyword.toLowerCase();
    filtered = filtered.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.neighborhood.toLowerCase().includes(q)
    );
  }
  if (filters.city) {
    filtered = filtered.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
  }
  if (filters.neighborhoods?.length) {
    filtered = filtered.filter(l => filters.neighborhoods!.includes(l.neighborhood));
  }
  if (filters.housingType?.length) {
    filtered = filtered.filter(l => filters.housingType!.includes(l.housingType));
  }
  if (filters.housingForm?.length) {
    filtered = filtered.filter(l => filters.housingForm!.includes(l.housingForm));
  }
  if (filters.minPrice !== undefined) {
    filtered = filtered.filter(l => l.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(l => l.price <= filters.maxPrice!);
  }
  if (filters.minRooms !== undefined) {
    filtered = filtered.filter(l => l.rooms >= filters.minRooms!);
  }
  if (filters.maxRooms !== undefined) {
    filtered = filtered.filter(l => l.rooms <= filters.maxRooms!);
  }
  if (filters.minSize !== undefined) {
    filtered = filtered.filter(l => l.size >= filters.minSize!);
  }
  if (filters.maxSize !== undefined) {
    filtered = filtered.filter(l => l.size <= filters.maxSize!);
  }
  if (filters.sortBy === SortOption.PriceAsc) {
    filtered.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === SortOption.PriceDesc) {
    filtered.sort((a, b) => b.price - a.price);
  } else if (filters.sortBy === SortOption.SizeAsc) {
    filtered.sort((a, b) => a.size - b.size);
  } else if (filters.sortBy === SortOption.SizeDesc) {
    filtered.sort((a, b) => b.size - a.size);
  } else if (filters.sortBy === SortOption.AiScore) {
    filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  } else {
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  const result: SearchResult = {
    listings: filtered,
    total: filtered.length,
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
}