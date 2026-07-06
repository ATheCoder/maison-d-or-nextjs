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
