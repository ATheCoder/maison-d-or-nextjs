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
import {
  and, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, max, ne, sql,
} from 'drizzle-orm';
import { db } from '@/src/db';
import { analyticsEvent, family, flagSeal, type AnalyticsEventRow } from '@/src/db/schema';
import { getActiveChild } from '@/lib/dal';
import { safeTimeZone, startOfZonedDay, zonedDayKey } from '@/lib/family-time';
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

// ── Read side (docs/daily-gold-analytics-plan.md §6, Phase A) ────────────────
// The parent roll-up behind DGForParents. Same trust rule as the write: the
// caller names no one, the child comes from the session.

/** One child's day, as the "Today's Exploration" card reads it. */
export type TodayExploration = {
  /** Section + story dwell, in whole minutes. */
  totalMinutes: number;
  /** Sections that held real attention, longest first. */
  sections: { section: string; minutes: number }[];
  /** Individual items opened and closed, longest first, capped at 8. */
  topContent: { contentType: string; contentId: string; label: string | null; minutes: number; opens: number }[];
  /** Books read from, longest first. */
  stories: { storyId: string; label: string | null; pagesRead: number; minutes: number; finished: boolean }[];
  /** Country seals whose most recent earn is today. */
  flagsEarnedToday: number;
};

const MS_PER_MINUTE = 60_000;
const toMinutes = (ms: number): number => Math.round(ms / MS_PER_MINUTE);

/**
 * Dwell for a grouped roll-up. COALESCE, not a bare SUM, so a group made
 * entirely of duration-less rows sorts as zero rather than as SQL NULL — which
 * Postgres would otherwise sort *first* under DESC and float to the top of the
 * capped top-content list.
 */
const dwellMs = sql<string>`coalesce(sum(${analyticsEvent.durationMs}), 0)`;

type EventType = AnalyticsEventRow['eventType'];

/**
 * Roll up the active child's activity since local midnight.
 *
 * Returns null for "nothing to show" in both senses — no reader, or the
 * database could not answer. This renders inside the child's own page load, so
 * a failure here degrades the parent card to its empty state and nothing else;
 * no path out of this function rejects.
 *
 * Titles come from the stored `label` snapshot (MAX per group), never from a
 * join back to the content tables: the label is what the child actually saw,
 * and it survives a later edit or unpublish of the source row — the same
 * denormalisation saved_item makes.
 */
