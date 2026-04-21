"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getListing, getAISummary, formatPrice, formatSize } from "@/lib/api";
import { Listing, AISummaryResponse } from "@/types";

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await getListing(id);
        setListing(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function requestAISummary() {
    if (!listing) return;
    setAiLoading(true);
    try {
      const result = await getAISummary({
        listingId: listing.id,
        url: listing.url,
        focusAreas: ["value", "commute", "neighborhood"],
      });
      setAiSummary(result);
    } catch {
      // Silently fail for now
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Laddar annons...</span>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || "Annons hittades inte"}</p>
        <Link href="/annonser" className="text-blue-600 underline">← Tillbaka</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/annonser" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-6 inline-block">
        ← Tillbaka till annonser
      </Link>

      {/* Image Gallery */}
      <div className="rounded-xl overflow-hidden mb-8 bg-gray-200 h-80">
        {listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-6xl">🏠</div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
          <p className="text-gray-600 mb-4">{listing.address}, {listing.neighborhood}, {listing.city}</p>

          <div className="flex items-center gap-2 mb-6">
            {listing.aiTags?.map(tag => (
              <span key={tag} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>

          <div className="prose prose-sm max-w-none mb-8">
            <p className="whitespace-pre-wrap">{listing.description}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-blue-900 mb-1">{formatPrice(listing.price)}</div>
            {listing.monthlyFee && (
              <p className="text-gray-500 text-sm mb-4">+ {formatPrice(listing.monthlyFee)}/mån avgift</p>
            )}

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Typ</dt>
                <dd className="font-medium">{listing.housingType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Form</dt>
                <dd className="font-medium">{listing.housingForm}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Storlek</dt>
                <dd className="font-medium">{formatSize(listing.size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Rum</dt>
                <dd className="font-medium">{listing.rooms}</dd>
              </div>
              {listing.floor && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Våning</dt>
                  <dd className="font-medium">{listing.floor}</dd>
                </div>
              )}
              {listing.constructionYear && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Byggår</dt>
                  <dd className="font-medium">{listing.constructionYear}</dd>
                </div>
              )}
              {listing.renovationYear && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Renoverad</dt>
                  <dd className="font-medium">{listing.renovationYear}</dd>
                </div>
              )}
            </dl>

            {/* Price per sqm */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pris/m²</span>
                <span className="font-medium">{formatPrice(Math.round(listing.price / listing.size))}</span>
              </div>
            </div>

            {listing.aiScore !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">AI-poäng</span>
                  <span className="bg-blue-600 text-white rounded-lg px-3 py-1 text-sm font-bold">
                    {listing.aiScore}/100
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Summary Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🤖 AI-analys
            </h3>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Analyserar...
              </div>
            ) : aiSummary ? (
              <div className="space-y-3 text-sm">
                <p className="text-gray-700">{aiSummary.summary}</p>
                {aiSummary.pros.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-1">✓ Styrkor</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {aiSummary.pros.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {aiSummary.cons.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-1">✗ Svagheter</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {aiSummary.cons.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {aiSummary.commuteInfo && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">🚶 Pendling</h4>
                    <p className="text-gray-600">{aiSummary.commuteInfo}</p>
                  </div>
                )}
                {aiSummary.neighborhoodInsight && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">🏘️ Områdesinsikt</h4>
                    <p className="text-gray-600">{aiSummary.neighborhoodInsight}</p>
                  </div>
                )}
              </div>
            ) : listing.aiSummary ? (
              <p className="text-sm text-gray-700">{listing.aiSummary}</p>
            ) : (
              <button
                onClick={requestAISummary}
                className="w-full rounded-lg bg-blue-50 text-blue-700 px-4 py-2.5 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Generera AI-analys
              </button>
            )}
          </div>

          {/* Broker Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-3">Mäklare</h3>
            <p className="font-medium text-sm">{listing.broker.name}</p>
            <p className="text-sm text-gray-500">{listing.broker.company}</p>
            {listing.broker.phone && (
              <p className="text-sm text-gray-600 mt-1">{listing.broker.phone}</p>
            )}
            {listing.broker.email && (
              <p className="text-sm text-blue-600 mt-1">{listing.broker.email}</p>
            )}
          </div>

          {/* Source Link */}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-gray-100 text-gray-700 px-4 py-3 text-sm font-medium text-center hover:bg-gray-200 transition-colors"
          >
            Se originalannons →
          </a>
        </div>
      </div>
    </div>
  );
}