'use server';
/**
 * The AI verbs for Daily Gold (Phase 8) — asks, per-field rewrites, and the
 * accept/reject of retrieved candidates.
 *
 * One file for all four surfaces because the *shape* is the same everywhere and
 * the shape is the point: **propose → review → accept**, never a silent
 * overwrite. Nothing here publishes anything on its own. The one exception is
 * stated where it happens — a whole-day ask writes the freely-generated half of
 * a draft edition, which is `generateBook`'s rule and needs the same explicit
 * confirmation when the draft is not empty.
 *
 * Every action starts with `requireAdmin()` and validates its own inputs:
 * server actions are open HTTP endpoints, and these ones spend money.
 */
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { touchDesk, touchEdition, touchMonthDay } from '@/lib/daily-gold-tags';
import { db } from '@/src/db';
import {
  dailyGoldEdition, goodNewsItem, greatestMoment, onThisDayEvent,
  type GenerationJobRow,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { inngest } from '@/lib/inngest/client';
import {
  createJob, deleteJob, failJob, jobsForSubject,
  editionSubject, monthDaySubject,
} from '@/lib/golden-story/jobs';
import {
  MOMENT_RANKS, NEWS_DISPLAY_SLOTS, firstFreeSlot,
} from '@/lib/daily-gold/candidates';
import {
  askCapacity, initialAskProgress, type AskKind, type AskMode,
} from '@/lib/daily-gold/askStore';
import { resolveDgField } from '@/lib/daily-gold/write';
import { startDgBatch, type DgSubject } from '@/lib/daily-gold/imageStore';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

/** Which key shape each ask kind is addressed by. */
const ASK_SUBJECT: Record<AskKind, 'edition' | 'month_day'> = {
  day: 'edition',
  news: 'edition',
  history: 'month_day',
  moments: 'month_day',
};

function okSubject(kind: 'edition' | 'month_day', key: unknown): key is string {
  if (typeof key !== 'string') return false;
  return kind === 'edition' ? DATE_RE.test(key) : MONTH_DAY_RE.test(key);
}

const subjectOf = (s: DgSubject) =>
  (s.kind === 'edition' ? editionSubject(s.key) : monthDaySubject(s.key));

/**
 * Tell every cache what a verb in this file just wrote.
 *
 * This used to be four `revalidatePath` calls, which is the *router* cache and
 * not the layer the reader's day is stored in: accepting a candidate published
 * a story into `use cache` entries that went on serving the version without it
 * for as long as `cacheLife('max')` would hold them. `touchEdition` and
 * `touchMonthDay` fire the tags and those same paths together, which is the
 * only reason that can't happen again (lib/daily-gold-tags.ts).
 *
 * An edition subject clears its column as well as its row (`news`) and the
 * navigator (`dates`): accepting a good-news candidate publishes a story, and
 * the first published story on a date is what puts the date in front of a
 * family at all.
 */
function touchSubject(s: DgSubject) {
  if (s.kind === 'edition') touchEdition(s.key, { news: true, dates: true });
  else touchMonthDay(s.key);
}

// ── Polling ──────────────────────────────────────────────────────────────────

export type DgJobs = {
  /** The latest whole-unit ask (running, failed, or freshly done so the editor reloads once). */
  ask: GenerationJobRow | null;
  /** Every unresolved rewrite proposal — resolved ones are deleted on Accept/Reject. */
  rewrites: GenerationJobRow[];
  /** The Path-A render awaiting Accept/Revert. */
  slot: GenerationJobRow | null;
  /** The batch renderer, feeding per-slot status. */
  images: GenerationJobRow | null;
};

/** The subject's live jobs, polled by the editors while anything is running. */
export async function getDgJobs(subject: DgSubject): Promise<DgJobs> {
  await requireAdmin();
  const empty: DgJobs = { ask: null, rewrites: [], slot: null, images: null };
  if (!subject || !okSubject(subject.kind, subject.key)) return empty;

  const rows = await jobsForSubject(subjectOf(subject));
  return {
    ask: rows.find((r) => r.kind === 'ask') ?? null,
    rewrites: rows.filter((r) => r.kind === 'rewrite'),
    slot: rows.find((r) => r.kind === 'slot') ?? null,
    images: rows.find((r) => r.kind === 'images') ?? null,
  };
}

/** Delete a job row — Accept, Reject or Dismiss on a proposal, or clearing a finished ask. */
export async function dismissDgJob(jobId: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!Number.isInteger(jobId)) return { ok: false };
  await deleteJob(jobId);
  return { ok: true };
}

