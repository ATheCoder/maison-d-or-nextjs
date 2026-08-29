/**
 * The Book Edition's slot table (lib/golden-story/slots.ts).
 *
 * What is worth pinning here is not that the table has the right length — it is
 * the three ways the two formats can quietly bleed into each other:
 *
 *  1. A Book Edition painted with flip-book plates. Every Book Edition plate is
 *     opaque and full-frame, and the page's CSS masks do the shaping; a
 *     multiply slot or a "painted on flat white" composition block would print
 *     as a pale bruise on cream paper.
 *  2. A chapter that the design gives no picture being offered one anyway. The
 *     Book Edition leaves stretches of unbroken text on purpose, and a slot for
 *     one is a painting the page has nowhere to put.
 *  3. The two styles converging. They are different products; if EDITION_STYLE
 *     ever stops reaching the Book Edition's prompts, nothing else fails.
 */
import { describe, it, expect } from 'vitest';
import { slotDescriptors, promptFor, figureShape, type SlotPerson } from './slots.ts';
import { EDITION_STYLE, STYLE, EDITION_CHAPTER_FIGURES } from './prompts.ts';

const person = (over: Partial<SlotPerson> = {}): SlotPerson => ({
  story_format: 'edition',
  image_url: null,
  chapters: Array.from({ length: 6 }, () => ({ image_url: null })),
  timeline: Array.from({ length: 5 }, () => ({ image_url: null })),
  treasures: Array.from({ length: 6 }, () => ({ image_url: null })),
  fun_facts: Array.from({ length: 3 }, () => ({ image_url: null })),
  ...over,
});

describe('the Book Edition slot table', () => {
  it('is chosen by the person, not by the caller', () => {
    const files = slotDescriptors(person()).map((d) => d.file);
    expect(files[0]).toBe('hero.png');
    // The flip-book's fixtures have no place in this book.
    expect(files).not.toContain('cover.png');
    expect(files).not.toContain('strip-childhood.png');
    expect(files).not.toContain('modern.png');
    expect(files).not.toContain('after-treasures.png');
  });

  it('falls back to a flip-book table for a classic person', () => {
    const files = slotDescriptors({ ...person(), story_format: 'classic' }).map((d) => d.file);
    expect(files).toContain('cover.png');
    expect(files).not.toContain('hero.png');
  });

  it('treats an absent format as the flip-book, so nothing that predates the Book Edition moves', () => {
    const files = slotDescriptors({ ...person(), story_format: undefined }).map((d) => d.file);
    expect(files).toContain('cover.png');
  });

  it('paints nothing with multiply — every plate is opaque and masked by the page', () => {
    for (const d of slotDescriptors(person())) expect(d.blend).toBe('normal');
  });

  it('gives a chapter a slot only where the design gives it a picture', () => {
    const files = slotDescriptors(person()).map((d) => d.file);
    EDITION_CHAPTER_FIGURES.forEach((shape, i) => {
      const expected = shape === 'none' ? false : true;
      expect(files.includes(`chapter-${i + 1}.png`)).toBe(expected);
    });
    // The design's own alternation, so this test fails if that table is edited
    // without the layout being reconsidered.
    expect(EDITION_CHAPTER_FIGURES).toEqual(['tall', 'band', 'none', 'round', 'none', 'none']);
  });

  it("lets a chapter override its shape, and 'none' retires its slot", () => {
    const chapters: SlotPerson['chapters'] = person().chapters.map(() => ({ image_url: null }));
    chapters[0] = { image_url: null, figure: 'none' };
    chapters[2] = { image_url: null, figure: 'round' };
    const files = slotDescriptors(person({ chapters })).map((d) => d.file);
    expect(files).not.toContain('chapter-1.png');
    expect(files).toContain('chapter-3.png');
  });

  it('sizes each figure for the shape the page cuts out of it', () => {
    const by = Object.fromEntries(slotDescriptors(person()).map((d) => [d.file, d]));
    expect(by['chapter-1.png'].size).toBe('1024x1536'); // tall, 3:4 radial mask
    expect(by['chapter-2.png'].size).toBe('1536x1024'); // band, feathered strip
    expect(by['chapter-4.png'].size).toBe('1024x1024'); // round, circle mask
    expect(by['treasure-1.png'].size).toBe('1024x1024');
    expect(by['fun-fact-1.png'].size).toBe('1024x1024');
  });

  it('draws no timeline and no modern art — the design has neither', () => {
    const files = slotDescriptors(person()).map((d) => d.file);
    expect(files.some((f) => f.startsWith('timeline-'))).toBe(false);
    expect(files).not.toContain('modern.png');
  });

  it('builds its prompts from the edition style, never the flip-book’s', () => {
    for (const d of slotDescriptors(person())) {
      const prompt = promptFor('A quiet room at dusk.', d.placement);
      expect(prompt.startsWith(EDITION_STYLE)).toBe(true);
      expect(prompt).not.toContain(STYLE);
      // The load-bearing sentence: nothing in this book is painted on white.
      expect(prompt).not.toContain('plain white background');
    }
  });

  it('keeps the flip-book’s prompts on the flip-book’s style', () => {
    for (const d of slotDescriptors({ ...person(), story_format: 'classic' })) {
      expect(promptFor('A quiet room at dusk.', d.placement).startsWith(STYLE)).toBe(true);
    }
  });
});

describe('figureShape', () => {
  it('honours an explicit choice over the design’s default', () => {
    expect(figureShape('round', 0)).toBe('round');
    expect(figureShape('none', 1)).toBe('none');
  });

  it('falls back to the design’s alternation by position', () => {
    expect(figureShape(undefined, 0)).toBe('tall');
    expect(figureShape('', 1)).toBe('band');
    expect(figureShape(undefined, 2)).toBe('none');
  });

  it('gives a chapter past the design’s six no picture', () => {
    expect(figureShape(undefined, 9)).toBe('none');
  });
});
