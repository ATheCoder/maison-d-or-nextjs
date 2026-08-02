/**
 * A day key — 'YYYY-MM-DD', the shape a Postgres `date` reads back as and the
 * shape `<input type="date">` speaks.
 *
 * These four functions were born in `child-birth-date.ts` and still live there
 * by re-export; they moved here when the date picker needed the same calendar
 * arithmetic without inheriting a module about children's birthdays. Nothing
 * about them is domain-specific: a day has no time and no zone, so everything
 * works on the string and its three numbers rather than on a Date. Parsing
 * '2016-03-04' with `new Date()` makes it UTC midnight, which is the 3rd of
 * March for anyone west of Greenwich — that bug is what this file avoids.
 *
 * One property the callers lean on: day keys are fixed-width and zero-padded,
 * so `a < b` as strings is `a` before `b` as days. Bounds checks are string
 * comparisons throughout.
 */

/** A 'YYYY-MM-DD' day, as `date` columns and `<input type="date">` both use. */
export type DayKey = string;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today on the host's own calendar, as a 'YYYY-MM-DD' key. */
export function todayKey(at: Date = new Date()): DayKey {
  return toDayKey(at.getFullYear(), at.getMonth() + 1, at.getDate());
}

export function toDayKey(year: number, month: number, day: number): DayKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Split a day key, returning null for anything that isn't a real calendar
 * date. The round-trip through UTC is what rejects 31 February and 30 February
 * — the regex alone would let both through.
 */
export function parseDayKey(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string') return null;
  const m = DAY_KEY.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}
