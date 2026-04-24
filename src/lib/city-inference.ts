// Swedish city inference — maps municipality names, neighborhoods, and county patterns to canonical city names
// Used when scrapers don't provide a `city` field but we can infer it from URL, area, or municipality

// Canonical city name → list of known municipality names (URL slug format)
const MUNICIPALITY_TO_CITY: Record<string, string> = {
  // Göteborg
  'goteborgs-stad': 'Göteborg',
  'goteborgs-kommun': 'Göteborg',
  'molndals-stad': 'Göteborg',
  'partille-kommun': 'Göteborg',
  'harryda-kommun': 'Göteborg',
  'lerums-kommun': 'Göteborg',
  'alvsborgs-kommun': 'Göteborg',
  'kungsbacka-kommun': 'Göteborg',
  'ale-kommun': 'Göteborg',
  'ockeros-kommun': 'Göteborg',
  'steningunds-kommun': 'Göteborg',
  // Stockholm
  'stockholms-stad': 'Stockholm',
  'stockholms-kommun': 'Stockholm',
  'solna-stad': 'Stockholm',
  'sundbybergs-stad': 'Stockholm',
  'lidingo-stad': 'Stockholm',
  'nacka-kommun': 'Stockholm',
  'varmdo-kommun': 'Stockholm',
  'danderyds-kommun': 'Stockholm',
  'taby-kommun': 'Stockholm',
  'sollentuna-kommun': 'Stockholm',
  'jarfalla-kommun': 'Stockholm',
  'huddinge-kommun': 'Stockholm',
  'botkyrka-kommun': 'Stockholm',
  'haninge-kommun': 'Stockholm',
  'tyreso-kommun': 'Stockholm',
  'upplands-bro-kommun': 'Stockholm',
  'sodertalje-kommun': 'Stockholm',
  'nynashamns-kommun': 'Stockholm',
  'osterakers-kommun': 'Stockholm',
  'norrtalje-kommun': 'Stockholm',
  'sigtuna-kommun': 'Stockholm',
  // Malmö
  'malmo-stad': 'Malmö',
  'malmo-kommun': 'Malmö',
  'lund-kommun': 'Lund',
  'helsingborgs-stad': 'Helsingborg',
  'helsingborgs-kommun': 'Helsingborg',
  // Uppsala
  'uppsala-kommun': 'Uppsala',
  'uppsala-stad': 'Uppsala',
  // Linköping
  'linkopings-kommun': 'Linköping',
  'linkopings-stad': 'Linköping',
  'norrkopings-kommun': 'Norrköping',
  'jonkopings-kommun': 'Jönköping',
  // Västerås
  'vasteras-stad': 'Västerås',
  'vasteras-kommun': 'Västerås',
  'rebro-kommun': 'Örebro',
  'orebro-kommun': 'Örebro',
  // Gävle
  'gavle-kommun': 'Gävle',
  'gavle-stad': 'Gävle',
  // Borås
  'boras-kommun': 'Borås',
  'boras-stad': 'Borås',
  // Umeå
  'umea-kommun': 'Umeå',
  'umea-stad': 'Umeå',
  // Sundsvall
  'sundsvalls-kommun': 'Sundsvall',
  // Karlstad
  'karlstads-kommun': 'Karlstad',
  // Västra Götaland - other major cities
  'trollhattans-kommun': 'Trollhättan',
  'uddevalla-kommun': 'Uddevalla',
  'skaraborgs-kommun': 'Skövde',
  'alingsas-kommun': 'Alingsås',
  'falkopings-kommun': 'Falköping',
  'vanersborgs-kommun': 'Vänersborg',
  // Skåne
  'lunds-kommun': 'Lund',
  'kristianstads-kommun': 'Kristianstad',
  'landskrona-kommun': 'Landskrona',
  'trelleborgs-kommun': 'Trelleborg',
  'angelholms-kommun': 'Ängelholm',
  'hogs kommun': 'Höganäs',
  'hoganas-kommun': 'Höganäs',
  // Halland
  'halmstads-kommun': 'Halmstad',
  'varbergs-kommun': 'Varberg',
  'falkenbergs-kommun': 'Falkenberg',
};

