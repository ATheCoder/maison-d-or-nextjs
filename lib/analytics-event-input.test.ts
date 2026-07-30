import { describe, it, expect } from 'vitest';
import {
  MAX_CONTENT_ID_LENGTH,
  MAX_EVENT_AGE_MS,
  MAX_EVENT_SKEW_AHEAD_MS,
  normaliseEventBatch,
} from './analytics-event-input';
import { MAX_DURATION_MS, MAX_EVENTS_PER_BATCH, MAX_LABEL_LENGTH } from './analytics-events';

const NOW = new Date('2026-07-30T12:00:00.000Z');
const AT = NOW.getTime() - 1000;

const event = (over: Record<string, unknown> = {}) => ({
  type: 'section_view',
  occurredAt: AT,
  ...over,
});

const batch = (events: unknown[], batchId = 'batch-0001-aaaa') => ({ batchId, events });

function ok(input: unknown, now: Date = NOW) {
  const result = normaliseEventBatch(input, now);
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result;
}

describe('normaliseEventBatch — batch-level rejections', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'events'],
    ['a number', 7],
    ['a bare array', [event()]],
    ['an object with no events', { batchId: 'batch-0001-aaaa' }],
    ['an object whose events is not an array', { batchId: 'batch-0001-aaaa', events: 'nope' }],
  ])('rejects %s as invalid_batch', (_label, input) => {
    expect(normaliseEventBatch(input, NOW)).toEqual({ ok: false, reason: 'invalid_batch' });
  });

  it.each([
    ['missing', undefined],
    ['not a string', 12345678],
    ['under 8 chars', 'short'],
    ['whitespace-padded down to under 8', '  abc  '],
    ['over 64 chars', 'x'.repeat(65)],
  ])('rejects a batchId that is %s', (_label, batchId) => {
    expect(normaliseEventBatch({ batchId, events: [event()] }, NOW))
      .toEqual({ ok: false, reason: 'invalid_batch_id' });
  });

  it('accepts the batchId boundary lengths and trims', () => {
    expect(ok({ batchId: 'a'.repeat(8), events: [event()] }).batchId).toBe('a'.repeat(8));
    expect(ok({ batchId: 'a'.repeat(64), events: [event()] }).batchId).toBe('a'.repeat(64));
    expect(ok({ batchId: '  padded-batch-id  ', events: [event()] }).batchId).toBe('padded-batch-id');
  });

  it('rejects an empty event list', () => {
    expect(normaliseEventBatch(batch([]), NOW)).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects more than the cap and accepts exactly the cap', () => {
    const at = (n: number) => Array.from({ length: n }, () => event());
    expect(normaliseEventBatch(batch(at(MAX_EVENTS_PER_BATCH + 1)), NOW))
      .toEqual({ ok: false, reason: 'too_large' });
    expect(ok(batch(at(MAX_EVENTS_PER_BATCH))).events).toHaveLength(MAX_EVENTS_PER_BATCH);
  });

  it('checks the batch id before the size', () => {
    // A garbage batch should report the cheapest true fault, not a size that
    // only matters once the batch is addressable.
    expect(normaliseEventBatch({ batchId: 'no', events: Array.from({ length: 99 }, () => event()) }, NOW))
      .toEqual({ ok: false, reason: 'invalid_batch_id' });
  });
});

describe('normaliseEventBatch — a valid batch', () => {
  it('passes a fully populated event through', () => {
    const result = ok(batch([event({
      type: 'content_close',
      section: 'good_news',
      contentType: 'news',
      contentId: '412',
      label: 'A whale came home',
      source: 'section',
      editionDate: '2026-07-30',
      durationMs: 4200,
    })]));

    expect(result).toMatchObject({ ok: true, batchId: 'batch-0001-aaaa', dropped: 0 });
    expect(result.events[0]).toEqual({
      eventType: 'content_close',
      section: 'good_news',
      contentType: 'news',
      contentId: '412',
      label: 'A whale came home',
      source: 'section',
      editionDate: '2026-07-30',
      durationMs: 4200,
      occurredAt: new Date(AT),
      seq: 0,
    });
  });

  it('nulls every optional field when nothing is supplied', () => {
    expect(ok(batch([event()])).events[0]).toEqual({
      eventType: 'section_view',
      section: null,
      contentType: null,
      contentId: null,
      label: null,
      source: null,
      editionDate: null,
      durationMs: null,
      occurredAt: new Date(AT),
      seq: 0,
    });
  });

  it('defaults `now` to the current clock', () => {
    const result = normaliseEventBatch(batch([event({ occurredAt: Date.now() })]));
    expect(result).toMatchObject({ ok: true, dropped: 0 });
  });
});

describe('normaliseEventBatch — event types', () => {
  it.each([
    'section_view', 'content_open', 'content_close', 'nav_select', 'shelf_open',
    'collection_view', 'edition_turn', 'story_page_view', 'story_finished',
    'session_pause', 'session_resume', 'session_heartbeat',
  ])('accepts the client type %s', (type) => {
    expect(ok(batch([event({ type })])).events[0].eventType).toBe(type);
  });

  it('drops a client-fabricated reader_switch', () => {
    const result = ok(batch([event({ type: 'reader_switch' }), event()]));
    expect(result.dropped).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].seq).toBe(1);
  });

  it.each([
    ['unknown', 'flag_earned'],
    ['empty', ''],
    ['missing', undefined],
    ['not a string', 3],
  ])('drops an event whose type is %s', (_label, type) => {
    expect(ok(batch([event({ type }), event()])).dropped).toBe(1);
  });

  it.each([
    ['null', null],
    ['a string', 'section_view'],
    ['an array', []],
  ])('drops a non-object event (%s)', (_label, raw) => {
    expect(ok(batch([raw, event()])).dropped).toBe(1);
  });
});

