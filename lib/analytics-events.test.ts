import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_SECTIONS,
  CLIENT_EVENT_TYPES,
  MAX_EVENTS_PER_BATCH,
  SECTION_LABELS,
  chunkIntoBatches,
  parseCarryover,
  type BufferedEvent,
} from './analytics-events';

/** Deterministic ids so batch assembly is assertable. */
function counterIds() {
  let n = 0;
  return () => `batch-${n++}`;
}

function buffer(count: number): BufferedEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'section_view' as const,
    section: 'good_news' as const,
    durationMs: 1000 + i,
    occurredAt: 1_700_000_000_000 + i,
  }));
}

describe('vocabulary', () => {
  it('carries all 13 event types with reader_switch server-only', () => {
    expect(ANALYTICS_EVENT_TYPES).toHaveLength(13);
    expect(ANALYTICS_EVENT_TYPES).toContain('reader_switch');
    expect(CLIENT_EVENT_TYPES).toHaveLength(12);
    expect(CLIENT_EVENT_TYPES).not.toContain('reader_switch');
  });

  it('labels every section', () => {
    for (const section of ANALYTICS_SECTIONS) {
      expect(SECTION_LABELS[section]).toBeTruthy();
    }
    expect(Object.keys(SECTION_LABELS)).toHaveLength(ANALYTICS_SECTIONS.length);
    expect(SECTION_LABELS.good_news).toBe('Good News');
  });
});

describe('chunkIntoBatches', () => {
  it('returns nothing for an empty buffer', () => {
    expect(chunkIntoBatches([], MAX_EVENTS_PER_BATCH, counterIds())).toEqual([]);
  });

  it('keeps exactly max in one batch', () => {
    const batches = chunkIntoBatches(buffer(MAX_EVENTS_PER_BATCH), MAX_EVENTS_PER_BATCH, counterIds());
    expect(batches).toHaveLength(1);
    expect(batches[0].events).toHaveLength(MAX_EVENTS_PER_BATCH);
  });

  it('splits max + 1 into two batches with the remainder last', () => {
    const batches = chunkIntoBatches(buffer(MAX_EVENTS_PER_BATCH + 1), MAX_EVENTS_PER_BATCH, counterIds());
    expect(batches).toHaveLength(2);
    expect(batches[0].events).toHaveLength(MAX_EVENTS_PER_BATCH);
    expect(batches[1].events).toHaveLength(1);
    expect(batches.map((b) => b.batchId)).toEqual(['batch-0', 'batch-1']);
  });

  it('numbers seq from 0 within each batch, not across the buffer', () => {
    const batches = chunkIntoBatches(buffer(5), 2, counterIds());
    expect(batches.map((b) => b.events.map((e) => e.seq))).toEqual([[0, 1], [0, 1], [0]]);
  });

  it('preserves event order and payload', () => {
    const batches = chunkIntoBatches(buffer(3), 10, counterIds());
    expect(batches[0].events.map((e) => e.durationMs)).toEqual([1000, 1001, 1002]);
    expect(batches[0].events[0]).toMatchObject({ type: 'section_view', section: 'good_news', seq: 0 });
  });

  it('does not mutate the input events', () => {
    const events = buffer(2);
    chunkIntoBatches(events, 10, counterIds());
    expect(events[0]).not.toHaveProperty('seq');
  });

  it('falls back to the default size for a nonsense max', () => {
    expect(chunkIntoBatches(buffer(51), 0, counterIds())).toHaveLength(2);
    expect(chunkIntoBatches(buffer(51), Number.NaN, counterIds())).toHaveLength(2);
  });

  it('defaults to MAX_EVENTS_PER_BATCH and generates distinct ids', () => {
    const batches = chunkIntoBatches(buffer(120));
    expect(batches).toHaveLength(3);
    expect(new Set(batches.map((b) => b.batchId)).size).toBe(3);
  });
});

describe('parseCarryover', () => {
  const batches = chunkIntoBatches(buffer(2), 10, counterIds());
  const envelope = JSON.stringify({ childId: 'child-1', savedAt: 1_700_000_000_000, batches });

  it('returns the batches when the child matches', () => {
    expect(parseCarryover(envelope, 'child-1')).toEqual(batches);
  });

  it('discards another reader’s tail', () => {
    expect(parseCarryover(envelope, 'child-2')).toBeNull();
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['a JSON array', '[1,2,3]'],
    ['a JSON scalar', '"hello"'],
    ['null literal', 'null'],
    ['an empty string', ''],
  ])('returns null for %s', (_label, raw) => {
    expect(parseCarryover(raw, 'child-1')).toBeNull();
  });

  it('returns null for a missing key', () => {
    expect(parseCarryover(null, 'child-1')).toBeNull();
  });

  it('returns null when the envelope has no batches array', () => {
    expect(parseCarryover(JSON.stringify({ childId: 'child-1', savedAt: 1 }), 'child-1')).toBeNull();
    expect(parseCarryover(JSON.stringify({ childId: 'child-1', batches: 'nope' }), 'child-1')).toBeNull();
  });

  it('returns null when there is no active child to route to', () => {
    expect(parseCarryover(envelope, '')).toBeNull();
  });

  it('accepts an empty batch list from a clean shutdown', () => {
    expect(parseCarryover(JSON.stringify({ childId: 'c', savedAt: 1, batches: [] }), 'c')).toEqual([]);
  });
});
