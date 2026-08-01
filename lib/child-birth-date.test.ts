import { describe, it, expect } from 'vitest';
import {
  MAX_CHILD_AGE,
  MIN_CHILD_AGE,
  ageOnDay,
  birthDateBounds,
  formatBirthDate,
  isBirthdayOn,
  normalizeBirthDate,
  parseDayKey,
} from './child-birth-date';

describe('parseDayKey', () => {
  it('accepts a real calendar day', () => {
    expect(parseDayKey('2016-03-04')).toEqual({ year: 2016, month: 3, day: 4 });
  });

  it('accepts 29 February in a leap year and rejects it otherwise', () => {
    expect(parseDayKey('2016-02-29')).toEqual({ year: 2016, month: 2, day: 29 });
    expect(parseDayKey('2015-02-29')).toBeNull();
  });

  it('rejects days that only look like dates', () => {
    for (const bad of ['2016-13-01', '2016-04-31', '2016-00-10', '16-03-04', '2016-3-4', '', 'today', null, 20160304]) {
      expect(parseDayKey(bad)).toBeNull();
    }
  });
});

describe('ageOnDay', () => {
  it('counts completed years, turning over on the birthday itself', () => {
    expect(ageOnDay('2016-03-04', '2025-03-03')).toBe(8);
    expect(ageOnDay('2016-03-04', '2025-03-04')).toBe(9);
    expect(ageOnDay('2016-03-04', '2025-03-05')).toBe(9);
  });

  it('does not round a December birthday up to the new year', () => {
    // The old year-only reading called this child 9 from 1 January.
    expect(ageOnDay('2016-12-31', '2025-01-01')).toBe(8);
  });

  it('is 0 on the day of birth and null for a day it cannot read', () => {
    expect(ageOnDay('2025-06-01', '2025-06-01')).toBe(0);
    expect(ageOnDay('not-a-date', '2025-06-01')).toBeNull();
    expect(ageOnDay('2016-03-04', 'not-a-date')).toBeNull();
  });
});

describe('isBirthdayOn', () => {
  it('is true only on the day', () => {
    expect(isBirthdayOn('2016-03-04', '2025-03-04')).toBe(true);
    expect(isBirthdayOn('2016-03-04', '2025-03-05')).toBe(false);
  });

  it('gives a leapling 1 March in a common year, and 29 February in a leap one', () => {
    expect(isBirthdayOn('2016-02-29', '2025-03-01')).toBe(true);
    expect(isBirthdayOn('2016-02-29', '2025-02-28')).toBe(false);
    expect(isBirthdayOn('2016-02-29', '2028-02-29')).toBe(true);
    expect(isBirthdayOn('2016-02-29', '2028-03-01')).toBe(false);
  });
});

describe('normalizeBirthDate', () => {
  const today = '2025-06-15';

  it('accepts a birthday inside the age range', () => {
    expect(normalizeBirthDate('2016-03-04', today)).toEqual({ ok: true, birthDate: '2016-03-04' });
  });

  it('refuses a missing or malformed birthday rather than guessing a year', () => {
    for (const bad of ['', '2016', undefined, null, {}]) {
      expect(normalizeBirthDate(bad, today).ok).toBe(false);
    }
  });

  it('refuses a birthday in the future', () => {
    const res = normalizeBirthDate('2026-01-01', today);
    expect(res).toEqual({ ok: false, error: 'That birthday is in the future.' });
  });

  it('refuses children outside 5–17', () => {
    expect(normalizeBirthDate('2020-06-15', today).ok).toBe(true);  // 5 today
    expect(normalizeBirthDate('2020-06-16', today).ok).toBe(false); // 5 tomorrow
    expect(normalizeBirthDate('2007-06-16', today).ok).toBe(true);  // 17, 18 tomorrow
    expect(normalizeBirthDate('2007-06-15', today).ok).toBe(false); // 18 today
  });
});

describe('birthDateBounds', () => {
  const today = '2025-06-15';
  const { min, max } = birthDateBounds(today);

  it('brackets exactly the ages the validator accepts', () => {
    expect(ageOnDay(max, today)).toBe(MIN_CHILD_AGE);
    expect(ageOnDay(min, today)).toBe(MAX_CHILD_AGE);
    expect(normalizeBirthDate(min, today).ok).toBe(true);
    expect(normalizeBirthDate(max, today).ok).toBe(true);
  });

  it('excludes the day either side of the bracket', () => {
    const dayBefore = (key: string) => {
      const p = parseDayKey(key)!;
      const d = new Date(Date.UTC(p.year, p.month - 1, p.day - 1));
      return d.toISOString().slice(0, 10);
    };
    const dayAfter = (key: string) => {
      const p = parseDayKey(key)!;
      const d = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
      return d.toISOString().slice(0, 10);
    };
    expect(normalizeBirthDate(dayBefore(min), today).ok).toBe(false); // just turned 18
    expect(normalizeBirthDate(dayAfter(max), today).ok).toBe(false);  // not yet 5
  });
});

describe('formatBirthDate', () => {
  it('reads back the same day it was given, in every zone', () => {
    // Naive `new Date('2016-03-04')` is UTC midnight — the 3rd of March west of
    // Greenwich. The formatter must not lose a day that way.
    expect(formatBirthDate('2016-03-04')).toBe('4 March 2016');
    expect(formatBirthDate('2016-01-01')).toBe('1 January 2016');
    expect(formatBirthDate('nope')).toBeNull();
  });
});

it('keeps the advertised age range in one place', () => {
  expect(MIN_CHILD_AGE).toBeLessThan(MAX_CHILD_AGE);
});
