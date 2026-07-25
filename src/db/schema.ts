import { pgTable, pgEnum, serial, integer, boolean, char, text, date, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import type { Brief } from '@/lib/golden-story/brief';

// ── Identity ─────────────────────────────────────────────────────────────────
// Better Auth-managed tables (see docs/auth-plan.md §3). Only admins and
// guardians hold accounts — children are profiles, not users. `role` is an
// additionalField that clients can never set (input: false in lib/auth.ts);
// the first admin is created by scripts/seed-admin.mjs.

export const userRole = pgEnum('user_role', ['admin', 'guardian']);

// A household: many guardians, many child profiles (phase 3). Created
// automatically when a guardian signs up (databaseHooks in lib/auth.ts), so
// every guardian always belongs to exactly one family.
export const family = pgTable('family', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRole('role').notNull().default('guardian'),
  // Null for admins; guardians always have one (set by the signup hook, or
  // re-pointed when an invite is accepted).
  familyId: text('family_id').references(() => family.id),
  // Guardian PIN for the grown-up gate (scrypt hash; null until set). Not a
  // Better Auth field — never leaves the server.
  pinHash: text('pin_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// A child in a family — a profile, never an account (auth-plan §1). Minimal
// PII by design: nickname, birth year, preset avatar key. The optional PIN
// is a sibling lock (auth-plan §4): scrypt-hashed and attempt-throttled, with
// the guardian PIN/password as the override.
export const childProfile = pgTable('child_profile', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => family.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  // Age 5–17 at creation, enforced in the server action.
  birthYear: integer('birth_year').notNull(),
  // Key into AVATARS (lib/avatars.ts).
  avatar: text('avatar').notNull().default('sun'),
  pinHash: text('pin_hash'),
  pinAttempts: integer('pin_attempts').notNull().default(0),
  pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('child_profile_family_id_idx').on(t.familyId),
]);

export type ChildProfileRow = typeof childProfile.$inferSelect;

// DB-backed sessions (no JWTs — see docs/auth-plan.md §1). Child mode is the
// active_child_profile_id: set server-side only, after PIN verification when
// the profile has one, and revocable instantly by clearing it.
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  activeChildProfileId: text('active_child_profile_id')
    .references(() => childProfile.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('session_user_id_idx').on(t.userId),
]);

// One row per credential/provider identity. Email+password lives here as
// providerId 'credential'; Google etc. become additional rows later (SSO is
// additive, not a migration).
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('account_user_id_idx').on(t.userId),
]);

// A pending invitation for a co-guardian to join a family. The raw token is
// the emailed secret and exists only in the invite URL — the row stores its
// SHA-256. One live invite per (family, email); re-inviting rotates the
// token.
export const familyInvite = pgTable('family_invite', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => family.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  // All invites are guardians today; kept for forward compatibility.
  role: userRole('role').notNull().default('guardian'),
  invitedBy: text('invited_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('family_invite_family_email_idx').on(t.familyId, t.email),
]);

export type FamilyRow = typeof family.$inferSelect;
export type FamilyInviteRow = typeof familyInvite.$inferSelect;

// Email verification and password reset tokens.
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── DailyGoldEdition ──────────────────────────────────────────────────────────
// Mirrors the Base44 "DailyGoldEdition" entity, reduced to its scalar fields.
// The repeated content groups live in their own tables: remarkable_person
// (Born Today), on_this_day_event and greatest_moment keyed by month-day,
// good_news_item keyed by its calendar date.

