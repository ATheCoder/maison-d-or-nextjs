import { describe, it, expect } from 'vitest';
import { SAVED_ITEM_TYPES, isSavedItemType, normaliseSaveInput } from './saved-item-input';

const base = { itemType: 'person', itemId: 'ada-lovelace', itemTitle: 'Ada Lovelace' } as const;

describe('isSavedItemType', () => {
  it('accepts exactly the enum members', () => {
    for (const t of SAVED_ITEM_TYPES) expect(isSavedItemType(t)).toBe(true);
    expect(isSavedItemType('recipe')).toBe(false);   // legacy Base44 type, dropped
    expect(isSavedItemType('history')).toBe(false);
    expect(isSavedItemType('')).toBe(false);
    expect(isSavedItemType(null)).toBe(false);
  });
});

describe('normaliseSaveInput rejections', () => {
  it('rejects an unknown or missing type', () => {
    expect(normaliseSaveInput({ ...base, itemType: 'recipe' }))
      .toEqual({ ok: false, reason: 'invalid_type' });
    expect(normaliseSaveInput({ ...base, itemType: undefined }))
      .toEqual({ ok: false, reason: 'invalid_type' });
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['over 300 chars', 'x'.repeat(301)],
    ['null', null],
    ['a number', 42],
  ])('rejects %s as invalid_item_id', (_label, itemId) => {
    expect(normaliseSaveInput({ ...base, itemId }))
      .toEqual({ ok: false, reason: 'invalid_item_id' });
  });

  it.each([
    ['empty', ''],
    ['whitespace only', ' \n '],
    ['over 200 chars', 'x'.repeat(201)],
    ['null', null],
  ])('rejects %s as invalid_title', (_label, itemTitle) => {
    expect(normaliseSaveInput({ ...base, itemTitle }))
      .toEqual({ ok: false, reason: 'invalid_title' });
  });

  it('accepts the boundary lengths', () => {
    expect(normaliseSaveInput({ ...base, itemId: 'x'.repeat(300), itemTitle: 'y'.repeat(200) }))
      .toMatchObject({ ok: true });
  });
});

describe('normaliseSaveInput normalisation', () => {
  it('trims the key fields', () => {
    const r = normaliseSaveInput({ ...base, itemId: '  ada-lovelace  ', itemTitle: '  Ada Lovelace ' });
    expect(r).toMatchObject({ ok: true, value: { itemId: 'ada-lovelace', itemTitle: 'Ada Lovelace' } });
  });

  it('passes a full valid input through', () => {
    expect(normaliseSaveInput({
      itemType: 'on_this_day',
      itemId: '412',
      itemTitle: 'A bridge opens',
      itemSubtitle: '1932',
      itemImageUrl: 'https://example.com/bridge.webp',
      countryCode: 'au',
      countryName: 'Australia',
      editionDate: '2026-03-19',
    })).toEqual({
      ok: true,
      value: {
        itemType: 'on_this_day',
        itemId: '412',
        itemTitle: 'A bridge opens',
        itemSubtitle: '1932',
        itemImageUrl: 'https://example.com/bridge.webp',
        countryCode: 'AU',
        countryName: 'Australia',
        editionDate: '2026-03-19',
      },
    });
  });

  it('soft-drops a bad subtitle, image and date rather than failing the save', () => {
    const r = normaliseSaveInput({
      ...base,
      itemSubtitle: '  ',
      itemImageUrl: 'javascript:alert(1)',
      editionDate: '2026-02-31',
    });
    expect(r).toMatchObject({
      ok: true,
      value: { itemSubtitle: null, itemImageUrl: null, editionDate: null },
    });
  });

  it('truncates an over-long subtitle instead of rejecting', () => {
    const r = normaliseSaveInput({ ...base, itemSubtitle: 's'.repeat(400) });
    expect(r).toMatchObject({ ok: true, value: { itemSubtitle: 's'.repeat(300) } });
  });

  it('drops an oversized image url', () => {
    const long = `https://example.com/${'a'.repeat(2048)}.webp`;
    expect(normaliseSaveInput({ ...base, itemImageUrl: long }))
      .toMatchObject({ ok: true, value: { itemImageUrl: null } });
  });

  it('resolves the country code and falls back to the canonical name', () => {
    expect(normaliseSaveInput({ ...base, countryCode: ' fr ', countryName: '' }))
      .toMatchObject({ ok: true, value: { countryCode: 'FR', countryName: 'France' } });
    expect(normaliseSaveInput({ ...base, countryCode: 'FR', countryName: 'French Republic' }))
      .toMatchObject({ ok: true, value: { countryCode: 'FR', countryName: 'French Republic' } });
  });

  it('nulls an unrecognised code and never stores the empty-string convention', () => {
    expect(normaliseSaveInput({ ...base, countryCode: 'ZZ', countryName: 'Atlantis' }))
      .toMatchObject({ ok: true, value: { countryCode: null, countryName: 'Atlantis' } });
    expect(normaliseSaveInput({ ...base, countryCode: '', countryName: '' }))
      .toMatchObject({ ok: true, value: { countryCode: null, countryName: null } });
  });
});
