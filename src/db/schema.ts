import { pgTable, pgEnum, serial, text, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── DailyGoldEdition ──────────────────────────────────────────────────────────
// Mirrors the Base44 "DailyGoldEdition" entity. Scalar fields become columns;
// the nested repeated groups (born_today, good_news, on_this_day,
// greatest_moments) are stored as typed JSONB.

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

export type BornTodayPerson = {
  name?: string;
  role?: string;
  birth_date?: string;
  death_year?: string;
  country?: string;
  image_url?: string | null;
  appearance_description?: string;
  story_title?: string;
  story_childhood?: string;
  story_curiosity?: string;
  story_dream?: string;
  story_turning_point?: string;
  story_contribution?: string;
  story_takeaway?: string;
  emotional_themes?: string[];
  chapters?: Chapter[];
  chapter_images?: string[];
  treasures?: Treasure[];
  timeline?: TimelineEntry[];
  modern_interpretation?: string;
  lessons?: Lesson[];
  famous_quote?: string;
};

export type GoodNewsItem = {
  headline?: string;
  location?: string;
  description?: string;
  image_url?: string | null;
};

export type OnThisDayItem = {
  year?: string;
  headline?: string;
  story?: string;
  location?: string;
  image_url?: string | null;
  maison_rewrite_done?: boolean;
  researched_from_internet?: boolean;
  raw_text?: string;
  raw_extract?: string;
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

  // Display string as written in the story ("March 14, 1879" or just "1452").
  birthDate: text('birth_date'),
  // 'MM-DD' when the full birth date is known — the Born Today lookup key.
  // Null when the story only records a year (e.g. Leonardo, "1452").
  birthMonthDay: text('birth_month_day'),
  deathYear: text('death_year'),

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
}, (t) => [
  index('remarkable_person_birth_month_day_idx').on(t.birthMonthDay),
]);

export type RemarkablePersonRow = typeof remarkablePerson.$inferSelect;
export type NewRemarkablePerson = typeof remarkablePerson.$inferInsert;

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

  bornToday: jsonb('born_today').$type<BornTodayPerson[]>().notNull().default([]),
  goodNews: jsonb('good_news').$type<GoodNewsItem[]>().notNull().default([]),
  onThisDay: jsonb('on_this_day').$type<OnThisDayItem[]>().notNull().default([]),
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
