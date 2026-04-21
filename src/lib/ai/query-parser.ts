// Natural Language → Structured Query Parser using Ollama

import { SearchFilters, HousingType, HousingForm, SortOption } from '@/types';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:cloud';

const SYSTEM_PROMPT = `Du är en Svensk fastighets-sökparsers. Konvertera användarens naturliga språkfråga till ett strukturerat JSON-filter för bostadssökning.

Exempel:
"3 rum i Majorna under 3.5M" → {"minRooms":3,"neighborhoods":["Majorna"],"city":"Göteborg","maxPrice":3500000,"housingType":["lägenhet"]}

"Lägenhet i Stockholm centrum med balkong 2-4 rum" → {"housingType":["lägenhet"],"city":"Stockholm","neighborhoods":["Centrum"],"minRooms":2,"maxRooms":4}

"Villa i Askim över 4 rum maximalt 8M" → {"housingType":["villa"],"city":"Göteborg","neighborhoods":["Askim"],"minRooms":4,"maxPrice":8000000}

"Hyresrätt 1 rum Malmö billigast" → {"housingForm":["hyresrätt"],"minRooms":1,"city":"Malmö","sortBy":"price_asc"}

VIKTIGT OM RUM: Om någon säger "3 rum", sätt BARA minRooms=3, INTE maxRooms. Även "3:a" betyder minRooms=3. Bara "2-4 rum" ska ha både minRooms och maxRooms.

Svara ENDAST med giltig JSON. Inga förklaringar. JSON måste matcha detta format:
{
  "city": "string | undefined",
  "neighborhoods": ["string"] | undefined,
  "housingType": ["lägenhet"|"villa"|"radhus"|"stuga"|"loft"|"studio"] | undefined,
  "housingForm": ["bostadsrätt"|"hyresrätt"|"äganderätt"] | undefined,
  "minPrice": number | undefined,
  "maxPrice": number | undefined,
  "minRooms": number | undefined,
  "maxRooms": number | undefined,
  "minSize": number | undefined,
  "maxSize": number | undefined,
  "sortBy": "price_asc"|"price_desc"|"size_asc"|"size_desc"|"newest"|"ai_score" | undefined,
  "keyword": "string | undefined"
}

Viktigt:
- "M" eller "miljon" = multiplicera med 1000000 (3.5M = 3500000)
- "k" eller "tusen" = multiplicera med 1000
- Om staden inte nämns men ett välkänt område nämns (Majorna, Södermalm, Limhamn), härled staden
- Svenska städer: Göteborg, Stockholm, Malmö, Uppsala, Linköping, Västerås, Örebro, Norrköping, Helsingborg, Jönköping, Umeå, Lund, Borås
- Om inget boendeform anges, anta bostadsrätt
- Om inget boendetyp anges, anta lägenhet`;

export interface ParsedQuery {
  filters: SearchFilters;
  raw: string;
  confidence: number; // 0-1 how confident the parse was
}

