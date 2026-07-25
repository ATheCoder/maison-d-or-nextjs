/**
 * Plain constants shared by the day editor's server actions and its UI.
 *
 * They live here rather than beside the actions because a `'use server'` module
 * may only export async functions — exporting an array from one fails the build
 * (and only at build time, not under tsc).
 */

/**
 * The seven the destination modal can show. The reader renders the continent
 * ahead of the name — "Europe · Lisbon" — so an unrecognised value would print
 * verbatim into the header.
 */
export const CONTINENTS = [
  'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica',
] as const;

export type Continent = typeof CONTINENTS[number];

export function isContinent(value: unknown): value is Continent {
  return typeof value === 'string' && (CONTINENTS as readonly string[]).includes(value);
}
