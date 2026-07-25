'use server';
/**
 * Admin library actions for remarkable people (Phase 2). Server actions are
 * open endpoints, so every one starts with requireAdmin() and validates its
 * inputs. Public draft-gating lives in the readers (getPersonBySlug, the Born
 * Today query); these admin readers/writers are unfiltered.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import {
  remarkablePerson,
  storyBrief,
  type Chapter,
  type StorySection,
  type TimelineEntry,
  type Treasure,
  type Lesson,
  type RemarkablePersonRow,
  type GenerationJobRow,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { slugify, SLUG_RE } from '@/lib/slug';
import { runPrompt, suggestPersons } from '@/lib/golden-story/brief';
import { OPENROUTER, orHeaders } from '@/lib/golden-story/openrouter';
import { createJob, failJob, jobsForSlug, deleteJob, personSubject } from '@/lib/golden-story/jobs';
import { initialBriefStages } from '@/lib/golden-story/textStore';
import { inngest } from '@/lib/inngest/client';

// Expected counts for a "complete" story (mirrors lib/golden-story counts).
const EXPECTED_CHAPTERS = 4;

export type OpenRouterCredits = { totalCredits: number; totalUsage: number; remaining: number };

/**
 * The OpenRouter account balance behind the AI writer/renderer — surfaced in the
 * editor's top bar so the balance is visible before kicking a generation. Reads
 * GET /credits ({ data: { total_credits, total_usage } }); remaining is the
 * difference. Admin-gated: this is account-level billing data.
 */
export async function getOpenRouterCredits(): Promise<
  { ok: true; credits: OpenRouterCredits } | { ok: false; error: string }
