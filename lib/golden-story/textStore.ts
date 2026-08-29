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
  type Chapter, type StorySection, type TimelineEntry, type Treasure, type Lesson, type FunFact,
  type RemarkablePersonRow, type JobProgress, type JobResult, type StoryFormat,
} from '@/src/db/schema';
import type { Brief, EditionBrief } from './brief.ts';
import { writeBrief, runPrompt, rewriteField, isEditionBrief } from './brief.ts';
import { EDITION_CHAPTER_FIGURES } from './prompts.ts';
import { setJobProgress } from './jobs.ts';

// The five stages screen ③ shows, driven coarsely: the model writes the whole
// book in one streamed call (stage "brief"), then the result is persisted and
// applied in the ordered steps below.
const BRIEF_STAGE_DEFS: Record<StoryFormat, [key: string, label: string][]> = {
  classic: [
    ['brief', 'Brief & structure'],
    ['character', 'Character sheet & golden thread'],
    ['narratives', 'Chapter narratives'],
    ['lists', 'Timeline · treasures · lessons'],
    ['scenes', 'Per-slot image scenes'],
  ],
  // The Book Edition writes different rooms, so it names them — the panel is
  // the only window on a job that takes minutes, and "Chapter narratives" while
  // it is writing fun facts is a small lie that makes the panel useless for
  // telling whether a run is stuck.
  edition: [
    ['brief', 'Brief & structure'],
    ['character', 'Character sheet & golden thread'],
    ['narratives', 'Chapters, headlines & captions'],
    ['lists', 'Fun facts · treasures · timeline · lessons'],
    ['scenes', 'Per-slot image scenes'],
  ],
};

/** The brief job's initial progress — passed to createJob so the row polls right. */
export function initialBriefStages(format: StoryFormat = 'classic'): JobProgress {
  return {
    stages: BRIEF_STAGE_DEFS[format].map(([key, label], i) => ({ key, label, state: i === 0 ? 'active' : 'pending' })),
  };
}

/**
 * Parse the writer's human birth string ("April 15, 1452") to the YYYY-MM-DD
 * the date column needs; null if unparseable (the editor requires the admin to
 * confirm the birth date anyway).
 *
 * The date is read back in LOCAL time, not through toISOString(). Date.parse of
 * a date-only string with no zone lands on local midnight, so converting it to
 * UTC moves it backwards a day everywhere east of Greenwich: on a server in
 * Asia/Tehran, "April 21, 1926" was being stored as 1926-04-20. Born Today
 * surfaces a person by their birth month-day, so that is not a rounding
 * detail — it is the whole book appearing on the wrong day, and a date a child
 * reads as a fact being wrong.
 */
