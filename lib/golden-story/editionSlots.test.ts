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
 *  2. A chapter losing the picture the design gives it. Every chapter of this
 *     book is illustrated, and a chapter that silently stops being offered a
 *     slot is a stretch of grey the reader has to scroll through. The one way
 *     to retire a slot is an explicit `figure: 'none'` on the chapter, which an
 *     admin chooses; the design never does it by position.
 *  3. The two styles converging. They are different products; if EDITION_STYLE
 *     ever stops reaching the Book Edition's prompts, nothing else fails.
 */
import { describe, it, expect } from 'vitest';
import {
  slotDescriptors, promptFor, figureShape, parseImageListPath, type SlotPerson,
} from './slots.ts';
import { EDITION_STYLE, EDITION_PENCIL_STYLE, STYLE, EDITION_CHAPTER_FIGURES } from './prompts.ts';

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

  it('paints nothing with multiply — every painted plate is opaque and masked by the page', () => {
    for (const d of slotDescriptors(person())) expect(d.blend).toBe('normal');
  });

  it('gives every chapter a picture', () => {
    const files = slotDescriptors(person()).map((d) => d.file);
    EDITION_CHAPTER_FIGURES.forEach((shape, i) => {
      expect(shape).not.toBe('none');
      expect(files.includes(`chapter-${i + 1}.png`)).toBe(true);
    });
    // The design's own alternation, so this test fails if that table is edited
    // without the layout being reconsidered. Two things it is holding: no
    // chapter runs as unbroken text, and no two figures in a row sit in the
    // same margin (tall floats right, round floats left, band is full width).
    expect(EDITION_CHAPTER_FIGURES).toEqual(['tall', 'band', 'round', 'tall', 'round', 'band']);
  });

  it("lets a chapter override its shape, and 'none' retires its slot", () => {
    // Both indices are ones where the chapter's choice and the design's default
    // differ, so neither assertion can pass on the default alone: chapter one
    // is 'tall' by design and chapter two is 'band'.
    const chapters: SlotPerson['chapters'] = person().chapters.map(() => ({ image_url: null }));
    chapters[0] = { image_url: null, figure: 'none' };
    chapters[1] = { image_url: null, figure: 'round' };
    const descs = slotDescriptors(person({ chapters }));
    const files = descs.map((d) => d.file);
    expect(files).not.toContain('chapter-1.png');
    expect(descs.find((d) => d.file === 'chapter-2.png')?.size).toBe('1024x1280');
  });

  it('sizes each figure for the shape the page cuts out of it', () => {
    const by = Object.fromEntries(slotDescriptors(person()).map((d) => [d.file, d]));
    expect(by['chapter-1.png'].size).toBe('1024x1536'); // tall, 3:4 radial mask
    expect(by['chapter-2.png'].size).toBe('1536x640'); // band, 12:5 — the frame's own shape
    expect(by['chapter-3.png'].size).toBe('1024x1280'); // round, 4:5 cameo oval
    expect(by['chapter-4.png'].size).toBe('1024x1536'); // tall
    expect(by['chapter-5.png'].size).toBe('1024x1280'); // round
    expect(by['chapter-6.png'].size).toBe('1536x640'); // band — the closer
    expect(by['treasure-1.png'].size).toBe('1024x1024');
    expect(by['fun-fact-1.png'].size).toBe('1024x1024'); // bleeding panel, crop unknown
  });

  it('draws no timeline and no modern art — the design has neither', () => {
    const files = slotDescriptors(person()).map((d) => d.file);
    expect(files.some((f) => f.startsWith('timeline-'))).toBe(false);
    expect(files).not.toContain('modern.png');
  });

  it('builds its prompts from the edition style, never the flip-book’s', () => {
    for (const d of slotDescriptors(person())) {
      const prompt = promptFor(d, 'A quiet room at dusk.');
      expect(prompt.startsWith(EDITION_STYLE)).toBe(true);
      expect(prompt).not.toContain(STYLE);
      // The load-bearing sentence: nothing in this book is painted on white.
      expect(prompt).not.toContain('plain white background');
    }
  });

  it('keeps the flip-book’s prompts on the flip-book’s style', () => {
    for (const d of slotDescriptors({ ...person(), story_format: 'classic' })) {
      expect(promptFor(d, 'A quiet room at dusk.').startsWith(STYLE)).toBe(true);
    }
  });
});

/**
 * The pencil hand (ArtStyle 'pencil').
 *
 * The style is one column and a handful of strings, and every way it can fail
 * is silent: it renders, it costs money, and the mistake only shows up as a
 * picture that looks wrong on the page. So what is pinned here is the CONTRACT
 * rather than the wording —
 *
 *  1. It changes the medium, never the book. The same slots, the same files,
 *     the same sizes: a person who switches style must not lose or gain a
 *     picture, or the art already rendered stops lining up with its slot.
 *  2. It inverts the blend. A pencil drawing arrives on flat white and is
 *     multiplied onto the leaf; a plate that stayed `normal` would print as an
 *     opaque white rectangle on cream paper, and it would look correct in
 *     isolation.
 *  3. It never reaches the flip-book. That book has no pencil composition
 *     blocks, so a classic person carrying the value must resolve to painted
 *     rather than assembling a prompt out of half a style.
 */