// ── §8.1 Per-field rewrite ───────────────────────────────────────────────────

/**
 * Draft an alternative for one field. `currentText` is the live editor value —
 * autosave may not have flushed — and it is stored with the proposal so the
 * CURRENT / AI-PROPOSES pair the admin reads stays stable while they read it.
 *
 * Applying is the editor's explicit Accept, which goes through the ordinary
 * save actions; nothing here writes to the content tables.
 */
export async function startDgRewrite(subject: DgSubject, fieldPath: string, currentText: string, context = ''):
  Promise<{ ok: true; jobId: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!subject || !okSubject(subject.kind, subject.key)) return { ok: false, error: 'Bad subject.' };
  if (typeof fieldPath !== 'string' || fieldPath.length > 60 || !resolveDgField(fieldPath)) {
    return { ok: false, error: 'That field cannot be rewritten.' };
  }
  const current = typeof currentText === 'string' ? currentText.slice(0, 5000) : '';
  if (!current.trim()) return { ok: false, error: 'There is nothing to rewrite yet — write a first version.' };

  const created = await createJob(subjectOf(subject), 'rewrite', { fieldPath });
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({
      name: 'dailygold/rewrite.requested',
      data: {
        subject, jobId: created.job.id, fieldPath, current,
        context: typeof context === 'string' ? context.slice(0, 500) : '',
      },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the rewrite.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the rewrite — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

// ── §8.2/§8.5 The asks ───────────────────────────────────────────────────────

/** What the ask panel needs before it runs: the cap, and what to say about it. */
export async function getAskCapacity(kind: AskKind, key: string):
  Promise<{ max: number; note: string | null }> {
  await requireAdmin();
  const subjectKind = ASK_SUBJECT[kind];
  if (!subjectKind || !okSubject(subjectKind, key)) return { max: 0, note: 'Bad request.' };
  return askCapacity(kind, key);
}

/** True when a day holds nothing an ask could overwrite (§8.2's auto-apply rule). */
async function editionIsEmpty(date: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, date))
    .limit(1);
  const e = rows[0];
  if (!e) return true;
  const written = [
    e.destinationCountry, e.destinationDescription, e.childLifeStory,
    e.tasteOfDay, e.soundOfDay, e.natureDetail, e.tinyPhrase, e.dailyQuote,
  ];
  return !written.some((v) => v?.trim());
}

/**
 * Start a whole-unit ask.
 *
 * `mode` is the words-only / words-and-paintings choice, taken on the ask and
 * never remembered (§8.5) — the right answer differs between "draft me five
 * moments" and "fill this one gap", so a stored preference would be wrong half
 * the time.
 *
 * A day ask onto a draft that already says something needs `confirm`, because
 * it is the one ask that overwrites live fields rather than proposing rows.
 */
