/**
 * Turning milliseconds into things a parent reads (spec §4).
 *
 * Two rules govern everything here:
 *
 * 1. **The same rounding as the child card.** `Math.round(ms / 60_000)`, matching
 *    `toMinutes` in app/analytics/actions.ts:143. If these ever diverge, the two
 *    surfaces disagree about the same day and the whole "honest numbers" claim
 *    goes with it.
 * 2. **Never "0 min".** A section the child visited cannot be reported as zero
 *    minutes — next to the section's own name that reads as a lie. Anything that
 *    rounds to zero but is not zero says "under a minute" instead.
 */

const MS_PER_MINUTE = 60_000;

/** The shared rounding. Deliberately identical to app/analytics/actions.ts:143. */
export const toMinutes = (ms: number): number => Math.round(ms / MS_PER_MINUTE);

/**
 * Prose duration: "under a minute", "1 min", "38 min", "1 h 41".
 *
 * Used in section meters, content chips and book meta lines — anywhere the
 * number sits inside a sentence rather than standing alone as a numeral.
 */
export function formatMinutes(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'no time yet';
  const minutes = toMinutes(ms);
  if (minutes === 0) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * A stat-trio numeral, split so the card can render the unit smaller than the
 * figure (the mock sets the figure at Playfair 34px and the tail at 20px).
 */
export type Numeral = { main: string; sub?: string };

/**
 * The week total, as the masthead's first numeral.
 *
 * Sub-minute reads "< 1 min" rather than the prose "under a minute": at 34px
 * the sentence would wrap across the three-column trio, and "< 1" carries the
 * same claim — some time, less than a minute — without ever showing a zero.
 */
export function durationNumeral(ms: number): Numeral {
  if (!Number.isFinite(ms) || ms <= 0) return { main: '0', sub: 'min' };
  const minutes = toMinutes(ms);
  if (minutes === 0) return { main: '< 1', sub: 'min' };
  if (minutes < 60) return { main: String(minutes), sub: 'min' };
  return { main: `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` };
}

/** "6 of 7" when a week is the frame; a plain count when it cannot be. */
export function editionsNumeral(opened: number, outOf: number): Numeral {
  return opened <= outOf ? { main: String(opened), sub: `of ${outOf}` } : { main: String(opened) };
}

/**
 * The streak numeral. Bare, because its card label supplies the unit: a streak
 * here counts *editions opened in a row*, never days in a row (plan §8), and
 * "5-day" — which is what the mock shows — would be the wrong claim on a child
 * who read five editions across a fortnight. Zero shows a dash rather than a
 * nagging "0".
 */
export function streakNumeral(editions: number): Numeral {
  return editions > 0 ? { main: String(editions) } : { main: '—' };
}

/** Percentage of a whole, floored to an integer, safe when the whole is zero. */
export function shareOf(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/** "7 pages", "1 page" — the bookshelf meta line counts in whole leaves. */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