> {
  await requireAdmin();
  try {
    const res = await fetch(`${OPENROUTER}/credits`, { headers: orHeaders(), cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `OpenRouter ${res.status}` };
    const { data } = await res.json();
    const totalCredits = Number(data?.total_credits ?? 0);
    const totalUsage = Number(data?.total_usage ?? 0);
    return { ok: true, credits: { totalCredits, totalUsage, remaining: totalCredits - totalUsage } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reach OpenRouter' };
  }
}

export type PersonListItem = {
  slug: string;
  name: string;
  // 'MM-DD' or null — Born Today can't surface a person without a birth date.
  monthDay: string | null;
  missingBirthDate: boolean;
  published: boolean;
  // Born Today display priority — higher shows first among people born the
  // same month-day.
  bornTodayPriority: number;
  coverUrl: string | null;
  // Card subtitle / meta — the story's one-liner and where they're from.
  role: string | null;
  field: string | null;
  country: string | null;
  storyTitle: string | null;
  chapterCount: number;
  timelineCount: number;
  treasureCount: number;
  // Image slots with no image_url (cover + childhood + modern + after +
  // per-chapter/timeline/treasure) and the total possible for this person.
  emptyImages: number;
  totalImages: number;
  hasBrief: boolean;
  incomplete: boolean;
};

/**
 * The whole library — one row per person with birth month-day, cover thumb,
 * published state and completeness signals computed in the query. Small table
 * (tens of rows), so search/filter happen client-side.
 */
export async function listPeople(): Promise<PersonListItem[]> {
  await requireAdmin();
  const empty = (col: unknown) => sql`(case when coalesce(${col}, '') = '' then 1 else 0 end)`;
  const emptyInArray = (col: unknown) =>
    sql`(select count(*) from jsonb_array_elements(${col}) e where coalesce(e ->> 'image_url', '') = '')`;

  const rows = await db
    .select({
      slug: remarkablePerson.slug,
      name: remarkablePerson.name,
      published: remarkablePerson.published,
      bornTodayPriority: remarkablePerson.bornTodayPriority,
      coverUrl: remarkablePerson.imageUrl,
      role: remarkablePerson.role,
      field: remarkablePerson.field,
      country: remarkablePerson.country,
      storyTitle: remarkablePerson.storyTitle,
      monthDay: sql<string | null>`to_char(${remarkablePerson.birthDate}, 'MM-DD')`,
      missingBirthDate: sql<boolean>`(${remarkablePerson.birthDate} is null)`,
      chapterCount: sql<number>`jsonb_array_length(${remarkablePerson.chapters})`,
      timelineCount: sql<number>`jsonb_array_length(${remarkablePerson.timeline})`,
      treasureCount: sql<number>`jsonb_array_length(${remarkablePerson.treasures})`,
      emptyImages: sql<number>`(
        ${empty(remarkablePerson.imageUrl)}
        + ${empty(remarkablePerson.childhoodImageUrl)}
        + ${sql`(case when coalesce(${remarkablePerson.modern} ->> 'image_url', '') = '' then 1 else 0 end)`}
        + ${sql`(case when coalesce(${remarkablePerson.afterTreasures} ->> 'image_url', '') = '' then 1 else 0 end)`}
        + ${emptyInArray(remarkablePerson.chapters)}
        + ${emptyInArray(remarkablePerson.timeline)}
        + ${emptyInArray(remarkablePerson.treasures)}
      )::int`,
      hasBrief: sql<boolean>`(${storyBrief.slug} is not null)`,
    })
    .from(remarkablePerson)
    .leftJoin(storyBrief, eq(storyBrief.slug, remarkablePerson.slug))
    .orderBy(asc(remarkablePerson.name));

  return rows.map((r) => {
    // Fixed image fields (cover, childhood, modern, after) + the three arrays.
    const totalImages = 4 + r.chapterCount + r.timelineCount + r.treasureCount;
    const incomplete = r.missingBirthDate || r.chapterCount < EXPECTED_CHAPTERS || r.emptyImages > 0;
    return { ...r, totalImages, incomplete };
  });
}

/**
 * Create a person from a name + (editable) slug, or overwrite an existing slug
 * after explicit confirmation. New rows are unpublished; on overwrite the row
 * is reset to a fresh draft (its R2 art is left in place — slugs may return —
 * and its brief is cleared). On success the editor is opened.
 */
export async function createPerson(input: { name?: string; slug?: string; overwrite?: boolean }):
  Promise<{ ok: false; error?: string; collision?: string }> {
  await requireAdmin();
  const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (name.length < 1) return { ok: false, error: 'Please enter a name.' };

  const raw = typeof input?.slug === 'string' && input.slug.trim() ? input.slug : name;
  const slug = slugify(raw);
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'The slug must be lowercase letters, numbers and dashes.' };
  }

  const existing = await db
    .select({ name: remarkablePerson.name })
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);

  if (existing[0] && !input.overwrite) {
    // Ask the caller to confirm before clobbering an existing person.
    return { ok: false, collision: existing[0].name };
  }

  if (existing[0]) {
    await db.transaction(async (tx) => {
      await tx.delete(storyBrief).where(eq(storyBrief.slug, slug));
      await tx
        .update(remarkablePerson)
        .set({
          name,
          published: false,
          role: null, field: null, country: null, birthDate: null, deathDate: null,
          storyTitle: null, famousQuote: null, imageUrl: null,
          storyChildhoodTitle: null, childhoodImageUrl: null,
          storyChildhood: null, storyTakeaway: null,
          modern: null, chapters: [], timeline: [], afterTreasures: null,
          treasures: [], lessons: [],
          updatedAt: new Date(),
        })
        .where(eq(remarkablePerson.slug, slug));
    });
  } else {
    await db.insert(remarkablePerson).values({ slug, name, published: false });
  }

  redirect(`/admin/people/${slug}`);
}

/**
 * Delete a person after a typed-slug confirmation. story_brief and
 * generation_job rows cascade; R2 objects are intentionally left in place
 * (cheap, and a slug may be recreated later).
 */
export async function deletePerson(slug: string, confirmSlug: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  if (confirmSlug !== slug) return { ok: false, error: 'The typed slug does not match.' };

  await db.delete(remarkablePerson).where(eq(remarkablePerson.slug, slug));
  revalidatePath('/admin/people');
  return { ok: true };
}

