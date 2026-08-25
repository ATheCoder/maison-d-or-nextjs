/**
 * Derive the editor rail from a draft person: the ordered section list with
 * the design's completeness-dot semantics (done / part / empty / warn) and the
 * spread each one flips the live book to. Pure — recomputed from the draft on
 * every edit so the rail and preview stay in lockstep.
 */
import { spreadIndexFor } from '@/components/dailygold/GoldenStory';
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
  kind: 'cover' | 'childhood' | 'chapter' | 'modern' | 'timeline' | 'treasures' | 'lessons' | 'after' | 'takeaway';
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
  return hasText(draft.story_childhood_fact)
    || draft.chapters.some((c) => hasText(c.fact))
    || hasText(draft.modern?.fact)
    || hasText(draft.after_treasures?.fact);
}

export function deriveSections(draft: DraftPerson): Section[] {
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

// A row list (timeline/treasures) scored by how many rows carry art.
function listStatus(rows: { image_url?: string | null }[]): { status: SectionStatus; count?: string } {
  if (!rows.length) return { status: 'empty' };
  const filled = rows.filter((r) => hasImg(r.image_url)).length;
  if (filled === rows.length) return { status: 'done' };
  return { status: 'part', count: `${filled} / ${rows.length}` };
}