export async function startDgAsk(
  kind: AskKind,
  key: string,
  mode: AskMode,
  count: number,
  opts?: { confirm?: boolean },
): Promise<{ ok: true; jobId: number } | { ok: false; error?: string; needsConfirm?: boolean }> {
  await requireAdmin();

  const subjectKind = ASK_SUBJECT[kind];
  if (!subjectKind) return { ok: false, error: 'Unknown ask.' };
  if (!okSubject(subjectKind, key)) return { ok: false, error: 'Bad subject.' };
  if (mode !== 'words' && mode !== 'words+paintings') return { ok: false, error: 'Unknown mode.' };

  const subject: DgSubject = { kind: subjectKind, key };

  // Units, clamped to what could actually be accepted (R4.17): proposing more
  // than there is room for buys results that can only ever be rejected.
  const capacity = await askCapacity(kind, key);
  if (capacity.max === 0 && kind !== 'day') {
    return { ok: false, error: capacity.note ?? 'There is nowhere to put a new one.' };
  }

  // A day ask carries no slider — its good-news stage takes whatever the column
  // has room for, and none at all when it is already full, which is a stage
  // skipped rather than a search wasted.
  const wanted = Number.isInteger(count) ? count : 0;
  const units = kind === 'day'
    ? Math.min(6, capacity.max)
    : Math.max(1, Math.min(wanted || 1, capacity.max));

  if (kind === 'day') {
    const rows = await db
      .select({ id: dailyGoldEdition.id })
      .from(dailyGoldEdition)
      .where(eq(dailyGoldEdition.editionDate, key))
      .limit(1);
    if (!rows[0]) return { ok: false, error: 'Prepare this date first — there is no edition row to write into.' };
    if (!opts?.confirm && !(await editionIsEmpty(key))) return { ok: false, needsConfirm: true };
  }

  const created = await createJob(
    subjectOf(subject),
    'ask',
    initialAskProgress({ kind, key, mode, count: units }, labelFor(kind, key, units)),
  );
  if (!created.ok) return { ok: false, error: created.error };

  try {
    await inngest.send({
      name: 'dailygold/ask.requested',
      data: { subject, jobId: created.job.id, kind, mode, count: units },
    });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the ask.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the ask — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

/** The ask stated in units, never in money (R6.5) — shown while it runs. */
function labelFor(kind: AskKind, key: string, units: number): string {
  switch (kind) {
    case 'day': return `Drafting ${key}`;
    case 'news': return `${units} good-news ${units === 1 ? 'story' : 'stories'}`;
    case 'history': return `${units} ${units === 1 ? 'event' : 'events'} for ${key}`;
    case 'moments': return `${units} ${units === 1 ? 'moment' : 'moments'} for ${key}`;
  }
}

// ── D11 Accept and reject ────────────────────────────────────────────────────

export type CandidateKind = 'news' | 'event' | 'moment';

/**
 * Publish a candidate and move it into the display band, in one transaction.
 *
 * This is a **reposition, not an update**. A candidate is parked past the band
 * while it waits (position 10+, rank 11+), so setting `published` alone would
 * leave a story ordered after the ten a family reads, or a moment on a rung the
 * ladder never renders. The ordering columns are unique, so the move has to be
 * transactional — and it has to be a move into a *free* slot, never a swap that
 * displaces something the admin wrote.
 *
 * `reviewedAt` is stamped here and nowhere else: it is the record that a human
 * looked at the claim beside its source (D10), and it is what keeps an accepted
 * item from being mistaken for an unreviewed one ever again.
 */
export async function acceptCandidate(kind: CandidateKind, id: number):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad id.' };

  if (kind === 'news') {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ date: goodNewsItem.date })
        .from(goodNewsItem).where(eq(goodNewsItem.id, id)).limit(1);
      if (!rows[0]) return 'That story no longer exists.';
      const { date } = rows[0];

      const siblings = await tx
        .select({ position: goodNewsItem.position })
        .from(goodNewsItem)
        .where(and(eq(goodNewsItem.date, date), sql`${goodNewsItem.id} <> ${id}`));
      const slot = firstFreeSlot(siblings.map((s) => s.position), 0, NEWS_DISPLAY_SLOTS);
      if (slot === null) {
        return 'The column already holds ten stories. Delete one to make room for this.';
      }

      await tx
        .update(goodNewsItem)
        .set({ position: slot, published: true, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(goodNewsItem.id, id));
      return null;
    });
    if (result) return { ok: false, error: result };
    await touchNewsFor(id);
    return { ok: true };
  }

  if (kind === 'moment') {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ monthDay: greatestMoment.monthDay })
        .from(greatestMoment).where(eq(greatestMoment.id, id)).limit(1);
      if (!rows[0]) return 'That moment no longer exists.';
      const { monthDay } = rows[0];

      const siblings = await tx
        .select({ rank: greatestMoment.rank })
        .from(greatestMoment)
        .where(and(eq(greatestMoment.monthDay, monthDay), sql`${greatestMoment.id} <> ${id}`));
      const slot = firstFreeSlot(siblings.map((s) => s.rank), 1, MOMENT_RANKS);
      if (slot === null) {
        return 'All ten rungs are taken. Delete one to make room for this.';
      }

      await tx
        .update(greatestMoment)
        .set({ rank: slot, published: true, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(greatestMoment.id, id));
      return null;
    });
    if (result) return { ok: false, error: result };
    await touchMomentFor(id);
    return { ok: true };
  }

  // An event needs no reposition: On This Day has no ceiling, and `position`
  // only orders one year's list, so accepting is publishing plus the stamp.
  const rows = await db
    .select({ monthDay: onThisDayEvent.monthDay, headline: onThisDayEvent.headline, story: onThisDayEvent.story })
    .from(onThisDayEvent).where(eq(onThisDayEvent.id, id)).limit(1);
  if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };
  if (!rows[0].headline?.trim() || !rows[0].story?.trim()) {
    return { ok: false, error: 'An event needs a headline and a story before families can see it.' };
  }
  await db
    .update(onThisDayEvent)
    .set({ maisonRewriteDone: true, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(onThisDayEvent.id, id));
  touchSubject({ kind: 'month_day', key: rows[0].monthDay });
  return { ok: true };
}

