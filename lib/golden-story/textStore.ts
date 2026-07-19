/**
 * Text-generation persistence and the durable bodies behind the whole-book
 * writer (screen ③) and per-field rewrites (Phase 5). Server-only: DB
 * reads/writes and the OpenRouter text calls live here so the `use server`
 * action file stays a thin validated wrapper, and so the Inngest functions
 * (lib/inngest/functions.ts) can import the bodies — a `use server` module can
 * only export actions. Mirrors imageStore.ts.
 */
import 'server-only';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import {
  remarkablePerson, storyBrief,
  type Chapter, type StorySection, type TimelineEntry, type Treasure, type Lesson,
  type RemarkablePersonRow, type JobProgress, type JobResult,
} from '@/src/db/schema';
import type { Brief } from './brief.ts';
import { writeBrief, runPrompt, rewriteField } from './brief.ts';
import { setJobProgress } from './jobs.ts';

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

/** The brief job's initial progress — passed to createJob so the row polls right. */
export function initialBriefStages(): JobProgress {
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
 * Write the whole book and apply it to the person — the body of the generateBrief
 * Inngest step. Reloads the person so a retried step works from current data,
 * stamps the five stages as it goes, and throws NonRetriableError where a retry
 * cannot help. Returns the job result the editor's freshly-done reload keys off.
 */
export async function runBriefJob(slug: string, jobId: number): Promise<JobResult> {
  const rows = await db.select().from(remarkablePerson).where(eq(remarkablePerson.slug, slug)).limit(1);
  const person = rows[0];
  if (!person) throw new NonRetriableError('This person no longer exists.');
  const name = person.name?.trim();
  if (!name) throw new NonRetriableError('Add a name before generating the book.');

  let progress = initialBriefStages();
  const advance = async (updates: Record<string, 'active' | 'done' | 'failed'>) => {
    progress = { stages: progress.stages!.map((s) => (updates[s.key] ? { ...s, state: updates[s.key] } : s)) };
    await setJobProgress(jobId, progress);
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
 * Draft an alternative for one narrative field — the body of the rewriteField
 * Inngest step. Re-reads the person/brief for the prompt seed; `current` (the
 * live editor value) rides in from the event since it may differ from the brief.
 * The proposal is applied only on the editor's explicit Accept.
 */
export async function runRewriteJob(slug: string, fieldPath: string, current: string): Promise<JobResult> {
  const briefRow = await db.select().from(storyBrief).where(eq(storyBrief.slug, slug)).limit(1);
  const brief = briefRow[0]?.brief;
  const personRow = await db
    .select({ name: remarkablePerson.name })
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);
  const seed = {
    name: personRow[0]?.name ?? '',
    golden_thread: brief?.golden_thread ?? '',
    character_sheet: brief?.character_sheet ?? '',
  };
  const raw = await runPrompt(rewriteField(seed, fieldPath, current));
  return { fieldPath, current, proposal: cleanProposal(raw) };
}