function toIsoDate(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

// death_year is a year ("1519"), a full date, or empty (still living).
function normalizeDeath(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  const v = s.trim();
  return /^\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// Map a brief onto the person's story columns, mirroring toStoryJson's layout
// defaults (single-leaf chapters, full-bleed modern spread, single-leaf
// after-treasures). Existing image URLs are kept by position so re-generating
// text never discards art.
//
// This and toStoryJson must stay in step: this is the editor's write path, that
// is the CLI's, and the two produce the same book. In particular the last
// chapter is no longer page_span 'image' with its narrative hidden — see the
// long note in storyJson.ts and docs/golden-stories-bible.md Standing
// decision 3.
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
    storyChildhoodFact: brief.story_childhood_fact || null,
    storyTakeaway: brief.story_takeaway || null,
    modern: {
      page_span: 'both', blend: 'normal',
      title: brief.modern.title, narrative: brief.modern.narrative,
      fact: brief.modern.fact,
      image_url: existing.modern?.image_url ?? null,
    } as StorySection,
    chapters: brief.chapters.map((c, i): Chapter => ({
      number: i + 1,
      page_span: 'single',
      // The final plate is opaque full-bleed art with the text washed over it;
      // the rest are painted on white and multiply into the parchment.
      ...(i === last ? { blend: 'normal', fade: true } : {}),
      title: c.title,
      narrative: c.narrative,
      fact: c.fact,
      image_url: exCh[i]?.image_url ?? null,
    })),
    timeline: brief.timeline.map((t, i): TimelineEntry => ({
      year: t.year, caption: t.caption, blend: 'multiply', image_url: exTl[i]?.image_url ?? null,
    })),
    afterTreasures: {
      page_span: 'single', blend: existing.afterTreasures?.blend ?? 'multiply', fade: false,
      title: brief.after_treasures.title, narrative: brief.after_treasures.narrative,
      fact: brief.after_treasures.fact,
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
 * Map a Book Edition brief onto the person's story columns.
 *
 * Two things differ from the flip-book's mapping beyond the field names, and
 * both are deliberate:
 *
 * 1. `page_span` / `blend` / `fade` are not written at all. They are flip-book
 *    layout hints — which leaf a chapter takes, whether its art multiplies into
 *    parchment, whether a wash sits behind overlaid text — and <EditionStory>
 *    has no leaves and no wash. Writing them would leave a Book Edition
 *    carrying instructions for a book it is not, which is exactly how the two
 *    formats start quietly bleeding into each other.
 * 2. `figure` IS written, from the design's fixed shape table. It is the Book
 *    Edition's real layout hint: it decides where a chapter's picture sits in
 *    the margin, and — because slotDescriptors reads it — whether that chapter
 *    is offered a picture at all. Writing it at generation time means the slot
 *    board is correct the moment the text lands, instead of after an admin has
 *    gone and chosen six shapes by hand.
 *
 * Existing image URLs are kept by position, so re-generating the text never
 * discards art that has already been painted and paid for.
 */
function editionBriefToColumns(brief: EditionBrief, existing: RemarkablePersonRow) {
  const exCh = existing.chapters ?? [];
  const exTr = existing.treasures ?? [];
  const exFf = existing.funFacts ?? [];
  return {
    role: brief.role || null,
    field: brief.field || null,
    country: brief.country || null,
    birthDate: toIsoDate(brief.birth_date) ?? existing.birthDate,
    deathDate: normalizeDeath(brief.death_year),
    storyTitle: brief.name || existing.name,
    famousQuote: brief.famous_quote || null,
    famousQuoteAttribution: brief.famous_quote_attribution || null,
    storyTakeaway: brief.story_takeaway || null,

    // The childhood columns belong to the flip-book's dedicated childhood
    // spread. This design opens straight into chapter one, which IS the
    // childhood, so they are cleared rather than left holding a previous
    // format's text.
    storyChildhoodTitle: null,
    storyChildhood: null,
    storyChildhoodFact: null,
    childhoodImageUrl: null,

    chapters: brief.chapters.map((c, i): Chapter => ({
      number: i + 1,
      title: c.eyebrow,
      headline: c.headline,
      narrative: c.narrative,
      fact: c.fact,
      caption: c.caption,
      figure: EDITION_CHAPTER_FIGURES[i] ?? 'none',
      image_url: exCh[i]?.image_url ?? null,
    })),

    funFacts: brief.fun_facts.map((f, i): FunFact => ({
      title: f.title, detail: f.detail, image_url: exFf[i]?.image_url ?? null,
    })),

    // No image_url and no layout hints: this card is drawn without a picture on
    // purpose (see editionSlotDescriptors) — the one invented page in the book
    // is also the one page with nothing illustrated to make it look real.
    modern: {
      narrative: brief.modern.narrative,
      fact: brief.modern.fact,
      traits: brief.modern.traits,
    } as StorySection,

    // Years only. The Book Edition draws its timeline as a scroll-filled rule,
    // so there are no vignettes to keep a blend for.
    timeline: brief.timeline.map((t): TimelineEntry => ({ year: t.year, caption: t.caption })),

    // In this design "after treasures" introduces the gallery rather than
    // closing the book — the closing is `legacy` below.
    afterTreasures: {
      title: brief.gallery.title,
      headline: brief.gallery.headline,
      narrative: brief.gallery.intro,
    } as StorySection,

    treasures: brief.treasures.map((t, i): Treasure => ({
      name: t.name, action: t.action, description: t.description, image_url: exTr[i]?.image_url ?? null,
    })),

    lessons: brief.lessons.map((l): Lesson => ({ icon_name: l.icon_name, lesson: l.lesson })),

    legacy: {
      title: brief.legacy.title,
      headline: brief.legacy.headline,
      narrative: brief.legacy.narrative,
    } as StorySection,

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

  // The person's own format decides which book gets written, which prompt
  // writes it and which columns it lands in. It is read here rather than passed
  // in so that a job re-run after an admin changed the format writes the book
  // the person is now, not the one they were when the button was pressed.
  const format = person.storyFormat;

  let progress = initialBriefStages(format);
  const advance = async (updates: Record<string, 'active' | 'done' | 'failed'>) => {
    progress = { stages: progress.stages!.map((s) => (updates[s.key] ? { ...s, state: updates[s.key] } : s)) };
    await setJobProgress(jobId, progress);
  };

  const brief = await writeBrief(name, format);
  // The writer is schema-constrained, so a brief of the wrong shape means the
  // wrong prompt ran — a bug in this file, not a bad generation. Fail loudly
  // rather than write half a book into the wrong columns.
  if ((format === 'edition') !== isEditionBrief(brief)) {
    throw new NonRetriableError(`The writer returned a ${isEditionBrief(brief) ? 'Book Edition' : 'flip-book'} brief for a ${format} story.`);
  }
  await advance({ brief: 'done', character: 'active' });

  await db
    .insert(storyBrief)
    .values({ slug, brief, updatedAt: new Date() })
    .onConflictDoUpdate({ target: storyBrief.slug, set: { brief, updatedAt: new Date() } });
  await advance({ character: 'done', narratives: 'active' });

  const columns = isEditionBrief(brief)
    ? editionBriefToColumns(brief, person)
    : briefToColumns(brief, person);
  await db.update(remarkablePerson).set(columns).where(eq(remarkablePerson.slug, slug));
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
    .select({ name: remarkablePerson.name, storyFormat: remarkablePerson.storyFormat })
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);
  const seed = {
    name: personRow[0]?.name ?? '',
    golden_thread: brief?.golden_thread ?? '',
    character_sheet: brief?.character_sheet ?? '',
    // Which house prompt judges the rewrite. Without it a Book Edition
    // paragraph comes back as flip-book stanzas — a well-written answer to the
    // wrong question, and one an admin might well accept before noticing.
    story_format: personRow[0]?.storyFormat,
  };
  const raw = await runPrompt(rewriteField(seed, fieldPath, current));
  return { fieldPath, current, proposal: cleanProposal(raw) };
}