export type Chapter = {
  number?: number;
  page_span?: string; // 'single' | 'both' | 'image' — GoldenStory layout hint
  blend?: string;
  fade?: boolean; // legibility wash behind overlaid text (single/both spans)
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
  // ISO-3166-1 alpha-2 — the flag medallion's authority. DGBornToday prefers it
  // (getIso2) and only falls back to matching `country` against a hardcoded name
  // table, which silently drops the flag chip for anything not listed. Nullable:
  // an editor fills it in; char(2) pins the length at the DB.
  countryCode: char('country_code', { length: 2 }),

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

  // Draft/Published gate for the editor. New rows start unpublished; public
  // readers (getPersonBySlug, the Born Today query) filter on it, admin
  // readers don't. The introducing migration backfills true for every existing
  // row (they are live today).
  published: boolean('published').notNull().default(false),

  // Born Today display priority: higher shows first. People are only ever
  // ranked against others born the same month-day, so a single global integer
  // suffices. Default 0 keeps existing rows name-sorted until an admin promotes
  // someone.
  bornTodayPriority: integer('born_today_priority').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type RemarkablePersonRow = typeof remarkablePerson.$inferSelect;
export type NewRemarkablePerson = typeof remarkablePerson.$inferInsert;

// ── StoryBrief ───────────────────────────────────────────────────────────────
// The writer's output for a person (lib/golden-story writeBrief), kept
// alongside the person so scene text, the golden thread and the character
// sheet survive editing and feed image-slot prompts. One row per person.

// Per-slot override + source metadata, keyed by slot file (e.g. 'cover.png').
// `fullPrompt` is the "Edit full prompt" escape hatch; `source`/`accepted`
// record whether the live image was generated here or uploaded (screens ②/④).
export type SlotOverride = {
  fullPrompt?: string;
  source?: 'generated' | 'uploaded';
  accepted?: boolean;
};

export const storyBrief = pgTable('story_brief', {
  slug: text('slug')
    .primaryKey()
    .references(() => remarkablePerson.slug, { onDelete: 'cascade' }),
  brief: jsonb('brief').$type<Brief>(),
  promptOverrides: jsonb('prompt_overrides').$type<Record<string, SlotOverride>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StoryBriefRow = typeof storyBrief.$inferSelect;
export type NewStoryBrief = typeof storyBrief.$inferInsert;

// ── GenerationJob ────────────────────────────────────────────────────────────
// A leave-and-return generation job: DB-backed row + in-process async runner +
// client polling (no queue infra — single self-hosted admin). `progress`
// mirrors screens ③ (staged brief writing) and ④ (per-slot image states);
// `result` holds e.g. a rewrite proposal awaiting Accept.

export const generationJobKind = pgEnum('generation_job_kind', ['brief', 'images', 'slot', 'rewrite']);
export const generationJobState = pgEnum('generation_job_state', ['running', 'done', 'failed']);

// Staged progress for a brief job; per-slot progress for image jobs. A rewrite
// job carries the dotted `fieldPath` it targets so a running rewrite is
// self-describing (the editor can show which field is drafting on return).
export type JobProgress = {
  stages?: { key: string; label: string; state: 'pending' | 'active' | 'done' | 'failed' }[];
  slots?: Record<string, { state: string; error?: string }>;
  fieldPath?: string;
};

// A rewrite job's proposal: the field it targets, the text at the time of the
// request (for a stable CURRENT column), and the proposed replacement.
export type JobResult = {
  fieldPath?: string;
  current?: string;
  proposal?: string;
  [key: string]: unknown;
};

// What a job is *about* (R7.1). Jobs began life belonging to a person by slug,
// but Daily Gold generation belongs to a calendar date or a recurring month-day
// and nothing in the AI phases works until a job row can say so.
export const generationJobSubject = pgEnum('generation_job_subject', ['person', 'edition', 'month_day']);

export const generationJob = pgTable('generation_job', {
  id: serial('id').primaryKey(),

  // The polymorphic subject. `subjectKey` is a slug, a 'YYYY-MM-DD' edition
  // date, or an 'MM-DD' month-day, according to `subjectKind`.
  subjectKind: generationJobSubject('subject_kind').notNull().default('person'),
  subjectKey: text('subject_key').notNull(),

  // Kept alongside `subjectKey` — nullable now — purely for the FK: a person's
  // jobs still cascade away when the person is deleted, which a polymorphic key
  // cannot express. For a person job this always equals `subjectKey`; for the
  // other two kinds it is null.
  slug: text('slug').references(() => remarkablePerson.slug, { onDelete: 'cascade' }),

  kind: generationJobKind('kind').notNull(),
  state: generationJobState('state').notNull().default('running'),
  progress: jsonb('progress').$type<JobProgress>().notNull().default({}),
  result: jsonb('result').$type<JobResult>(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('generation_job_slug_idx').on(t.slug),
  index('generation_job_subject_idx').on(t.subjectKind, t.subjectKey),
]);

export type GenerationJobRow = typeof generationJob.$inferSelect;
export type NewGenerationJob = typeof generationJob.$inferInsert;

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

  // The publish gate. Readers filter on this, so an unpublished row is both a
  // draft and — per D11 — a retrieval candidate awaiting review. It still holds
  // a `position`, because (date, position) is unique; accepting a candidate
  // repositions it into the next free display slot rather than keeping the
  // arrival order it was inserted with.
  published: boolean('published').notNull().default(false),

  // Provenance (D10). A retrieved item records where its claim came from so
  // review is verification rather than a rubber stamp; a hand-written item
  // leaves these null.
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title'),
  // When the *source* published the story — compared against `date` to catch a
  // 2019 feel-good piece being presented as today's news.
  sourcePublishedAt: timestamp('source_published_at', { withTimezone: true }),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
  // Stamped when an admin actually checked the claim against its source.
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

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
// The "On This Day" historical events. Recurring content like
// remarkable_person: an event from a given year belongs to its month-day every
// year. A month-day holds a *list* per year, ordered by position — several
// events in one year is the normal case, each publishable on its own.
//
// Scope is the last twenty years (the deep past is greatest_moment's job). The
// band is rolling and governs only what gets generated: an event published for
// 2007 stays published as the window moves past it.
//
// Emptied by migration 0020 — the Base44 backfill it used to hold was written
// by the reader itself, unreviewed, and five of its thirteen "authored" rows
// were filed under the wrong month-day. See docs/daily-gold-admin-spec.md
// R7.13; a pg_dump of those 323 rows was taken first.

export const onThisDayEvent = pgTable('on_this_day_event', {
  id: serial('id').primaryKey(),

  // 'MM-DD' — the recurrence key.
  monthDay: text('month_day').notNull(),
  // Order within the year's list, contiguous and 0-based per month-day.
  position: integer('position').notNull().default(0),
  year: integer('year').notNull(),

  headline: text('headline'),
  story: text('story'),
  location: text('location'),
  imageUrl: text('image_url'),

  // The publish gate for this table (D4) — the reader has always required it,
  // so it needs no `published` twin. Setting it is an explicit act.
  maisonRewriteDone: boolean('maison_rewrite_done').notNull().default(false),

  // Provenance (D10), the same five columns good_news_item and greatest_moment
  // carry, so all three content types record a citation identically.
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title'),
  sourcePublishedAt: timestamp('source_published_at', { withTimezone: true }),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('on_this_day_event_month_day_idx').on(t.monthDay),
  // The per-year lookup the frontend's year navigator uses.
  index('on_this_day_event_month_day_year_idx').on(t.monthDay, t.year),
  // Unique, so reordering a year is a transaction rather than a series of
  // independent updates.
  uniqueIndex('on_this_day_event_month_day_position_idx').on(t.monthDay, t.position),
]);

export type OnThisDayEventRow = typeof onThisDayEvent.$inferSelect;
export type NewOnThisDayEvent = typeof onThisDayEvent.$inferInsert;

// ── GreatestMoment ───────────────────────────────────────────────────────────
// The "Greatest Moments" top-10 ranked events, extracted out of
// daily_gold_edition.greatest_moments. Recurring content like
// on_this_day_event: the top moments of a calendar date apply every year, so
// rows are keyed by month-day. rank (1–10) is both the display order and,
// with month_day, the natural key.

export const greatestMoment = pgTable('greatest_moment', {
  id: serial('id').primaryKey(),

  // 'MM-DD' — the recurrence key.
  monthDay: text('month_day').notNull(),
  rank: integer('rank').notNull(),
  // All-numeric in the data; shown as the moment's year label.
  year: integer('year').notNull(),

  headline: text('headline'),
  story: text('story'),
  imageUrl: text('image_url'),

  // The publish gate, and with it the candidate mechanism (D11) — an
  // unpublished moment holds a rank, so accepting one re-ranks it into the
  // next free rung rather than keeping where it landed.
  published: boolean('published').notNull().default(false),

  // Provenance (D10). Year drift is this content type's standard failure, so
  // the citation is what the admin checks the year against.
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title'),
  sourcePublishedAt: timestamp('source_published_at', { withTimezone: true }),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('greatest_moment_month_day_idx').on(t.monthDay),
  // Lets the backfill upsert on (month_day, rank), so re-runs are idempotent.
  uniqueIndex('greatest_moment_month_day_rank_idx').on(t.monthDay, t.rank),
]);

export type GreatestMomentRow = typeof greatestMoment.$inferSelect;
export type NewGreatestMoment = typeof greatestMoment.$inferInsert;

// 'draft' is the edition's publish gate (D4/R7.11): prepare writes it, publish
// writes 'ready', and only 'ready' reaches a reader. 'generating' keeps its
// literal meaning — a generation job in flight — so the status never lies about
// a row no model has touched.
export const dgStatus = pgEnum('dg_status', ['draft', 'generating', 'ready', 'fallback']);

export const dailyGoldEdition = pgTable('daily_gold_edition', {
  // Preserve the Base44 record id so re-imports upsert instead of duplicate.
  id: text('id').primaryKey(),

  // Not unique: Base44 can hold several editions for the same date (the app
  // reads the most recent), so we index it for lookups instead.
  editionDate: date('edition_date').notNull(),

  // The masthead painting behind <DGHero>, which has been falling back to
  // destinationImageUrl for want of this column.
  heroImageUrl: text('hero_image_url'),

  destinationCountry: text('destination_country'),
  destinationDescription: text('destination_description'),
  destinationImageUrl: text('destination_image_url'),
  // Rendered ahead of the destination name in the modal header ("Europe · Lisbon").
  continent: text('continent'),
  // The "A Child in <destination>" narrative, in blank-line separated paragraphs
  // (the reader splits on '\n\n'). A scalar like everything else here — a title
  // or image for the section would be additive columns, not a reshape.
  childLifeStory: text('child_life_story'),

  tasteOfDay: text('taste_of_day'),
  soundOfDay: text('sound_of_day'),
  natureDetail: text('nature_detail'),
  tinyPhrase: text('tiny_phrase'),
  tinyPhraseLanguage: text('tiny_phrase_language'),
  tinyPhraseTranslation: text('tiny_phrase_translation'),

  // The <DGInspirationBar> quote. Left null the bar rotates its own curated set,
  // so a day without one still reads finished.
  dailyQuote: text('daily_quote'),
  dailyQuoteAuthor: text('daily_quote_author'),

  generatedAt: timestamp('generated_at', { withTimezone: true }),
  status: dgStatus('status').notNull().default('generating'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('daily_gold_edition_edition_date_idx').on(t.editionDate),
]);

export type DailyGoldEditionRow = typeof dailyGoldEdition.$inferSelect;
export type NewDailyGoldEdition = typeof dailyGoldEdition.$inferInsert;
