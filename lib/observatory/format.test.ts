import { describe, expect, it } from 'vitest';
import {
  durationNumeral,
  editionsNumeral,
  formatMinutes,
  pluralise,
  shareOf,
  streakNumeral,
  toMinutes,
} from './format';

describe('toMinutes', () => {
  // Must stay byte-identical to app/analytics/actions.ts:143 — if these two
  // round differently, the observatory and the child's own card report
  // different numbers for the same day and both stop being trustworthy.
  it.each([
    [0, 0],
    [29_999, 0],
    [30_000, 1], // rounds up at the half minute, like the reference
    [60_000, 1],
    [89_999, 1],
    [90_000, 2],
    [6_060_000, 101],
  ])('%s ms → %s min', (ms, expected) => {
    expect(toMinutes(ms)).toBe(expected);
  });
});

describe('formatMinutes', () => {
  // The load-bearing case: a section the child demonstrably visited must never
  // be reported as "0 min", which reads as a lie sitting next to its own name.
  it.each([
    [1, 'under a minute'],
    [15_000, 'under a minute'],
    [29_999, 'under a minute'],
    [30_000, '1 min'],
    [60_000, '1 min'],
    [120_000, '2 min'],
    [2_280_000, '38 min'],
    [3_600_000, '1 h 00'],
    [6_060_000, '1 h 41'],
    [3_900_000, '1 h 05'], // padded, so it reads as a clock rather than "1 h 5"
  ])('%s ms → "%s"', (ms, expected) => {
    expect(formatMinutes(ms)).toBe(expected);
  });

  it.each([[0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'refuses to invent a duration for %s',
    (ms) => {
      expect(formatMinutes(ms)).toBe('no time yet');
    },
  );
});

describe('durationNumeral', () => {
  it.each([
    [0, { main: '0', sub: 'min' }],
    [20_000, { main: '< 1', sub: 'min' }], // never a bare "0" in the trio either
    [60_000, { main: '1', sub: 'min' }],
    [2_280_000, { main: '38', sub: 'min' }],
    [6_060_000, { main: '1 h 41' }],
  ])('%s ms → %o', (ms, expected) => {
    expect(durationNumeral(ms)).toEqual(expected);
  });
});

describe('editionsNumeral / streakNumeral', () => {
  it('frames editions against the week when it can', () => {
    expect(editionsNumeral(6, 7)).toEqual({ main: '6', sub: 'of 7' });
    expect(editionsNumeral(0, 7)).toEqual({ main: '0', sub: 'of 7' });
  });

  // Catching up on a backlog can open more editions than the week has days;
  // "8 of 7" would look like a bug, so the frame is dropped instead.
  it('drops the frame when more editions were opened than days', () => {
    expect(editionsNumeral(8, 7)).toEqual({ main: '8' });
  });

  it('shows a dash rather than nagging with a zero streak', () => {
    expect(streakNumeral(0)).toEqual({ main: '—' });
    expect(streakNumeral(5)).toEqual({ main: '5' });
  });
});

describe('shareOf', () => {
  it.each([
    [50, 100, 50],
    [1, 3, 33],
    [0, 100, 0],
    [100, 100, 100],
    [150, 100, 100], // clamped
    [10, 0, 0], // no division by zero
    [Number.NaN, 100, 0],
  ])('%s of %s → %s%%', (part, whole, expected) => {
    expect(shareOf(part, whole)).toBe(expected);
  });
});

describe('pluralise', () => {
  it.each([
    [0, '0 pages'],
    [1, '1 page'],
    [2, '2 pages'],
  ])('%s → "%s"', (count, expected) => {
    expect(pluralise(count, 'page')).toBe(expected);
  });

  it('takes an explicit plural when -s is wrong', () => {
    expect(pluralise(2, 'sitting')).toBe('2 sittings');
  });
});
