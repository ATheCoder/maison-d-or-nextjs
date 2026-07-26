'use server';
/**
 * The almanac editor (Phase 6) — one month-day, in every year.
 *
 * Two content types share this screen because they share a key, but they are
 * not the same contract (R7.14):
 *
 *   On This Day     a rolling twenty-year band, several events per year,
 *                   ordered by `position`, with a flag-earning `location`.
 *                   Publish gate: `maison_rewrite_done`.
 *   Greatest Moments  a fixed 1–10 ladder over all of history, no window.
 *                   Publish gate: `published`.
 *
 * **Two unique indexes drive every ordering operation here.**
 * `(month_day, position)` is unique across the whole month-day, *not* per year —
 * so reordering one year's events permutes the positions that year already
 * holds rather than renumbering from zero, which would collide with a
 * neighbouring year. `(month_day, rank)` is unique likewise, so re-ranking
 * parks every row on a negative rank before assigning finals. Both run in one
 * transaction.
 */
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import { greatestMoment, onThisDayEvent, remarkablePerson } from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { resolveLocation } from '@/lib/countries';
import { MOMENT_RANKS, firstFreeSlot, isCandidate } from '@/lib/daily-gold/candidates';
import { getScenes } from '@/lib/daily-gold/imageStore';

const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

/**
 * The reader renders ten ranks; an eleventh would never appear.
 *
 * Since Phase 8 this bounds the *ladder* rather than the table: retrieval parks
 * its proposed moments at rank 11 and upward, so a month-day can hold fifteen
 * rows and still have free rungs (lib/daily-gold/candidates.ts).
 */
const MAX_RANKS = MOMENT_RANKS;

/**
 * The rolling band On This Day generation is scoped to (R4.3).
 *
 * It matches the reader's navigator floor exactly (`currentYear - 20` in
 * DGOnThisDay), so every year a child can step to is a year you can author.
 * The design labels this "2007–2026"; the navigator actually reaches 2006, and
 * an unreachable-but-authorable year is a worse mismatch than an extra row.
 * Coverage is reported with real years rather than a count, so no "of twenty"
 * can be wrong.
 */
function band(): { from: number; to: number } {
  const to = new Date().getUTCFullYear();
  return { from: to - 20, to };
}

// ── Reading ──────────────────────────────────────────────────────────────────

export type AlmanacEvent = {
  id: number;
  year: number;
  position: number;
  headline: string | null;
  story: string | null;
  location: string | null;
  iso2: string | null;
  image_url: string | null;
  image_scene: string | null;
  published: boolean;
  source_url: string | null;
  source_title: string | null;
  retrieved_at: string | null;
  reviewed_at: string | null;
  /** A retrieved proposal nobody has reviewed yet (D11) — review, then accept. */
  candidate: boolean;
  /** True when the story text names a date that is not this month-day. */
  dateMismatch: boolean;
};

export type AlmanacYear = {
  year: number;
  inBand: boolean;
  events: AlmanacEvent[];
};

export type AlmanacMoment = {
  id: number;
  rank: number;
  year: number;
  headline: string | null;
  story: string | null;
  image_url: string | null;
  image_scene: string | null;
  published: boolean;
  source_url: string | null;
  source_title: string | null;
  retrieved_at: string | null;
  reviewed_at: string | null;
  candidate: boolean;
};

export type BornTodayPerson = {
  slug: string;
  name: string;
  birthYear: number | null;
  published: boolean;
};

export type AlmanacDay = {
  monthDay: string;
  bandFrom: number;
  bandTo: number;
  /** Every year in the band, plus any out-of-band year that holds rows. */
  years: AlmanacYear[];
  /** The ladder: ranks 1–10, hand-written and accepted alike. */
  moments: AlmanacMoment[];
  /** Proposed moments awaiting review, parked past rank 10 (D11). */
  momentCandidates: AlmanacMoment[];
  people: BornTodayPerson[];
  /** Each image slot's stored scene, so the modal opens with its prompt ready. */
  scenes: Record<string, string>;
  /** This month-day's most recent occurrence as a real date (R4.16). */
  occurrenceDate: string;
};