/**
 * Delete a rejected candidate.
 *
 * Good news closes the gap behind it so the column stays contiguous; the other
 * two deliberately do not, for the reason Phase 6 gave — a partial ladder
 * renders perfectly, and renumbering rows in unrelated years to tidy a hole
 * nobody can see is work with a blast radius and no benefit. In every case a
 * rejected candidate parked outside the display band leaves nothing to close.
 */
export async function rejectCandidate(kind: CandidateKind, id: number):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad id.' };

  if (kind === 'news') {
    const rows = await db
      .select({ date: goodNewsItem.date, position: goodNewsItem.position })
      .from(goodNewsItem).where(eq(goodNewsItem.id, id)).limit(1);
    if (!rows[0]) return { ok: false, error: 'That story no longer exists.' };
    const { date, position } = rows[0];

    await db.transaction(async (tx) => {
      await tx.delete(goodNewsItem).where(eq(goodNewsItem.id, id));
      // Only the display band is kept contiguous; the parking band above it is
      // arrival order and means nothing to anybody.
      if (position < NEWS_DISPLAY_SLOTS) {
        await tx
          .update(goodNewsItem)
          .set({ position: sql`${goodNewsItem.position} - 1` })
          .where(and(
            eq(goodNewsItem.date, date),
            sql`${goodNewsItem.position} > ${position}`,
            sql`${goodNewsItem.position} < ${NEWS_DISPLAY_SLOTS}`,
          ));
      }
    });
    touchSubject({ kind: 'edition', key: date });
    return { ok: true };
  }

  if (kind === 'moment') {
    const rows = await db
      .delete(greatestMoment).where(eq(greatestMoment.id, id))
      .returning({ monthDay: greatestMoment.monthDay });
    if (!rows[0]) return { ok: false, error: 'That moment no longer exists.' };
    touchSubject({ kind: 'month_day', key: rows[0].monthDay });
    return { ok: true };
  }

  const rows = await db
    .delete(onThisDayEvent).where(eq(onThisDayEvent.id, id))
    .returning({ monthDay: onThisDayEvent.monthDay });
  if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };
  touchSubject({ kind: 'month_day', key: rows[0].monthDay });
  return { ok: true };
}

/** Reject every unreviewed candidate of a kind at once — "none of these are any good". */
export async function rejectAllCandidates(kind: CandidateKind, key: string):
  Promise<{ ok: boolean; removed?: number; error?: string }> {
  await requireAdmin();

  if (kind === 'news') {
    if (!DATE_RE.test(key ?? '')) return { ok: false, error: 'Bad date.' };
    const rows = await db
      .delete(goodNewsItem)
      .where(and(
        eq(goodNewsItem.date, key),
        isNotNull(goodNewsItem.retrievedAt),
        isNull(goodNewsItem.reviewedAt),
        eq(goodNewsItem.published, false),
      ))
      .returning({ id: goodNewsItem.id });
    touchSubject({ kind: 'edition', key });
    return { ok: true, removed: rows.length };
  }

  if (!MONTH_DAY_RE.test(key ?? '')) return { ok: false, error: 'Bad month-day.' };

  if (kind === 'moment') {
    const rows = await db
      .delete(greatestMoment)
      .where(and(
        eq(greatestMoment.monthDay, key),
        isNotNull(greatestMoment.retrievedAt),
        isNull(greatestMoment.reviewedAt),
        eq(greatestMoment.published, false),
      ))
      .returning({ id: greatestMoment.id });
    touchSubject({ kind: 'month_day', key });
    return { ok: true, removed: rows.length };
  }

  const rows = await db
    .delete(onThisDayEvent)
    .where(and(
      eq(onThisDayEvent.monthDay, key),
      isNotNull(onThisDayEvent.retrievedAt),
      isNull(onThisDayEvent.reviewedAt),
      eq(onThisDayEvent.maisonRewriteDone, false),
    ))
    .returning({ id: onThisDayEvent.id });
  touchSubject({ kind: 'month_day', key });
  return { ok: true, removed: rows.length };
}

