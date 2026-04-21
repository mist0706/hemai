import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Hitta ditt nästa hem med <span className="text-blue-300">AI</span>
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            HemAI analyserar bostadsannonser i hela Sverige med artificiell intelligens — 
            granskningar, värderingar och insikter på sekunder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sok"
              className="inline-flex items-center justify-center rounded-lg bg-white text-blue-900 px-8 py-3.5 text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Sök bostad →
            </Link>
            <Link
              href="/annonser"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 text-white px-8 py-3.5 text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Se annonser
            </Link>
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
            <h3 className="text-lg font-semibold mb-2">Smartsök</h3>
            <p className="text-gray-600 text-sm">
              Sök bland tusentals bostäder med intelligenta filter — stad, område, rum, pris, och mer. AI:n förstår vad du menar.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-sammanfattning</h3>
            <p className="text-gray-600 text-sm">
              Varje annons får en AI-genererad sammanfattning med styrkor, svagheter, pendlingstider och värdering.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-2xl mb-4">
              ⭐
            </div>
            <h3 className="text-lg font-semibold mb-2">Värderingspoäng</h3>
            <p className="text-gray-600 text-sm">
              AI-poäng från 0–100 baserat på pris, läge, skick och område — så du vet vad som är ett fynd.
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
          <Link
            href="/sok"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-8 py-3.5 text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sök bostad nu →
          </Link>
        </div>
      </section>
    </div>
  );
}