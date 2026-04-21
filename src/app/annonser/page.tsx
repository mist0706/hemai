"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { searchListings, formatPrice, formatSize } from "@/lib/api";
import { SearchResult, Listing } from "@/types";

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/annonser/${listing.id}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-4xl">🏠</div>
          )}
          {listing.aiScore !== undefined && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-lg px-3 py-1 text-sm font-bold shadow">
              {listing.aiScore}/100
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">{listing.title}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">{listing.address}, {listing.neighborhood}</p>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-blue-900">{formatPrice(listing.price)}</span>
            {listing.monthlyFee && (
              <span className="text-gray-400">+ {formatPrice(listing.monthlyFee)}/mån</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            <span>{listing.rooms} rum</span>
            <span>·</span>
            <span>{formatSize(listing.size)}</span>
            {listing.floor && (
              <>
                <span>·</span>
                <span>Vån {listing.floor}</span>
              </>
            )}
          </div>

          {/* AI Tags */}
          {listing.aiTags && listing.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {listing.aiTags.slice(0, 3).map(tag => (
                <span key={tag} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      setError(null);
      try {
        const filters = {
          keyword: searchParams.get("q") || undefined,
          city: searchParams.get("city") || undefined,
          minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
          maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
          minRooms: searchParams.get("minRooms") ? Number(searchParams.get("minRooms")) : undefined,
          maxRooms: searchParams.get("maxRooms") ? Number(searchParams.get("maxRooms")) : undefined,
          minSize: searchParams.get("minSize") ? Number(searchParams.get("minSize")) : undefined,
          maxSize: searchParams.get("maxSize") ? Number(searchParams.get("maxSize")) : undefined,
          housingType: searchParams.getAll("type") as any[] || undefined,
          housingForm: searchParams.getAll("form") as any[] || undefined,
          sortBy: (searchParams.get("sort") as any) || undefined,
        };
        const data = await searchListings(filters);
        setResults(data);
      } catch (err: any) {
        setError(err.message || "Kunde inte hämta annonser");
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [searchParams.toString()]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Söker bostäder...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-blue-600 underline">
          Försök igen
        </button>
      </div>
    );
  }

  if (!results || results.listings.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-lg mb-2">Inga annonser hittades</p>
        <p className="text-gray-400">Prova att ändra dina sökfilter</p>
        <Link href="/sok" className="inline-block mt-4 text-blue-600 underline">
          ← Tillbaka till sök
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        {results.total} {results.total === 1 ? "annons" : "annonser"} hittades
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Annonser</h1>
        <Link href="/sok" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Ändra sökning
        </Link>
      </div>
      <Suspense fallback={<div className="animate-pulse">Laddar...</div>}>
        <ListingsContent />
      </Suspense>
    </div>
  );
}