// ── Editor (Phase 3) ─────────────────────────────────────────────────────────
// The editor edits a person in the story.json shape <GoldenStory> consumes,
// plus its publish state and last-saved timestamp; DB-column mapping happens
// only on save (savePerson), so the live preview is a plain prop pass.

export type EditorPerson = {
  slug: string;
  name: string;
  role: string | null;
  field: string | null;
  country: string | null;
  birth_date: string | null;
  death_date: string | null;
  story_title: string | null;
  famous_quote: string | null;
  image_url: string | null;
  story_childhood_title: string | null;
  childhood_image_url: string | null;
  story_childhood: string | null;
  story_takeaway: string | null;
  modern: StorySection | null;
  chapters: Chapter[];
  timeline: TimelineEntry[];
  after_treasures: StorySection | null;
  treasures: Treasure[];
  lessons: Lesson[];
  published: boolean;
  updated_at: string | null;
};

function toEditorPerson(row: RemarkablePersonRow): EditorPerson {
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
    published: row.published,
    updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

/** Load one person for the editor (admin reader — no published filter). */
export async function getPersonForEditor(slug: string): Promise<EditorPerson | null> {
  await requireAdmin();
  const rows = await db
    .select()
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);
  return rows[0] ? toEditorPerson(rows[0]) : null;
}

// Trim to a string (capped) or null. Server actions are open endpoints, so the
// whole record is treated as untrusted and coerced field by field.
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const objOrNull = <T,>(v: unknown): T | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : null;

/**
 * Persist the editor's draft, mapping the story.json shape back to DB columns.
 * Never touches `published` (that is setPublished) or the slug. Returns the new
 * updated_at for the saved-timestamp indicator.
 */
export async function savePerson(slug: string, record: Partial<EditorPerson>):
  Promise<{ ok: boolean; error?: string; updated_at?: string }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  const name = str(record?.name, 200);
  if (!name) return { ok: false, error: 'A name is required.' };

  const birth = typeof record?.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.birth_date)
    ? record.birth_date : null;
  const death = typeof record?.death_date === 'string' && /^\d{4}(-\d{2}-\d{2})?$/.test(record.death_date)
    ? record.death_date : null;

  const updatedAt = new Date();
  const result = await db
    .update(remarkablePerson)
    .set({
      name,
      role: str(record?.role, 200),
      field: str(record?.field, 200),
      country: str(record?.country, 200),
      birthDate: birth,
      deathDate: death,
      storyTitle: str(record?.story_title, 200),
      famousQuote: str(record?.famous_quote, 1000),
      imageUrl: str(record?.image_url, 2000),
      storyChildhoodTitle: str(record?.story_childhood_title, 300),
      childhoodImageUrl: str(record?.childhood_image_url, 2000),
      storyChildhood: str(record?.story_childhood, 5000),
      storyTakeaway: str(record?.story_takeaway, 1000),
      modern: objOrNull<StorySection>(record?.modern),
      chapters: arr<Chapter>(record?.chapters),
      timeline: arr<TimelineEntry>(record?.timeline),
      afterTreasures: objOrNull<StorySection>(record?.after_treasures),
      treasures: arr<Treasure>(record?.treasures),
      lessons: arr<Lesson>(record?.lessons),
      updatedAt,
    })
    .where(eq(remarkablePerson.slug, slug))
    .returning({ slug: remarkablePerson.slug });

  if (!result[0]) return { ok: false, error: 'This person no longer exists.' };
  // A priority (or any) edit changes the Born Today ordering — refresh the
  // public page's cache alongside the library.
  revalidatePath('/admin/people');
  revalidatePath('/daily-gold-edition');
  return { ok: true, updated_at: updatedAt.toISOString() };
}

/**
 * Flip a person between Draft and Published. Publishing takes effect
 * immediately — the public story page and Born Today read `published`.
 */