export async function getTodayExplorationForActiveChild(): Promise<TodayExploration | null> {
  const child = await getActiveChild();
  if (!child) return null;

  try {
    // "Today" is the *family's* local day, read from the household's own
    // timezone (parent-observatory spec §8.1) — the v1 note here promised this
    // change once a family carried a zone, and the observatory now does the
    // same bucketing from the same column. That is what makes the two surfaces
    // agree on a day: an evening's reading in Paris lands on tonight's card,
    // not tomorrow's, and on tonight's bar in the observatory too.
    //
    // One indexed row read on the household this child belongs to.
    const household = await db
      .select({ timezone: family.timezone })
      .from(family)
      .where(eq(family.id, child.familyId))
      .limit(1);
    const zone = safeTimeZone(household[0]?.timezone);
    const now = new Date();
    const start = startOfZonedDay(zone, now);
    const dayKey = zonedDayKey(zone, now);

    // Every event read is this child, today, one type — served by the
    // (child_id, occurred_at DESC) index.
    const mine = (type: EventType) => and(
      eq(analyticsEvent.childId, child.id),
      gte(analyticsEvent.occurredAt, start),
      eq(analyticsEvent.eventType, type),
    );

    // Four answers, six statements: stories need their title and their
    // finished flag from sibling event types, and merging three small grouped
    // reads in memory beats a join or a lateral over the same narrow index.
    const [sectionRows, contentRows, storyPageRows, storyTitleRows, finishedRows, flagRows] =
      await Promise.all([
        // 1. Where the attention went.
        db
          .select({ section: analyticsEvent.section, dwell: dwellMs })
          .from(analyticsEvent)
          .where(and(mine('section_view'), isNotNull(analyticsEvent.section)))
          .groupBy(analyticsEvent.section)
          .orderBy(desc(dwellMs)),

        // 2. What was opened. Stories are excluded here — they have their own
        // per-page roll-up below, and listing them twice would read as two
        // different activities.
        db
          .select({
            contentType: analyticsEvent.contentType,
            contentId: analyticsEvent.contentId,
            label: max(analyticsEvent.label),
            dwell: dwellMs,
            opens: count(),
          })
          .from(analyticsEvent)
          .where(and(
            mine('content_close'),
            isNotNull(analyticsEvent.contentType),
            isNotNull(analyticsEvent.contentId),
            ne(analyticsEvent.contentType, 'story'),
          ))
          .groupBy(analyticsEvent.contentType, analyticsEvent.contentId)
          .orderBy(desc(dwellMs))
          .limit(8),

        // 3. How much of each book. A story page's `label` is its page number,
        // so distinct labels are distinct pages — re-reading page 3 four times
        // is still one page read.
        db
          .select({
            contentId: analyticsEvent.contentId,
            pagesRead: countDistinct(analyticsEvent.label),
            dwell: dwellMs,
          })
          .from(analyticsEvent)
          .where(and(mine('story_page_view'), isNotNull(analyticsEvent.contentId)))
          .groupBy(analyticsEvent.contentId),

        // 4. …and its title, which page events cannot carry. Open and close
        // both hold it, so an abandoned book (no close) is still named.
        db
          .select({ contentId: analyticsEvent.contentId, label: max(analyticsEvent.label) })
          .from(analyticsEvent)
          .where(and(
            eq(analyticsEvent.childId, child.id),
            gte(analyticsEvent.occurredAt, start),
            inArray(analyticsEvent.eventType, ['content_open', 'content_close']),
            eq(analyticsEvent.contentType, 'story'),
            isNotNull(analyticsEvent.contentId),
          ))
          .groupBy(analyticsEvent.contentId),

        // 5. Which of them reached the last leaf.
        db
          .select({ contentId: analyticsEvent.contentId })
          .from(analyticsEvent)
          .where(and(mine('story_finished'), isNotNull(analyticsEvent.contentId)))
          .groupBy(analyticsEvent.contentId),

        // 6. Seals earned today — a separate table, keyed by day already.
        db
          .select({ earned: count() })
          .from(flagSeal)
          .where(and(eq(flagSeal.childId, child.id), eq(flagSeal.lastEarnedDate, dayKey))),
      ]);

    // A section that was on screen for under a second was scrolled past, not
    // read; the collector already discards those segments, and a group summing
    // to zero is left over from instantaneous rows.
    const sectionDwell = sectionRows.map((row) => ({
      section: row.section ?? '',
      ms: Number(row.dwell ?? 0),
    }));
    const sections = sectionDwell
      .filter((row) => row.section && row.ms > 0)
      .map((row) => ({ section: row.section, minutes: toMinutes(row.ms) }));

    const topContent = contentRows.flatMap((row) => (
      row.contentType && row.contentId
        ? [{
            contentType: row.contentType,
            contentId: row.contentId,
            label: row.label ?? null,
            minutes: toMinutes(Number(row.dwell ?? 0)),
            opens: Number(row.opens ?? 0),
          }]
        : []
    ));

    const storyTitles = new Map(
      storyTitleRows.flatMap((row) => (row.contentId ? [[row.contentId, row.label ?? null] as const] : [])),
    );
    const storiesFinished = new Set(
      finishedRows.flatMap((row) => (row.contentId ? [row.contentId] : [])),
    );
    const storyDwell = storyPageRows.flatMap((row) => (
      row.contentId
        ? [{
            storyId: row.contentId,
            label: storyTitles.get(row.contentId) ?? null,
            pagesRead: Number(row.pagesRead ?? 0),
            ms: Number(row.dwell ?? 0),
            finished: storiesFinished.has(row.contentId),
          }]
        : []
    ));
    // Ordered on raw milliseconds, so two books that both round to "1 min"
    // still rank by the one actually read longer.
    storyDwell.sort((a, b) => b.ms - a.ms);
    const stories = storyDwell.map(({ ms, ...story }) => ({ ...story, minutes: toMinutes(ms) }));

    // Section dwell plus story dwell, and deliberately *not* content dwell: a
    // modal opened from a section accumulates inside that section's own dwell,
    // so adding it back would count the same minutes twice.
    const totalMs = sectionDwell.reduce((sum, row) => sum + row.ms, 0)
      + storyDwell.reduce((sum, story) => sum + story.ms, 0);

    return {
      totalMinutes: toMinutes(totalMs),
      sections,
      topContent,
      stories,
      flagsEarnedToday: Number(flagRows[0]?.earned ?? 0),
    };
  } catch (error) {
    console.error('analytics: today roll-up failed', error);
    return null;
  }
}
