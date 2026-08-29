/**
 * Derive the editor rail from a draft person: the ordered section list with
 * the design's completeness-dot semantics (done / part / empty / warn) and the
 * spread each one flips the live book to. Pure — recomputed from the draft on
 * every edit so the rail and preview stay in lockstep.
 */
import { spreadIndexFor } from '@/components/dailygold/GoldenStory';
import { figureShape } from '@/lib/golden-story/slots';
import type { DraftPerson } from './draftTypes';

export type SectionStatus = 'done' | 'part' | 'empty' | 'warn';

export type Section = {
  id: string;
  label: string;
  status: SectionStatus;
  note?: string; // right-aligned amber label, e.g. "no art"
  count?: string; // right-aligned mono count, e.g. "3 / 5"
  spreadIndex: number;
  // Which editor the center panel shows. Row-based sections (timeline,
  // treasures, lessons) get their full editors in Phase 4.
  kind:
    // Shared, and the flip-book's own.
    | 'cover' | 'childhood' | 'chapter' | 'modern' | 'timeline' | 'treasures'
    | 'lessons' | 'after' | 'takeaway'
    // The Book Edition's own rooms.
    | 'fun-facts' | 'legacy';
  chapterIndex?: number;
  // Chapter rows only: the draft's stable per-chapter `_key`, used as the
  // dnd-kit sortable id so the reorder animation tracks the chapter itself
  // rather than its slot (`id` above stays the positional `chapter-<i>` the
  // spread-index map expects).
  dndKey?: string;
};

const hasText = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0;
const hasImg = (u: unknown): boolean => typeof u === 'string' && u.trim().length > 0;

/**
 * Does this book answer to the fact-per-spread rule?
 *
 * The bible applies going forward only (Standing decision 1): the books written
 * before it carry no facts anywhere and are deliberately not backfilled, so
 * flagging every one of their sections would paint the rail amber for a book
 * nobody intends to change — and a warning nobody can act on is a warning that
 * teaches the eye to ignore warnings.
 *
 * A book that carries a fact ANYWHERE was written under the bible, so a section
 * missing one there is a real gap worth showing. A book with none anywhere is
 * pre-bible and left alone. The two populations do not overlap, because the
 * writer's schema makes a fact required on every narrative section — a bible-era
 * book arrives with all of them or the generation failed.
 */
export function holdsToFactRule(draft: DraftPerson): boolean {
  // Every Book Edition is bible-era by construction — the format postdates the
  // bible and its writer makes a fact required on every chapter — so the
  // "is this book exempt" question does not arise for one, and an empty fact
  // there is always a real gap rather than a pre-bible absence.
  if (draft.story_format === 'edition') return true;
  return hasText(draft.story_childhood_fact)
    || draft.chapters.some((c) => hasText(c.fact))
    || hasText(draft.modern?.fact)
    || hasText(draft.after_treasures?.fact);
}

/**
 * The rail for whichever book this person is. The two lists are genuinely
 * different — the Book Edition has no childhood spread and no takeaway row, and
 * has a fun-facts room and a legacy panel the flip-book has never heard of — so
 * this dispatches rather than branching field by field inside one builder.
 */
export function deriveSections(draft: DraftPerson): Section[] {
  return draft.story_format === 'edition' ? deriveEditionSections(draft) : deriveClassicSections(draft);
}

/**
 * The Book Edition's rail, in page order: cover, the six chapters, the fun
 * facts, the treasure gallery, the timeline, the lessons, the "if they were ten
 * today" card and the closing panel.
 *
 * `spreadIndex` carries a different meaning here and it is deliberate: the Book
 * Edition has no spreads, so the number is only ever handed back to the editor
 * as an opaque ordinal (it drives the "Section n of m" readout, and the preview
 * scrolls by section id instead). It is kept on the type rather than made
 * optional so the rail, the reducer and the centre panel all stay one shape.
 */
