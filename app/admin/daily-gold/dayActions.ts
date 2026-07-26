'use server';
/**
 * The day editor (Phase 5) — one calendar date: its edition row and its
 * good-news column. No AI here; every field is written by hand.
 *
 * Publishing model (D4): **nothing on this date is visible to a family until
 * the day is published.** A hand-written good-news item is created unpublished,
 * and `setEditionStatus(date, 'ready')` publishes the edition *and* its column
 * in one transaction. Otherwise a published item under a draft edition would
 * put the date in the reader's navigator (getAvailableDates unions both), which
 * is exactly the leak R7.2 closes. An individual item can still be held back
 * afterwards with `setNewsPublished`.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import {
  dailyGoldEdition,
  goodNewsItem,
  greatestMoment,
  onThisDayEvent,
  remarkablePerson,
  type DailyGoldEditionRow,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { resolveLocation } from '@/lib/countries';
import { isContinent } from '@/lib/daily-gold/edition';
import { NEWS_DISPLAY_SLOTS, firstFreeSlot, isCandidate } from '@/lib/daily-gold/candidates';
import { getScenes } from '@/lib/daily-gold/imageStore';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The ten the reader renders; anything past this never appears (R3.7).
 *
 * Since Phase 8 this bounds the *column* rather than the table: retrieval parks
 * its candidates at position 10 and upward (lib/daily-gold/candidates.ts), so a
 * date can hold twenty rows and still have free places in the ten.
 */
const MAX_NEWS = NEWS_DISPLAY_SLOTS;

// ── Reading ──────────────────────────────────────────────────────────────────

export type EditorEdition = {
  id: string;
  status: DailyGoldEditionRow['status'];
  hero_image_url: string | null;
  destination_country: string | null;
  continent: string | null;
  destination_description: string | null;
  destination_image_url: string | null;
  child_life_story: string | null;
  taste_of_day: string | null;
  sound_of_day: string | null;
  nature_detail: string | null;
  tiny_phrase: string | null;
  tiny_phrase_language: string | null;
  tiny_phrase_translation: string | null;
  daily_quote: string | null;
  daily_quote_author: string | null;
  generated_at: string | null;
  updated_at: string | null;
};

export type EditorNewsItem = {
  id: number;
  position: number;
  headline: string;
  description: string | null;
  location: string | null;
  iso2: string | null;
  image_url: string | null;
  image_scene: string | null;
  published: boolean;
  source_url: string | null;
  source_title: string | null;
  source_published_at: string | null;
  retrieved_at: string | null;
  reviewed_at: string | null;
  /**
   * A retrieved proposal nobody has reviewed yet (D11). It sits outside the
   * ten, so it is not part of the column until it is accepted — the editor
   * lists these separately, claim beside source (R3.19).
   */
  candidate: boolean;
  /**
   * The source's publication date is more than a week from the edition date —
   * a 2019 feel-good piece presented as today's news, which R3.20 calls this
   * content type's most likely failure.
   */
  stale: boolean;
};

/** The month-day rail: recurring content a family sees on this date (R4.15). */
export type RecurringCounts = {
  monthDay: string;
  historyYears: number;
  momentsFilled: number;
  peopleCount: number;
};

export type DayForEditor = {
  date: string;
  /** null when the date has no edition row — "prepared" has not happened yet. */
  edition: EditorEdition | null;
  /** More than one row means the reader silently picks; the desk resolves it. */
  editionCount: number;
  /** The column, in position order — hand-written and accepted items only. */
  news: EditorNewsItem[];
  /** Retrieved proposals awaiting review, parked outside the ten (D11). */
  candidates: EditorNewsItem[];
  /** Each image slot's stored scene, so the modal opens with its prompt ready. */
  scenes: Record<string, string>;
  recurring: RecurringCounts;
  prevDate: string;
  nextDate: string;
};

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const iso = (v: Date | string | null | undefined) =>
  v ? new Date(v).toISOString() : null;

