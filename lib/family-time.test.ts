import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  daysBetweenKeys,
  isValidTimeZone,
  lastNDayKeys,
  longDateForKey,
  safeTimeZone,
  shortDateForKey,
  shortWeekdayForKey,
  startOfZonedDay,
  weekRangeLabel,
  weekdayForKey,
  zonedDayKey,
} from './family-time';

/** A summer evening in Europe, which is already "tomorrow" east of the date line. */
const EVENING = new Date('2026-07-30T22:30:00.000Z');

describe('isValidTimeZone / safeTimeZone', () => {
  it.each([
    ['UTC', true],
    ['Europe/Paris', true],
    ['America/New_York', true],
    ['Pacific/Kiritimati', true],
    ['Mars/Olympus_Mons', false],
    ['', false],
    ['  ', false],
    [null, false],
    [undefined, false],
    [42, false],
  ])('%s → %s', (input, expected) => {
    expect(isValidTimeZone(input)).toBe(expected);
  });

  // A family row carrying a bad zone must degrade the day boundary, not 500 the
  // parent dashboard — every read path goes through this rather than validating.
  it('falls back to UTC rather than throwing', () => {
    expect(safeTimeZone('Mars/Olympus_Mons')).toBe('UTC');
    expect(safeTimeZone(null)).toBe('UTC');
    expect(safeTimeZone('Europe/Paris')).toBe('Europe/Paris');
  });
});

describe('zonedDayKey', () => {
  // The whole reason family.timezone exists: 22:30 UTC is three different
  // calendar dates depending on who is reading the paper.
  it.each([
    ['UTC', '2026-07-30'],
    ['Europe/Paris', '2026-07-31'],
    ['America/New_York', '2026-07-30'],
    ['America/Los_Angeles', '2026-07-30'],
    ['Pacific/Kiritimati', '2026-07-31'],
    ['Pacific/Niue', '2026-07-30'],
  ])('%s reads 2026-07-30T22:30Z as %s', (tz, expected) => {
    expect(zonedDayKey(tz, EVENING)).toBe(expected);
  });

  it('an unknown zone reads as UTC', () => {
    expect(zonedDayKey('Nowhere/Nothing', EVENING)).toBe('2026-07-30');
  });
});

describe('startOfZonedDay', () => {
  it.each([
    ['UTC', '2026-07-30T00:00:00.000Z'],
    ['Europe/Paris', '2026-07-30T22:00:00.000Z'], // +02:00 in July
    ['America/New_York', '2026-07-30T04:00:00.000Z'], // -04:00 in July
    ['Asia/Kolkata', '2026-07-30T18:30:00.000Z'], // +05:30, a half-hour zone
    ['Pacific/Kiritimati', '2026-07-30T10:00:00.000Z'], // +14:00, the far side
  ])('%s midnight is %s', (tz, expected) => {
    // Note Paris and Kiritimati resolve *different days* — each is midnight of
    // that zone's own reading of the instant, which is the point.
    expect(startOfZonedDay(tz, EVENING).toISOString()).toBe(expected);
  });

  it('applies a day offset in calendar days, not in 24-hour steps', () => {
    const weekStart = startOfZonedDay('Europe/Paris', EVENING, -6);
    expect(zonedDayKey('Europe/Paris', weekStart)).toBe('2026-07-25');
  });

  // The invariant that matters for a `>= start` window: the returned instant is
  // inside the requested day, and one millisecond earlier is not. Asserted
  // across DST transitions rather than by hardcoding transition tables.
  it.each([
    ['UTC', new Date('2026-11-01T12:00:00Z')],
    ['America/New_York', new Date('2026-11-01T12:00:00Z')], // falls back this day
    ['America/New_York', new Date('2026-03-08T12:00:00Z')], // springs forward this day
    ['Europe/Paris', new Date('2026-03-29T12:00:00Z')],
    ['Europe/Paris', new Date('2026-10-25T12:00:00Z')],
    ['America/Santiago', new Date('2026-09-06T12:00:00Z')], // springs forward at midnight
    ['Australia/Lord_Howe', new Date('2026-10-04T12:00:00Z')], // 30-minute DST shift
  ])('%s: %s is the first instant of its own day', (tz, at) => {
    const key = zonedDayKey(tz, at);
    const start = startOfZonedDay(tz, at);
    expect(zonedDayKey(tz, start)).toBe(key);
    expect(zonedDayKey(tz, new Date(start.getTime() - 1))).toBe(addDaysToKey(key, -1));
  });
});