describe('normaliseEventBatch — field normalisation', () => {
  it.each([
    ['unknown section', { section: 'kitchen' }, { section: null }],
    ['unknown content type', { contentType: 'recipe' }, { contentType: null }],
    ['unknown source', { source: 'iframe' }, { source: null }],
    ['non-string section', { section: 5 }, { section: null }],
    ['whitelisted section', { section: 'for_parents' }, { section: 'for_parents' }],
    ['whitelisted source', { source: 'seal_navigator' }, { source: 'seal_navigator' }],
    ['whitelisted content type', { contentType: 'seal' }, { contentType: 'seal' }],
  ])('%s', (_label, over, expected) => {
    expect(ok(batch([event(over)])).events[0]).toMatchObject(expected);
  });

  it('trims and caps the label', () => {
    expect(ok(batch([event({ label: '  Ada Lovelace  ' })])).events[0].label).toBe('Ada Lovelace');
    expect(ok(batch([event({ label: 'x'.repeat(MAX_LABEL_LENGTH + 50) })])).events[0].label)
      .toHaveLength(MAX_LABEL_LENGTH);
    expect(ok(batch([event({ label: '   ' })])).events[0].label).toBeNull();
    expect(ok(batch([event({ label: 99 })])).events[0].label).toBeNull();
  });

  it('trims and caps the content id', () => {
    expect(ok(batch([event({ contentId: ' the-lantern ' })])).events[0].contentId).toBe('the-lantern');
    expect(ok(batch([event({ contentId: 'x'.repeat(MAX_CONTENT_ID_LENGTH + 10) })])).events[0].contentId)
      .toHaveLength(MAX_CONTENT_ID_LENGTH);
    expect(ok(batch([event({ contentId: 1912 })])).events[0].contentId).toBeNull();
  });

  it.each([
    ['clamps a negative duration to 0', -5000, 0],
    ['keeps a plausible duration', 12_345, 12_345],
    ['rounds a fractional duration', 1500.7, 1501],
    ['clamps past the ceiling', MAX_DURATION_MS + 1, MAX_DURATION_MS],
    ['keeps exactly the ceiling', MAX_DURATION_MS, MAX_DURATION_MS],
    ['keeps zero', 0, 0],
  ])('%s', (_label, durationMs, expected) => {
    expect(ok(batch([event({ durationMs })])).events[0].durationMs).toBe(expected);
  });

  it.each([
    ['a string', '4000'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['null', null],
  ])('nulls a duration that is %s', (_label, durationMs) => {
    expect(ok(batch([event({ durationMs })])).events[0].durationMs).toBeNull();
  });

  it.each([
    ['a real day', '2026-02-28', '2026-02-28'],
    ['a leap day that exists', '2024-02-29', '2024-02-29'],
    ['a day that does not exist', '2026-02-30', null],
    ['a non-ISO shape', '30/07/2026', null],
    ['a number', 20260730, null],
    ['null', null, null],
  ])('edition date: %s', (_label, editionDate, expected) => {
    expect(ok(batch([event({ editionDate })])).events[0].editionDate).toBe(expected);
  });
});

describe('normaliseEventBatch — the timestamp window', () => {
  it.each([
    ['exactly 48 h old', NOW.getTime() - MAX_EVENT_AGE_MS, true],
    ['a millisecond older than 48 h', NOW.getTime() - MAX_EVENT_AGE_MS - 1, false],
    ['exactly 2 min ahead', NOW.getTime() + MAX_EVENT_SKEW_AHEAD_MS, true],
    ['a millisecond further ahead', NOW.getTime() + MAX_EVENT_SKEW_AHEAD_MS + 1, false],
    ['right now', NOW.getTime(), true],
  ])('%s', (_label, occurredAt, kept) => {
    const result = ok(batch([event({ occurredAt })]));
    expect(result.events).toHaveLength(kept ? 1 : 0);
    expect(result.dropped).toBe(kept ? 0 : 1);
  });

  it.each([
    ['missing', undefined],
    ['a string', '2026-07-30T12:00:00Z'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['null', null],
  ])('drops an event whose occurredAt is %s', (_label, occurredAt) => {
    expect(ok(batch([event({ occurredAt })])).dropped).toBe(1);
  });

  it('keeps a whole batch when only some events are stale', () => {
    const result = ok(batch([
      event(),
      event({ occurredAt: 0 }),
      event(),
    ]));
    expect(result.events).toHaveLength(2);
    expect(result.dropped).toBe(1);
  });
});

describe('normaliseEventBatch — seq stability', () => {
  it('numbers by received position, not by surviving position', () => {
    const result = ok(batch([
      event({ label: 'first' }),
      event({ type: 'reader_switch' }),
      event({ occurredAt: 0 }),
      event({ label: 'fourth' }),
    ]));
    expect(result.dropped).toBe(2);
    expect(result.events.map((e) => e.seq)).toEqual([0, 3]);
    expect(result.events.map((e) => e.label)).toEqual(['first', 'fourth']);
  });

  it('gives a retried flush the identical (batchId, seq) pairs', () => {
    const raw = batch([event({ label: 'a' }), { junk: true }, event({ label: 'c' })]);
    const first = ok(raw);
    const retry = ok(raw, new Date(NOW.getTime() + 30_000));
    expect(retry.batchId).toBe(first.batchId);
    expect(retry.events.map((e) => e.seq)).toEqual(first.events.map((e) => e.seq));
    expect(first.events.map((e) => e.seq)).toEqual([0, 2]);
  });

  it('reports every event dropped without rejecting the batch', () => {
    const result = ok(batch([{ junk: true }, event({ type: 'nope' })]));
    expect(result.events).toEqual([]);
    expect(result.dropped).toBe(2);
  });
});
