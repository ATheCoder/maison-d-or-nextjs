'use server';
/**
 * Server actions backing the Daily Gold Edition page.
 * These read editions from the local Postgres database via Drizzle and return
 * them in the snake_case shape the client components already expect (the same
 * shape Base44 used to return), so no consumer mapping has to change.
 */
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/src/db';
import {
  dailyGoldEdition,
  goodNewsItem,
  greatestMoment,
  onThisDayEvent,
  remarkablePerson,
  type DailyGoldEditionRow,
  type GoodNewsItemRow,
  type GreatestMomentRow,
  type OnThisDayEventRow,
  type RemarkablePersonRow,
} from '@/src/db/schema';

export type EditionRecord = {
  id: string;
  edition_date: string;
  hero_image_url: string | null;
  destination_country: string | null;
  destination_description: string | null;
  destination_image_url: string | null;
  continent: string | null;
  // The shape the destination modal reads (dest.child_life?.story); the column
  // behind it is a plain text paragraph.
  child_life: { story: string } | null;
  taste_of_day: string | null;
  sound_of_day: string | null;
  nature_detail: string | null;
  tiny_phrase: string | null;
  tiny_phrase_language: string | null;
  tiny_phrase_translation: string | null;
  daily_quote: string | null;
  daily_quote_author: string | null;
  generated_at: string | null;
  status: string;
};

// A remarkable_person row in the story.json shape <GoldenStory> consumes.
export type PersonRecord = ReturnType<typeof personToRecord>;

// A good_news_item row in the snake_case shape <DGGoodNews> consumes.
export type GoodNewsRecord = ReturnType<typeof goodNewsToRecord>;

function goodNewsToRecord(row: GoodNewsItemRow) {
  return {
    // The stable key a treasury heart saves under — (date, position) moves
    // whenever an admin reorders the day.
    id: row.id,
    headline: row.headline,
    description: row.description,
    location: row.location,
    image_url: row.imageUrl,
  };
}

// An on_this_day_event row in the snake_case shape <DGOnThisDay> consumes.
// `position` is part of the record because a year holds a list, not a slot —
// the reader renders every event a year has, in this order.
export type OnThisDayRecord = ReturnType<typeof onThisDayToRecord>;

function onThisDayToRecord(row: OnThisDayEventRow) {
  return {
    id: row.id,
    year: row.year,
    position: row.position,
    headline: row.headline,
    story: row.story,
    location: row.location,
    image_url: row.imageUrl,
  };
}

function personToRecord(row: RemarkablePersonRow) {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    field: row.field,
    country: row.country,
    // char(2) never pads a two-letter value, but trimming keeps a legacy
    // one-letter row from reaching the flag resolver as 'F '.
    country_code: row.countryCode?.trim().toUpperCase() || null,
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
    hero_image_url: row.heroImageUrl,
    destination_country: row.destinationCountry,
    destination_description: row.destinationDescription,
    destination_image_url: row.destinationImageUrl,
    continent: row.continent,
    child_life: row.childLifeStory ? { story: row.childLifeStory } : null,
    taste_of_day: row.tasteOfDay,
    sound_of_day: row.soundOfDay,
    nature_detail: row.natureDetail,
    tiny_phrase: row.tinyPhrase,
    tiny_phrase_language: row.tinyPhraseLanguage,
    tiny_phrase_translation: row.tinyPhraseTranslation,
    daily_quote: row.dailyQuote,
    daily_quote_author: row.dailyQuoteAuthor,
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

/**
 * The most recent *published* edition for a given date.
 *
 * There can be more than one row per date (the table permits it and 2026-06-06
 * has two), so this takes the newest by createdAt — but only among rows that
 * are 'ready'. A draft is invisible to the reader until it is published.
 *
 * `id` breaks the tie: 2026-06-06's two rows share a createdAt to the
 * microsecond, so ordering by createdAt alone lets Postgres return either one.
 * The admin desk orders identically, so what it reports as the visible row is
 * the row this returns.
 */
export async function getEditionByDate(date: string): Promise<EditionRecord | null> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(and(
      eq(dailyGoldEdition.editionDate, date),
      eq(dailyGoldEdition.status, 'ready'),
    ))
    .orderBy(desc(dailyGoldEdition.createdAt), desc(dailyGoldEdition.id))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/**
 * The single most recent edition overall.
 * Deliberately NOT the reader's fallback for "today": the reader declares one
 * date and shows today's content or nothing, so borrowing the latest edition
 * would put another day's content under today's masthead.
 */
export async function getLatestEdition(): Promise<EditionRecord | null> {
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.status, 'ready'))
    .orderBy(desc(dailyGoldEdition.editionDate), desc(dailyGoldEdition.createdAt), desc(dailyGoldEdition.id))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** People born on an edition date's month-day — the Born Today gallery. */
export async function getPeopleForDate(date: string): Promise<PersonRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  const rows = await db
    .select()
    .from(remarkablePerson)
    .where(and(
      sql`to_char(${remarkablePerson.birthDate}, 'MM-DD') = ${monthDay}`,
      eq(remarkablePerson.published, true),
    ))
    .orderBy(desc(remarkablePerson.bornTodayPriority), asc(remarkablePerson.name))
    .limit(10);
  return rows.map(personToRecord);
}