describe('lastNDayKeys', () => {
  it('ends on the reader’s own day, oldest first', () => {
    expect(lastNDayKeys('UTC', 7, EVENING)).toEqual([
      '2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27',
      '2026-07-28', '2026-07-29', '2026-07-30',
    ]);
  });

  it('is anchored in the family’s zone, not the host’s', () => {
    expect(lastNDayKeys('Europe/Paris', 7, EVENING).at(-1)).toBe('2026-07-31');
  });

  // A week spanning a DST change is still seven bars — the reason this walks
  // calendar dates instead of subtracting 86_400_000 seven times.
  it.each([
    ['America/New_York', new Date('2026-11-02T12:00:00Z')],
    ['Europe/Paris', new Date('2026-03-30T12:00:00Z')],
  ])('%s produces 7 contiguous keys across a transition', (tz, at) => {
    const keys = lastNDayKeys(tz, 7, at);
    expect(keys).toHaveLength(7);
    expect(new Set(keys).size).toBe(7);
    keys.slice(1).forEach((key, i) => expect(daysBetweenKeys(keys[i], key)).toBe(1));
  });

  it.each([[0], [-3]])('a non-positive count is an empty week (%s)', (n) => {
    expect(lastNDayKeys('UTC', n, EVENING)).toEqual([]);
  });
});

describe('addDaysToKey / daysBetweenKeys', () => {
  it.each([
    ['2026-07-30', 1, '2026-07-31'],
    ['2026-07-31', 1, '2026-08-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
    ['2026-02-28', 1, '2026-03-01'], // not one
    ['2026-07-30', 0, '2026-07-30'],
    ['2026-07-30', -29, '2026-07-01'],
  ])('%s + %s days = %s', (key, delta, expected) => {
    expect(addDaysToKey(key, delta)).toBe(expected);
  });

  it('leaves a malformed key alone rather than inventing a date', () => {
    expect(addDaysToKey('not-a-day', 1)).toBe('not-a-day');
    expect(daysBetweenKeys('not-a-day', '2026-07-30')).toBe(0);
  });

  it.each([
    ['2026-07-24', '2026-07-30', 6],
    ['2026-07-30', '2026-07-24', -6],
    ['2026-07-30', '2026-07-30', 0],
    ['2026-03-07', '2026-03-09', 2], // straddles a US DST change
  ])('%s → %s is %s days', (from, to, expected) => {
    expect(daysBetweenKeys(from, to)).toBe(expected);
  });
});

describe('labels', () => {
  it.each([
    ['2026-07-24', 'Friday'],
    ['2026-07-28', 'Tuesday'],
    ['2026-07-30', 'Thursday'],
  ])('%s is a %s', (key, expected) => {
    expect(weekdayForKey(key)).toBe(expected);
  });

  it('renders the grains the cards use', () => {
    expect(shortWeekdayForKey('2026-07-30')).toBe('Thu');
    expect(shortDateForKey('2026-07-28')).toBe('Tue 28');
    expect(longDateForKey('2026-07-25')).toBe('Saturday 25 July');
  });

  it('collapses a shared month in the week line', () => {
    expect(weekRangeLabel('2026-07-24', '2026-07-30')).toBe('24 – 30 July');
    expect(weekRangeLabel('2026-07-28', '2026-08-03')).toBe('28 July – 3 August');
  });

  it.each([['weekdayForKey', weekdayForKey], ['shortDateForKey', shortDateForKey], ['longDateForKey', longDateForKey]])(
    '%s returns empty for a malformed key rather than "Invalid Date"',
    (_name, fn) => {
      expect(fn('2026-7-3')).toBe('');
    },
  );
});
