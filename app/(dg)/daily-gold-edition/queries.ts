import 'server-only';
/**
 * The day reads backing the Daily Gold Edition page.
 * These read editions from the local Postgres database via Drizzle and return
 * them in the snake_case shape the client components already expect (the same
 * shape Base44 used to return), so no consumer mapping has to change.
 *
 * Not a `'use server'` module, and deliberately so. Every export here is a
 * read; there is not one mutation among them. As server actions they were nine
 * unauthenticated POST endpoints that nothing needed — no client component
 * imports this file, both callers are server components. The directive is also
 * mutually exclusive with `'use cache'` (SWC: *"Conflicting directives
 * "use server" and "use cache" found in the same file"*), and caching the
 * day-keyed reads is the whole point of this module. `import 'server-only'` is
 * what now keeps it off the client, which is all the directive was doing.
 *
 * ── What is cached here, and how it is keyed ──────────────────────────────
 *
 * Every read below answers the same question for every reader, so all of them
 * are cached. They fall into three families, and the family decides the key:
 *
 *   Day-keyed      getEditionByDate, getGoodNewsForDate — one calendar day.
 *                  Tagged `dg-edition:<date>` / `dg-goodnews:<date>`.
 *   Month-day keyed getPeopleForDate, getOnThisDayForDate,
 *                  getGreatestMomentsForDate — "what happened on this day
 *                  across history". These take a full date for the caller's
 *                  convenience but the *cache* must key on the month-day, or
 *                  2026-03-14 and 2025-03-14 would compute the same rows into
 *                  two entries and a single edit would leave one of them stale.
 *                  So each is a thin wrapper around a cached inner function
 *                  that takes the month-day. Tagged `dg-almanac:<MM-DD>`
 *                  (`dg-people:<MM-DD>` for the Born Today gallery).
 *   List reads     getAvailableDates, getLatestEdition — change whenever an
 *                  edition is published. Tagged `dg-dates`.
 *
 * `cacheLife('max')` on the first two families is not optimism: an archive day
 * is immutable, and the only thing that can change today's is an admin write,
 * which invalidates the tag explicitly. The time bound is a backstop, not the
 * mechanism. The list reads take `'hours'` because a publish moving the set of
 * available days is the common case rather than the exception.
 *
 * Two rules that must hold:
 *
 *  - **Never cache a reader-keyed read.** getSavedKeys, getSession and
 *    getActiveChild read cookies; a cached copy is a data leak between
 *    families, not a performance win. None of them is called from this route
 *    any more — they belong to app/(dg)/layout.tsx, which resolves the reader
 *    once for the whole group and holds them in ReaderContext. That is what
 *    leaves every read on this page day-keyed and therefore cacheable, and the
 *    page segment above them identical for every reader on a given date.
 *  - **The clock stays outside every cached scope.** getAvailableDates used to
 *    call `new Date()` itself; it now takes `today` as an argument. A clock read
 *    captured inside a `'use cache'` function becomes part of the cache key by
 *    closure and can hang the build waiting for a value that cannot resolve
 *    during prerender.
 */
