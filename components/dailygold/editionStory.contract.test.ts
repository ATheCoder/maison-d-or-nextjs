import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EDITION_CHAPTER_FIGURES } from '../../lib/golden-story/prompts.ts';

/**
 * The rule this suite holds: everything the Book Edition's writer is REQUIRED
 * to produce for a chapter is printed on the page.
 *
 * It exists because that stopped being true and nothing noticed. Every chapter
 * carries a `fact` — "the one thing a child could tell somebody afterwards", the
 * bible's rule, mandatory in EDITION_WRITER_SYSTEM and flagged as a defect by
 * personSections.ts when it is missing. The writer wrote one per chapter, the
 * generator stored it, this component read it into its view model on line one
 * of the chapter map, and then the JSX never mentioned it again: six of the
 * best lines in every Book Edition were dead data. The caption went the same
 * way for a subtler reason — the figcaption was written out inside the band's
 * branch, so the two margin shapes dropped theirs.
 *
 * Both are invisible failures. The page renders, TypeScript is satisfied, the
 * admin desk reports those chapters as `done`, and only reading the book beside
 * the draft shows the difference. So the assertions here are deliberately not
 * "does this string appear somewhere in the file" — the dead `fact` appeared in
 * the file. They are: does the STORY ROOM read it, and is the caption printed
 * by something that cannot know which shape it is drawing.
 *
 * Why source text rather than a rendered DOM: this repo's vitest runs in node
 * with no jsdom, and EditionStory's import graph reaches `@/` aliases that the
 * test setup does not resolve (see lib/golden-story/editionSlots.test.ts for
 * the same constraint). Reading the source is what components/ds does for the
 * same class of rule, and it is enough — the defect was structural, not
 * behavioural.
 */

const ROOT = resolve(__dirname, '..', '..');
const SOURCE = readFileSync(join(ROOT, 'components/dailygold/EditionStory.tsx'), 'utf8');

/** Block and line comments. The docstrings here discuss these fields at length. */
function stripCommentary(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

const CODE = stripCommentary(SOURCE);

/** The text between two anchors, both of which are code rather than comment. */
function slice(from: string, to: string): string {
  const start = CODE.indexOf(from);
  const end = CODE.indexOf(to, start + 1);
  expect(start, `anchor not found: ${from}`).toBeGreaterThan(-1);
  expect(end, `anchor not found: ${to}`).toBeGreaterThan(start);
  return CODE.slice(start, end);
}

/** The chapter view model, and the room that is supposed to print it. */
const CHAPTER_MODEL = slice('const chapters = useMemo(', 'const funFacts = useMemo(');
const STORY_ROOM = slice('{roomFilled.story && (', '{roomFilled.lessons && (');

describe('the Book Edition prints what the writer wrote', () => {
  it('reads every field of the chapter view model in the story room', () => {
    // Derived, not listed: a field added to the model tomorrow is covered
    // tomorrow, and one that leaves stops being policed without anyone
    // editing a list here.
    const keys = [...CHAPTER_MODEL.matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
    expect(keys).toContain('fact');
    expect(keys).toContain('caption');

    const unread = keys.filter((k) => !STORY_ROOM.includes(`c.${k}`));
    expect(unread, 'built into the chapter object and never rendered').toEqual([]);
  });

  it('builds that model out of the fields the writer must produce', () => {
    // The other half of the trip: EDITION_WRITER_SYSTEM requires each of these
    // on every chapter, so each must arrive in the model to have any chance of
    // reaching the room. Named as the CHAPTER stores them — the brief's
    // `eyebrow` is written onto the chapter as `title` (textStore.ts), and the
    // rest keep their names.
    for (const stored of ['title', 'headline', 'narrative', 'fact', 'caption']) {
      expect(CHAPTER_MODEL, `chapter.${stored} never enters the view model`)
        .toMatch(new RegExp(`c\\.${stored}\\b`));
    }
  });

  it('prints the caption from one shape-blind figure component', () => {
    // The original bug in one assertion: a figcaption that lives inside a
    // per-shape branch prints for one shape and silently drops the rest.
    const figure = slice('function ChapterFigure(', 'function Fact(');
    expect(figure).toContain('figcaption');
    expect(figure).toContain('caption &&');

    const shapes = new Set(EDITION_CHAPTER_FIGURES.filter((s) => s !== 'none'));
    const table = slice('const FIGURE_SHAPES', 'function ChapterFigure(');
    for (const shape of shapes) {
      expect(table, `the design draws a ${shape} figure that has no frame`).toMatch(
        new RegExp(`\\b${shape}:`),
      );
    }

    // And nothing else in the room may draw one, or the branch can come back.
    const captions = STORY_ROOM.match(/figcaption/g) ?? [];
    expect(captions).toEqual([]);
  });

  it('prints the chapter fact, set apart from the narrative', () => {
    expect(STORY_ROOM).toMatch(/<Fact text=\{c\.fact\}/);
    const fact = slice('function Fact(', 'export default function EditionStory(');
    expect(fact, 'the fact must not render as prose').toContain('styles.fact');
  });
});
