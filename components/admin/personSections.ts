/**
 * Derive the editor rail from a draft person: the ordered section list with
 * the design's completeness-dot semantics (done / part / empty / warn) and the
 * spread each one flips the live book to. Pure — recomputed from the draft on
 * every edit so the rail and preview stay in lockstep.
 */
import { spreadIndexFor } from '@/components/dailygold/GoldenStory';
import type { EditorPerson } from '@/app/admin/people/actions';

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
};

const hasText = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0;
const hasImg = (u: unknown): boolean => typeof u === 'string' && u.trim().length > 0;

export function deriveSections(draft: EditorPerson): Section[] {
  const first = (draft.name || '').trim().split(/\s+/)[0] || 'they';
  const at = (id: string) => spreadIndexFor(draft, id);
  const out: Section[] = [];

  // Cover — always has a title; the "content" that can be missing is the art.
  out.push({
    id: 'cover', label: 'Cover', kind: 'cover', spreadIndex: at('cover'),
    ...(hasImg(draft.image_url) ? { status: 'done' as const } : { status: 'warn' as const, note: 'no art' }),
  });

  // Childhood page.
  out.push({
    id: 'childhood', label: 'Childhood page', kind: 'childhood', spreadIndex: at('childhood'),
    ...textArtStatus(draft.story_childhood, draft.childhood_image_url),
  });

  // Chapters (one row each).
  draft.chapters.forEach((c, i) => {
    const number = c.number ?? i + 1;
    const title = (c.title || '').trim();
    const label = title ? `Chapter ${number} · ${title}` : `Chapter ${number}`;
    let status: ReturnType<typeof textArtStatus>;
    if (c.page_span === 'image') {
      // Art-only closing chapter: no text expected.
      status = hasImg(c.image_url) ? { status: 'done' } : { status: 'empty' };
    } else {
      status = textArtStatus(c.title || c.narrative, c.image_url);
    }
    out.push({ id: `chapter-${i}`, label, kind: 'chapter', chapterIndex: i, spreadIndex: at(`chapter-${i}`), ...status });
  });

  // Modern ("If X were 10 today").
  out.push({
    id: 'modern', label: `If ${first} were 10 today`, kind: 'modern', spreadIndex: at('modern'),
    ...textArtStatus(draft.modern?.narrative, draft.modern?.image_url),
  });

  // Life timeline — partial by filled art.
  out.push({ id: 'timeline', label: 'Life timeline', kind: 'timeline', spreadIndex: at('timeline'), ...listStatus(draft.timeline) });

  // Treasures — partial by filled art.
  out.push({ id: 'treasures', label: 'Treasures', kind: 'treasures', spreadIndex: at('treasures'), ...listStatus(draft.treasures) });

  // Lessons — text only, no art.
  const lessonCount = draft.lessons.filter((l) => hasText(l.lesson)).length;
  out.push({
    id: 'lessons', label: 'Lessons', kind: 'lessons', spreadIndex: at('lessons'),
    status: lessonCount > 0 ? 'done' : 'empty',
  });

  // After-treasures ("Gifts That Live On").
  out.push({
    id: 'after-treasures', label: 'Gifts That Live On', kind: 'after', spreadIndex: at('after-treasures'),
    ...textArtStatus(draft.after_treasures?.narrative, draft.after_treasures?.image_url),
  });

  // Takeaway — one line, no art.
  out.push({
    id: 'takeaway', label: 'Takeaway', kind: 'takeaway', spreadIndex: at('takeaway'),
    status: hasText(draft.story_takeaway) ? 'done' : 'empty',
  });

  return out;
}

// Text present + art present → done; text but no art → warn ("no art");
// nothing → empty.
function textArtStatus(text: unknown, img: unknown): { status: SectionStatus; note?: string } {
  if (!hasText(text)) return { status: 'empty' };
  if (!hasImg(img)) return { status: 'warn', note: 'no art' };
  return { status: 'done' };
}

// A row list (timeline/treasures) scored by how many rows carry art.
function listStatus(rows: { image_url?: string | null }[]): { status: SectionStatus; count?: string } {
  if (!rows.length) return { status: 'empty' };
  const filled = rows.filter((r) => hasImg(r.image_url)).length;
  if (filled === rows.length) return { status: 'done' };
  return { status: 'part', count: `${filled} / ${rows.length}` };
}