export async function setPublished(slug: string, published: boolean):
  Promise<{ ok: boolean; error?: string; published?: boolean }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  const value = published === true;
  const result = await db
    .update(remarkablePerson)
    .set({ published: value, updatedAt: new Date() })
    .where(eq(remarkablePerson.slug, slug))
    .returning({ slug: remarkablePerson.slug });
  if (!result[0]) return { ok: false, error: 'This person no longer exists.' };

  revalidatePath('/admin/people');
  revalidatePath(`/stories/${slug}`);
  revalidatePath('/daily-gold-edition');
  return { ok: true, published: value };
}

/**
 * Set the Born Today display order for a group of people (all born the same
 * month-day) from a slug list in the desired top-to-bottom order. Priority is
 * "higher shows first", so the first slug gets the largest value and each
 * subsequent one steps down by 1 — the exact numbers don't matter, only their
 * relative order within the day's set (getPeopleForDate sorts on this).
 */
export async function reorderBornToday(slugsInOrder: string[]):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const slugs = Array.isArray(slugsInOrder)
    ? slugsInOrder.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 100)
    : [];
  if (slugs.length === 0) return { ok: false, error: 'Nothing to reorder.' };
  // Reject duplicates — a repeated slug would make the ordering ambiguous.
  if (new Set(slugs).size !== slugs.length) return { ok: false, error: 'Duplicate people in the order.' };

  const n = slugs.length;
  await db.transaction(async (tx) => {
    for (let i = 0; i < slugs.length; i++) {
      await tx
        .update(remarkablePerson)
        .set({ bornTodayPriority: n - i, updatedAt: new Date() })
        .where(eq(remarkablePerson.slug, slugs[i]));
    }
  });

  revalidatePath('/admin/people');
  revalidatePath('/daily-gold-edition');
  return { ok: true };
}

// ── AI text generation (Phase 5) ─────────────────────────────────────────────
// A leave-and-return writer: the whole-book brief job, per-field rewrites, and
// the golden-thread / character-sheet panels. Jobs are DB rows run in-process
// (lib/golden-story/jobs); the editor polls getPersonJobs while any is running.

const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

/**
 * Kick the whole-book writer. Validates the person is empty (or the caller
 * confirmed overwriting) and has a name, then starts a `brief` job that writes
 * the brief, persists it, and applies its text to the person — stamping the
 * five stages as it goes. Returns immediately; the editor polls getPersonJobs.
 */
export async function generateBook(slug: string, opts?: { confirm?: boolean }):
  Promise<{ ok: true; jobId: number } | { ok: false; error?: string; needsConfirm?: boolean }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };

  const rows = await db.select().from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
  const person = rows[0];
  if (!person) return { ok: false, error: 'This person no longer exists.' };
  const name = person.name?.trim();
  if (!name) return { ok: false, error: 'Add a name before generating the book.' };

  const hasContent = (person.chapters?.length ?? 0) > 0
    || hasText(person.storyChildhood) || hasText(person.storyTakeaway)
    || (person.timeline?.length ?? 0) > 0 || (person.treasures?.length ?? 0) > 0;
  if (hasContent && !opts?.confirm) return { ok: false, needsConfirm: true };

  // The writing runs on Inngest (generateBrief in lib/inngest/functions.ts) — a
  // durable, dashboard-visible run that survives a redeploy. This only creates
  // the job row the editor polls and sends the triggering event.
  const created = await createJob(personSubject(slug), 'brief', initialBriefStages());
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({ name: 'story/brief.requested', data: { slug, jobId: created.job.id } });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the book writer.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the book writer — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

/**
 * Draft an alternative for one narrative field. `currentText` is the live value
 * from the editor (narratives live on the person and may have diverged from any
 * brief), stored alongside the proposal so the CURRENT / AI-PROPOSES review is
 * stable. The proposal is applied only on the editor's explicit Accept.
 */
