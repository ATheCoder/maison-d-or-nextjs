'use server';

/**
 * Child-activity analytics ingestion (docs/daily-gold-analytics-plan.md §3).
 *
 * One action, one insert. The trust invariant is the whole design: **the client
 * reports what, never who.** A batch carries event shapes and timings only —
 * the child is resolved from the session by getActiveChild(), exactly as the
 * treasury and passport writes do, so there is no parameter here to attack.
 *
 * Every path returns a status. Analytics is background bookkeeping behind a
 * child's page; a failure here must be invisible to them, so failures come back
 * as discriminated-union values and never as raised errors. A sibling contract
 * test asserts that statically, over the raw source of this file.
 */
import { randomUUID } from 'node:crypto';
import { and, count, eq, gt } from 'drizzle-orm';
import { db } from '@/src/db';
import { analyticsEvent } from '@/src/db/schema';
import { getActiveChild } from '@/lib/dal';
import { normaliseEventBatch } from '@/lib/analytics-event-input';
import { MAX_EVENTS_PER_BATCH } from '@/lib/analytics-events';

export type RecordEventsResult =
  | { status: 'ok'; accepted: number }
  | { status: 'no_child' }
  | { status: 'invalid' }
  | { status: 'over_budget' }
  | { status: 'error'; reason: 'db_error' };

/**
 * How often a flush pays for the budget COUNT. A real child never approaches
 * the cap, so sampling is enough to stop a script within seconds while leaving
 * the common path at one statement (§5.3).
 */
const BUDGET_CHECK_PROBABILITY = 0.2;
/** Rows one child may write in a rolling day. Orders of magnitude past real use. */
const DAILY_ROW_BUDGET = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Record one flush of buffered events.
 *
 * Rejections are ordered cheapest-first: no session work is wasted on a
 * malformed batch, and no parsing is wasted on a visitor with no active child.
 * Individually implausible events are dropped by the normaliser rather than
 * failing the batch — losing a whole session's dwell to one stale timestamp
 * would be the worse bug.
 *
 * The insert is idempotent on (batch_id, seq): a carryover replay, a
 * double-fire or a captured request writes zero duplicate rows, which is what
 * lets the client retry a flush blindly.
 */
export async function recordEvents(batch: unknown): Promise<RecordEventsResult> {
  // Non-redirecting, and first: an anonymous flood costs one session read.
  const child = await getActiveChild();
  if (!child) return { status: 'no_child' };

  // Cheap shape gate before the full normalisation walk.
  if (!batch || typeof batch !== 'object' || Array.isArray(batch)) return { status: 'invalid' };
  const rawEvents = (batch as { events?: unknown }).events;
  if (!Array.isArray(rawEvents) || rawEvents.length > MAX_EVENTS_PER_BATCH) {
    return { status: 'invalid' };
  }

  const normalised = normaliseEventBatch(batch);
  if (!normalised.ok) {
    console.warn(`analytics: rejected batch (${normalised.reason})`);
    return { status: 'invalid' };
  }
  const { batchId, events, dropped } = normalised;
  if (dropped > 0) {
    console.warn(`analytics: dropped ${dropped} implausible event(s) from batch ${batchId}`);
  }
  // Everything in the batch was implausible, or the batch was pure noise. The
  // client should still treat this as delivered and clear its buffer.
  if (events.length === 0) return { status: 'ok', accepted: 0 };

  try {
    if (Math.random() < BUDGET_CHECK_PROBABILITY) {
      // Served entirely by the (child_id, occurred_at DESC) index.
      const [budget] = await db
        .select({ rows: count() })
        .from(analyticsEvent)
        .where(and(
          eq(analyticsEvent.childId, child.id),
          gt(analyticsEvent.occurredAt, new Date(Date.now() - DAY_MS)),
        ));
      if ((budget?.rows ?? 0) > DAILY_ROW_BUDGET) return { status: 'over_budget' };
    }

    const result = await db
      .insert(analyticsEvent)
      .values(events.map((event) => ({
        id: randomUUID(),
        childId: child.id,
        batchId,
        eventType: event.eventType,
        section: event.section,
        contentType: event.contentType,
        contentId: event.contentId,
        label: event.label,
        source: event.source,
        editionDate: event.editionDate,
        durationMs: event.durationMs,
        occurredAt: event.occurredAt,
        seq: event.seq,
      })))
      .onConflictDoNothing({ target: [analyticsEvent.batchId, analyticsEvent.seq] });

    // node-postgres reports how many rows survived the conflict clause; when a
    // driver does not, claiming the batch is right — the rows are there either
    // way, and a replay is a no-op by construction.
    const written = (result as { rowCount?: number | null })?.rowCount;
    return { status: 'ok', accepted: typeof written === 'number' ? written : events.length };
  } catch (error) {
    console.error('analytics: ingest failed', error);
    return { status: 'error', reason: 'db_error' };
  }
}