describe('the pencil hand', () => {
  const drawn = (over: Partial<SlotPerson> = {}) => person({ art_style: 'pencil', ...over });

  it('draws the same slots as the painted hand — same files, same sizes', () => {
    const painted = slotDescriptors(person());
    const pencil = slotDescriptors(drawn());
    expect(pencil.map((d) => d.file)).toEqual(painted.map((d) => d.file));
    expect(pencil.map((d) => d.size)).toEqual(painted.map((d) => d.size));
    expect(pencil.map((d) => d.personPath)).toEqual(painted.map((d) => d.personPath));
    expect(pencil.map((d) => d.briefField)).toEqual(painted.map((d) => d.briefField));
  });

  it('multiplies every plate onto the paper, the inverse of the painted book', () => {
    for (const d of slotDescriptors(drawn())) {
      expect(d.blend).toBe('multiply');
      expect(d.art).toBe('pencil');
    }
  });

  it('asks for a drawing on flat white in every slot', () => {
    for (const d of slotDescriptors(drawn())) {
      const prompt = promptFor(d, 'A quiet room at dusk.');
      expect(prompt.startsWith(EDITION_PENCIL_STYLE)).toBe(true);
      expect(prompt).not.toContain(EDITION_STYLE);
      // The load-bearing sentence of this hand, and the exact opposite of the
      // painted book's: the drawing must dissolve into white, not fill its frame.
      expect(prompt).toContain('flat white (#FFFFFF)');
      expect(prompt).not.toContain('no blank margins');
    }
  });

  it('never reaches the flip-book, whose placements have no pencil block', () => {
    const classic = slotDescriptors({ ...person(), story_format: 'classic', art_style: 'pencil' });
    for (const d of classic) {
      expect(d.art).toBe('painted');
      expect(promptFor(d, 'A quiet room at dusk.').startsWith(STYLE)).toBe(true);
    }
  });

  it('leaves a painted Book Edition exactly as it was', () => {
    for (const d of slotDescriptors(person({ art_style: 'painted' }))) {
      expect(d.art).toBe('painted');
      expect(d.blend).toBe('normal');
      expect(promptFor(d, 'A quiet room at dusk.').startsWith(EDITION_STYLE)).toBe(true);
    }
  });

  it('treats an absent art style as painted, so nothing that predates it moves', () => {
    for (const d of slotDescriptors(person({ art_style: undefined }))) {
      expect(d.art).toBe('painted');
      expect(d.blend).toBe('normal');
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
    expect(figureShape(undefined, 2)).toBe('round');
    expect(figureShape(undefined, 5)).toBe('band');
  });

  it('gives a chapter past the design’s six no picture', () => {
    expect(figureShape(undefined, 9)).toBe('none');
  });
});

describe('parseImageListPath', () => {
  /**
   * This parser is the fix for a data-loss bug, so the test is written against
   * the loss rather than against the regex.
   *
   * The Book Edition added a fourth image-bearing list, `fun_facts`. The path
   * parser existed in three copies — the DB write, the slot card, and the
   * editor's mirror-into-the-draft — and only two were updated. The result was
   * not a missing thumbnail: the image was written to the column, the editor's
   * draft never learned it, and the next autosave wrote the whole draft back
   * with `image_url: null` over art that had already been rendered and paid
   * for. Every list a person can hold must parse, from the one function.
   */
  it('parses every image-bearing list a person has', () => {
    expect(parseImageListPath('chapters.0.image_url')).toEqual({ list: 'chapters', index: 0 });
    expect(parseImageListPath('timeline.4.image_url')).toEqual({ list: 'timeline', index: 4 });
    expect(parseImageListPath('treasures.5.image_url')).toEqual({ list: 'treasures', index: 5 });
    expect(parseImageListPath('fun_facts.2.image_url')).toEqual({ list: 'fun_facts', index: 2 });
  });

  it('parses the personPath of every slot both books declare', () => {
    const people: SlotPerson[] = [
      {
        story_format: 'edition',
        chapters: Array.from({ length: 6 }, () => ({ image_url: null })),
        timeline: Array.from({ length: 5 }, () => ({ image_url: null })),
        treasures: Array.from({ length: 6 }, () => ({ image_url: null })),
        fun_facts: Array.from({ length: 3 }, () => ({ image_url: null })),
      },
      {
        story_format: 'classic',
        modern: { image_url: null },
        after_treasures: { image_url: null },
        chapters: Array.from({ length: 4 }, () => ({ image_url: null })),
        timeline: Array.from({ length: 5 }, () => ({ image_url: null })),
        treasures: Array.from({ length: 6 }, () => ({ image_url: null })),
      },
    ];
    // A list path that does not parse is art the editor cannot mirror, so the
    // assertion is over EVERY slot rather than a sample.
    for (const person of people) {
      for (const d of slotDescriptors(person)) {
        const isListPath = /\.\d+\.image_url$/.test(d.personPath);
        expect(isListPath ? parseImageListPath(d.personPath) !== null : true).toBe(true);
      }
    }
  });

  it('refuses paths that are not one of those lists', () => {
    expect(parseImageListPath('image_url')).toBeNull();
    expect(parseImageListPath('modern.image_url')).toBeNull();
    expect(parseImageListPath('lessons.0.image_url')).toBeNull();
    expect(parseImageListPath('chapters.0.narrative')).toBeNull();
    expect(parseImageListPath('chapters.x.image_url')).toBeNull();
  });
});