export async function getDayForEditor(date: string): Promise<DayForEditor | null> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return null;
  const monthDay = date.slice(5);

  const [editions, news, history, moments, people, scenes] = await Promise.all([
    db
      .select()
      .from(dailyGoldEdition)
      .where(eq(dailyGoldEdition.editionDate, date))
      // Same ordering as the reader, id breaking the createdAt tie, so the row
      // edited here is the row a family sees.
      .orderBy(sql`${dailyGoldEdition.createdAt} desc, ${dailyGoldEdition.id} desc`),
    db.select().from(goodNewsItem).where(eq(goodNewsItem.date, date)).orderBy(asc(goodNewsItem.position)),
    db
      .select({ years: sql<number>`count(distinct ${onThisDayEvent.year})::int` })
      .from(onThisDayEvent)
      .where(and(eq(onThisDayEvent.monthDay, monthDay), eq(onThisDayEvent.maisonRewriteDone, true))),
    db
      .select({ filled: sql<number>`count(*)::int` })
      .from(greatestMoment)
      .where(and(eq(greatestMoment.monthDay, monthDay), eq(greatestMoment.published, true))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(remarkablePerson)
      .where(and(
        eq(remarkablePerson.published, true),
        sql`to_char(${remarkablePerson.birthDate}, 'MM-DD') = ${monthDay}`,
      )),
    getScenes({ kind: 'edition', key: date }),
  ]);

  const row = editions[0];

  // A week either side of the edition — the same window retrieval searches in,
  // so a candidate flagged stale here is one the search should not have kept.
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const editionTime = Date.parse(`${date}T00:00:00Z`);

  const toItem = (n: typeof news[number]): EditorNewsItem => {
    const item = {
      id: n.id,
      position: n.position,
      headline: n.headline,
      description: n.description,
      location: n.location,
      iso2: n.location ? resolveLocation(n.location) : null,
      image_url: n.imageUrl,
      image_scene: n.imageScene,
      published: n.published,
      source_url: n.sourceUrl,
      source_title: n.sourceTitle,
      source_published_at: iso(n.sourcePublishedAt),
      retrieved_at: iso(n.retrievedAt),
      reviewed_at: iso(n.reviewedAt),
    };
    return {
      ...item,
      candidate: isCandidate(item),
      stale: Boolean(n.sourcePublishedAt)
        && Math.abs(new Date(n.sourcePublishedAt!).getTime() - editionTime) > WEEK,
    };
  };

  const allNews = news.map(toItem);

  return {
    date,
    editionCount: editions.length,
    edition: row ? {
      id: row.id,
      status: row.status,
      hero_image_url: row.heroImageUrl,
      destination_country: row.destinationCountry,
      continent: row.continent,
      destination_description: row.destinationDescription,
      destination_image_url: row.destinationImageUrl,
      child_life_story: row.childLifeStory,
      taste_of_day: row.tasteOfDay,
      sound_of_day: row.soundOfDay,
      nature_detail: row.natureDetail,
      tiny_phrase: row.tinyPhrase,
      tiny_phrase_language: row.tinyPhraseLanguage,
      tiny_phrase_translation: row.tinyPhraseTranslation,
      daily_quote: row.dailyQuote,
      daily_quote_author: row.dailyQuoteAuthor,
      generated_at: iso(row.generatedAt),
      updated_at: iso(row.updatedAt),
    } : null,
    news: allNews.filter((n) => !n.candidate),
    candidates: allNews.filter((n) => n.candidate),
    scenes,
    recurring: {
      monthDay,
      historyYears: history[0]?.years ?? 0,
      momentsFilled: moments[0]?.filled ?? 0,
      peopleCount: people[0]?.n ?? 0,
    },
    prevDate: addDays(date, -1),
    nextDate: addDays(date, 1),
  };
}

// ── Writing the edition ──────────────────────────────────────────────────────

/** Trim to null, clamped. Server actions are open endpoints — nothing is trusted. */
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

const url = (v: unknown): string | null => {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
};

export type EditionPatch = Partial<Record<
  | 'hero_image_url' | 'destination_country' | 'continent' | 'destination_description'
  | 'destination_image_url' | 'child_life_story' | 'taste_of_day' | 'sound_of_day'
  | 'nature_detail' | 'tiny_phrase' | 'tiny_phrase_language' | 'tiny_phrase_translation'
  | 'daily_quote' | 'daily_quote_author', unknown>>;

/**
 * Save a partial edition. Only the keys present in `patch` are written, so an
 * autosave of one field can never blank another by omission.
 */
