/**
 * The shared vocabulary of child-activity analytics
 * (docs/daily-gold-analytics-plan.md §2–§4). Pure TypeScript with zero imports:
 * the browser provider, the server action, the normaliser and the parent
 * roll-up all pull their constants from here, so a section id can never drift
 * between the thing that emits it and the thing that renders it.
 *
 * src/db/schema.ts mirrors ANALYTICS_EVENT_TYPES as literals because drizzle's
 * pgEnum cannot take a computed list — that is the one place this file's
 * contents are duplicated, and both sides carry a cross-reference comment.
 */

/** Every event type the enum knows, client-emitted or not. */
export const ANALYTICS_EVENT_TYPES = [
  'section_view',
  'content_open',
  'content_close',
  'nav_select',
  'shelf_open',
  'collection_view',
  'edition_turn',
  'story_page_view',
  'story_finished',
  'session_pause',
  'session_resume',
  'session_heartbeat',
  'reader_switch',
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

/**
 * The 12 a browser may report. `reader_switch` is written server-side inside
 * the profile-entry action — the server knows both the from-child and the
 * to-child, and a client cannot forget (or lie about) the switch. A batch
 * claiming one is a fabrication, so the normaliser drops it.
 */
export type ClientEventType = Exclude<AnalyticsEventType, 'reader_switch'>;
export const CLIENT_EVENT_TYPES: readonly ClientEventType[] = ANALYTICS_EVENT_TYPES
  .filter((type): type is ClientEventType => type !== 'reader_switch');

/** Trackable regions of the paper, plus the two off-paper surfaces. */
export const ANALYTICS_SECTIONS = [
  'hero',
  'born_today',
  'good_news',
  'on_this_day',
  'greatest_moments',
  'inspiration',
  'destination',
  'more_to_explore',
  'values',
  'for_parents',
  'story',
  'collection',
] as const;
export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[number];

/**
 * Display names for the DGForParents chips. Deliberately the child's own words
 * for the page, not the internal ids — a parent reads "Good News", never
 * "good_news".
 */
export const SECTION_LABELS: Record<AnalyticsSection, string> = {
  hero: 'Front Page',
  born_today: 'Born Today',
  good_news: 'Good News',
  on_this_day: 'On This Day',
  greatest_moments: 'Greatest Moments',
  inspiration: 'Inspiration',
  destination: 'Destination',
  more_to_explore: 'More to Explore',
  values: 'Values',
  for_parents: 'For Parents',
  story: 'Golden Story',
  collection: 'My Collection',
};

/** What an opened content item can be. Matches the modal-shaped surfaces. */
export const ANALYTICS_CONTENT_TYPES = [
  'person',
  'news',
  'moment',
  'destination',
  'story',
  'on_this_day',
  'seal',
] as const;
export type AnalyticsContentType = (typeof ANALYTICS_CONTENT_TYPES)[number];

/** Where an event came from — which chrome the child touched. */
export const ANALYTICS_SOURCES = [
  'rail',
  'tabbar',
  'shelf',
  'header',
  'seal_navigator',
  'section',
  'server',
] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

/** One flush never carries more than this; the action rejects a bigger batch. */
export const MAX_EVENTS_PER_BATCH = 50;
/** Labels are display snapshots, not documents. */
export const MAX_LABEL_LENGTH = 120;
/** 10 minutes. A longer single dwell is a stuck clock or a fabrication. */
export const MAX_DURATION_MS = 600_000;

/**
 * An event as the provider buffers it: `occurredAt` is epoch milliseconds
 * stamped at track() time, so a batch that waits in localStorage overnight
 * still reports when it actually happened.
 */
export type BufferedEvent = {
  type: ClientEventType;
  section?: AnalyticsSection | null;
  contentType?: AnalyticsContentType | null;
  contentId?: string | null;
  label?: string | null;
  source?: AnalyticsSource | null;
  editionDate?: string | null;
  durationMs?: number | null;
  occurredAt: number;
};

/**
 * A buffer chunked and frozen for sending. `seq` is assigned once, here, and is
 * never renumbered afterwards — with the UNIQUE (batch_id, seq) index that is
 * what makes a replayed batch write zero duplicate rows.
 */
export type AssembledBatch = {
  batchId: string;
  events: (BufferedEvent & { seq: number })[];
};

/**
 * Best-effort unique batch id. Kept injectable so tests (and any runtime
 * without `crypto.randomUUID`) stay deterministic — collisions only cost a
 * dropped duplicate batch, never a wrong row.
 */
function defaultBatchId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Split a buffer into sendable batches of at most `max` events, numbering each
 * event by its position **within its own batch**.
 */
export function chunkIntoBatches(
  events: readonly BufferedEvent[],
  max: number = MAX_EVENTS_PER_BATCH,
  makeBatchId: () => string = defaultBatchId,
): AssembledBatch[] {
  const size = Number.isFinite(max) && max >= 1 ? Math.floor(max) : MAX_EVENTS_PER_BATCH;
  const batches: AssembledBatch[] = [];
  for (let i = 0; i < events.length; i += size) {
    batches.push({
      batchId: makeBatchId(),
      events: events.slice(i, i + size).map((event, seq) => ({ ...event, seq })),
    });
  }
  return batches;
}

/** The localStorage carryover envelope. `childId` never leaves the browser. */
export type Carryover = {
  childId: string;
  savedAt: number;
  batches: AssembledBatch[];
};

/**
 * Read the carryover blob left by a previous session.
 *
 * The stored `childId` is a routing hint and nothing else: it exists so a
 * sibling who switches profiles cannot inherit the previous child's tail. A
 * mismatch, a malformed blob or an absent key are all the same answer — null,
 * meaning "discard, there is nothing here for this reader".
 */
export function parseCarryover(raw: string | null, childId: string): AssembledBatch[] | null {
  if (!raw || !childId) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const envelope = parsed as Partial<Carryover>;
  if (envelope.childId !== childId) return null;
  if (!Array.isArray(envelope.batches)) return null;
  return envelope.batches;
}
