// Property Summarizer — generates Swedish summaries via Ollama

import { Listing, SearchFilters, AISummaryResponse } from '@/types';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:cloud';

export async function summarizeListing(
  listing: Listing,
  query: SearchFilters,
  score: number
): Promise<AISummaryResponse> {
  const prompt = buildSummaryPrompt(listing, query, score);

  try {
    const response = await fetch(`${OLLAMA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Du är en svensk fastighetsanalytiker. Ge korta, koncisa analyser på svenska. Svara ENDAST med giltig JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return generateRuleBasedSummary(listing, query, score);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);

    if (parsed) {
      return {
        listingId: listing.id,
        summary: parsed.summary || '',
        score: parsed.score || score,
        tags: parsed.tags || generateTags(listing, query),
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        commuteInfo: parsed.commuteInfo,
        neighborhoodInsight: parsed.neighborhoodInsight,
      };
    }
  } catch (err) {
    console.error('[summarizer] LLM error:', err);
  }

  return generateRuleBasedSummary(listing, query, score);
}

function buildSummaryPrompt(listing: Listing, query: SearchFilters, score: number): string {
  const queryDesc = query.city ? `${query.neighborhoods?.join(', ') || ''} ${query.city}`.trim() : 'Sverige';
  const pricePerSqm = listing.size > 0 ? Math.round(listing.price / listing.size) : 0;

  return `Analysera denna bostad:

Bostad: ${listing.title}
Adress: ${listing.address}, ${listing.neighborhood}, ${listing.city}
Pris: ${listing.price.toLocaleString('sv-SE')} kr${listing.monthlyFee ? ` + ${listing.monthlyFee.toLocaleString('sv-SE')} kr/mån avgift` : ''}
Storlek: ${listing.size} m², ${listing.rooms} rum
Pris/m²: ${pricePerSqm.toLocaleString('sv-SE')} kr
Typ: ${listing.housingType}, ${listing.housingForm}
${listing.constructionYear ? `Byggår: ${listing.constructionYear}` : ''}

Sökfråga: "${queryDesc}"
AI-poäng: ${score}/100

Svara med JSON:
{
  "summary": "1-2 meningar om varför denna bostad matchar sökningen",
  "score": number,
  "tags": ["tagg1", "tagg2", "tagg3"],
  "pros": ["fördel1", "fördel2"],
  "cons": ["nackdel1"],
  "commuteInfo": "pendlingsinfo (valfritt)",
  "neighborhoodInsight": "områdesinsikt (valfritt)"
}`;
}

function generateRuleBasedSummary(listing: Listing, query: SearchFilters, score: number): AISummaryResponse {
  const tags = generateTags(listing, query);
  const pros: string[] = [];
  const cons: string[] = [];

  // Rule-based pros/cons
  if (score >= 80) pros.push('Hög matchning med sökningen');
  if (listing.size > 0 && query.maxPrice && listing.price < query.maxPrice * 0.85) {
    pros.push('Prisvärd jämfört med budget');
  }
  if (listing.constructionYear && listing.constructionYear > 2010) {
    pros.push('Nyproduktion/modern');
  }
  if (listing.rooms >= (query.minRooms || 0) && listing.rooms <= (query.maxRooms || Infinity)) {
    pros.push('Rätt antal rum');
  }

  if (listing.monthlyFee && listing.monthlyFee > 5000) {
    cons.push('Hög månadsavgift');
  }
  if (query.maxPrice && listing.price > query.maxPrice) {
    cons.push('Över budget');
  }
  if (listing.constructionYear && listing.constructionYear < 1960) {
    cons.push('Äldre byggnad');
  }

  const summary = score >= 70
    ? `Denna ${listing.housingType} i ${listing.neighborhood || listing.city} är en bra matchning med en AI-poäng på ${score}/100.`
    : `Denna ${listing.housingType} i ${listing.neighborhood || listing.city} matchar delvis din sökning (AI-poäng: ${score}/100).`;

  return {
    listingId: listing.id,
    summary,
    score,
    tags,
    pros,
    cons,
  };
}

function extractJson(text: string): Record<string, any> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// Also exported for use by tags module
export function generateTags(listing: Listing, query: SearchFilters): string[] {
  const tags: string[] = [];

  // Price-based tags
  if (query.maxPrice && listing.price <= query.maxPrice * 0.8) {
    tags.push('Prisvärd');
  }
  if (query.maxPrice && listing.price > query.maxPrice) {
    tags.push('Över budget');
  }

  // Location tags
  if (listing.neighborhood) {
    tags.push(listing.neighborhood);
  }

  // Size tags
  if (listing.size > 100) tags.push('Rymlig');
  if (listing.size < 40) tags.push('Kompakt');

  // Feature tags
  if (listing.amenities?.includes('Balkong') || listing.description?.toLowerCase().includes('balkong')) {
    tags.push('Balkong');
  }
  if (listing.amenities?.includes('Hiss') || listing.description?.toLowerCase().includes('hiss')) {
    tags.push('Hiss');
  }

  // Condition tags
  if (listing.constructionYear && listing.constructionYear > 2020) tags.push('Nyproduktion');
  if (listing.renovationYear && listing.renovationYear > 2020) tags.push('Nyligen renoverad');

  // Type tags
  tags.push(listing.housingType === 'lägenhet' ? 'Lägenhet' : 
             listing.housingType === 'villa' ? 'Villa' : 
             listing.housingType === 'radhus' ? 'Radhus' : '');

  return tags.filter(Boolean).slice(0, 5);
}