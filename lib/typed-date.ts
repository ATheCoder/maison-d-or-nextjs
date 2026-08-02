/**
 * The text half of the date picker: turning what somebody typed into a day
 * key, and saying what is wrong when it cannot.
 *
 * It lives here rather than in the component because it is the part with edge
 * cases — 31 February, a two-digit year, a paste of an ISO string — and those
 * are worth a test suite rather than a click-through.
 *
 * The written form is DD/MM/YYYY, the same order `formatBirthDate` reads back
 * in and the one the rest of the app's en-GB dates use.
 */
import { parseDayKey, toDayKey, type DayKey } from './day-key';

/** 'YYYY-MM-DD' → '04/03/2016'. '' for anything that is not a real day. */
export function formatTypedDate(key: unknown): string {
  const p = parseDayKey(key);
  if (!p) return '';
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${String(p.year).padStart(4, '0')}`;
}

/**
 * A typed date, or null. Deliberately forgiving about separators and leading
 * zeros — the one thing it will not guess at is a two-digit year, because '16'
 * is 2016 to one person and 1916 to another and a birthday must not be a coin
 * toss.
 */
export function parseTypedDate(raw: string): DayKey | null {
  // A day that exists, as a key — parseDayKey is what rejects 31 February.
  const real = (year: number, month: number, day: number): DayKey | null => {
    const key = toDayKey(year, month, day);
    return parseDayKey(key) ? key : null;
  };
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return real(+iso[1], +iso[2], +iso[3]);
  const dmy = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/.exec(s);
  if (dmy) return real(+dmy[3], +dmy[2], +dmy[1]);
  const bare = /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (bare) return real(+bare[3], +bare[2], +bare[1]);
  return null;
}

/**
 * The month somebody was aiming at, even when the day they wrote does not
 * exist: '31/02/2016' still says February 2016, which is where the calendar
 * should open to have the mistake corrected in.
 */
export function typedDateMonth(raw: string): DayKey | null {
  const parsed = parseTypedDate(raw);
  if (parsed) return parsed;
  const m = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const first = toDayKey(+m[3], +m[2], 1);
  return parseDayKey(first) ? first : null;
}

/**
 * What is wrong with text that did not parse, in the field's own words. The
 * caller of the picker cannot write this one: the value it holds is '' both
 * for an empty field and for '31/02/2016', so only the field itself knows the
 * difference between nothing typed yet and a day that does not exist.
 */
export function typedDateProblem(raw: string): string | null {
  const s = raw.trim();
  if (!s || parseTypedDate(s)) return null;
  const shaped = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/.test(s)
    || /^\d{8}$/.test(s)
    || /^\d{4}-\d{1,2}-\d{1,2}$/.test(s);
  return shaped ? 'That day does not exist.' : 'Please write the date as DD / MM / YYYY.';
}

/**
 * The text to show after a keystroke — separators inserted as you type, so
 * '04032016' becomes '04/03/2016' without anybody reaching for the slash.
 *
 * The mask only applies while the field is *growing* and holds nothing but
 * digits and slashes. A deletion, a paste, or a cursor placed mid-string is
 * left exactly as it came, because a mask that rewrites text under a cursor
 * moves the cursor, and a field that fights back while you fix a typo is worse
 * than one that never helped.
 */
export function maskTypedDate(previous: string, next: string): string {
  if (next.length <= previous.length || !/^[\d/]*$/.test(next)) return next;
  const d = next.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}