function deriveEditionSections(draft: DraftPerson): Section[] {
  const first = (draft.name || '').trim().split(/\s+/)[0] || 'they';
  const out: Section[] = [];
  let n = 0;
  const next = () => n++;

  // The hero portrait carries the title, the role and the dates: the text is
  // always there, so what can be missing is the art.
  out.push({
    id: 'cover', label: 'Hero & identity', kind: 'cover', spreadIndex: next(),
    ...(hasImg(draft.image_url) ? { status: 'done' as const } : { status: 'warn' as const, note: 'no art' }),
  });

  draft.chapters.forEach((c, i) => {
    const number = c.number ?? i + 1;
    const eyebrow = (c.title || '').trim();
    const label = eyebrow ? `Chapter ${number} · ${eyebrow}` : `Chapter ${number}`;
    // A chapter that runs as unbroken text is not missing a picture — the
    // design says it has none. Only a chapter with a figure shape is judged on
    // its art, which is why this asks slots.ts rather than guessing.
    const wantsArt = figureShape(c.figure, i) !== 'none';
    out.push({
      id: `chapter-${i}`, label, kind: 'chapter', chapterIndex: i, dndKey: c._key, spreadIndex: next(),
      ...editionChapterStatus(c, wantsArt),
    });
  });

  out.push({
    id: 'fun-facts', label: 'Fun facts', kind: 'fun-facts', spreadIndex: next(),
    ...listStatus(draft.fun_facts, (f) => hasText(f.title) || hasText(f.detail)),
  });

  out.push({
    id: 'treasures', label: 'Treasures', kind: 'treasures', spreadIndex: next(),
    ...listStatus(draft.treasures, (t) => hasText(t.name)),
  });

  // The gallery's own opening lines, on the same rail row as nothing else —
  // they are the words above the treasure grid.
  out.push({
    id: 'after-treasures', label: 'Gallery opening', kind: 'after', spreadIndex: next(),
    status: hasText(draft.after_treasures?.headline) || hasText(draft.after_treasures?.narrative) ? 'done' : 'empty',
  });

  // No art on the timeline in this design, so it is scored on its text.
  const dated = draft.timeline.filter((t) => hasText(t.year) || hasText(t.caption)).length;
  out.push({
    id: 'timeline', label: 'Life timeline', kind: 'timeline', spreadIndex: next(),
    ...(draft.timeline.length === 0
      ? { status: 'empty' as const }
      : dated === draft.timeline.length
        ? { status: 'done' as const }
        : { status: 'part' as const, count: `${dated} / ${draft.timeline.length}` }),
  });

  const lessonCount = draft.lessons.filter((l) => hasText(l.lesson)).length;
  out.push({
    id: 'lessons', label: 'Life lessons', kind: 'lessons', spreadIndex: next(),
    status: lessonCount > 0 ? 'done' : 'empty',
  });

  // The daydream card. It has no art in this design, and its fact is the true
  // thing it stands on — so a missing fact is a real gap here even though a
  // missing picture is not.
  out.push({
    id: 'modern', label: `If ${first} were 10 today`, kind: 'modern', spreadIndex: next(),
    ...(hasText(draft.modern?.narrative)
      ? (hasText(draft.modern?.fact) ? { status: 'done' as const } : { status: 'warn' as const, note: 'no fact' })
      : { status: 'empty' as const }),
  });

  out.push({
    id: 'legacy', label: 'Legacy & takeaway', kind: 'legacy', spreadIndex: next(),
    ...(hasText(draft.legacy?.headline) && hasText(draft.story_takeaway)
      ? { status: 'done' as const }
      : hasText(draft.legacy?.headline) || hasText(draft.legacy?.narrative) || hasText(draft.story_takeaway)
        ? { status: 'warn' as const, note: 'unfinished' }
        : { status: 'empty' as const }),
  });

  return out;
}

// A Book Edition chapter is scored on four things, not three: it needs a
// headline (the line that carries the page), a narrative, a fact, and art only
// where the layout gives it a picture.
function editionChapterStatus(c: DraftPerson['chapters'][number], wantsArt: boolean):
  { status: SectionStatus; note?: string } {
  if (!hasText(c.narrative) && !hasText(c.headline)) return { status: 'empty' };
  const missing: string[] = [];
  if (!hasText(c.headline)) missing.push('no headline');
  if (!hasText(c.narrative)) missing.push('no text');
  if (wantsArt && !hasImg(c.image_url)) missing.push('no art');
  if (!hasText(c.fact)) missing.push('no fact');
  if (missing.length) return { status: 'warn', note: missing.join(' · ') };
  return { status: 'done' };
}