export async function saveEdition(date: string, patch: EditionPatch):
  Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };
  if (!patch || typeof patch !== 'object') return { ok: false, error: 'Nothing to save.' };

  const set: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);

  if (has('hero_image_url')) set.heroImageUrl = url(patch.hero_image_url);
  if (has('destination_image_url')) set.destinationImageUrl = url(patch.destination_image_url);
  if (has('destination_country')) set.destinationCountry = str(patch.destination_country, 200);
  if (has('continent')) {
    const c = str(patch.continent, 40);
    set.continent = isContinent(c) ? c : null;
  }
  if (has('destination_description')) set.destinationDescription = str(patch.destination_description, 5000);
  if (has('child_life_story')) set.childLifeStory = str(patch.child_life_story, 10000);
  // Short, ~4–8 words each; the reader renders them in a small card.
  if (has('taste_of_day')) set.tasteOfDay = str(patch.taste_of_day, 200);
  if (has('sound_of_day')) set.soundOfDay = str(patch.sound_of_day, 200);
  if (has('nature_detail')) set.natureDetail = str(patch.nature_detail, 200);
  if (has('tiny_phrase')) set.tinyPhrase = str(patch.tiny_phrase, 200);
  if (has('tiny_phrase_language')) set.tinyPhraseLanguage = str(patch.tiny_phrase_language, 100);
  if (has('tiny_phrase_translation')) set.tinyPhraseTranslation = str(patch.tiny_phrase_translation, 300);
  if (has('daily_quote')) set.dailyQuote = str(patch.daily_quote, 1000);
  if (has('daily_quote_author')) set.dailyQuoteAuthor = str(patch.daily_quote_author, 200);

  if (!Object.keys(set).length) return { ok: false, error: 'No recognised fields to save.' };

  const updatedAt = new Date();
  set.updatedAt = updatedAt;

  const done = await db
    .update(dailyGoldEdition)
    .set(set)
    .where(eq(dailyGoldEdition.editionDate, date))
    .returning({ id: dailyGoldEdition.id });

  if (!done.length) return { ok: false, error: 'This date has no edition row yet.' };

  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true, updatedAt: updatedAt.toISOString() };
}

/**
 * Publish or unpublish the day. Publishing takes the good-news column with it,
 * so "published" means one thing on this screen; unpublishing withdraws it
 * again. One transaction — a half-published day is the state this avoids.
 *
 * **Unreviewed candidates are exempt.** Publishing the day must not publish a
 * retrieved claim nobody has read beside its source — that is the whole of D10.
 * The test is `retrieved_at IS NOT NULL AND reviewed_at IS NULL`, so an
 * *accepted* candidate (reviewed, stamped) publishes and withdraws with
 * everything else, however many times the day is toggled.
 */
export async function setEditionStatus(date: string, status: 'draft' | 'ready'):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };
  if (status !== 'draft' && status !== 'ready') return { ok: false, error: 'Unknown status.' };

  const result = await db.transaction(async (tx) => {
    const done = await tx
      .update(dailyGoldEdition)
      .set({ status, updatedAt: new Date() })
      .where(eq(dailyGoldEdition.editionDate, date))
      .returning({ id: dailyGoldEdition.id });
    if (!done.length) return false;

    await tx
      .update(goodNewsItem)
      .set({ published: status === 'ready', updatedAt: new Date() })
      .where(and(
        eq(goodNewsItem.date, date),
        sql`(${goodNewsItem.retrievedAt} is null or ${goodNewsItem.reviewedAt} is not null)`,
      ));
    return true;
  });

  if (!result) return { ok: false, error: 'This date has no edition row yet.' };
  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

// ── Good news ────────────────────────────────────────────────────────────────

/**
 * Append an empty item at the next free place in the column. Created
 * unpublished: the column becomes visible when the day is published, not when a
 * row appears.
 *
 * The ceiling counts the *display band*, not the table (D11) — a date holding
 * eight proposals still has ten places to write into by hand.
 */
export async function createNewsItem(date: string):
  Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };

  const existing = await db
    .select({ position: goodNewsItem.position })
    .from(goodNewsItem)
    .where(eq(goodNewsItem.date, date));
  const position = firstFreeSlot(existing.map((e) => e.position), 0, MAX_NEWS);
  if (position === null) {
    return { ok: false, error: `The reader renders ten stories — an eleventh would never appear.` };
  }

  const [row] = await db
    .insert(goodNewsItem)
    .values({
      date,
      position,
      headline: 'Untitled story',
      published: false,
    })
    .returning({ id: goodNewsItem.id });

  revalidatePath('/admin/daily-gold');
  return { ok: true, id: row.id };
}

