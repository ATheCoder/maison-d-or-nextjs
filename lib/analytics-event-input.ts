/**
 * Pure validation/normalisation for the analytics ingest action
 * (docs/daily-gold-analytics-plan.md §3.3). Kept out of app/analytics/actions.ts
 * so the decision logic is unit-testable without a DB or a session — the same
 * split lib/saved-item-input.ts makes for saves and lib/flag-seal-input.ts for
 * earns.
 *
 * The governing asymmetry: a batch is rejected only when it is unusable as a
 * batch (no id, no events, absurdly large). A single implausible *event* is
 * dropped on its own — a child's real session should not lose 49 good events
 * because one carried a stale clock reading.
 *
 * Plausibility limits are the abuse limits here (§5.2): whitelists instead of
 * free text, a label cap, a duration clamp and a timestamp window are what a
 * scripted client runs into, and there is nothing softer behind them.
 */
import {
  ANALYTICS_CONTENT_TYPES,
  ANALYTICS_SECTIONS,
  ANALYTICS_SOURCES,
  CLIENT_EVENT_TYPES,
  MAX_DURATION_MS,
  MAX_EVENTS_PER_BATCH,
  MAX_LABEL_LENGTH,
  type AnalyticsContentType,
  type AnalyticsSection,
  type AnalyticsSource,
  type ClientEventType,
} from './analytics-events';
import { isIsoDate } from './flag-seal-input';

/** Carryover replays hours-old events; only the far past is implausible. */
export const MAX_EVENT_AGE_MS = 48 * 60 * 60 * 1000;
/** Enough slack for a skewed device clock, not enough to seed the future. */
export const MAX_EVENT_SKEW_AHEAD_MS = 2 * 60 * 1000;
/** A slug, a serial id or a year — never a document. */
export const MAX_CONTENT_ID_LENGTH = 200;
const MIN_BATCH_ID_LENGTH = 8;
const MAX_BATCH_ID_LENGTH = 64;

/** The analytics_event columns one event writes, ready to spread into an insert. */
export type AnalyticsEventValues = {
  eventType: ClientEventType;
  section: AnalyticsSection | null;
  contentType: AnalyticsContentType | null;
  contentId: string | null;
  label: string | null;
  source: AnalyticsSource | null;
  editionDate: string | null;
  durationMs: number | null;
  occurredAt: Date;
  /** Position in the batch **as received** — see normaliseEventBatch. */
  seq: number;
};

export type NormalisedEventBatch =
  | { ok: true; batchId: string; events: AnalyticsEventValues[]; dropped: number }
  | { ok: false; reason: 'invalid_batch' | 'invalid_batch_id' | 'too_large' | 'empty' };

function isClientEventType(value: unknown): value is ClientEventType {
  return typeof value === 'string' && (CLIENT_EVENT_TYPES as readonly string[]).includes(value);
}

/** Whitelist-or-null: an unrecognised value is decoration we simply forget. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function cappedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Clamped rather than rejected: a wild duration is noise, not a reason to lose the event. */
function clampDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(Math.max(Math.round(value), 0), MAX_DURATION_MS);
}

/**
 * Validate one flush.
 *
 * `seq` is the event's index in the array **as received**, assigned before any
 * event is dropped. That is deliberate and load-bearing: a retry of the same
 * flush must produce the same (batch_id, seq) pairs, or the unique index stops
 * absorbing duplicates the moment a batch contains one bad event. Surviving
 * seq values are therefore sparse whenever `dropped > 0`.
 */
export function normaliseEventBatch(input: unknown, now: Date = new Date()): NormalisedEventBatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'invalid_batch' };
  }
  const batch = input as { batchId?: unknown; events?: unknown };

  if (!Array.isArray(batch.events)) return { ok: false, reason: 'invalid_batch' };

  const batchId = typeof batch.batchId === 'string' ? batch.batchId.trim() : '';
  if (batchId.length < MIN_BATCH_ID_LENGTH || batchId.length > MAX_BATCH_ID_LENGTH) {
    return { ok: false, reason: 'invalid_batch_id' };
  }

  const received = batch.events;
  if (received.length === 0) return { ok: false, reason: 'empty' };
  if (received.length > MAX_EVENTS_PER_BATCH) return { ok: false, reason: 'too_large' };

  const oldest = now.getTime() - MAX_EVENT_AGE_MS;
  const newest = now.getTime() + MAX_EVENT_SKEW_AHEAD_MS;

  const events: AnalyticsEventValues[] = [];
  let dropped = 0;

  received.forEach((raw, seq) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      dropped += 1;
      return;
    }
    const event = raw as Record<string, unknown>;

    // A client claiming reader_switch is fabricating: that row is written
    // server-side where both profile ids are actually known.
    if (!isClientEventType(event.type)) {
      dropped += 1;
      return;
    }

    const occurredAt = event.occurredAt;
    if (typeof occurredAt !== 'number' || !Number.isFinite(occurredAt)) {
      dropped += 1;
      return;
    }
    if (occurredAt < oldest || occurredAt > newest) {
      dropped += 1;
      return;
    }

    events.push({
      eventType: event.type,
      section: oneOf(event.section, ANALYTICS_SECTIONS),
      contentType: oneOf(event.contentType, ANALYTICS_CONTENT_TYPES),
      contentId: cappedText(event.contentId, MAX_CONTENT_ID_LENGTH),
      label: cappedText(event.label, MAX_LABEL_LENGTH),
      source: oneOf(event.source, ANALYTICS_SOURCES),
      editionDate: isIsoDate(event.editionDate) ? event.editionDate : null,
      durationMs: clampDuration(event.durationMs),
      occurredAt: new Date(occurredAt),
      seq,
    });
  });

  return { ok: true, batchId, events, dropped };
}
