import { describe, it, expect } from 'vitest';
import { FLAG_SOURCES, isFlagSource, isIsoDate, normaliseEarnInput } from './flag-seal-input';

const TODAY = '2026-07-27';
const base = { countryCode: 'FR', countryName: 'French', source: 'born_today' } as const;

describe('isFlagSource', () => {
  it('accepts exactly the four sources', () => {
    for (const s of FLAG_SOURCES) expect(isFlagSource(s)).toBe(true);
    expect(isFlagSource('treasury')).toBe(false);
    expect(isFlagSource('')).toBe(false);
    expect(isFlagSource(null)).toBe(false);
  });
});

describe('isIsoDate', () => {
  it('accepts real calendar days only', () => {
    expect(isIsoDate('2026-07-27')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);   // leap day
    expect(isIsoDate('2026-02-31')).toBe(false);  // overflows
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('26-07-27')).toBe(false);
    expect(isIsoDate('2026/07/27')).toBe(false);
    expect(isIsoDate(20260727)).toBe(false);
  });
});

describe('normaliseEarnInput', () => {
  it('normalises case and whitespace on the code', () => {
    const r = normaliseEarnInput({ ...base, countryCode: ' fr ' }, TODAY);
    expect(r).toMatchObject({ ok: true, code: 'FR' });
  });

  it.each([
    ['ZZ (well-formed but not a country)', 'ZZ'],
    ['empty', ''],
    ['one letter', 'F'],
    ['digit', 'F1'],
    ['three letters', 'FRA'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s as invalid_code', (_label, code) => {
    expect(normaliseEarnInput({ ...base, countryCode: code }, TODAY))
      .toEqual({ ok: false, reason: 'invalid_code' });
  });

  it('rejects an unknown source', () => {
    expect(normaliseEarnInput({ ...base, source: 'treasury' }, TODAY))
      .toEqual({ ok: false, reason: 'invalid_source' });
    expect(normaliseEarnInput({ ...base, source: undefined }, TODAY))
      .toEqual({ ok: false, reason: 'invalid_source' });
  });

  it('rejects malformed or impossible dates', () => {
    expect(normaliseEarnInput({ ...base, editionDate: '2026-02-31' }, TODAY))
      .toEqual({ ok: false, reason: 'invalid_date' });
    expect(normaliseEarnInput({ ...base, editionDate: 'today' }, TODAY))
      .toEqual({ ok: false, reason: 'invalid_date' });
  });

  it('defaults the edition date to the injected today', () => {
    const r = normaliseEarnInput(base, TODAY);
    expect(r).toMatchObject({ ok: true, editionDate: TODAY });
    const r2 = normaliseEarnInput({ ...base, editionDate: '' }, TODAY);
    expect(r2).toMatchObject({ ok: true, editionDate: TODAY });
  });

  it('keeps an explicit valid edition date', () => {
    expect(normaliseEarnInput({ ...base, editionDate: '2026-01-05' }, TODAY))
      .toMatchObject({ ok: true, editionDate: '2026-01-05' });
  });

  it('canonical name always comes from COUNTRIES, never the caller (R5.6)', () => {
    const r = normaliseEarnInput({ ...base, countryName: 'French' }, TODAY);
    expect(r).toMatchObject({ ok: true, canonicalName: 'France', displayName: 'French' });
  });

  it('falls back to the canonical name when the caller sends no label', () => {
    const r = normaliseEarnInput({ ...base, countryName: '' }, TODAY);
    expect(r).toMatchObject({ ok: true, displayName: 'France' });
  });
});