export type NewsPatch = Partial<Record<'headline' | 'description' | 'location' | 'image_url', unknown>>;

export async function saveNewsItem(id: number, patch: NewsPatch):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad item id.' };

  const set: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch ?? {}, k);
  // headline is notNull in the schema, so an empty one falls back rather than
  // failing the write under the admin's fingers.
  if (has('headline')) set.headline = str(patch.headline, 500) ?? 'Untitled story';
  if (has('description')) set.description = str(patch.description, 5000);
  if (has('location')) set.location = str(patch.location, 200);
  if (has('image_url')) set.imageUrl = url(patch.image_url);
  if (!Object.keys(set).length) return { ok: false, error: 'No recognised fields to save.' };

  set.updatedAt = new Date();
  const done = await db.update(goodNewsItem).set(set).where(eq(goodNewsItem.id, id)).returning({ id: goodNewsItem.id });
  if (!done.length) return { ok: false, error: 'That story no longer exists.' };

  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

/** Hold one story back from a published day, or restore it. */
export async function setNewsPublished(id: number, published: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id) || typeof published !== 'boolean') return { ok: false, error: 'Bad request.' };
  const done = await db
    .update(goodNewsItem)
    // Showing a story to families is the act of review, so it stamps
    // `reviewedAt` — otherwise a retrieved item published from this button
    // rather than from Accept would go on reading as an unreviewed proposal.
    .set({ published, ...(published ? { reviewedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(goodNewsItem.id, id))
    .returning({ id: goodNewsItem.id });
  if (!done.length) return { ok: false, error: 'That story no longer exists.' };
  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

/** Delete a story and close the gap it leaves, so positions stay contiguous. */
export async function deleteNewsItem(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: 'Bad item id.' };

  const rows = await db
    .select({ date: goodNewsItem.date, position: goodNewsItem.position })
    .from(goodNewsItem)
    .where(eq(goodNewsItem.id, id))
    .limit(1);
  if (!rows[0]) return { ok: false, error: 'That story no longer exists.' };
  const { date, position } = rows[0];

  await db.transaction(async (tx) => {
    await tx.delete(goodNewsItem).where(eq(goodNewsItem.id, id));
    // Everything after it, *within the column*, shuffles down one. Safe as a
    // single statement: the deleted row's position is now free, so no pair ever
    // collides. Bounded at the display band because shifting a parked candidate
    // from 10 down to 9 would silently promote it into the ten (D11).
    await tx
      .update(goodNewsItem)
      .set({ position: sql`${goodNewsItem.position} - 1` })
      .where(and(
        eq(goodNewsItem.date, date),
        sql`${goodNewsItem.position} > ${position}`,
        sql`${goodNewsItem.position} < ${MAX_NEWS}`,
      ));
  });

  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

/**
 * Write contiguous 0-based positions in the given order (R3.4).
 *
 * `(date, position)` is unique, so a naive sequential update collides the
 * moment two rows want the same slot mid-flight. Every row is parked on a
 * negative position first — a range the index shares with nothing — and then
 * brought back to its final value. One transaction, so no reader and no
 * concurrent write ever observes the negative half.
 *
 * Scoped to the column: unreviewed candidates keep their parking positions and
 * are neither reordered nor renumbered into the ten (D11).
 */
export async function reorderNews(date: string, ids: number[]): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };
  if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i))) {
    return { ok: false, error: 'Bad ordering.' };
  }
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'Duplicate items in the ordering.' };

  const current = await db
    .select({ id: goodNewsItem.id, position: goodNewsItem.position })
    .from(goodNewsItem)
    .where(and(eq(goodNewsItem.date, date), sql`${goodNewsItem.position} < ${MAX_NEWS}`));
  const known = new Set(current.map((c) => c.id));

  // The ordering must name exactly this date's column — no more, no fewer, or
  // the result would not be contiguous.
  if (ids.length !== known.size || ids.some((i) => !known.has(i))) {
    return { ok: false, error: 'The ordering does not match this date’s stories. Reload and try again.' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(goodNewsItem)
      .set({ position: sql`-${goodNewsItem.position} - 1` })
      .where(inArray(goodNewsItem.id, ids));

    for (const [index, id] of ids.entries()) {
      await tx
        .update(goodNewsItem)
        .set({ position: index, updatedAt: new Date() })
        .where(and(eq(goodNewsItem.id, id), eq(goodNewsItem.date, date)));
    }
  });

  revalidatePath('/admin/daily-gold');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