function deriveClassicSections(draft: DraftPerson): Section[] {
  const first = (draft.name || '').trim().split(/\s+/)[0] || 'they';
  const at = (id: string) => spreadIndexFor(draft, id);
  const out: Section[] = [];
  // Captured once: every section below asks the same question of the same book.
  const wantsFacts = holdsToFactRule(draft);
  const status = (text: unknown, img: unknown, fact: unknown) =>
    textArtStatus(text, img, wantsFacts ? fact : 'n/a');

  // Cover — always has a title; the "content" that can be missing is the art.
  out.push({
    id: 'cover', label: 'Cover', kind: 'cover', spreadIndex: at('cover'),
    ...(hasImg(draft.image_url) ? { status: 'done' as const } : { status: 'warn' as const, note: 'no art' }),
  });

  // Childhood page.
  out.push({
    id: 'childhood', label: 'Childhood page', kind: 'childhood', spreadIndex: at('childhood'),
    ...status(draft.story_childhood, draft.childhood_image_url, draft.story_childhood_fact),
  });

  // Chapters (one row each).
  draft.chapters.forEach((c, i) => {
    const number = c.number ?? i + 1;
    const title = (c.title || '').trim();
    const label = title ? `Chapter ${number} · ${title}` : `Chapter ${number}`;
    let rowStatus: ReturnType<typeof textArtStatus>;
    if (c.page_span === 'image') {
      // Art-only chapter: no text and so no fact expected. Only pre-bible books
      // still have one (Standing decision 3 retired the wordless final plate).
      rowStatus = hasImg(c.image_url) ? { status: 'done' } : { status: 'empty' };
    } else {
      rowStatus = status(c.title || c.narrative, c.image_url, c.fact);
    }
    out.push({ id: `chapter-${i}`, label, kind: 'chapter', chapterIndex: i, dndKey: c._key, spreadIndex: at(`chapter-${i}`), ...rowStatus });
  });

  // The rows below follow the book's spread order (see GoldenStory's build
  // loop): timeline · treasures + after-treasures · modern + lessons.

  // Life timeline — partial by filled art.
  out.push({ id: 'timeline', label: 'Life timeline', kind: 'timeline', spreadIndex: at('timeline'), ...listStatus(draft.timeline) });

  // Treasures — partial by filled art.
  out.push({ id: 'treasures', label: 'Treasures', kind: 'treasures', spreadIndex: at('treasures'), ...listStatus(draft.treasures) });

  // After-treasures ("Gifts That Live On") — the treasures spread's right leaf.
  out.push({
    id: 'after-treasures', label: 'Gifts That Live On', kind: 'after', spreadIndex: at('after-treasures'),
    ...status(draft.after_treasures?.narrative, draft.after_treasures?.image_url, draft.after_treasures?.fact),
  });

  // Modern ("If X were 10 today").
  out.push({
    id: 'modern', label: `If ${first} were 10 today`, kind: 'modern', spreadIndex: at('modern'),
    ...status(draft.modern?.narrative, draft.modern?.image_url, draft.modern?.fact),
  });

  // Lessons — text only, no art; the band under Modern on the same spread.
  const lessonCount = draft.lessons.filter((l) => hasText(l.lesson)).length;
  out.push({
    id: 'lessons', label: 'Lessons', kind: 'lessons', spreadIndex: at('lessons'),
    status: lessonCount > 0 ? 'done' : 'empty',
  });

  // Takeaway — one line, no art.
  out.push({
    id: 'takeaway', label: 'Takeaway', kind: 'takeaway', spreadIndex: at('takeaway'),
    status: hasText(draft.story_takeaway) ? 'done' : 'empty',
  });

  return out;
}

// Text present + art present + fact present → done; text but something missing
// → warn, naming what; nothing → empty.
//
// A missing fact is a warning and never a block: publishing is never gated on
// any of this (docs/golden-stories-bible.md, Standing decision 2). Callers that
// do not hold this book to the fact rule pass a non-empty sentinel for `fact`.
function textArtStatus(text: unknown, img: unknown, fact: unknown = 'n/a'):
  { status: SectionStatus; note?: string } {
  if (!hasText(text)) return { status: 'empty' };
  const missing: string[] = [];
  if (!hasImg(img)) missing.push('no art');
  if (!hasText(fact)) missing.push('no fact');
  if (missing.length) return { status: 'warn', note: missing.join(' · ') };
  return { status: 'done' };
}

/**
 * A row list scored by how many of its rows are finished. `filled` defaults to
 * "carries art", which is what completeness means for the flip-book's timeline
 * vignettes and treasure spots; the Book Edition passes its own predicate,
 * since a fun fact with no picture is still a fun fact.
 */
function listStatus<T extends { image_url?: string | null }>(
  rows: T[],
  filled: (row: T) => boolean = (r) => hasImg(r.image_url),
): { status: SectionStatus; count?: string } {
  if (!rows.length) return { status: 'empty' };
  const done = rows.filter(filled).length;
  if (done === rows.length) return { status: 'done' };
  return { status: 'part', count: `${done} / ${rows.length}` };
}
