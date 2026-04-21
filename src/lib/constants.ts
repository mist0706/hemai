// HemAI Constants

export const SITE = {
  name: 'HemAI',
  tagline: 'Smarta hem i Sverige',
  description: 'AI-driven Swedish home search — find your next home with intelligent insights.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://hemai.houselarsson.com',
} as const;

export const CITIES = [
  'Göteborg',
  'Stockholm',
  'Malmö',
  'Uppsala',
  'Linköping',
  'Västerås',
  'Örebro',
  'Norrköping',
  'Helsingborg',
  'Jönköping',
  'Umeå',
  'Lund',
  'Borås',
  'Sundsvall',
  'Gävle',
] as const;

export const NEIGHBORHOODS: Record<string, string[]> = {
  'Göteborg': ['Hisingen', 'Centrum', 'Majorna', 'Linné', 'Haga', 'Järntorget', 'Andersberg', 'Mölndal', 'Kållered', 'Askim', 'Billdal', 'Särö'],
  'Stockholm': ['Södermalm', 'Kungsholmen', 'Vasastan', 'Östermalm', 'Gamla Stan', 'Hornstull', 'Mariatorget', 'Fridhemsplan', 'Stora Essingen', 'Lilla Essingen', 'Djurgården'],
  'Malmö': ['Centrum', 'Värnhem', 'Möllevången', 'Limhamn', 'Hyllie', 'Rosengård', 'Bulltofta', 'Sofielund'],
} as const;

export const HOUSING_TYPE_LABELS: Record<string, string> = {
  lägenhet: 'Lägenhet',
  villa: 'Villa',
  radhus: 'Radhus',
  stuga: 'Stuga',
  loft: 'Loft',
  studio: 'Studio',
} as const;

export const HOUSING_FORM_LABELS: Record<string, string> = {
  bostadsrätt: 'Bostadsrätt',
  hyresrätt: 'Hyresrätt',
  äganderätt: 'Äganderätt',
} as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Nyast först' },
  { value: 'price_asc', label: 'Pris ↑' },
  { value: 'price_desc', label: 'Pris ↓' },
  { value: 'size_asc', label: 'Storlek ↑' },
  { value: 'size_desc', label: 'Storlek ↓' },
  { value: 'ai_score', label: 'AI-poäng' },
] as const;