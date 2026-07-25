import { describe, it, expect } from 'vitest';
import {
  COUNTRIES,
  countryByCode,
  flagEmoji,
  isValidIso2,
  resolveLocation,
  resolveNationality,
  resolvePerson,
} from './countries';

describe('COUNTRIES', () => {
  it('holds the 193 UN member states', () => {
    expect(COUNTRIES).toHaveLength(193);
  });

  it('includes Côte d\'Ivoire and excludes Vatican City — the two legacy errors', () => {
    expect(COUNTRIES.some((c) => c.code === 'CI')).toBe(true);
    expect(COUNTRIES.some((c) => c.code === 'VA')).toBe(false);
  });

  it('has no duplicate codes or names', () => {
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length);
  });

  it('uses well-formed ISO2 codes throughout', () => {
    for (const c of COUNTRIES) expect(c.code).toMatch(/^[A-Z]{2}$/);
  });

  it('resolves every canonical name back to its own code', () => {
    for (const c of COUNTRIES) {
      expect(resolveNationality(c.name), `${c.name} should resolve`).toBe(c.code);
    }
  });
});

describe('resolveNationality', () => {
  const cases: [string, string | null][] = [
    // Plain demonyms — the common case in remarkable_person.country
    ['French', 'FR'],
    ['American', 'US'],
    ['German', 'DE'],
    ['Japanese', 'JP'],
    ['Kenyan', 'KE'],
    // Country names
    ['France', 'FR'],
    ['United States', 'US'],
    ['New Zealand', 'NZ'],
    ['South Africa', 'ZA'],
    // R4.3 — case and diacritic insensitivity
    ['french', 'FR'],
    ['FRENCH', 'FR'],
    ["Côte d'Ivoire", 'CI'],
    ['Cote dIvoire', 'CI'],
    // R4.4 — compound nationalities, first part wins
    ['Polish-French', 'PL'],
    ['British-American', 'GB'],
    ['Italian-French', 'IT'],
    // R4.6 — historical aliases resolve to the modern successor
    ['Soviet', 'RU'],
    ['USSR', 'RU'],
    ['Soviet Union', 'RU'],
    ['Czechoslovakia', 'CZ'],
    ['Persian', 'IR'],
    ['Austro-Hungarian', 'AT'],
    ['Prussian', 'DE'],
    ['Scottish', 'GB'],
    ['Welsh', 'GB'],
    ['English', 'GB'],
    // Live data shapes from remarkable_person
    ['Dutch Republic (Netherlands)', 'NL'],
    // Misses are silent nulls, never a guess
    ['', null],
    ['   ', null],
    ['Atlantis', null],
    ['Wakanda', null],
  ];

  it.each(cases)('%s → %s', (input, expected) => {
    expect(resolveNationality(input)).toBe(expected);
  });

  it('returns null for non-string input rather than throwing', () => {
    expect(resolveNationality(null)).toBeNull();
    expect(resolveNationality(undefined)).toBeNull();
  });
});

describe('resolveLocation', () => {
  const cases: [string, string | null][] = [
    // R4.5 — "City, Country" takes the segment after the last comma
    ['Kyoto, Japan', 'JP'],
    ['Lisbon, Portugal', 'PT'],
    ['Springfield, United States', 'US'],
    // R4.7 — bare city names, the On This Day shape
    ['Paris', 'FR'],
    ['Tokyo', 'JP'],
    ['Kyiv', 'UA'],
    ['New York', 'US'],
    // Plain country names still work
    ['Brazil', 'BR'],
    ['Vietnam', 'VN'],
    // R4.8 — longest match first, so the specific name wins over the substring
    ['South Sudan', 'SS'],
    ['DR Congo', 'CD'],
    ['Guinea-Bissau', 'GW'],
    ['Equatorial Guinea', 'GQ'],
    // Word-boundary scan for prose locations
    ['the Republic of Kenya', 'KE'],
    ['somewhere in Norway today', 'NO'],
    // Misses
    ['', null],
    ['Atlantis', null],
  ];

  it.each(cases)('%s → %s', (input, expected) => {
    expect(resolveLocation(input)).toBe(expected);
  });

  it('prefers the country after the comma over a city before it', () => {
    // "Paris, Canada" is a real place; the comma segment is the better answer.
    expect(resolveLocation('Paris, Canada')).toBe('CA');
  });
});

describe('resolvePerson', () => {
  it('prefers an explicit valid country_code over the text (R4.1)', () => {
    expect(resolvePerson({ countryCode: 'JP', country: 'French' })).toBe('JP');
  });

  it('falls back to text when the code is absent or malformed', () => {
    expect(resolvePerson({ countryCode: '', country: 'French' })).toBe('FR');
    expect(resolvePerson({ countryCode: 'XX', country: 'French' })).toBe('FR');
    expect(resolvePerson({ countryCode: 'F', country: 'French' })).toBe('FR');
  });

  it('prefers nationality over country when both are present', () => {
    expect(resolvePerson({ nationality: 'Italian', country: 'French' })).toBe('IT');
  });

  it('returns null when nothing resolves', () => {
    expect(resolvePerson({})).toBeNull();
    expect(resolvePerson({ country: 'Atlantis' })).toBeNull();
  });
});

describe('isValidIso2 / countryByCode', () => {
  it('accepts real codes in any case, with surrounding space', () => {
    expect(isValidIso2('FR')).toBe(true);
    expect(isValidIso2(' fr ')).toBe(true);
    expect(countryByCode('fr')?.name).toBe('France');
  });

  it('rejects well-formed codes that are not UN members', () => {
    // The shape is right; the country is not in the canonical list.
    expect(isValidIso2('VA')).toBe(false);
    expect(isValidIso2('XX')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidIso2('F')).toBe(false);
    expect(isValidIso2('FRA')).toBe(false);
    expect(isValidIso2(null)).toBe(false);
    expect(isValidIso2(42)).toBe(false);
  });
});

describe('flagEmoji', () => {
  it('maps a code to its regional-indicator pair', () => {
    expect(flagEmoji('FR')).toBe('🇫🇷');
    expect(flagEmoji('JP')).toBe('🇯🇵');
    expect(flagEmoji('gb')).toBe('🇬🇧');
  });

  it('returns an empty string rather than stray letter-boxes for a bad code', () => {
    expect(flagEmoji('XX')).toBe('');
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji(null)).toBe('');
  });

  it('produces a flag for every canonical country', () => {
    for (const c of COUNTRIES) expect(flagEmoji(c.code)).not.toBe('');
  });
});
