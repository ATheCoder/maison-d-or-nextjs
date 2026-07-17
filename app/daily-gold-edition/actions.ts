'use server';
/**
 * Server actions backing the Daily Gold Edition page.
 * These read editions from the local Postgres database via Drizzle and return
 * them in the snake_case shape the client components already expect (the same
 * shape Base44 used to return), so no consumer mapping has to change.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { db } from '@/src/db';
import {
  dailyGoldEdition,
  goodNewsItem,
  onThisDayEvent,
  remarkablePerson,
  type DailyGoldEditionRow,
  type GoodNewsItemRow,
  type OnThisDayEventRow,
  type RemarkablePersonRow,
} from '@/src/db/schema';

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
  greatest_moments: unknown[];
  generated_at: string | null;
  status: string;
};

// A remarkable_person row in the story.json shape <GoldenStory> consumes.
export type PersonRecord = ReturnType<typeof personToRecord>;

// A good_news_item row in the snake_case shape <DGGoodNews> consumes.
export type GoodNewsRecord = ReturnType<typeof goodNewsToRecord>;

function goodNewsToRecord(row: GoodNewsItemRow) {
  return {
    headline: row.headline,
    description: row.description,
    location: row.location,
    image_url: row.imageUrl,
  };
}

// An on_this_day_event row in the snake_case shape <DGOnThisDay> consumes.
// raw_text/raw_extract stay server-side: they are enrichment source material,
// not display content.
export type OnThisDayRecord = ReturnType<typeof onThisDayToRecord>;

function onThisDayToRecord(row: OnThisDayEventRow) {
  return {
    year: row.year,
    headline: row.headline,
    story: row.story,
    location: row.location,
    image_url: row.imageUrl,
    maison_rewrite_done: row.maisonRewriteDone,
  };
}

function personToRecord(row: RemarkablePersonRow) {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    field: row.field,
    country: row.country,
    birth_date: row.birthDate,
    death_date: row.deathDate,
    story_title: row.storyTitle,
    famous_quote: row.famousQuote,
    image_url: row.imageUrl,
    story_childhood_title: row.storyChildhoodTitle,
    childhood_image_url: row.childhoodImageUrl,
    story_childhood: row.storyChildhood,
    story_takeaway: row.storyTakeaway,
    modern: row.modern,
    chapters: row.chapters ?? [],
    timeline: row.timeline ?? [],
    after_treasures: row.afterTreasures,
    treasures: row.treasures ?? [],
    lessons: row.lessons ?? [],
  };
}

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

/** People born on an edition date's month-day — the Born Today gallery. */
export async function getPeopleForDate(date: string): Promise<PersonRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  const rows = await db
    .select()
    .from(remarkablePerson)
    .where(sql`to_char(${remarkablePerson.birthDate}, 'MM-DD') = ${monthDay}`)
    .orderBy(asc(remarkablePerson.name))
    .limit(10);
  return rows.map(personToRecord);
}

/** The Good News stories for a calendar day, in display order. */
export async function getGoodNewsForDate(date: string): Promise<GoodNewsRecord[]> {
  if (!date) return [];
  const rows = await db
    .select()
    .from(goodNewsItem)
    .where(eq(goodNewsItem.date, date))
    .orderBy(asc(goodNewsItem.position));
  return rows.map(goodNewsToRecord);
}

/** The historical events for an edition date's month-day — On This Day. */
export async function getOnThisDayForDate(date: string): Promise<OnThisDayRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  const rows = await db
    .select()
    .from(onThisDayEvent)
    .where(eq(onThisDayEvent.monthDay, monthDay))
    .orderBy(desc(onThisDayEvent.year), asc(onThisDayEvent.position));
  return rows.map(onThisDayToRecord);
}

// ── On This Day enrichment write-through ─────────────────────────────────────
// The Base44 enrichHistoricalEvent function is still the enrichment engine;
// this captures its results in Postgres (rescuing the generated image to R2)
// so they aren't stranded in Base44's copy of the data.

const R2_ENV = ['S3_API', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_DOMAIN'] as const;

let s3Client: S3Client | null = null;
function getS3() {
  if (!s3Client) {
    const endpointUrl = new URL(process.env.S3_API!);
    s3Client = new S3Client({
      region: 'auto',
      endpoint: endpointUrl.origin,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  const bucket = new URL(process.env.S3_API!).pathname.replace(/^\/|\/$/g, '');
  return { s3: s3Client, bucket };
}

// Download a Base44-hosted enrichment image, convert to WebP and store it at
// history-media/<MM-DD>/year-<year>.webp (the year- prefix keeps it clear of
// the backfill's position-numbered keys). Returns the R2 URL, the input
// untouched if it is already on R2, or null when the image can't be rescued.
async function rescueEnrichmentImage(srcUrl: unknown, monthDay: string, year: number): Promise<string | null> {
  if (typeof srcUrl !== 'string' || !srcUrl) return null;
  if (R2_ENV.some((v) => !process.env[v])) return null;
  const publicBase = process.env.R2_DOMAIN!.replace(/\/$/, '');
  if (srcUrl.startsWith(`${publicBase}/`)) return srcUrl;
  let host;
  try { host = new URL(srcUrl).host; } catch { return null; }
  if (host !== 'media.base44.com') return null;

  const key = `history-media/${monthDay}/year-${year}.webp`;
  const { s3, bucket } = getS3();
  try {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return `${publicBase}/${key}`; // already rescued
    } catch (err) {
      if ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw err;
    }
    const res = await fetch(srcUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const webp = await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 82 }).toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' }));
    return `${publicBase}/${key}`;
  } catch (err) {
    console.warn(`on_this_day image rescue failed for ${key}:`, err);
    return null;
  }
}

const clip = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/**
 * Persist a Base44 enrichment result for (edition date's month-day, year).
 * Server actions are open endpoints, so all inputs are validated here.
 */
export async function saveEnrichedEvent(
  date: string,
  year: number,
  data: { headline?: string; story?: string; location?: string; image_url?: string; researched?: boolean },
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return;
  if (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear()) return;
  const monthDay = date.slice(5);
  const headline = clip(data?.headline, 500);
  const story = clip(data?.story, 10000);
  const location = clip(data?.location, 200);
  if (!headline || !story) return;

  const imageUrl = await rescueEnrichmentImage(data?.image_url, monthDay, year);
  const enriched = {
    headline,
    story,
    location,
    imageUrl,
    maisonRewriteDone: true,
    researchedFromInternet: data?.researched === true,
    updatedAt: sql`now()`,
  };

  // Update the day's existing row for that year if there is one (first by
  // position, matching what the reader surfaces); otherwise append a fresh
  // row after the backfilled ones.
  const existing = await db
    .select({ id: onThisDayEvent.id })
    .from(onThisDayEvent)
    .where(and(eq(onThisDayEvent.monthDay, monthDay), eq(onThisDayEvent.year, year)))
    .orderBy(asc(onThisDayEvent.position))
    .limit(1);
  if (existing[0]) {
    await db.update(onThisDayEvent).set(enriched).where(eq(onThisDayEvent.id, existing[0].id));
  } else {
    await db.insert(onThisDayEvent).values({
      monthDay,
      year,
      position: sql`(select coalesce(max(position) + 1, 0) from on_this_day_event where month_day = ${monthDay})`,
      ...enriched,
    });
  }
}

/** A single person by slug — the Golden Story page. */
export async function getPersonBySlug(slug: string): Promise<PersonRecord | null> {
  const rows = await db
    .select()
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);
  return rows[0] ? personToRecord(rows[0]) : null;
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
