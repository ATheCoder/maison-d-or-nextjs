/**
 * Calendar arithmetic in a family's own timezone (parent-observatory spec §8.1).
 *
 * Two surfaces show a parent "a day": the child card's Today's Exploration and
 * the observatory's bars. They must agree, and neither may inherit the *host's*
 * timezone — an evening's reading in Paris landing on tomorrow's card is the
 * bug this file exists to remove.
 *
 * Division of labour with SQL: `AT TIME ZONE` is authoritative for *grouping*
 * rows into days, because that runs where the rows are. This module supplies
 * only window-start instants (the `>=` bound of a query) and the labels, from
 * the same IANA rules — so the two can disagree only if Postgres and the JS
 * runtime carry different tzdata, which is a deployment fault, not a logic one.
 *
 * A "day key" throughout is an ISO calendar date, `YYYY-MM-DD`, with no zone
 * and no time. It is deliberately the same shape as `analytics_event.edition_date`.
 *
 * Pure and dependency-free, so its own suite can exercise DST without a database.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Matches a day key exactly — four digits, two, two. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether the runtime recognises `tz` as an IANA zone.
 *
 * The only honest test is to ask Intl to build a formatter and see whether it
 * throws: the tzdata a runtime carries is the sole authority on which names
 * exist, and hardcoding a list here would rot.
 */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fall back to UTC for anything unusable.
 *
 * Read paths call this rather than validating at every site: a family row that
 * somehow carries a bad zone should render a *slightly wrong day boundary*, not
 * a 500 on the parent dashboard.
 */
export function safeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : 'UTC';
}

/** 'en-CA' formats as YYYY-MM-DD, which is the day-key shape by definition. */
function dayKeyFormatter(tz: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** The calendar date `at` falls on, as read by a clock in `tz`. */
export function zonedDayKey(tz: string, at: Date): string {
  return dayKeyFormatter(safeTimeZone(tz)).format(at);
}

/**
 * How far `tz` is ahead of UTC at a given instant, in milliseconds.
 *
 * Works by formatting the instant's wall clock in `tz` and re-reading those
 * fields as if they were UTC; the gap between that and the true instant is the
 * offset. This is the standard trick, and it is DST-correct *for that instant*
 * because Intl applies the rules in force then.
 */
function offsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const field = (type: Intl.DateTimeFormatPartTypes): number => (
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  );
  // `hourCycle: 'h23'` still renders midnight as 24 in some ICU versions.
  const hour = field('hour') % 24;
  const asUtc = Date.UTC(field('year'), field('month') - 1, field('day'), hour, field('minute'), field('second'));
  return asUtc - at.getTime();
}

/** Shift a day key by whole calendar days. Pure string→string. */
export function addDaysToKey(key: string, delta: number): string {
  if (!DAY_KEY.test(key)) return key;
  const [year, month, day] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + delta * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

/**
 * The instant at which a day key begins in `tz`.
 *
 * Solves `t + offset(t) = midnight` by fixed-point iteration: the first guess
 * uses the offset at UTC midnight, the second uses the offset at that guess.
 * Two passes is provably enough — a DST shift moves the answer by at most an
 * hour, and no zone changes offset twice within one hour.
 *
 * The loop afterwards covers the one case iteration cannot: zones that spring
 * forward *at* midnight (Santiago, Beirut), where 00:00 simply does not exist
 * that day. There the honest window start is the first instant that does exist,
 * so we step forward until the clock is actually on the requested date.
 */
export function startOfZonedDay(tz: string, at: Date, dayOffset = 0): Date {
  const zone = safeTimeZone(tz);
  const key = addDaysToKey(zonedDayKey(zone, at), dayOffset);
  const [year, month, day] = key.split('-').map(Number);
  const midnightAsUtc = Date.UTC(year, month - 1, day);

  let ts = midnightAsUtc - offsetMs(zone, new Date(midnightAsUtc));
  ts = midnightAsUtc - offsetMs(zone, new Date(ts));

  // Bounded by construction: no DST gap exceeds two hours.
  for (let step = 0; step < 8 && dayKeyFormatter(zone).format(new Date(ts)) < key; step += 1) {
    ts += 15 * 60 * 1000;
  }
  return new Date(ts);
}

/**
 * The `n` day keys ending with `at`'s own day, oldest first.
 *
 * Built by walking calendar dates rather than subtracting 24h repeatedly, so a
 * week containing a DST change still has exactly seven entries.
 */
export function lastNDayKeys(tz: string, n: number, at: Date): string[] {
  const today = zonedDayKey(tz, at);
  const count = Math.max(0, Math.floor(n));
  return Array.from({ length: count }, (_, i) => addDaysToKey(today, i - (count - 1)));
}

/**
 * Read a day key as a fixed instant for labelling.
 *
 * Noon UTC, so that formatting the result in any zone on earth still lands on
 * the same calendar date — the labels below never care about time of day, and
 * midnight would make them zone-sensitive.
 */
function keyAsInstant(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

/** "Tuesday" — the only grain a milestone or a bookshelf date is ever shown at. */
export function weekdayForKey(key: string): string {
  if (!DAY_KEY.test(key)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long' }).format(keyAsInstant(key));
}

/** "Wed" — the bar-chart day label. */
export function shortWeekdayForKey(key: string): string {
  if (!DAY_KEY.test(key)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(keyAsInstant(key));
}

/** "Tue 29" — the edition-recap chips. */
export function shortDateForKey(key: string): string {
  if (!DAY_KEY.test(key)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric' })
    .format(keyAsInstant(key))
    .replace(',', '');
}

/** "24 – 30 July", the masthead's week line. Collapses the month when shared. */
export function weekRangeLabel(startKey: string, endKey: string): string {
  if (!DAY_KEY.test(startKey) || !DAY_KEY.test(endKey)) return '';
  const dayOf = (key: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' }).format(keyAsInstant(key));
  const monthOf = (key: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long' }).format(keyAsInstant(key));
  return monthOf(startKey) === monthOf(endKey)
    ? `${dayOf(startKey)} – ${dayOf(endKey)} ${monthOf(endKey)}`
    : `${dayOf(startKey)} ${monthOf(startKey)} – ${dayOf(endKey)} ${monthOf(endKey)}`;
}

/** "12 July", for a book that has been set aside. */
export function dayMonthForKey(key: string): string {
  if (!DAY_KEY.test(key)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(keyAsInstant(key));
}

/** "Saturday 26 July", for a finished book. */
export function longDateForKey(key: string): string {
  if (!DAY_KEY.test(key)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(keyAsInstant(key))
    .replace(',', '');
}

/** Whole calendar days between two keys, `to - from`. Negative if `to` is earlier. */
export function daysBetweenKeys(from: string, to: string): number {
  if (!DAY_KEY.test(from) || !DAY_KEY.test(to)) return 0;
  return Math.round((keyAsInstant(to).getTime() - keyAsInstant(from).getTime()) / DAY_MS);
}
