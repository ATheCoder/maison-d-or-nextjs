'use server';

/**
 * Treasury save toggle + read actions (replaces the Base44 SavedItem entity,
 * docs/auth-plan.md §3).
 *
 * The child is always resolved from the session via lib/dal.ts — no function
 * here accepts a child id, family id, or email, which is what closes the
 * legacy IDOR (the old heart posted a client-supplied child_id) by
 * construction rather than by validation. Unlike a flag earn, a save is a
 * deliberate act: every failure comes back as a status the heart can show,
 * and nothing here ever throws to the client.
 */
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db';
import {
  dailyGoldEdition,
  goodNewsItem,
  greatestMoment,
  onThisDayEvent,
  savedItem,
  type SavedItemRow,
} from '@/src/db/schema';
import { getActiveChild } from '@/lib/dal';
import { normaliseSaveInput, type SaveInput } from '@/lib/saved-item-input';

export type ToggleSaveResult =
  | { status: 'saved' }
  | { status: 'unsaved' }
  | { status: 'error'; reason: 'no_child' | 'invalid_input' | 'db_error' };

export async function toggleSavedItem(input: SaveInput): Promise<ToggleSaveResult> {
  // Non-redirecting: a heart tap outside child mode is an error to render,
  // not a navigation.
  const child = await getActiveChild();
  if (!child) return { status: 'error', reason: 'no_child' };

  const save = normaliseSaveInput(input);
  if (!save.ok) {
    console.warn(`treasury: rejected save (${save.reason})`, { itemType: input?.itemType });
    return { status: 'error', reason: 'invalid_input' };
  }
  const { value } = save;

  try {
    // Delete-first toggle. Each statement is atomic on its own, so no
    // transaction: the unique index is what keeps the pair consistent, and
    // concurrent double-taps are last-writer-wins by design (whichever
    // statement lands second decides the final state, which is also what the
    // child's last tap said).
    const deleted = await db
      .delete(savedItem)
      .where(and(
        eq(savedItem.childId, child.id),
        eq(savedItem.itemType, value.itemType),
        eq(savedItem.itemId, value.itemId),
      ))
      .returning({ id: savedItem.id });

    if (deleted.length > 0) return { status: 'unsaved' };

    await db
      .insert(savedItem)
      .values({ id: randomUUID(), childId: child.id, ...value })
      .onConflictDoNothing({
        target: [savedItem.childId, savedItem.itemType, savedItem.itemId],
      });

    // 'saved' whether or not the insert produced a row: an empty result means
    // a concurrent tap inserted first, so the row exists either way.
    return { status: 'saved' };
  } catch (error) {
    console.error('treasury: toggle failed', error);
    return { status: 'error', reason: 'db_error' };
  }
}

/** What the treasury renders — no child_id, no row id. */
export type SavedItemRecord = ReturnType<typeof savedToRecord>;

function savedToRecord(row: SavedItemRow) {
  return {
    item_type: row.itemType,
    item_id: row.itemId,
    item_title: row.itemTitle,
    item_subtitle: row.itemSubtitle,
    item_image_url: row.itemImageUrl,
    country_code: row.countryCode,
    country_name: row.countryName,
    edition_date: row.editionDate,
    saved_at: row.savedAt,
  };
}

/** The child's saves, newest first. Empty outside child mode. */
export async function getSavedItems(): Promise<SavedItemRecord[]> {
  const child = await getActiveChild();
  if (!child) return [];

  const rows = await db
    .select()
    .from(savedItem)
    .where(eq(savedItem.childId, child.id))
    .orderBy(desc(savedItem.savedAt));

  return rows.map(savedToRecord);
}

/**
 * The full story behind a treasure, fetched when its card is opened in the
 * Treasury's modal. The saved row is only a snapshot (title, subtitle, image);
 * the body text lives in the source tables, so the modal looks it up on
 * demand — through the same publish gates the reader uses, which means an
 * unpublished or deleted source comes back `null` and the modal falls back to
 * the snapshot instead of leaking a draft.
 *
 * taste/sound/nature return `null` by design: their snapshot already holds
 * everything there is (the title *is* the content). A phrase's translation
 * is returned only while the edition still carries the phrase that was saved —
 * an admin edit would otherwise caption the child's phrase with another
 * phrase's translation.
 */