// County (län) slug → primary city
const COUNTY_TO_CITY: Record<string, string> = {
  'stockholms-lan': 'Stockholm',
  'vastra-gotalands-lan': 'Göteborg',
  'skane-lan': 'Malmö',
  'ostergotlands-lan': 'Linköping',
  'uppsala-lan': 'Uppsala',
  'jonkopings-lan': 'Jönköping',
  'hallands-lan': 'Halmstad',
  'gavleborgs-lan': 'Gävle',
  'varmlands-lan': 'Karlstad',
  'orebro-lan': 'Örebro',
  'vastmanlands-lan': 'Västerås',
  'dalarnas-lan': 'Falun',
  'kalmar-lan': 'Kalmar',
  'kalmar-(oland)-lan': 'Kalmar',
  'kronobergs-lan': 'Växjö',
  'blekinge-lan': 'Karlskrona',
  'gotlands-lan': 'Visby',
  'vasternorrlands-lan': 'Härnösand',
  'jamtlands-lan': 'Östersund',
  'vasterbottens-lan': 'Umeå',
  'norrbottens-lan': 'Luleå',
  'sodermanlands-lan': 'Nyköping',
};

// Neighborhood → city mapping (most common Swedish neighborhoods)
const NEIGHBORHOOD_TO_CITY: Record<string, string> = {
  // Göteborg neighborhoods
  'majorna': 'Göteborg', 'linné': 'Göteborg', 'haga': 'Göteborg',
  'södermalm': 'Stockholm',  // Both - but primarily Stockholm
  'kallebäck': 'Göteborg', 'högsbo': 'Göteborg', 'frölunda': 'Göteborg',
  'jägerstorp': 'Göteborg', 'torp': 'Göteborg', 'mölndal': 'Göteborg',
  'gårdsten': 'Göteborg', 'angered': 'Göteborg', 'bergsjön': 'Göteborg',
  'biskopsgården': 'Göteborg', 'gamlestaden': 'Göteborg',
  'kräggedal': 'Göteborg', 'kärralund': 'Göteborg', 'kålltorp': 'Göteborg',
  'olsjö': 'Göteborg', 'stapeln': 'Göteborg', 'guldheden': 'Göteborg',
  'landala': 'Göteborg', 'vasastaden': 'Göteborg', 'centrum': 'Göteborg',
  'johanneberg': 'Göteborg', 'chalmers': 'Göteborg',
  'lunden': 'Göteborg', 'sahlgren': 'Göteborg', 'krokslätt': 'Göteborg',
  'kållered': 'Göteborg', 'askim': 'Göteborg', 'hovås': 'Göteborg',
  'billdal': 'Göteborg', 'särö': 'Göteborg',
  // Stockholm neighborhoods
  'vasastan': 'Stockholm', 'gamla stan': 'Stockholm', 'kungsholmen': 'Stockholm',
  'kista': 'Stockholm', 'spånga': 'Stockholm', 'tensta': 'Stockholm',
  'rinkeby': 'Stockholm', 'solna': 'Stockholm', 'sundbyberg': 'Stockholm',
  'lidingö': 'Stockholm', 'danderyd': 'Stockholm', 'täby': 'Stockholm',
  ' Nacka': 'Stockholm', 'nacka': 'Stockholm', 'varmdö': 'Stockholm',
  'södertälje': 'Stockholm', 'tumba': 'Stockholm', 'botkyrka': 'Stockholm',
  'farsta': 'Stockholm', 'skärholmen': 'Stockholm', 'huddinge': 'Stockholm',
  'tyresö': 'Stockholm', 'haninge': 'Stockholm', 'nynäshamn': 'Stockholm',
  'enskede': 'Stockholm', 'skarpnäck': 'Stockholm', 'bromma': 'Stockholm',
  'hägersten': 'Stockholm', 'ägersten': 'Stockholm', ' Hässelby': 'Stockholm',
  'katarina': 'Stockholm', 'maria': 'Stockholm',
  'stångán': 'Stockholm', 'rödja': 'Stockholm', 'jörsa': 'Stockholm',
  // Malmö neighborhoods
  'limhamn': 'Malmö', 'bunkeflo': 'Malmö', 'husie': 'Malmö',
  'fosie': 'Malmö', 'kirseberg': 'Malmö', 'oxie': 'Malmö',
  'söderslätt': 'Malmö', 'hyllie': 'Malmö', 'vallgraven': 'Malmö',
  // Uppsala
  'lundkullan': 'Uppsala', 'luthagen': 'Uppsala', 'fjärdingen': 'Uppsala',
  // Linköping
  'ryd': 'Linköping', 'tannefors': 'Linköping', 'skäggetorp': 'Linköping',
  // Norrköping  
  'druve': 'Norrköping', 'berget': 'Norrköping', 'höie': 'Norrköping',
};

