'use server';
/**
 * Server actions backing the Daily Gold Edition page.
 * These read editions from the local Postgres database via Drizzle and return
 * them in the snake_case shape the client components already expect (the same
 * shape Base44 used to return), so no consumer mapping has to change.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '@/src/db';
import { dailyGoldEdition, type DailyGoldEditionRow } from '@/src/db/schema';

export type EditionRecord = {
  id: string;
  edition_date: string;
  destination_country: string | null;
  destination_description: string | null;
  destination_image_url: string | null;
  taste_of_day: string | null;
  sound_of_day: string | null;
  nature_detail: string | null;
  tiny_phrase: string | null;
  tiny_phrase_language: string | null;
  tiny_phrase_translation: string | null;
  born_today: unknown[];
  good_news: unknown[];
  on_this_day: unknown[];
  greatest_moments: unknown[];
  generated_at: string | null;
  status: string;
};

function rowToRecord(row: DailyGoldEditionRow): EditionRecord {
  return {
    id: row.id,
    edition_date: row.editionDate,
    destination_country: row.destinationCountry,
    destination_description: row.destinationDescription,
    destination_image_url: row.destinationImageUrl,
    taste_of_day: row.tasteOfDay,
    sound_of_day: row.soundOfDay,
    nature_detail: row.natureDetail,
    tiny_phrase: row.tinyPhrase,
    tiny_phrase_language: row.tinyPhraseLanguage,
    tiny_phrase_translation: row.tinyPhraseTranslation,
    born_today: row.bornToday ?? [],
    good_news: row.goodNews ?? [],
    on_this_day: row.onThisDay ?? [],
    greatest_moments: row.greatestMoments ?? [],
    generated_at: row.generatedAt ? new Date(row.generatedAt).toISOString() : null,
    status: row.status,
  };
}

/** A single edition by its id (used by the storybook route). */
export async function getEditionById(id: string): Promise<EditionRecord | null> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.id, id))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** The most recent edition for a given date (there can be more than one). */
export async function getEditionByDate(date: string): Promise<EditionRecord | null> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.editionDate, date))
    .orderBy(desc(dailyGoldEdition.createdAt))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** The single most recent edition overall. */
export async function getLatestEdition(): Promise<EditionRecord | null> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .orderBy(desc(dailyGoldEdition.editionDate), desc(dailyGoldEdition.createdAt))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Today's edition if present, otherwise the most recent one. */
export async function getInitialEdition(today: string): Promise<EditionRecord | null> {
  return (await getEditionByDate(today)) ?? (await getLatestEdition());
}

/** Distinct edition dates, ascending — used by the day navigator. */
export async function getEditionDates(): Promise<string[]> {
  const rows = await db
    .select({ date: dailyGoldEdition.editionDate })
    .from(dailyGoldEdition)
    .orderBy(desc(dailyGoldEdition.editionDate))
    .limit(50);
  return [...new Set(rows.map((r) => r.date))].sort();
}