export type SavedItemDetail =
  | { kind: 'news'; headline: string; description: string | null; location: string | null; image_url: string | null }
  | { kind: 'moment'; year: number; headline: string | null; story: string | null; location: string | null; image_url: string | null; rank: number | null }
  | { kind: 'destination'; name: string | null; continent: string | null; atmosphere: string | null; story: string | null; image_url: string | null }
  | { kind: 'phrase'; language: string | null; translation: string | null }
  | null;

const isoDateShape = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The reader's edition rule (getEditionByDate in the edition actions): newest
 * 'ready' row for the date, id breaking createdAt ties.
 */
async function publishedEditionFor(editionDate: string) {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(and(
      eq(dailyGoldEdition.editionDate, editionDate),
      eq(dailyGoldEdition.status, 'ready'),
    ))
    .orderBy(desc(dailyGoldEdition.createdAt), desc(dailyGoldEdition.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSavedItemDetail(input: {
  itemType: string;
  itemId: string;
  editionDate: string | null;
}): Promise<SavedItemDetail> {
  const child = await getActiveChild();
  if (!child) return null;

  const itemType = typeof input?.itemType === 'string' ? input.itemType : '';
  const itemId = typeof input?.itemId === 'string' ? input.itemId : '';
  const editionDate =
    typeof input?.editionDate === 'string' && isoDateShape.test(input.editionDate)
      ? input.editionDate
      : null;

  try {
    if (itemType === 'news') {
      const id = Number(itemId);
      if (!Number.isInteger(id)) return null;
      const rows = await db
        .select()
        .from(goodNewsItem)
        .where(and(eq(goodNewsItem.id, id), eq(goodNewsItem.published, true)))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { kind: 'news', headline: row.headline, description: row.description, location: row.location, image_url: row.imageUrl };
    }

    if (itemType === 'on_this_day') {
      const id = Number(itemId);
      if (!Number.isInteger(id)) return null;
      const rows = await db
        .select()
        .from(onThisDayEvent)
        .where(and(eq(onThisDayEvent.id, id), eq(onThisDayEvent.maisonRewriteDone, true)))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { kind: 'moment', year: row.year, headline: row.headline, story: row.story, location: row.location, image_url: row.imageUrl, rank: null };
    }

    if (itemType === 'greatest_moment') {
      const id = Number(itemId);
      if (!Number.isInteger(id)) return null;
      const rows = await db
        .select()
        .from(greatestMoment)
        .where(and(eq(greatestMoment.id, id), eq(greatestMoment.published, true)))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { kind: 'moment', year: row.year, headline: row.headline, story: row.story, location: null, image_url: row.imageUrl, rank: row.rank };
    }

    if (itemType === 'destination') {
      if (!editionDate) return null;
      const row = await publishedEditionFor(editionDate);
      if (!row) return null;
      return {
        kind: 'destination',
        name: row.destinationCountry,
        continent: row.continent,
        atmosphere: row.destinationDescription,
        story: row.childLifeStory,
        image_url: row.destinationImageUrl,
      };
    }

    if (itemType === 'phrase') {
      if (!editionDate) return null;
      const row = await publishedEditionFor(editionDate);
      if (!row || row.tinyPhrase !== itemId) return null;
      return { kind: 'phrase', language: row.tinyPhraseLanguage, translation: row.tinyPhraseTranslation };
    }

    // taste / sound / nature / person: nothing beyond the snapshot to fetch.
    return null;
  } catch (error) {
    console.error('treasury: detail lookup failed', error);
    return null;
  }
}

/**
 * The `type:id` keys a page feeds its hearts, so no heart fetches its own
 * state on mount. `null` — not `[]` — outside child mode, so sections can
 * tell "nothing saved" from "no one to save for" and render no hearts at all.
 */
export async function getSavedKeys(): Promise<string[] | null> {
  const child = await getActiveChild();
  if (!child) return null;

  const rows = await db
    .select({ itemType: savedItem.itemType, itemId: savedItem.itemId })
    .from(savedItem)
    .where(eq(savedItem.childId, child.id));

  return rows.map((row) => `${row.itemType}:${row.itemId}`);
}