/**
 * The published Good News stories for a calendar day, in display order.
 * Unpublished rows are drafts or unreviewed retrieval candidates (D11) and
 * never reach a reader, even though they hold positions of their own.
 */
export async function getGoodNewsForDate(date: string): Promise<GoodNewsRecord[]> {
  if (!date) return [];
  const rows = await db
    .select()
    .from(goodNewsItem)
    .where(and(eq(goodNewsItem.date, date), eq(goodNewsItem.published, true)))
    .orderBy(asc(goodNewsItem.position));
  return rows.map(goodNewsToRecord);
}

/**
 * The published historical events for an edition date's month-day.
 * `maison_rewrite_done` is this table's publish gate. Ordered newest year
 * first, then by position within the year, which is the order the reader
 * renders a year's list in.
 */
export async function getOnThisDayForDate(date: string): Promise<OnThisDayRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  const rows = await db
    .select()
    .from(onThisDayEvent)
    .where(and(
      eq(onThisDayEvent.monthDay, monthDay),
      eq(onThisDayEvent.maisonRewriteDone, true),
    ))
    .orderBy(desc(onThisDayEvent.year), asc(onThisDayEvent.position));
  return rows.map(onThisDayToRecord);
}

// A greatest_moment row in the snake_case shape <DGGreatestMoments> consumes.
export type GreatestMomentRecord = ReturnType<typeof momentToRecord>;

function momentToRecord(row: GreatestMomentRow) {
  return {
    id: row.id,
    rank: row.rank,
    year: row.year,
    headline: row.headline,
    story: row.story,
    image_url: row.imageUrl,
  };
}

/** The published top-10 ranked moments for an edition date's month-day. */
export async function getGreatestMomentsForDate(date: string): Promise<GreatestMomentRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  const rows = await db
    .select()
    .from(greatestMoment)
    .where(and(eq(greatestMoment.monthDay, monthDay), eq(greatestMoment.published, true)))
    .orderBy(asc(greatestMoment.rank));
  return rows.map(momentToRecord);
}

/** A single published person by slug — the public Golden Story page. */
export async function getPersonBySlug(slug: string): Promise<PersonRecord | null> {
  const rows = await db
    .select()
    .from(remarkablePerson)
    .where(and(eq(remarkablePerson.slug, slug), eq(remarkablePerson.published, true)))
    .limit(1);
  return rows[0] ? personToRecord(rows[0]) : null;
}

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * An 'MM-DD' resolved to its most recent occurrence on or before `today`.
 * Golden Stories are keyed by birth month-day with no year, so this is what
 * makes one reachable as a calendar day.
 */
function mostRecentOccurrence(monthDay: string, today: string): string | null {
  if (!/^\d{2}-\d{2}$/.test(monthDay)) return null;
  const thisYear = Number(today.slice(0, 4));
  let year = monthDay <= today.slice(5) ? thisYear : thisYear - 1;
  // 29 February exists only in leap years — step back to the most recent one.
  if (monthDay === '02-29') while (!isLeapYear(year)) year -= 1;
  return `${year}-${monthDay}`;
}

/**
 * Every past day the reader can navigate to: any date with something
 * **published** for it, ascending, most recent 50.
 *
 * Three sources, deliberately not five. `dailyGoldEdition` and `goodNewsItem`
 * are pinned to real dates; `remarkablePerson` is keyed by birth month-day and
 * resolves through `mostRecentOccurrence`, which is what lets a day that only
 * has Golden Stories (and no edition or news) be opened at all.
 *
 * Each source is filtered on its own publish gate (R7.2). Without that, the
 * first row of a half-written day turned into a wax seal in the navigator the
 * moment it was inserted — a date the child can reach that renders nothing.
 *
 * `onThisDayEvent` and `greatestMoment` are excluded on purpose: they are keyed
 * per month-day, so counting them would eventually mark all 366 dates available
 * and the navigator would stop showing where the work is.
 */
export async function getAvailableDates(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [editionRows, newsRows, personRows] = await Promise.all([
    db
      .selectDistinct({ d: dailyGoldEdition.editionDate })
      .from(dailyGoldEdition)
      .where(eq(dailyGoldEdition.status, 'ready')),
    db
      .selectDistinct({ d: goodNewsItem.date })
      .from(goodNewsItem)
      .where(eq(goodNewsItem.published, true)),
    db
      .selectDistinct({ md: sql<string>`to_char(${remarkablePerson.birthDate}, 'MM-DD')` })
      .from(remarkablePerson)
      .where(and(eq(remarkablePerson.published, true), isNotNull(remarkablePerson.birthDate))),
  ]);

  const dates = new Set<string>();
  for (const r of [...editionRows, ...newsRows]) if (r.d) dates.add(r.d);
  for (const r of personRows) {
    const d = mostRecentOccurrence(r.md, today);
    if (d) dates.add(d);
  }
  return [...dates].filter((d) => d <= today).sort().slice(-50);
}