export async function parseQuery(text: string): Promise<ParsedQuery> {
  // First try regex-based quick parse for common patterns
  const quickResult = quickParse(text);
  if (quickResult && quickResult.confidence > 0.7) {
    return quickResult;
  }

  // Fall back to LLM parsing
  try {
    const response = await fetch(`${OLLAMA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`[query-parser] Ollama HTTP ${response.status}`);
      return fallbackParse(text);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);

    if (parsed) {
      const filters = mapToSearchFilters(parsed);
      return { filters, raw: text, confidence: 0.9 };
    }
  } catch (err) {
    console.error('[query-parser] LLM parse error:', err);
  }

  return fallbackParse(text);
}

function quickParse(text: string): ParsedQuery | null {
  const lower = text.toLowerCase();
  const filters: SearchFilters = {};
  let confidence = 0;
  let cityDetected = false;

  // City detection
  const cityMap: Record<string, string> = {
    'göteborg': 'Göteborg', 'goteborg': 'Göteborg', 'gbg': 'Göteborg',
    'stockholm': 'Stockholm', 'sthlm': 'Stockholm',
    'malmö': 'Malmö', 'malmo': 'Malmö',
    'uppsala': 'Uppsala', 'linköping': 'Linköping', 'linkoping': 'Linköping',
    'västerås': 'Västerås', 'vasteras': 'Västerås',
    'örebro': 'Örebro', 'orebro': 'Örebro',
    'norrköping': 'Norrköping', 'norrkoping': 'Norrköping',
    'helsingborg': 'Helsingborg', 'jönköping': 'Jönköping',
    'umeå': 'Umeå', 'lund': 'Lund', 'borås': 'Borås',
  };

  for (const [key, city] of Object.entries(cityMap)) {
    if (lower.includes(key)) {
      filters.city = city;
      cityDetected = true;
      confidence += 0.2;
      break;
    }
  }

  // Room detection: "3 rum", "2-4 rum", "1:a", "2:a", "3:a"
  // "3 rum" means min 3 rooms (people usually want at least that many)
  // "2-4 rum" means min 2, max 4
  const roomMatch = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*rum/);
  if (roomMatch) {
    filters.minRooms = parseInt(roomMatch[1], 10);
    filters.maxRooms = parseInt(roomMatch[2], 10);
    confidence += 0.2;
  } else {
    const singleRoomMatch = lower.match(/(\d+)\s*rum/);
    if (singleRoomMatch) {
      filters.minRooms = parseInt(singleRoomMatch[1], 10);
      // Don't set maxRooms — allow rooms >= minRooms
      confidence += 0.2;
    } else {
      const apartmentMatch = lower.match(/(\d+):[aå]/);
      if (apartmentMatch) {
        filters.minRooms = parseInt(apartmentMatch[1], 10);
        confidence += 0.15;
      }
    }
  }

  // Price detection: "under 3.5M", "max 5miljoner", "2-4M", "under 3500000"
  const priceUnderMatch = lower.match(/(?:under|max|upp till|mest)\s+(\d+[.,]?\d*)\s*(m|milj|miljoner|k|tusen)?/i);
  if (priceUnderMatch) {
    let price = parseFloat(priceUnderMatch[1].replace(',', '.'));
    const unit = priceUnderMatch[2]?.toLowerCase();
    if (unit?.startsWith('m') || unit?.startsWith('milj')) price *= 1_000_000;
    else if (unit?.startsWith('k') || unit?.startsWith('tusen')) price *= 1_000;
    filters.maxPrice = Math.round(price);
    confidence += 0.2;
  }

  const priceOverMatch = lower.match(/(?:över|min|från|minst)\s+(\d+[.,]?\d*)\s*(m|milj|miljoner|k|tusen)?/i);
  if (priceOverMatch) {
    let price = parseFloat(priceOverMatch[1].replace(',', '.'));
    const unit = priceOverMatch[2]?.toLowerCase();
    if (unit?.startsWith('m') || unit?.startsWith('milj')) price *= 1_000_000;
    else if (unit?.startsWith('k') || unit?.startsWith('tusen')) price *= 1_000;
    filters.minPrice = Math.round(price);
    confidence += 0.15;
  }

  // Area detection ("i Majorna", "i Askim", "på Södermalm")
  // Match Swedish area names (including åäö, compound names like "Stockholm centrum")
  const areaMatch = lower.match(/\bi\s+([a-zäåö]+\s*[a-zäåö]*)/);
  if (areaMatch) {
    const areaRaw = areaMatch[1].trim();
    // Capitalize first letter of each word
    const area = areaRaw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    filters.neighborhoods = [area];
    confidence += 0.1;
    // Infer city from well-known neighborhoods if not already set
    if (!cityDetected) {
      const neighborhoodCityMap: Record<string, string> = {
        'Majorna': 'Göteborg', 'Linné': 'Göteborg', 'Hisingen': 'Göteborg',
        'Askim': 'Göteborg', 'Frölunda': 'Göteborg', 'Mölndal': 'Göteborg',
        'Södermalm': 'Stockholm', 'Östermalm': 'Stockholm', 'Vasastan': 'Stockholm',
        'Kungsholmen': 'Stockholm', 'Gamla Stan': 'Stockholm', 'Nacka': 'Stockholm',
        'Limhamn': 'Malmö', 'Hyllie': 'Malmö', 'Rosengård': 'Malmö', 'Västra Hamnen': 'Malmö',
      };
      if (neighborhoodCityMap[area]) {
        filters.city = neighborhoodCityMap[area];
        cityDetected = true;
        confidence += 0.1;
      }
    } else {
      confidence += 0.05;
    }
  }

  // Housing type
  if (lower.includes('villa')) { filters.housingType = [HousingType.House]; confidence += 0.1; }
  else if (lower.includes('radhus')) { filters.housingType = [HousingType.Townhouse]; confidence += 0.1; }
  else if (lower.includes('studio') || lower.includes('etta') || lower.includes('1:a')) { filters.housingType = [HousingType.Studio]; confidence += 0.1; }
  else if (lower.includes('lägenhet') || lower.includes('trea') || lower.includes('tvåa') || lower.includes('fyra')) { filters.housingType = [HousingType.Apartment]; confidence += 0.05; }

  // Housing form
  if (lower.includes('hyresrätt') || lower.includes('hyra')) { filters.housingForm = [HousingForm.Rental]; confidence += 0.1; }
  else if (lower.includes('äganderätt') || lower.includes('ägare')) { filters.housingForm = [HousingForm.TenantOwnership]; confidence += 0.1; }

  if (confidence < 0.3) return null;
  return { filters, raw: text, confidence };
}

function fallbackParse(text: string): ParsedQuery {
  const quick = quickParse(text);
  if (quick) return quick;

  // Last resort: just use it as a keyword search
  return {
    filters: { keyword: text, sortBy: SortOption.Newest },
    raw: text,
    confidence: 0.2,
  };
}

function extractJson(text: string): Record<string, any> | null {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function mapToSearchFilters(parsed: Record<string, any>): SearchFilters {
  const filters: SearchFilters = {};

  if (parsed.city) filters.city = parsed.city;
  if (parsed.neighborhoods) filters.neighborhoods = parsed.neighborhoods;
  if (parsed.keyword) filters.keyword = parsed.keyword;

  if (parsed.housingType?.length) {
    filters.housingType = parsed.housingType.filter((t: string) =>
      Object.values(HousingType).includes(t as HousingType)
    ) as HousingType[];
  }

  if (parsed.housingForm?.length) {
    filters.housingForm = parsed.housingForm.filter((f: string) =>
      Object.values(HousingForm).includes(f as HousingForm)
    ) as HousingForm[];
  }

  if (parsed.minPrice !== undefined) filters.minPrice = Number(parsed.minPrice);
  if (parsed.maxPrice !== undefined) filters.maxPrice = Number(parsed.maxPrice);
  if (parsed.minRooms !== undefined) filters.minRooms = Number(parsed.minRooms);
  if (parsed.maxRooms !== undefined) filters.maxRooms = Number(parsed.maxRooms);
  if (parsed.minSize !== undefined) filters.minSize = Number(parsed.minSize);
  if (parsed.maxSize !== undefined) filters.maxSize = Number(parsed.maxSize);

  if (parsed.sortBy && Object.values(SortOption).includes(parsed.sortBy)) {
    filters.sortBy = parsed.sortBy as SortOption;
  }

  return filters;
}