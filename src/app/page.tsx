"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, NEIGHBORHOODS } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    // Use the natural language search endpoint
    router.push(`/annonser?q=${encodeURIComponent(query.trim())}`);
  }

  const suggestions = [
    "3 rum i Majorna under 3.5M",
    "Lägenhet i Stockholm centrum 2-4 rum",
    "Villa i Askim med trädgård",
    "Hyresrätt 1 rum Malmö",
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">🦞</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Hitta ditt hem med <span className="text-blue-300">AI</span>
          </h1>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Sök naturligt — skriv vad du letar efter så analyserar AI tusentals bostäder och ger dig de bästa matchningarna.
          </p>

          {/* Chat-style search bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="t.ex. 3 rum i Majorna under 3.5M..."
              className="w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 pr-14 text-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                "Sök"
              )}
            </button>
          </form>

          {/* Quick suggestions */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); }}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Så fungerar HemAI</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Våra AI-agenter bevakar, analyserar och sammanfattar bostadsannonser så att du sparar tid och fattar bättre beslut.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-2xl mb-4">
              🔍
            </div>
            <h3 className="text-lg font-semibold mb-2">Naturlig sökning</h3>
            <p className="text-gray-600 text-sm">
              Skriv på svenska som du pratar — &quot;3 rum i Majorna under 3.5M&quot; — och AI:n förstår exakt vad du menar.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-analys</h3>
            <p className="text-gray-600 text-sm">
              Varje bostad får en AI-poäng, svensk sammanfattning, styrkor och svagheter — inte bara en annons.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-2xl mb-4">
              ⭐
            </div>
            <h3 className="text-lg font-semibold mb-2">Värderingspoäng</h3>
            <p className="text-gray-600 text-sm">
              AI-poäng 0–100 baserat på pris, läge, skick och område — så du vet vad som är ett fynd.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Redo att hitta ditt hem?</h2>
          <p className="text-gray-600 mb-8">
            Börja söka direkt — inga konton, inga avgifter.
          </p>
          <button
            onClick={() => document.querySelector('input')?.focus()}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-8 py-3.5 text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sök bostad nu →
          </button>
        </div>
      </section>
    </div>
  );
}
