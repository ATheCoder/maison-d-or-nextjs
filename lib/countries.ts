/**
 * The one country table. Nothing else in this repo may contain a country
 * mapping — see docs/flag-seal-spec.md §4.1, where five divergent hardcoded
 * tables meant the same person earned a flag on one screen and not on another,
 * and a Base44 function existed purely to hand-patch six people's codes.
 *
 * Pure and synchronous (R4.10): usable from server and client components alike,
 * and testable without a database. See lib/countries.test.ts.
 */

export type Iso2 = string;
export interface Country {
  code: Iso2;
  name: string;
}

/**
 * The 193 UN member states (flag-seal spec Appendix A).
 *
 * Deliberately not the legacy list, which claimed 197 in its comments while
 * holding 193 entries, omitted Côte d'Ivoire and included Vatican City — a UN
 * observer, not a member. Derive every displayed total from `COUNTRIES.length`;
 * never write the number into copy.
 */
export const COUNTRIES: readonly Country[] = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'DR Congo' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' }, { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' }, { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' }, { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

/**
 * Demonyms, informal names, and historical aliases → ISO2.
 *
 * The union of all six legacy tables (flag-seal spec Appendix B), plus the
 * historical successors R4.6 requires. Canonical country names are *not* listed
 * here — they are indexed automatically from COUNTRIES below, so adding a
 * country to that list is the only edit adding a country needs.
 *
 * Historical entries resolve to the modern successor state. That is a product
 * decision, not a geopolitical claim: a child collecting a flag for a story set
 * in the Soviet Union gets the flag of the country that place is now.
 */
const ALIASES: Record<string, Iso2> = {
  // Britain and Ireland
  british: 'GB', english: 'GB', scottish: 'GB', welsh: 'GB', uk: 'GB',
  britain: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  irish: 'IE',
  // Western Europe
  french: 'FR', german: 'DE', prussian: 'DE', prussia: 'DE',
  italian: 'IT', spanish: 'ES', portuguese: 'PT',
  dutch: 'NL', holland: 'NL', belgian: 'BE', swiss: 'CH',
  austrian: 'AT', 'austro-hungarian': 'AT', 'austro hungarian': 'AT',
  luxembourgish: 'LU', monegasque: 'MC', maltese: 'MT',
  // Nordics
  swedish: 'SE', norwegian: 'NO', danish: 'DK', finnish: 'FI', icelandic: 'IS',
  // Greece, Cyprus
  greek: 'GR', cypriot: 'CY',
  // Eastern Europe and the former USSR
  russian: 'RU', soviet: 'RU', ussr: 'RU', 'soviet union': 'RU',
  polish: 'PL', czech: 'CZ', 'czech republic': 'CZ', czechoslovakia: 'CZ',
  czechoslovakian: 'CZ', slovak: 'SK', slovakian: 'SK',
  hungarian: 'HU', romanian: 'RO', bulgarian: 'BG',
  croatian: 'HR', serbian: 'RS', yugoslavia: 'RS', yugoslav: 'RS',
  ukrainian: 'UA', belarusian: 'BY', estonian: 'EE', latvian: 'LV',
  lithuanian: 'LT', slovenian: 'SI', bosnian: 'BA', macedonian: 'MK',
  albanian: 'AL', moldovan: 'MD', montenegrin: 'ME',
  // The Americas
  american: 'US', usa: 'US', america: 'US', 'united states of america': 'US',
  canadian: 'CA', mexican: 'MX', brazilian: 'BR',
  argentine: 'AR', argentinian: 'AR', chilean: 'CL', colombian: 'CO',
  peruvian: 'PE', venezuelan: 'VE', ecuadorian: 'EC', bolivian: 'BO',
  paraguayan: 'PY', uruguayan: 'UY', cuban: 'CU', jamaican: 'JM',
  haitian: 'HT', costa_rican: 'CR', 'costa rican': 'CR', panamanian: 'PA',
  // Asia
  japanese: 'JP', chinese: 'CN', korean: 'KR', indian: 'IN',
  pakistani: 'PK', bangladeshi: 'BD', 'sri lankan': 'LK', nepalese: 'NP',
  nepali: 'NP', thai: 'TH', vietnamese: 'VN', indonesian: 'ID',
  malaysian: 'MY', singaporean: 'SG', filipino: 'PH', philippine: 'PH',
  burmese: 'MM', burma: 'MM', cambodian: 'KH', laotian: 'LA',
  mongolian: 'MN', kazakh: 'KZ', uzbek: 'UZ', afghan: 'AF',
  // Middle East and North Africa
  turkish: 'TR', ottoman: 'TR',
  iranian: 'IR', persian: 'IR', persia: 'IR',
  iraqi: 'IQ', saudi: 'SA', uae: 'AE', emirati: 'AE',
  israeli: 'IL', jordanian: 'JO', lebanese: 'LB', syrian: 'SY',
  egyptian: 'EG', moroccan: 'MA', algerian: 'DZ', tunisian: 'TN',
  libyan: 'LY', qatari: 'QA', kuwaiti: 'KW', omani: 'OM', yemeni: 'YE',
  // Sub-Saharan Africa
  nigerian: 'NG', kenyan: 'KE', 'south african': 'ZA', ethiopian: 'ET',
  ghanaian: 'GH', tanzanian: 'TZ', ugandan: 'UG', senegalese: 'SN',
  zimbabwean: 'ZW', zambian: 'ZM', sudanese: 'SD', somali: 'SO',
  rwandan: 'RW', malian: 'ML', ivorian: 'CI', 'ivory coast': 'CI',
  congolese: 'CG', 'democratic republic of the congo': 'CD', zaire: 'CD',
  cameroonian: 'CM', angolan: 'AO', mozambican: 'MZ', namibian: 'NA',
  botswanan: 'BW', swaziland: 'SZ', 'cape verde': 'CV',
  // Oceania
  australian: 'AU', 'new zealander': 'NZ', kiwi: 'NZ', fijian: 'FJ',
  'papua new guinean': 'PG', samoan: 'WS', tongan: 'TO',
};

/**
 * Cities → ISO2, kept separate from the country table (R4.7). On This Day
 * locations are frequently a bare city name, which is the only reason this
 * index exists; it is not consulted when resolving a nationality.
 */
const CITIES: Record<string, Iso2> = {
  paris: 'FR', berlin: 'DE', london: 'GB', washington: 'US',
  'new york': 'US', moscow: 'RU', rome: 'IT', madrid: 'ES',
  tokyo: 'JP', beijing: 'CN', lisbon: 'PT', athens: 'GR',
  amsterdam: 'NL', warsaw: 'PL', cairo: 'EG', istanbul: 'TR',
  dublin: 'IE', stockholm: 'SE', vienna: 'AT', kyiv: 'UA',
  jerusalem: 'IL',
};

/**
 * Lowercase, strip diacritics and punctuation, collapse whitespace (R4.3).
 * `Côte d'Ivoire` and `Cote dIvoire` must reach the same key.
 */
function normalise(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.'’`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_CODE = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

/** Canonical names, auto-indexed so COUNTRIES stays the single place to edit. */
const BY_NAME = new Map<string, Iso2>(COUNTRIES.map((c) => [normalise(c.name), c.code]));

const BY_ALIAS = new Map<string, Iso2>(
  Object.entries(ALIASES).map(([k, v]) => [normalise(k), v]),
);

const BY_CITY = new Map<string, Iso2>(
  Object.entries(CITIES).map(([k, v]) => [normalise(k), v]),
);

/**
 * Every place key, longest first. Longest-match-first is what keeps
 * "DR Congo" from being swallowed by "Congo", and "South Sudan" by "Sudan"
 * (R4.8). The legacy resolver used bare bidirectional `includes()`, so a
 * two-character destination could match almost anything.
 */
const PLACE_KEYS_BY_LENGTH: readonly [string, Iso2][] = [
  ...BY_NAME.entries(), ...BY_ALIAS.entries(), ...BY_CITY.entries(),
].sort((a, b) => b[0].length - a[0].length);

export function isValidIso2(code: unknown): boolean {
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code.trim().toUpperCase())
    && BY_CODE.has(code.trim().toUpperCase());
}

export function countryByCode(code: unknown): Country | undefined {
  if (typeof code !== 'string') return undefined;
  return BY_CODE.get(code.trim().toUpperCase());
}

/** Look a normalised token up in names then aliases. Cities are excluded. */
function lookupNameOrAlias(key: string): Iso2 | null {
  return BY_NAME.get(key) ?? BY_ALIAS.get(key) ?? null;
}

/**
 * Nationality, demonym, or country name → ISO2. "French" → "FR".
 *
 * Compound nationalities resolve on the **first matching part** (R4.4):
 * "Polish-French" → PL, "British-American" → GB. First-part-wins is the
 * intended rule — the live data holds "Italian-French" and "Dutch Republic
 * (Netherlands)", and a person's first-listed nationality is the one the
 * editorial copy leads with.
 */
export function resolveNationality(input?: string | null): Iso2 | null {
  if (typeof input !== 'string') return null;
  const key = normalise(input);
  if (!key) return null;

  const whole = lookupNameOrAlias(key);
  if (whole) return whole;

  // "Dutch Republic (Netherlands)" — a parenthetical often holds the real name,
  // and normalise() has already turned the brackets into spaces.
  for (const part of key.split(/[-,/\s]+/)) {
    const hit = lookupNameOrAlias(part);
    if (hit) return hit;
  }

  // Multi-word names ("south africa", "new zealand") survive the split above
  // only as fragments, so try adjacent pairs before giving up.
  const words = key.split(' ');
  for (let i = 0; i < words.length - 1; i += 1) {
    const hit = lookupNameOrAlias(`${words[i]} ${words[i + 1]}`);
    if (hit) return hit;
  }

  return null;
}

/**
 * Free-form place string → ISO2. Handles "Paris, France", "Kyoto, Japan" and
 * bare city names.
 *
 * Order is deliberate (R4.5): the segment after the last comma is tried first,
 * because "City, Country" puts the country there and it is the more specific
 * answer; then the whole string; then the first segment, which is where a bare
 * city name lives.
 */
export function resolveLocation(input?: string | null): Iso2 | null {
  if (typeof input !== 'string') return null;
  const key = normalise(input);
  if (!key) return null;

  const segments = key.split(',').map((s) => s.trim()).filter(Boolean);
  const candidates = segments.length > 1
    ? [segments[segments.length - 1], key, segments[0]]
    : [key];

  for (const candidate of candidates) {
    const hit = lookupNameOrAlias(candidate) ?? BY_CITY.get(candidate);
    if (hit) return hit;
  }

  // Last resort: a word-boundary, longest-match-first scan, so "the Republic of
  // Kenya" resolves without "Kenya" being matched inside an unrelated word.
  for (const [placeKey, code] of PLACE_KEYS_BY_LENGTH) {
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(placeKey)}(?:[^a-z0-9]|$)`);
    if (pattern.test(key)) return code;
  }

  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A person record → ISO2. An explicit, valid `country_code` always wins (R4.1);
 * text matching is the fallback for the rows that do not have one yet — which,
 * before the Phase 3 backfill, is all 37 of them.
 */
export function resolvePerson(p: {
  countryCode?: string | null;
  nationality?: string | null;
  country?: string | null;
}): Iso2 | null {
  const explicit = typeof p.countryCode === 'string' ? p.countryCode.trim().toUpperCase() : '';
  if (isValidIso2(explicit)) return explicit;
  return resolveNationality(p.nationality) ?? resolveNationality(p.country);
}

/**
 * ISO2 → the flag emoji, by offsetting each letter into the regional indicator
 * block. Returns '' for anything that is not a country in COUNTRIES, so a bad
 * code renders as nothing rather than as two stray letter-boxes.
 */
export function flagEmoji(code: unknown): string {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!isValidIso2(c)) return '';
  return String.fromCodePoint(
    ...[...c].map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65)),
  );
}