// Normalize strings: strip diacritics, lowercase, replace common variations
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Pre-build normalized lookup maps
const NORMALIZED_MUNICIPALITY: Record<string, string> = {};
for (const [k, v] of Object.entries(MUNICIPALITY_TO_CITY)) {
  NORMALIZED_MUNICIPALITY[normalize(k)] = v;
}

const NORMALIZED_COUNTY: Record<string, string> = {};
for (const [k, v] of Object.entries(COUNTY_TO_CITY)) {
  NORMALIZED_COUNTY[normalize(k)] = v;
}

const NORMALIZED_NEIGHBORHOOD: Record<string, string> = {};
for (const [k, v] of Object.entries(NEIGHBORHOOD_TO_CITY)) {
  NORMALIZED_NEIGHBORHOOD[normalize(k)] = v;
}

/**
 * Infer city from a Fastighetsbyrån listing URL
 * URL format: .../till-salu/{county}/{municipality}/objekt/...
 */
export function inferCityFromUrl(url: string): string {
  const parts = url.split('/till-salu/');
  if (parts.length < 2) return '';

  const segments = parts[1].split('/');
  if (segments.length < 2) return '';

  const countySlug = segments[0];
  const municipalitySlug = segments[1];

  // Try municipality first (most specific)
  const municipalityCity = NORMALIZED_MUNICIPALITY[normalize(municipalitySlug)];
  if (municipalityCity) return municipalityCity;

  // Do NOT fallback to county — it's too broad (e.g., all of Västra Götaland → Göteborg is wrong)
  // Let the caller handle empty city via area inference or rejection
  return '';
}

/**
 * Infer city from a neighborhood/area name
 */
export function inferCityFromArea(area: string): string {
  if (!area) return '';
  return NORMALIZED_NEIGHBORHOOD[normalize(area)] || '';
}

/**
 * Fuzzy city match — normalizes both sides and checks if they refer to the same city
 * Handles: Göteborg vs goteborg, Malmö vs malmo, etc.
 */
export function cityMatches(listingCity: string, queryCity: string): boolean {
  if (!queryCity) return true; // No city filter
  if (!listingCity) return false; // Can't verify — reject

  const n1 = normalize(listingCity);
  const n2 = normalize(queryCity);

  if (n1 === n2) return true;

  // Check if either normalized form maps to the same canonical city
  // via our lookup tables
  const city1 = NORMALIZED_NEIGHBORHOOD[n1] || NORMALIZED_MUNICIPALITY[n1] || NORMALIZED_COUNTY[n1];
  const city2 = NORMALIZED_NEIGHBORHOOD[n2] || NORMALIZED_MUNICIPALITY[n2] || NORMALIZED_COUNTY[n2];

  if (city1 && city2 && city1 === city2) return true;
  // If only one resolves, use partial match
  if (city1 && normalize(city1) === n2) return true;
  if (city2 && n1 === normalize(city2)) return true;

  // Fallback: substring match for "Göteborg" containing in "Västra Götalands län"
  if (n1.includes(n2) || n2.includes(n1)) return true;

  return false;
}

/**
 * Enrich a listing with city data if missing.
 * Tries: 1) URL parsing, 2) neighborhood lookup
 */
export function inferCity(listing: { url?: string; area?: string; city?: string }): string {
  if (listing.city) return listing.city;

  // Try URL first
  if (listing.url) {
    const fromUrl = inferCityFromUrl(listing.url);
    if (fromUrl) return fromUrl;
  }

  // Try neighborhood/area lookup
  if (listing.area) {
    const fromArea = inferCityFromArea(listing.area);
    if (fromArea) return fromArea;
  }

  return '';
}