const isoOf = (v: Date | string | null | undefined) => (v ? new Date(v).toISOString() : null);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Does the story text name a different day from the one it is filed under?
 *
 * Five of the thirteen rows the old import called "authored" opened with
 * "On June 6" while sitting under other month-days, so this is a real class of
 * defect rather than a hypothetical one. Best-effort and advisory only.
 */
function storyDateMismatch(story: string | null, monthDay: string): boolean {
  if (!story) return false;
  const m = story.match(/\b([A-Z][a-z]+)\s+(\d{1,2})\b/);
  if (!m) return false;
  const monthIndex = MONTHS.indexOf(m[1]);
  if (monthIndex < 0) return false;
  const found = `${String(monthIndex + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
  return found !== monthDay;
}

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The most recent occurrence of a month-day on or before today. */
function mostRecentOccurrence(monthDay: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = Number(today.slice(0, 4));
  let year = monthDay <= today.slice(5) ? thisYear : thisYear - 1;
  if (monthDay === '02-29') while (!isLeapYear(year)) year -= 1;
  return `${year}-${monthDay}`;
}

export async function getAlmanacDay(monthDay: string): Promise<AlmanacDay | null> {
  await requireAdmin();
  if (!MONTH_DAY_RE.test(monthDay ?? '')) return null;
  const [mm, dd] = monthDay.split('-').map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const { from, to } = band();

  const [events, moments, people, scenes] = await Promise.all([
    db
      .select()
      .from(onThisDayEvent)
      .where(eq(onThisDayEvent.monthDay, monthDay))
      .orderBy(asc(onThisDayEvent.year), asc(onThisDayEvent.position)),
    db
      .select()
      .from(greatestMoment)
      .where(eq(greatestMoment.monthDay, monthDay))
      .orderBy(asc(greatestMoment.rank)),
    db
      .select({
        slug: remarkablePerson.slug,
        name: remarkablePerson.name,
        birthDate: remarkablePerson.birthDate,
        published: remarkablePerson.published,
        priority: remarkablePerson.bornTodayPriority,
      })
      .from(remarkablePerson)
      .where(sql`to_char(${remarkablePerson.birthDate}, 'MM-DD') = ${monthDay}`)
      .orderBy(sql`${remarkablePerson.bornTodayPriority} desc`, asc(remarkablePerson.name)),
    getScenes({ kind: 'month_day', key: monthDay }),
  ]);

  const toEvent = (e: typeof events[number]): AlmanacEvent => {
    const provenance = { retrieved_at: isoOf(e.retrievedAt), reviewed_at: isoOf(e.reviewedAt) };
    return {
      id: e.id,
      year: e.year,
      position: e.position,
      headline: e.headline,
      story: e.story,
      location: e.location,
      iso2: e.location ? resolveLocation(e.location) : null,
      image_url: e.imageUrl,
      image_scene: e.imageScene,
      published: e.maisonRewriteDone,
      source_url: e.sourceUrl,
      source_title: e.sourceTitle,
      ...provenance,
      candidate: isCandidate(provenance),
      dateMismatch: storyDateMismatch(e.story, monthDay),
    };
  };

  const toMoment = (m: typeof moments[number]): AlmanacMoment => {
    const provenance = { retrieved_at: isoOf(m.retrievedAt), reviewed_at: isoOf(m.reviewedAt) };
    return {
      id: m.id,
      rank: m.rank,
      year: m.year,
      headline: m.headline,
      story: m.story,
      image_url: m.imageUrl,
      image_scene: m.imageScene,
      published: m.published,
      source_url: m.sourceUrl,
      source_title: m.sourceTitle,
      ...provenance,
      candidate: isCandidate(provenance),
    };
  };

  // Every band year appears, empty or not — an empty year is finished work, not
  // a gap (R4.7). Out-of-band years appear only if they hold something, so a
  // 1998 row stays visible and editable instead of silently disappearing.
  const byYear = new Map<number, AlmanacEvent[]>();
  for (const e of events) {
    const list = byYear.get(e.year) ?? [];
    list.push(toEvent(e));
    byYear.set(e.year, list);
  }

  const yearNumbers = new Set<number>(byYear.keys());
  for (let y = from; y <= to; y += 1) yearNumbers.add(y);

  const years: AlmanacYear[] = [...yearNumbers]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      inBand: year >= from && year <= to,
      events: byYear.get(year) ?? [],
    }));

  return {
    monthDay,
    bandFrom: from,
    bandTo: to,
    years,
    // The ladder is the ten rungs a family reads; a parked proposal is a
    // proposal, and mixing the two would make "6 of 10" mean nothing.
    moments: moments.map(toMoment).filter((m) => !m.candidate),
    momentCandidates: moments.map(toMoment).filter((m) => m.candidate),
    scenes,
    people: people.map((p) => ({
      slug: p.slug,
      name: p.name,
      birthYear: p.birthDate ? Number(String(p.birthDate).slice(0, 4)) : null,
      published: p.published,
    })),
    occurrenceDate: mostRecentOccurrence(monthDay),
  };
}

// ── Shared validation ────────────────────────────────────────────────────────

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

const urlOrNull = (v: unknown): string | null => {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch { return null; }
};

/**
 * A year, allowing BC as a negative (live data holds −411). Bounded well past
 * recorded history in both directions so a typo cannot store something absurd.
 */
const yearOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  if (!Number.isInteger(n) || n === 0) return null;
  return n >= -4000 && n <= new Date().getUTCFullYear() + 1 ? n : null;
};

const revalidate = (monthDay: string) => {
  revalidatePath(`/admin/daily-gold/almanac/${monthDay}`);
  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
};

// ── On This Day ──────────────────────────────────────────────────────────────

/**
 * Append an event to a year. Its position is the next free one for the whole
 * month-day — positions are unique per month-day, so they cannot restart per
 * year. Created unpublished: the publish flag is an explicit act (R4.6).
 */
export async function createEvent(monthDay: string, year: number):
  Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!MONTH_DAY_RE.test(monthDay ?? '')) return { ok: false, error: 'Bad month-day.' };
  const y = yearOrNull(year);
  if (y === null) return { ok: false, error: 'That is not a usable year.' };

  const [row] = await db
    .insert(onThisDayEvent)
    .values({
      monthDay,
      year: y,
      position: sql`(select coalesce(max(position) + 1, 0) from on_this_day_event where month_day = ${monthDay})`,
      headline: 'Untitled event',
      maisonRewriteDone: false,
    })
    .returning({ id: onThisDayEvent.id });

  revalidate(monthDay);
  return { ok: true, id: row.id };
}

export type EventPatch = Partial<Record<'headline' | 'story' | 'location' | 'image_url' | 'year', unknown>>;

export async function saveEvent(id: number, patch: EventPatch): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad event id.' };

  const set: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch ?? {}, k);
  if (has('headline')) set.headline = str(patch.headline, 500);
  if (has('story')) set.story = str(patch.story, 10000);
  if (has('location')) set.location = str(patch.location, 200);
  if (has('image_url')) set.imageUrl = urlOrNull(patch.image_url);
  if (has('year')) {
    const y = yearOrNull(patch.year);
    if (y === null) return { ok: false, error: 'That is not a usable year.' };
    set.year = y;
  }
  if (!Object.keys(set).length) return { ok: false, error: 'No recognised fields to save.' };
  set.updatedAt = new Date();

  const rows = await db
    .update(onThisDayEvent).set(set).where(eq(onThisDayEvent.id, id))
    .returning({ monthDay: onThisDayEvent.monthDay });
  if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };

  revalidate(rows[0].monthDay);
  return { ok: true };
}

/** The publish flag, per event and never per year (R4.4). */
export async function setEventPublished(id: number, published: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id) || typeof published !== 'boolean') return { ok: false, error: 'Bad request.' };

  if (published) {
    // A row with no headline or story would render as an empty card.
    const rows = await db
      .select({ headline: onThisDayEvent.headline, story: onThisDayEvent.story })
      .from(onThisDayEvent).where(eq(onThisDayEvent.id, id)).limit(1);
    if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };
    if (!rows[0].headline?.trim() || !rows[0].story?.trim()) {
      return { ok: false, error: 'An event needs a headline and a story before families can see it.' };
    }
  }

  const rows = await db
    .update(onThisDayEvent)
    // Publishing *is* the act of review, so it stamps `reviewedAt` too. Without
    // that, a retrieved event published from this toggle rather than from the
    // Accept button would go on reading as an unreviewed proposal for ever.
    .set({ maisonRewriteDone: published, ...(published ? { reviewedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(onThisDayEvent.id, id))
    .returning({ monthDay: onThisDayEvent.monthDay });
  if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };

  revalidate(rows[0].monthDay);
  return { ok: true };
}

/**
 * Delete an event. Positions are deliberately **not** renumbered: they only
 * have to order a year's list, gaps are invisible to the reader, and closing
 * them would mean rewriting rows in unrelated years.
 */
export async function deleteEvent(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad event id.' };
  const rows = await db
    .delete(onThisDayEvent).where(eq(onThisDayEvent.id, id))
    .returning({ monthDay: onThisDayEvent.monthDay });
  if (!rows[0]) return { ok: false, error: 'That event no longer exists.' };
  revalidate(rows[0].monthDay);
  return { ok: true };
}

/**
 * Reorder one year's events (R4.4).
 *
 * The positions that year already occupies are collected, sorted, and handed
 * back out in the requested order — so the year's internal order changes while
 * every other year keeps its own positions untouched. Renumbering to 0…n-1
 * would collide with neighbouring years, because the unique index spans the
 * whole month-day.
 */
export async function reorderYear(monthDay: string, year: number, ids: number[]):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!MONTH_DAY_RE.test(monthDay ?? '')) return { ok: false, error: 'Bad month-day.' };
  const y = yearOrNull(year);
  if (y === null) return { ok: false, error: 'Bad year.' };
  if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i)) || new Set(ids).size !== ids.length) {
    return { ok: false, error: 'Bad ordering.' };
  }

  const current = await db
    .select({ id: onThisDayEvent.id, position: onThisDayEvent.position })
    .from(onThisDayEvent)
    .where(and(eq(onThisDayEvent.monthDay, monthDay), eq(onThisDayEvent.year, y)));

  const known = new Set(current.map((c) => c.id));
  if (ids.length !== known.size || ids.some((i) => !known.has(i))) {
    return { ok: false, error: 'The ordering does not match that year’s events. Reload and try again.' };
  }

  const slots = current.map((c) => c.position).sort((a, b) => a - b);

  await db.transaction(async (tx) => {
    // Park on negatives first: two rows would otherwise briefly share a
    // position and trip the unique index mid-update.
    await tx
      .update(onThisDayEvent)
      .set({ position: sql`-${onThisDayEvent.position} - 1` })
      .where(inArray(onThisDayEvent.id, ids));

    for (const [index, id] of ids.entries()) {
      await tx
        .update(onThisDayEvent)
        .set({ position: slots[index], updatedAt: new Date() })
        .where(eq(onThisDayEvent.id, id));
    }
  });

  revalidate(monthDay);
  return { ok: true };
}

// ── Greatest Moments ─────────────────────────────────────────────────────────

/** Add a moment at the next free rank, 1–10 (R4.17: appended, never replacing). */
export async function createMoment(monthDay: string):
  Promise<{ ok: true; id: number; rank: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!MONTH_DAY_RE.test(monthDay ?? '')) return { ok: false, error: 'Bad month-day.' };

  const taken = await db
    .select({ rank: greatestMoment.rank })
    .from(greatestMoment)
    .where(eq(greatestMoment.monthDay, monthDay));

  const rank = firstFreeSlot(taken.map((t) => t.rank), 1, MAX_RANKS);
  if (rank === null) return { ok: false, error: `All ten ranks are filled — the reader renders no more.` };

  const [row] = await db
    .insert(greatestMoment)
    .values({
      monthDay,
      rank,
      year: new Date().getUTCFullYear(),
      headline: 'Untitled moment',
      published: false,
    })
    .returning({ id: greatestMoment.id });

  revalidate(monthDay);
  return { ok: true, id: row.id, rank };
}

export type MomentPatch = Partial<Record<'headline' | 'story' | 'image_url' | 'year', unknown>>;

export async function saveMoment(id: number, patch: MomentPatch): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad moment id.' };

  const set: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch ?? {}, k);
  if (has('headline')) set.headline = str(patch.headline, 500);
  if (has('story')) set.story = str(patch.story, 10000);
  if (has('image_url')) set.imageUrl = urlOrNull(patch.image_url);
  if (has('year')) {
    const y = yearOrNull(patch.year);
    if (y === null) return { ok: false, error: 'That is not a usable year — BC years are negative.' };
    set.year = y;
  }
  if (!Object.keys(set).length) return { ok: false, error: 'No recognised fields to save.' };
  set.updatedAt = new Date();

  const rows = await db
    .update(greatestMoment).set(set).where(eq(greatestMoment.id, id))
    .returning({ monthDay: greatestMoment.monthDay });
  if (!rows[0]) return { ok: false, error: 'That moment no longer exists.' };

  revalidate(rows[0].monthDay);
  return { ok: true };
}

export async function setMomentPublished(id: number, published: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id) || typeof published !== 'boolean') return { ok: false, error: 'Bad request.' };

  if (published) {
    const rows = await db
      .select({ headline: greatestMoment.headline, story: greatestMoment.story })
      .from(greatestMoment).where(eq(greatestMoment.id, id)).limit(1);
    if (!rows[0]) return { ok: false, error: 'That moment no longer exists.' };
    if (!rows[0].headline?.trim() || !rows[0].story?.trim()) {
      return { ok: false, error: 'A moment needs a headline and a story before families can see it.' };
    }
  }

  const rows = await db
    .update(greatestMoment)
    // Publishing is the act of review — see setEventPublished.
    .set({ published, ...(published ? { reviewedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(greatestMoment.id, id))
    .returning({ monthDay: greatestMoment.monthDay });
  if (!rows[0]) return { ok: false, error: 'That moment no longer exists.' };

  revalidate(rows[0].monthDay);
  return { ok: true };
}

/**
 * Delete a moment. Ranks are left as they are — a partial ladder renders
 * perfectly in rank order (R4.13), so closing the hole is the admin's choice
 * via a drag, not something to do behind their back.
 */
export async function deleteMoment(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad moment id.' };
  const rows = await db
    .delete(greatestMoment).where(eq(greatestMoment.id, id))
    .returning({ monthDay: greatestMoment.monthDay });
  if (!rows[0]) return { ok: false, error: 'That moment no longer exists.' };
  revalidate(rows[0].monthDay);
  return { ok: true };
}

/**
 * Re-rank the ladder (R4.12). Like the year reorder, the ranks currently
 * occupied are redistributed in the requested order, so a ladder sitting on
 * 1, 2, 5 keeps those three rungs rather than being silently compacted.
 * Transactional, because `(month_day, rank)` is unique.
 *
 * Scoped to the ten: proposals parked above them keep their parking ranks and
 * cannot be dragged into the ladder without being accepted (D11).
 */
export async function reorderMoments(monthDay: string, ids: number[]): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!MONTH_DAY_RE.test(monthDay ?? '')) return { ok: false, error: 'Bad month-day.' };
  if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i)) || new Set(ids).size !== ids.length) {
    return { ok: false, error: 'Bad ordering.' };
  }

  const current = await db
    .select({ id: greatestMoment.id, rank: greatestMoment.rank })
    .from(greatestMoment)
    .where(and(eq(greatestMoment.monthDay, monthDay), lte(greatestMoment.rank, MAX_RANKS)));

  const known = new Set(current.map((c) => c.id));
  if (ids.length !== known.size || ids.some((i) => !known.has(i))) {
    return { ok: false, error: 'The ordering does not match this day’s moments. Reload and try again.' };
  }

  const slots = current.map((c) => c.rank).sort((a, b) => a - b);

  await db.transaction(async (tx) => {
    await tx
      .update(greatestMoment)
      .set({ rank: sql`-${greatestMoment.rank}` })
      .where(inArray(greatestMoment.id, ids));

    for (const [index, id] of ids.entries()) {
      await tx
        .update(greatestMoment)
        .set({ rank: slots[index], updatedAt: new Date() })
        .where(eq(greatestMoment.id, id));
    }
  });

  revalidate(monthDay);
  return { ok: true };
}
