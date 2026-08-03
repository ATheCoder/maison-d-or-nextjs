import { describe, it, expect } from 'vitest';
import { mergeSavedEdits, savedKeyFor, type SavedTreasure, type SavedEdits } from './saved-treasures';

const treasure = (item_type: string, item_id: string, item_title = `${item_type} ${item_id}`): SavedTreasure => ({
  item_type,
  item_id,
  item_title,
  item_subtitle: null,
  item_image_url: null,
  country_code: null,
  country_name: null,
  edition_date: null,
});

const keys = (items: SavedTreasure[]) => items.map((i) => savedKeyFor(i.item_type, i.item_id));

const edits = (...pairs: [SavedTreasure, boolean][]): SavedEdits => {
  const map = new Map<string, SavedTreasure | null>();
  for (const [record, saved] of pairs) {
    map.set(savedKeyFor(record.item_type, record.item_id), saved ? record : null);
  }
  return map;
};

describe('mergeSavedEdits', () => {
  const news = treasure('news', '1');
  const moment = treasure('greatest_moment', '2');
  // The Cabinet types, whose card exists nowhere but this snapshot.
  const taste = treasure('taste', 'Saffron buns', 'Saffron buns');

  it('returns the server list untouched when nothing was tapped', () => {
    const server = [news, moment];
    expect(mergeSavedEdits(server, new Map())).toBe(server);
  });

  it('shows a treasure saved since the list was fetched', () => {
    const merged = mergeSavedEdits([news], edits([taste, true]));
    expect(keys(merged)).toEqual(['taste:Saffron buns', 'news:1']);
    // The whole card, not just its key — there is no source row to rebuild a
    // taste-of-day from.
    expect(merged[0].item_title).toBe('Saffron buns');
  });

  it('drops a treasure unsaved since the list was fetched', () => {
    const merged = mergeSavedEdits([news, moment], edits([news, false]));
    expect(keys(merged)).toEqual(['greatest_moment:2']);
  });

  it('does not duplicate a treasure once its write has landed', () => {
    // The server now returns what the optimistic edit already added.
    const merged = mergeSavedEdits([taste, news], edits([taste, true]));
    expect(keys(merged)).toEqual(['taste:Saffron buns', 'news:1']);
  });

  it('is idempotent once the server agrees, in both directions', () => {
    const both = edits([taste, true], [news, false]);
    const once = mergeSavedEdits([taste, moment], both);
    const twice = mergeSavedEdits(once, both);
    expect(keys(twice)).toEqual(keys(once));
  });

  it('puts the most recently saved treasure first', () => {
    const second = treasure('person', 'ada-lovelace');
    const merged = mergeSavedEdits([news], edits([taste, true], [second, true]));
    expect(keys(merged)).toEqual(['person:ada-lovelace', 'taste:Saffron buns', 'news:1']);
  });

  it('lets a rollback undo an addition', () => {
    // The optimistic flip, then the server refusing it.
    const rolledBack = edits([taste, true], [taste, false]);
    expect(keys(mergeSavedEdits([news], rolledBack))).toEqual(['news:1']);
  });

  it('lets a rollback restore a removal', () => {
    // Unsaved optimistically, then the save failed — the card must come back.
    const rolledBack = edits([news, false], [news, true]);
    expect(keys(mergeSavedEdits([news, moment], rolledBack))).toEqual(['news:1', 'greatest_moment:2']);
  });

  it('applies additions and removals together', () => {
    const merged = mergeSavedEdits([news, moment], edits([news, false], [taste, true]));
    expect(keys(merged)).toEqual(['taste:Saffron buns', 'greatest_moment:2']);
  });

  it('handles an empty server list', () => {
    expect(keys(mergeSavedEdits([], edits([taste, true])))).toEqual(['taste:Saffron buns']);
  });

  it('keeps item types apart when ids collide', () => {
    // A taste and a sound can both be a bare string, so the type has to be
    // part of the key or one would unsave the other.
    const sound = treasure('sound', 'Bells');
    const sameIdTaste = treasure('taste', 'Bells');
    const merged = mergeSavedEdits([sound, sameIdTaste], edits([sound, false]));
    expect(keys(merged)).toEqual(['taste:Bells']);
  });
});