// ── Preflight ────────────────────────────────────────────────────────────────

export type PreflightItem = {
  key: string;
  level: 'ready' | 'gap' | 'substitute';
  label: string;
};

export type Preflight = {
  date: string;
  status: DailyGoldEditionRow['status'] | null;
  items: PreflightItem[];
  /** Recurring content is a separate job in the almanac — stated, not blocking. */
  recurringNote: string | null;
};

/**
 * What a family will and will not see (R3.10). **Nothing here blocks
 * publishing** — absence is a designed state (§2.2), so these are statements of
 * consequence, not errors to clear.
 */
export async function getPreflight(date: string): Promise<Preflight | null> {
  await requireAdmin();
  const day = await getDayForEditor(date);
  if (!day) return null;

  const e = day.edition;
  const items: PreflightItem[] = [];

  const iso2 = e?.destination_country ? resolveLocation(e.destination_country) : null;
  if (e?.destination_country) {
    items.push(iso2
      ? { key: 'destination', level: 'ready', label: `Destination “${e.destination_country}” — earns the ${iso2} seal` }
      : { key: 'destination', level: 'gap', label: `“${e.destination_country}” resolves to no country — no flag seal is awarded` });
  } else {
    items.push({ key: 'destination', level: 'gap', label: 'No destination — the whole destination card is absent' });
  }

  const sensory = [e?.taste_of_day, e?.sound_of_day, e?.nature_detail];
  const filled = sensory.filter(Boolean).length;
  if (filled === 3) items.push({ key: 'sensory', level: 'ready', label: 'All three sensory cards are filled' });
  else if (filled === 0) items.push({ key: 'sensory', level: 'gap', label: 'All three sensory cards are empty — three em-dashes render' });
  else items.push({ key: 'sensory', level: 'gap', label: `${3 - filled} sensory card${3 - filled === 1 ? '' : 's'} empty — the card shows an em-dash` });

  if (!e?.hero_image_url) {
    items.push(e?.destination_image_url
      ? { key: 'hero', level: 'substitute', label: 'No masthead painting — the destination one will stand in' }
      : { key: 'hero', level: 'gap', label: 'No masthead painting and no destination painting to borrow' });
  } else {
    items.push({ key: 'hero', level: 'ready', label: 'Masthead painting set' });
  }

  const lead = day.news.find((n) => n.position === 0);
  if (!day.news.length) {
    items.push({ key: 'news', level: 'gap', label: 'No good news — the column is absent' });
  } else if (lead && !lead.image_url) {
    items.push({ key: 'news', level: 'gap', label: `${day.news.length} stories, but the lead has no image — it gets the large card` });
  } else {
    items.push({ key: 'news', level: 'ready', label: `${day.news.length} good-news ${day.news.length === 1 ? 'story' : 'stories'}` });
  }

  if (e?.daily_quote && !e.daily_quote_author) {
    items.push({ key: 'quote', level: 'gap', label: 'A quote with no attribution' });
  } else if (!e?.daily_quote) {
    items.push({ key: 'quote', level: 'ready', label: 'No quote — the curated rotation shows instead' });
  } else {
    items.push({ key: 'quote', level: 'ready', label: `Quote attributed to ${e.daily_quote_author}` });
  }

  const { historyYears, momentsFilled } = day.recurring;
  const missing: string[] = [];
  if (historyYears === 0) missing.push('On This Day');
  if (momentsFilled === 0) missing.push('Greatest Moments');

  return {
    date,
    status: e?.status ?? null,
    items,
    recurringNote: missing.length
      ? `${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} still empty for this month-day. `
        + 'That is recurring content, so filling it is a separate job in the almanac — a family will see '
        + `${missing.length === 1 ? 'that column' : 'those columns'} absent today.`
      : null,
  };
}

/** Create the missing edition row for a date reached directly by URL. */
export async function prepareThisDate(date: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!DATE_RE.test(date ?? '')) return { ok: false, error: 'That is not a valid date.' };
  const existing = await db
    .select({ id: dailyGoldEdition.id })
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, date))
    .limit(1);
  if (existing[0]) return { ok: true };

  await db
    .insert(dailyGoldEdition)
    .values({ id: `dg-${date}`, editionDate: date, status: 'draft' })
    .onConflictDoNothing();
  revalidatePath('/admin/daily-gold');
  return { ok: true };
}
