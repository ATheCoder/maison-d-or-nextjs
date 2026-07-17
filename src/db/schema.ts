import { pgTable, pgEnum, serial, integer, boolean, text, date, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── DailyGoldEdition ──────────────────────────────────────────────────────────
// Mirrors the Base44 "DailyGoldEdition" entity. Scalar fields become columns;
// the nested repeated group (greatest_moments) is stored as typed JSONB.
// Born Today people live in remarkable_person and On This Day events in
// on_this_day_event, both keyed by month-day; Good News stories live in
// good_news_item, keyed by their calendar date.

export type Chapter = {
  number?: number;
  page_span?: string; // 'single' | 'both' | 'image' — GoldenStory layout hint
  blend?: string;
  title?: string;
  narrative?: string;
  image_url?: string | null;
};

export type Treasure = {
  name?: string;
  description?: string;
  image_url?: string | null;
};

export type TimelineEntry = {
  year?: string;
  caption?: string;
  blend?: string;
  image_url?: string | null;
};

export type Lesson = {
  icon_name?: string;
  lesson?: string;
};

export type GreatestMoment = {
  rank?: number;
  year?: string;
  headline?: string;
  story?: string;
  image_url?: string | null;
};

// ── RemarkablePerson ─────────────────────────────────────────────────────────
// The people featured in "Born Today" and rendered as Golden Story books,
// extracted out of daily_gold_edition.born_today into their own table so they
// can be generated once and reused every year on their birth month-day.
// The canonical shape is the story.json format under public/stories/<slug>/
// (what <GoldenStory> consumes), not the legacy Base44 born_today blob.

// Shared shape of the `modern` ("If X were 10 today") and `after_treasures`
// closing sections of a Golden Story.
export type StorySection = {
  page_span?: string; // 'single' | 'both' | 'image'
  blend?: string;
  fade?: boolean;
  title?: string;
  narrative?: string;
  image_url?: string | null;
};

export const remarkablePerson = pgTable('remarkable_person', {
  // Folder name under public/stories/, e.g. 'albert-einstein'. Imports upsert
  // on it, so re-running the importer updates instead of duplicating.
  slug: text('slug').primaryKey(),

  name: text('name').notNull(),
  role: text('role'),
  field: text('field'),
  country: text('country'),

  // Full precision required — Born Today matches on its month-day, so a
  // person can't be surfaced without one. Read back as 'YYYY-MM-DD'.
  birthDate: date('birth_date'),
  // ISO-8601 text at known precision: "1955-04-18" when the full date is
  // known, "1955" when only the year is (frontend formats accordingly,
  // lib/dates.js). Null while the person is living.
  deathDate: text('death_date'),

  storyTitle: text('story_title'),
  famousQuote: text('famous_quote'),
  imageUrl: text('image_url'), // book cover

  storyChildhoodTitle: text('story_childhood_title'),
  childhoodImageUrl: text('childhood_image_url'),
  storyChildhood: text('story_childhood'),
  storyTakeaway: text('story_takeaway'),

  modern: jsonb('modern').$type<StorySection>(),
  chapters: jsonb('chapters').$type<Chapter[]>().notNull().default([]),
  timeline: jsonb('timeline').$type<TimelineEntry[]>().notNull().default([]),
  afterTreasures: jsonb('after_treasures').$type<StorySection>(),
  treasures: jsonb('treasures').$type<Treasure[]>().notNull().default([]),
  lessons: jsonb('lessons').$type<Lesson[]>().notNull().default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type RemarkablePersonRow = typeof remarkablePerson.$inferSelect;
export type NewRemarkablePerson = typeof remarkablePerson.$inferInsert;

// ── GoodNewsItem ─────────────────────────────────────────────────────────────
// The "Good News of the Day" stories, extracted out of
// daily_gold_edition.good_news. Unlike remarkable_person (recurring by
// month-day), good news is genuinely daily content, so rows are keyed by the
// actual calendar date they belong to.

export const goodNewsItem = pgTable('good_news_item', {
  id: serial('id').primaryKey(),

  // The day this news belongs to — the lookup key. Read back as 'YYYY-MM-DD'.
  date: date('date').notNull(),
  // Display order within a day.
  position: integer('position').notNull().default(0),

  headline: text('headline').notNull(),
  description: text('description'),
  // Mostly null in current data; feeds the flag chip if present.
  location: text('location'),
  imageUrl: text('image_url'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('good_news_item_date_idx').on(t.date),
  // Lets the backfill upsert on (date, position), so re-runs are idempotent.
  uniqueIndex('good_news_item_date_position_idx').on(t.date, t.position),
]);

export type GoodNewsItemRow = typeof goodNewsItem.$inferSelect;
export type NewGoodNewsItem = typeof goodNewsItem.$inferInsert;

// ── OnThisDayEvent ───────────────────────────────────────────────────────────
// The "On This Day" historical events, extracted out of
// daily_gold_edition.on_this_day. Recurring content like remarkable_person:
// an event from a given year belongs to its month-day every year. Most rows
// are un-enriched stubs (only year + raw_text/raw_extract, the source
// material the enrichment pipeline consumes); enriched rows carry the
// child-friendly headline/story and maison_rewrite_done = true.

export const onThisDayEvent = pgTable('on_this_day_event', {
  id: serial('id').primaryKey(),

  // 'MM-DD' — the recurrence key.
  monthDay: text('month_day').notNull(),
  // Order within the day's list. (month_day, year) is NOT unique — some days
  // have two events in the same year — so position is the backfill key.
  position: integer('position').notNull().default(0),
  // All-numeric in the data (53–2026); drives the year navigator.
  year: integer('year').notNull(),

  headline: text('headline'),
  story: text('story'),
  location: text('location'),
  imageUrl: text('image_url'),

  maisonRewriteDone: boolean('maison_rewrite_done').notNull().default(false),
  researchedFromInternet: boolean('researched_from_internet').notNull().default(false),
  rawText: text('raw_text'),
  rawExtract: text('raw_extract'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('on_this_day_event_month_day_idx').on(t.monthDay),
  // The per-year lookup the frontend's year navigator uses.
  index('on_this_day_event_month_day_year_idx').on(t.monthDay, t.year),
  // Lets the backfill upsert on (month_day, position), so re-runs are idempotent.
  uniqueIndex('on_this_day_event_month_day_position_idx').on(t.monthDay, t.position),
]);

export type OnThisDayEventRow = typeof onThisDayEvent.$inferSelect;
export type NewOnThisDayEvent = typeof onThisDayEvent.$inferInsert;

export const dgStatus = pgEnum('dg_status', ['generating', 'ready', 'fallback']);

export const dailyGoldEdition = pgTable('daily_gold_edition', {
  // Preserve the Base44 record id so re-imports upsert instead of duplicate.
  id: text('id').primaryKey(),

  // Not unique: Base44 can hold several editions for the same date (the app
  // reads the most recent), so we index it for lookups instead.
  editionDate: date('edition_date').notNull(),

  destinationCountry: text('destination_country'),
  destinationDescription: text('destination_description'),
  destinationImageUrl: text('destination_image_url'),

  tasteOfDay: text('taste_of_day'),
  soundOfDay: text('sound_of_day'),
  natureDetail: text('nature_detail'),
  tinyPhrase: text('tiny_phrase'),
  tinyPhraseLanguage: text('tiny_phrase_language'),
  tinyPhraseTranslation: text('tiny_phrase_translation'),

  greatestMoments: jsonb('greatest_moments').$type<GreatestMoment[]>().notNull().default([]),

  generatedAt: timestamp('generated_at', { withTimezone: true }),
  status: dgStatus('status').notNull().default('generating'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('daily_gold_edition_edition_date_idx').on(t.editionDate),
]);

export type DailyGoldEditionRow = typeof dailyGoldEdition.$inferSelect;
export type NewDailyGoldEdition = typeof dailyGoldEdition.$inferInsert;
