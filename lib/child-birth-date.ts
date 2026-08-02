/**
 * A child's birthday — the shared reading of `child_profile.birth_date`.
 *
 * The column is a plain `date`, read back as 'YYYY-MM-DD'. Everything here
 * works on that string rather than a Date, because a birthday has no time and
 * no zone; the mechanics of that live in `lib/day-key`, which this module
 * re-exports so existing callers keep their single import.
 *
 * Both doors that create a profile — the /welcome wizard and /family — go
 * through `normalizeBirthDate`, so there is one definition of a valid birthday
 * and one age range, checked on the server whatever the input control allows.
 */

import { parseDayKey, toDayKey, todayKey, type DayKey } from './day-key';

export { parseDayKey, toDayKey, todayKey, type DayKey };

export const MIN_CHILD_AGE = 5;
export const MAX_CHILD_AGE = 17;

/**
 * Completed years lived on `on` — the real age, not "the age they turn this
 * year". A child born on the 4th of March is 8 on the 3rd and 9 on the 4th.
 *
 * Returns null if either day key is malformed, so callers decide what to show
 * rather than being handed a NaN to render.
 */
export function ageOnDay(birthDate: unknown, on: DayKey = todayKey()): number | null {
  const b = parseDayKey(birthDate);
  const t = parseDayKey(on);
  if (!b || !t) return null;
  const hadBirthday = t.month > b.month || (t.month === b.month && t.day >= b.day);
  return t.year - b.year - (hadBirthday ? 0 : 1);
}

/** True on the day itself. 29 February counts as 1 March in common years. */
export function isBirthdayOn(birthDate: unknown, on: DayKey = todayKey()): boolean {
  const b = parseDayKey(birthDate);
  const t = parseDayKey(on);
  if (!b || !t) return false;
  if (t.month === b.month && t.day === b.day) return true;
  const leapling = b.month === 2 && b.day === 29;
  const leapYear = parseDayKey(toDayKey(t.year, 2, 29)) != null;
  return leapling && !leapYear && t.month === 3 && t.day === 1;
}

/**
 * The earliest and latest birthdays that make a child MIN..MAX years old on
 * `on` — the bounds the date inputs advertise, derived from the same two
 * constants the server validates against so the control can never offer a day
 * the action will refuse.
 *
 * The oldest bound is the day *after* the 18th birthday, so a child who turns
 * 18 tomorrow still fits today.
 */
export function birthDateBounds(on: DayKey = todayKey()): { min: DayKey; max: DayKey } {
  const t = parseDayKey(on) ?? parseDayKey(todayKey())!;
  const shift = (years: number, days: number) => {
    const d = new Date(Date.UTC(t.year - years, t.month - 1, t.day + days));
    return toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  };
  return { min: shift(MAX_CHILD_AGE + 1, 1), max: shift(MIN_CHILD_AGE, 0) };
}

export type BirthDateResult =
  | { ok: true; birthDate: DayKey }
  | { ok: false; error: string };

/** The one gate every write to `birth_date` passes through. */
export function normalizeBirthDate(value: unknown, on: DayKey = todayKey()): BirthDateResult {
  const parsed = parseDayKey(value);
  if (!parsed) return { ok: false, error: 'Please enter their full date of birth.' };
  const birthDate = toDayKey(parsed.year, parsed.month, parsed.day);
  const age = ageOnDay(birthDate, on);
  if (age == null) return { ok: false, error: 'Please enter their full date of birth.' };
  if (age < 0) return { ok: false, error: 'That birthday is in the future.' };
  if (age < MIN_CHILD_AGE || age > MAX_CHILD_AGE) {
    return { ok: false, error: `Children are ${MIN_CHILD_AGE}–${MAX_CHILD_AGE} years old.` };
  }
  return { ok: true, birthDate };
}

/** 'Tuesday 4 March 2016' — for the grown-up surfaces that show it back. */
export function formatBirthDate(birthDate: unknown): string | null {
  const b = parseDayKey(birthDate);
  if (!b) return null;
  return new Date(Date.UTC(b.year, b.month - 1, b.day)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