// The tags are keyed by the parent — a date or a month-day — and an accept
// holds only a row id, so these read the key back off the row.
async function touchNewsFor(id: number) {
  const rows = await db.select({ date: goodNewsItem.date }).from(goodNewsItem).where(eq(goodNewsItem.id, id)).limit(1);
  if (rows[0]) touchSubject({ kind: 'edition', key: rows[0].date });
}
async function touchMomentFor(id: number) {
  const rows = await db
    .select({ monthDay: greatestMoment.monthDay }).from(greatestMoment).where(eq(greatestMoment.id, id)).limit(1);
  if (rows[0]) touchSubject({ kind: 'month_day', key: rows[0].monthDay });
}

// ── Painting what an ask left empty ──────────────────────────────────────────

/**
 * Paint every slot on this subject that has a scene and no picture — the
 * follow-up to a words-only run, and the "generate all missing" of §8.4.
 * A slot holding accepted art is skipped unless it is asked for by name (R6.4).
 */
export async function paintMissing(subject: DgSubject): Promise<{ ok: boolean; count?: number; error?: string }> {
  await requireAdmin();
  if (!subject || !okSubject(subject.kind, subject.key)) return { ok: false, error: 'Bad subject.' };

  const keys: string[] = [];

  if (subject.kind === 'edition') {
    const [edition, news] = await Promise.all([
      db.select().from(dailyGoldEdition).where(eq(dailyGoldEdition.editionDate, subject.key)).limit(1),
      db.select().from(goodNewsItem).where(eq(goodNewsItem.date, subject.key)).orderBy(asc(goodNewsItem.position)),
    ]);
    const e = edition[0];
    if (e?.heroScene && !e.heroImageUrl) keys.push('hero');
    if (e?.destinationScene && !e.destinationImageUrl) keys.push('destination');
    if (e?.tasteScene && !e.tasteImageUrl) keys.push('sense:taste');
    if (e?.soundScene && !e.soundImageUrl) keys.push('sense:sound');
    if (e?.natureScene && !e.natureImageUrl) keys.push('sense:nature');
    if (e?.phraseScene && !e.phraseImageUrl) keys.push('sense:phrase');
    for (const n of news) if (n.imageScene && !n.imageUrl) keys.push(`news:${n.position}`);
  } else {
    const [events, moments] = await Promise.all([
      db.select().from(onThisDayEvent).where(eq(onThisDayEvent.monthDay, subject.key)),
      db.select().from(greatestMoment).where(eq(greatestMoment.monthDay, subject.key)),
    ]);
    for (const ev of events) if (ev.imageScene && !ev.imageUrl) keys.push(`history:${ev.year}:${ev.position}`);
    for (const m of moments) if (m.imageScene && !m.imageUrl) keys.push(`moment:${m.rank}`);
  }

  if (!keys.length) {
    return { ok: false, error: 'Nothing to paint — every slot with a scene already has a painting.' };
  }

  const res = await startDgBatch(subject, keys);
  if (!res.ok) return { ok: false, error: res.error };
  // Job rows only: the paintings are written by the Inngest run, which fires
  // its own tags when they land (renderDailyGoldImages).
  touchDesk(subject.kind === 'edition'
    ? `/admin/daily-gold/${subject.key}`
    : `/admin/daily-gold/almanac/${subject.key}`);
  return { ok: true, count: res.count };
}