import { cacheLife, cacheTag } from 'next/cache';
import {
  DG_DATES_TAG,
  dgAlmanacTag,
  dgEditionTag,
  dgGoodNewsTag,
  dgPeopleTag,
  personTag,
} from '@/lib/daily-gold-tags';
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
  // The four senses' own paintings. Null on every day authored before the
  // gallery gave them frames, which is most of them — the destination wall
  // hangs an unpainted sense as a label plate rather than as an empty frame.
  taste_image_url: string | null;
  sound_image_url: string | null;
  nature_image_url: string | null;
  phrase_image_url: string | null;
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
    // Which of the two books this person is read as. First in the record
    // because it is the first thing the reader has to know: it picks the
    // component (<GoldenStory> or <EditionStory>) that everything below is
    // handed to. See StoryFormat in src/db/schema.ts.
    story_format: row.storyFormat,
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
    // Book Edition only — the pull-quote's footer. Null on every flip-book.
    famous_quote_attribution: row.famousQuoteAttribution,
    image_url: row.imageUrl,
    story_childhood_title: row.storyChildhoodTitle,
    childhood_image_url: row.childhoodImageUrl,
    story_childhood: row.storyChildhood,
    // The childhood spread's fact. Every other section's fact rides inside its
    // own jsonb and arrives with it; this one is a column, so it has to be
    // named here or the spread renders without it (docs/golden-stories-bible.md).
    story_childhood_fact: row.storyChildhoodFact,
    story_takeaway: row.storyTakeaway,
    modern: row.modern,
    chapters: row.chapters ?? [],
    timeline: row.timeline ?? [],
    after_treasures: row.afterTreasures,
    treasures: row.treasures ?? [],
    lessons: row.lessons ?? [],
    // Book Edition only. Empty / null on every flip-book, which is exactly how
    // <EditionStory> and <GoldenStory> each ignore the other's rooms.
    fun_facts: row.funFacts ?? [],
    legacy: row.legacy,
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
    taste_image_url: row.tasteImageUrl,
    sound_image_url: row.soundImageUrl,
    nature_image_url: row.natureImageUrl,
    phrase_image_url: row.phraseImageUrl,
    daily_quote: row.dailyQuote,
    daily_quote_author: row.dailyQuoteAuthor,
    generated_at: row.generatedAt ? new Date(row.generatedAt).toISOString() : null,
    status: row.status,
  };
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
  'use cache';
  cacheLife('max');
  cacheTag(dgEditionTag(date));
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
 *
 * The reader uses this only to find *which day* to open when today is blank,
 * and then navigates to that day — never to borrow this edition's content for
 * today. The page still declares one date and shows that date's content or
 * nothing; putting another day's edition under today's masthead stays wrong.
 */
export async function getLatestEdition(): Promise<EditionRecord | null> {
  'use cache';
  cacheLife('hours');
  // Not `dg-edition:<date>` — which day is "latest" changes when *any* day is
  // published, including one this entry has never seen.
  cacheTag(DG_DATES_TAG);
  const rows = await db
    .select()
    .from(dailyGoldEdition)
    .where(eq(dailyGoldEdition.status, 'ready'))
    .orderBy(desc(dailyGoldEdition.editionDate), desc(dailyGoldEdition.createdAt), desc(dailyGoldEdition.id))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/**
 * People born on an edition date's month-day — the Born Today gallery.
 *
 * The wrapper narrows the date to its month-day so the cache below is keyed by
 * the thing the answer actually depends on; see the module docblock.
 */
export async function getPeopleForDate(date: string): Promise<PersonRecord[]> {
  const monthDay = date?.slice(5);
  if (!monthDay) return [];
  return getPeopleForMonthDay(monthDay);
}

async function getPeopleForMonthDay(monthDay: string): Promise<PersonRecord[]> {
  'use cache';
  cacheLife('max');
  cacheTag(dgPeopleTag(monthDay));
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
  return goodNewsForDate(date);
}

async function goodNewsForDate(date: string): Promise<GoodNewsRecord[]> {
  'use cache';
  cacheLife('max');
  cacheTag(dgGoodNewsTag(date));
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
  return onThisDayForMonthDay(monthDay);
}

async function onThisDayForMonthDay(monthDay: string): Promise<OnThisDayRecord[]> {
  'use cache';
  cacheLife('max');
  cacheTag(dgAlmanacTag(monthDay));
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
  return greatestMomentsForMonthDay(monthDay);
}

async function greatestMomentsForMonthDay(monthDay: string): Promise<GreatestMomentRecord[]> {
  'use cache';
  cacheLife('max');
  // Shares the almanac tag with On This Day: both are authored on the same
  // /admin/daily-gold/almanac/[monthDay] screen and saved by the same actions.
  cacheTag(dgAlmanacTag(monthDay));
  const rows = await db
    .select()
    .from(greatestMoment)
    .where(and(eq(greatestMoment.monthDay, monthDay), eq(greatestMoment.published, true)))
    .orderBy(asc(greatestMoment.rank));
  return rows.map(momentToRecord);
}

/** A single published person by slug — the public Golden Story page. */
export async function getPersonBySlug(slug: string): Promise<PersonRecord | null> {
  'use cache';
  cacheLife('max');
  cacheTag(personTag(slug));
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
 *
 * `today` is an argument rather than a `new Date()` inside this function, and
 * that is a cache requirement, not a style choice. A clock read inside a
 * `'use cache'` scope is captured by closure into the cache key and can hang
 * the build; passing it in makes the dependency explicit, gives each day its
 * own entry, and lets the caller — which has already committed to request-time
 * work by reading searchParams — own the clock.
 */
export async function getAvailableDates(today: string): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(DG_DATES_TAG);
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
