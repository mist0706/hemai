// Mock data for development — extracted to separate file for shared use

import { SearchFilters, SearchResult, Listing, HousingType, HousingForm, SortOption } from "@/types";

export const MOCK_LISTINGS: Listing[] = [
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
    url: "https://www.hemnet.se/bostad/1",
    broker: { name: "Anna Svensson", phone: "070-1234567", email: "anna@exempel.se", company: "Mäklarfirman AB" },
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
    url: "https://www.hemnet.se/bostad/2",
    broker: { name: "Erik Johansson", company: "Svensk Fastighetsförmedling" },
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
    url: "https://www.hemnet.se/bostad/3",
    broker: { name: "Maria Lind", phone: "031-987654", email: "maria@exempel.se", company: "Länsförsäkringar Fastighetsförmedling" },
  },
  {
    id: "4",
    title: "Charmig 2:a i Linné",
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
    url: "https://www.hemnet.se/bostad/4",
    broker: { name: "Johan Berg", company: "Fastighetsbyrån" },
  },
  {
    id: "5",
    title: "Ljus 4:a på Södermalm",
    address: "Hornsgatan 78",
    neighborhood: "Södermalm",
    city: "Stockholm",
    postalCode: "117 26",
    price: 5200000,
    monthlyFee: 6200,
    size: 95,
    rooms: 4,
    floor: "4",
    housingType: HousingType.Apartment,
    housingForm: HousingForm.Condominium,
    constructionYear: 1910,
    renovationYear: 2020,
    imageUrl: "",
    images: [],
    description: "Ljus och rymlig fyra på Södermalm med fantastisk utsikt. Renoverat kök 2020. Hög takhöjd och fina originaldetaljer. Nära Mariatorget.",
    amenities: ["Hiss", "Balkong", "Förråd", "Tvättstuga"],
    publishedAt: "2026-04-20T12:00:00Z",
    url: "https://www.hemnet.se/bostad/5",
    broker: { name: "Lisa Andersson", phone: "08-123456", email: "lisa@exempel.se", company: "Erik Olsson Fastighetsförmedling" },
  },
  {
    id: "6",
    title: "Renoverad villa i Limhamn",
    address: "Sibyllegatan 15",
    neighborhood: "Limhamn",
    city: "Malmö",
    postalCode: "216 15",
    price: 4800000,
    size: 140,
    rooms: 5,
    housingType: HousingType.House,
    housingForm: HousingForm.TenantOwnership,
    constructionYear: 1955,
    renovationYear: 2022,
    imageUrl: "",
    images: [],
    description: "Välrenoverad villa i Limhamn med härlig trädgård. Totalrenoverad 2022. Nära havet och Limhamns torg. Perfekt för familjen.",
    amenities: ["Trädgård", "Garage", "Källare", "Uterum"],
    publishedAt: "2026-04-19T11:00:00Z",
    url: "https://www.hemnet.se/bostad/6",
    broker: { name: "Per Nilsson", company: "Svensk Fastighetsförmedling Malmö" },
  },
];

export function searchMockListings(filters: SearchFilters): Listing[] {
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
  } else {
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  return filtered;
}