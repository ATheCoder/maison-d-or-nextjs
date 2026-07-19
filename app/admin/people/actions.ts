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
  type JobProgress,
} from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { slugify, SLUG_RE } from '@/lib/slug';
import type { Brief } from '@/lib/golden-story/brief';
import { writeBrief, runPrompt, rewriteField, suggestPersons } from '@/lib/golden-story/brief';
import { startJob, jobsForSlug, deleteJob } from '@/lib/golden-story/jobs';

// Expected counts for a "complete" story (mirrors lib/golden-story counts).
const EXPECTED_CHAPTERS = 4;

export type PersonListItem = {
  slug: string;
  name: string;
  // 'MM-DD' or null — Born Today can't surface a person without a birth date.
  monthDay: string | null;
  missingBirthDate: boolean;
  published: boolean;
  coverUrl: string | null;
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
      coverUrl: remarkablePerson.imageUrl,
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

// ── AI text generation (Phase 5) ─────────────────────────────────────────────
// A leave-and-return writer: the whole-book brief job, per-field rewrites, and
// the golden-thread / character-sheet panels. Jobs are DB rows run in-process
// (lib/golden-story/jobs); the editor polls getPersonJobs while any is running.

const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

// The five stages screen ③ shows, driven coarsely: the model writes the whole
// book in one streamed call (stage "brief"), then the result is persisted and
// applied in the ordered steps below.
const BRIEF_STAGE_DEFS: [key: string, label: string][] = [
  ['brief', 'Brief & structure'],
  ['character', 'Character sheet & golden thread'],
  ['narratives', 'Chapter narratives'],
  ['lists', 'Timeline · treasures · lessons'],
  ['scenes', 'Per-slot image scenes'],
];

function initialBriefStages(): JobProgress {
  return { stages: BRIEF_STAGE_DEFS.map(([key, label], i) => ({ key, label, state: i === 0 ? 'active' : 'pending' })) };
}

// Parse the writer's human birth string ("April 15, 1452") to the YYYY-MM-DD
// the date column needs; leave it null if unparseable (the editor requires the
// admin to confirm the birth date anyway).
function toIsoDate(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const iso = new Date(t).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

// death_year is a year ("1519"), a full date, or empty (still living).
function normalizeDeath(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  const v = s.trim();
  return /^\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// Map a brief onto the person's story columns, mirroring toStoryJson's layout
// defaults (single-leaf chapters with the last one image-only, full-bleed
// modern spread, single-leaf after-treasures). Existing image URLs are kept by
// position so re-generating text never discards art.
function briefToColumns(brief: Brief, existing: RemarkablePersonRow) {
  const last = brief.chapters.length - 1;
  const exCh = existing.chapters ?? [];
  const exTl = existing.timeline ?? [];
  const exTr = existing.treasures ?? [];
  return {
    role: brief.role || null,
    field: brief.field || null,
    country: brief.country || null,
    birthDate: toIsoDate(brief.birth_date) ?? existing.birthDate,
    deathDate: normalizeDeath(brief.death_year),
    storyTitle: brief.name || existing.name,
    famousQuote: brief.famous_quote || null,
    storyChildhoodTitle: brief.story_childhood_title || null,
    storyChildhood: brief.story_childhood || null,
    storyTakeaway: brief.story_takeaway || null,
    modern: {
      page_span: 'both', blend: 'normal',
      title: brief.modern.title, narrative: brief.modern.narrative,
      image_url: existing.modern?.image_url ?? null,
    } as StorySection,
    chapters: brief.chapters.map((c, i): Chapter => (i === last
      ? { number: i + 1, page_span: 'image', blend: 'normal', image_url: exCh[i]?.image_url ?? null }
      : { number: i + 1, page_span: 'single', title: c.title, narrative: c.narrative, image_url: exCh[i]?.image_url ?? null })),
    timeline: brief.timeline.map((t, i): TimelineEntry => ({
      year: t.year, caption: t.caption, blend: 'multiply', image_url: exTl[i]?.image_url ?? null,
    })),
    afterTreasures: {
      page_span: 'single', blend: existing.afterTreasures?.blend ?? 'multiply', fade: false,
      title: brief.after_treasures.title, narrative: brief.after_treasures.narrative,
      image_url: existing.afterTreasures?.image_url ?? null,
    } as StorySection,
    treasures: brief.treasures.map((t, i): Treasure => ({
      name: t.name, description: exTr[i]?.description, image_url: exTr[i]?.image_url ?? null,
    })),
    lessons: brief.lessons.map((l): Lesson => ({ icon_name: l.icon_name, lesson: l.lesson })),
    updatedAt: new Date(),
  };
}

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

  const started = await startJob(slug, 'brief', initialBriefStages(), async (job) => {
    let progress = initialBriefStages();
    const advance = async (updates: Record<string, 'active' | 'done' | 'failed'>) => {
      progress = { stages: progress.stages!.map((s) => (updates[s.key] ? { ...s, state: updates[s.key] } : s)) };
      await job.setProgress(progress);
    };

    const brief = await writeBrief(name);
    await advance({ brief: 'done', character: 'active' });

    await db
      .insert(storyBrief)
      .values({ slug, brief, updatedAt: new Date() })
      .onConflictDoUpdate({ target: storyBrief.slug, set: { brief, updatedAt: new Date() } });
    await advance({ character: 'done', narratives: 'active' });

    await db.update(remarkablePerson).set(briefToColumns(brief, person)).where(eq(remarkablePerson.slug, slug));
    await advance({ narratives: 'done', lists: 'done', scenes: 'done' });

    return { applied: true };
  });

  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, jobId: started.job.id };
}

// Strip the odd wrapping the model sometimes adds around a single-string reply.
function cleanProposal(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('“') && s.endsWith('”')))) {
    s = s.slice(1, -1).trim();
  }
  return s;
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

  const briefRow = await db.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
  const brief = briefRow[0]?.brief;
  const personRow = await db.select({ name: remarkablePerson.name }).from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
  const seed = {
    name: personRow[0]?.name ?? '',
    golden_thread: brief?.golden_thread ?? '',
    character_sheet: brief?.character_sheet ?? '',
  };

  const started = await startJob(slug, 'rewrite', { fieldPath }, async () => {
    const raw = await runPrompt(rewriteField(seed, fieldPath, current));
    return { fieldPath, current, proposal: cleanProposal(raw) };
  });
  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, jobId: started.job.id };
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