export async function startRewrite(slug: string, fieldPath: string, currentText: string):
  Promise<{ ok: true; jobId: number } | { ok: false; error?: string }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  if (typeof fieldPath !== 'string' || !fieldPath) return { ok: false, error: 'Missing field.' };
  const current = typeof currentText === 'string' ? currentText.slice(0, 5000) : '';

  // The draft runs on Inngest (rewriteField in lib/inngest/functions.ts). The
  // live editor value rides the event since it may differ from any brief; the
  // prompt seed (name + golden thread + character sheet) is re-read there.
  const created = await createJob(personSubject(slug), 'rewrite', { fieldPath });
  if (!created.ok) return { ok: false, error: created.error };
  try {
    await inngest.send({ name: 'story/rewrite.requested', data: { slug, jobId: created.job.id, fieldPath, current } });
  } catch {
    await failJob(created.job.id, 'Could not reach Inngest to enqueue the rewrite.');
    return { ok: false, error: 'Could not reach Inngest to enqueue the rewrite — is the dev server running?' };
  }
  return { ok: true, jobId: created.job.id };
}

/** Delete a job row — Reject/Accept/Dismiss on a rewrite, or clearing a job. */
export async function dismissJob(jobId: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (typeof jobId !== 'number' || !Number.isFinite(jobId)) return { ok: false };
  await deleteJob(jobId);
  return { ok: true };
}

/**
 * The person's active jobs for polling: the latest brief job (running, failed,
 * or freshly done so the editor reloads once) and every rewrite job (running or
 * an unresolved proposal — resolved ones are deleted on Accept/Reject). Phase 6
 * adds the latest image jobs: the single-slot Path-A render (`slot`, awaiting
 * Accept/Revert) and the batch renderer (`images`, feeding the status board).
 */
export async function getPersonJobs(slug: string):
  Promise<{ brief: GenerationJobRow | null; rewrites: GenerationJobRow[]; slot: GenerationJobRow | null; images: GenerationJobRow | null }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { brief: null, rewrites: [], slot: null, images: null };
  const rows = await jobsForSlug(slug);
  return {
    brief: rows.find((r) => r.kind === 'brief') ?? null,
    rewrites: rows.filter((r) => r.kind === 'rewrite'),
    slot: rows.find((r) => r.kind === 'slot') ?? null,
    images: rows.find((r) => r.kind === 'images') ?? null,
  };
}

/** The golden thread + character sheet for the ambient panels (from the brief). */
export async function getStoryBrief(slug: string):
  Promise<{ goldenThread: string; characterSheet: string } | null> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return null;
  const rows = await db.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
  const brief = rows[0]?.brief;
  if (!brief) return null;
  return { goldenThread: brief.golden_thread ?? '', characterSheet: brief.character_sheet ?? '' };
}

/** Edit the golden thread (the story's spine), stored on the brief. */
export async function updateGoldenThread(slug: string, text: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  const value = typeof text === 'string' ? text.trim().slice(0, 500) : '';
  const rows = await db.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
  const brief = rows[0]?.brief;
  if (!brief) return { ok: false, error: 'Generate the book first — the golden thread lives on its brief.' };
  await db
    .update(storyBrief)
    .set({ brief: { ...brief, golden_thread: value }, updatedAt: new Date() })
    .where(eq(storyBrief.slug, slug));
  return { ok: true };
}

export type PersonSuggestion = { name: string; birth_date: string; field: string; why: string };

/** Suggest remarkable people born on a MM-DD, for the create flow's picker. */
export async function suggestPeople(monthDay: string, exclude: string[] = []):
  Promise<{ ok: true; suggestions: PersonSuggestion[] } | { ok: false; error: string }> {
  await requireAdmin();
  if (typeof monthDay !== 'string' || !/^\d{2}-\d{2}$/.test(monthDay)) {
    return { ok: false, error: 'Pick a month and day first.' };
  }
  const names = Array.isArray(exclude) ? exclude.filter((n) => typeof n === 'string').slice(0, 400) : [];
  try {
    const raw = await runPrompt(suggestPersons(monthDay, names));
    const parsed = JSON.parse(raw) as { suggestions?: PersonSuggestion[] };
    return { ok: true, suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 8) : [] };
  } catch {
    return { ok: false, error: 'Could not fetch suggestions — try again.' };
  }
}
