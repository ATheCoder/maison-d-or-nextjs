/**
 * The editor's image-slot model (Phase 6, screens ② and ④). Pure and
 * client-safe: no `server-only`, no env, no fetch — it only reads the person
 * draft, the brief (for scenes) and the per-slot overrides, and assembles the
 * same prompts `buildSlots` does. The editor derives slot cards and the status
 * board from this; the server reuses it to render Path A / batch images.
 *
 * The slot LIST is derived from the person (so it tracks live edits — added
 * chapters, reordered timeline — and works before any brief exists), while each
 * slot's SUBJECT scene is read from the brief by position. Placement/blend come
 * from the person's own layout hints so the prompt's bleed block and the
 * "needs white bg" rule match what the book actually renders.
 */
import {
  STYLE, COVER_BLEED, STRIP_BLEED, SINGLE_BLEED, OPAQUE, PAPER,
  EDITION_STYLE, HERO_BLEED, VIGNETTE_TALL, VIGNETTE_ROUND, BAND_BLEED, SPOT_PANEL, CARD_FILL,
  EDITION_PENCIL_STYLE, PENCIL_HERO, PENCIL_TALL, PENCIL_ROUND, PENCIL_BAND, PENCIL_PANEL, PENCIL_CARD,
  EDITION_CHAPTER_FIGURES,
  type SlotPlacement, type SlotBlend,
} from './prompts.ts';
import type { AnyBrief } from './brief.ts';
import type { ArtStyle, SlotOverride, StoryFormat } from '@/src/db/schema';
import type { ImageQuality, ImageSlot, SlotTreatment } from '@/lib/daily-gold/slots.ts';

/**
 * The book renders every slot at one quality — its art is printed-page sized
 * and shown unobscured, so there is nothing here to trade away (unlike the
 * Daily Gold list surfaces, which vary it per slot). Lives here rather than in
 * imageStore.ts so the client-side modal and the server renderer read one
 * value; imageStore.ts is `server-only` and cannot be imported by either.
 */
export const BOOK_IMAGE_QUALITY: ImageQuality = 'low';

// The person shape this reads — a structural subset of EditorPerson, declared
// locally so the module stays free of the server actions' types.
export type SlotPerson = {
  /**
   * Which book this person is — it decides the whole slot table, not a detail
   * of it. Absent means 'classic', so every caller that predates the Book
   * Edition (and every flip-book row) keeps the table it always had.
   */
  story_format?: StoryFormat | null;
  /**
   * Which hand draws the pictures. Absent means 'painted', so every caller that
   * predates the pencil style keeps the art it has always asked for. It changes
   * the style block, the composition block and — for the Book Edition — the
   * blend, but never which slots exist: the two styles paint the same table.
   */
  art_style?: ArtStyle | null;
  image_url?: string | null;
  childhood_image_url?: string | null;
  modern?: { image_url?: string | null; blend?: string } | null;
  after_treasures?: { image_url?: string | null; blend?: string } | null;
  chapters: { image_url?: string | null; page_span?: string; blend?: string; figure?: string }[];
  timeline: { image_url?: string | null }[];
  treasures: { image_url?: string | null }[];
  fun_facts?: { image_url?: string | null }[];
};

export type SlotStatus = 'empty' | 'prompt-ready' | 'generating' | 'generated' | 'uploaded' | 'failed';

// One slot's static descriptor: what it is, where its art lives on the person,
// where its scene lives in the brief, and how the art meets the page.
export type SlotDescriptor = {
  file: string;        // 'cover.png', 'chapter-1.png', 'timeline-1.png'
  label: string;       // 'Chapter 2 · illustration'
  shortLabel: string;  // 'Chapter 2' — the status-board tile caption
  personPath: string;  // dotted path to the image field, e.g. 'chapters.1.image_url'
  briefField: string;  // dotted path to the scene, e.g. 'chapters.1.scene'
  size: string;        // '1024x1536'
  placement: SlotPlacement;
  blend: SlotBlend;    // 'multiply' ⇒ needs a flat-white background
  showsProtagonist: boolean; // whether the scene should carry the character sheet
  /**
   * Which hand draws this slot — the person's `art_style`, already resolved
   * (see artStyleOf). It rides on the descriptor rather than being passed
   * alongside it because every consumer that assembles a prompt has the
   * descriptor in hand and none of them should have to remember a second
   * argument: forgetting it would silently paint a pencil book in oils.
   */
  art: ArtStyle;
};

/**
 * A slot as the two tables below build it — everything except the art style,
 * which is stamped on afterwards by `slotDescriptors` because it is a property
 * of the whole person and not of any one slot.
 */
type BaseDescriptor = Omit<SlotDescriptor, 'art'>;

const TAIL: Record<SlotPlacement, string> = {
  cover: COVER_BLEED,
  strip: STRIP_BLEED,
  single: SINGLE_BLEED,
  opaque: OPAQUE,
  paper: PAPER,
  hero: HERO_BLEED,
  'vignette-tall': VIGNETTE_TALL,
  'vignette-round': VIGNETTE_ROUND,
  band: BAND_BLEED,
  'spot-panel': SPOT_PANEL,
  card: CARD_FILL,
};

// The pencil hand's composition blocks, one per Book Edition placement. Partial
// on purpose: the flip-book's five placements have no pencil block and never
// reach here, because `artStyleOf` only ever returns 'pencil' for a Book
// Edition. A missing entry falls back to the painted block rather than throwing
// — the wrong picture is recoverable, a story page that will not render is not.
const PENCIL_TAIL: Partial<Record<SlotPlacement, string>> = {
  hero: PENCIL_HERO,
  'vignette-tall': PENCIL_TALL,
  'vignette-round': PENCIL_ROUND,
  band: PENCIL_BAND,
  'spot-panel': PENCIL_PANEL,
  card: PENCIL_CARD,
};

// Which style block a placement is painted under. The two books are different
// products with different paint (see prompts.ts), and the placement is what
// tells them apart — there is no placement either book shares.
const STYLE_FOR: Record<SlotPlacement, string> = {
  cover: STYLE, strip: STYLE, single: STYLE, opaque: STYLE, paper: STYLE,
  hero: EDITION_STYLE, 'vignette-tall': EDITION_STYLE, 'vignette-round': EDITION_STYLE,
  band: EDITION_STYLE, 'spot-panel': EDITION_STYLE, card: EDITION_STYLE,
};

/** The style block a slot is drawn under — the placement's book, in its hand. */
export function styleFor(placement: SlotPlacement, art: ArtStyle): string {
  return art === 'pencil' && PENCIL_TAIL[placement] ? EDITION_PENCIL_STYLE : STYLE_FOR[placement];
}

/** The fixed composition block for a slot — where the picture meets the page. */
export function tailFor(placement: SlotPlacement, art: ArtStyle): string {
  return (art === 'pencil' ? PENCIL_TAIL[placement] : undefined) ?? TAIL[placement];
}

/**
 * The hand a person's art is drawn in, as the slot model is allowed to use it.
 *
 * 'pencil' is a Book Edition style only. A flip-book row carrying the value is
 * resolved back to 'painted' here rather than anywhere downstream, so there is
 * exactly one place that decides it and no half-pencil book can be assembled:
 * the flip-book is a painted picture book by definition (docs/golden-stories-bible.md,
 * standing decision 4), and its five placements have no pencil composition block.
 */
export function artStyleOf(person: SlotPerson): ArtStyle {
  return person.story_format === 'edition' && person.art_style === 'pencil' ? 'pencil' : 'painted';
}

const isNormalBlend = (blend?: string): boolean => blend === 'normal' || blend === 'none';

/**
 * The ordered slot descriptors for a person — one per image their book holds,
 * in the order the book shows them.
 *
 * Which table you get is decided by the person's own `story_format`, not by an
 * argument, so a caller cannot accidentally paint a Book Edition with flip-book
 * plates: the descriptors carry the file names, the sizes, the placements and
 * the style block, and the two sets have no file name in common.
 */
export function slotDescriptors(person: SlotPerson): SlotDescriptor[] {
  const art = artStyleOf(person);
  const table = person.story_format === 'edition' ? editionSlotDescriptors(person) : classicSlotDescriptors(person);
  // The pencil hand changes how EVERY slot meets the page, not which slots
  // exist, so it is stamped over the finished table rather than threaded into
  // both tables. `blend` flips with it: a pencil drawing arrives on flat white
  // and is multiplied onto the paper (the flip-book's bargain), where a painted
  // Book Edition plate is opaque and masked. That one field is what makes the
  // rest follow — the modal previews the multiply, uploads are checked for a
  // white background, and the reader composites it as ink on the page.
  return art === 'pencil'
    ? table.map((d) => ({ ...d, art, blend: 'multiply' as const }))
    : table.map((d) => ({ ...d, art }));
}

/**
 * The Book Edition's slots. Every one is opaque and full-frame — the page's CSS
 * masks do the feathering the flip-book asks the painter for — so nothing here
 * is `multiply` and nothing needs a white background.
 *
 * The chapter figures are the interesting part. Their shape comes from the
 * chapter's own `figure` field when it has one (the editor lets an admin move a
 * picture from the right margin to the left, or drop it entirely), and falls
 * back to EDITION_CHAPTER_FIGURES by position for a chapter that has never been
 * told. A chapter whose figure is 'none' gets NO slot at all — it is a stretch
 * of unbroken text by design, and offering art for it would put a painting on
 * the page that the page has nowhere to put.
 */
function editionSlotDescriptors(person: SlotPerson): BaseDescriptor[] {
  const out: BaseDescriptor[] = [
    {
      file: 'hero.png', label: 'Hero portrait', shortLabel: 'Hero',
      personPath: 'image_url', briefField: 'hero_scene',
      size: '1024x1536', placement: 'hero', blend: 'normal', showsProtagonist: true,
    },
  ];

  person.chapters.forEach((c, i) => {
    const shape = figureShape(c.figure, i);
    if (shape === 'none') return;
    const placement: SlotPlacement =
      shape === 'band' ? 'band' : shape === 'round' ? 'vignette-round' : 'vignette-tall';
    out.push({
      file: `chapter-${i + 1}.png`,
      label: `Chapter ${i + 1} · ${FIGURE_LABEL[shape]}`,
      shortLabel: `Chapter ${i + 1}`,
      personPath: `chapters.${i}.image_url`,
      briefField: `chapters.${i}.scene`,
      // The band is painted 1536x640 — 12:5, the exact shape of the frame the
      // page cuts (.plateBand). It was 1536x1024 until 2026-08-31, and a 3:2
      // painting dropped into a wide band lost more than half its height to
      // `cover`: BAND_BLEED asks for a panoramic slice, but at 3:2 the painter
      // composed an ordinary scene and the crop took the subject's head off.
      size: shape === 'band' ? '1536x640' : shape === 'round' ? '1024x1280' : '1024x1536',
      placement,
      blend: 'normal',
      showsProtagonist: true,
    });
  });

  // Square, and its own placement: the card bleeds this one to its edge as an
  // upright panel whose height follows the text, so it is neither the chapter
  // spot's cameo oval nor a shape known at painting time. See SPOT_PANEL.
  (person.fun_facts ?? []).forEach((_, i) => out.push({
    file: `fun-fact-${i + 1}.png`, label: `Fun fact ${i + 1} · panel`, shortLabel: `Fact ${i + 1}`,
    personPath: `fun_facts.${i}.image_url`, briefField: `fun_facts.${i}.scene`,
    size: '1024x1024', placement: 'spot-panel', blend: 'normal', showsProtagonist: false,
  }));

  person.treasures.forEach((_, i) => out.push({
    file: `treasure-${i + 1}.png`, label: `Treasure ${i + 1} · card`, shortLabel: `Treas ${i + 1}`,
    personPath: `treasures.${i}.image_url`, briefField: `treasures.${i}.scene`,
    size: '1024x1024', placement: 'card', blend: 'normal', showsProtagonist: false,
  }));

  // No timeline art and no modern art on purpose: the design draws the
  // timeline as a scroll-filled rule of years, and prints the "if they were ten
  // today" daydream as a card with no picture, so that the one invented page in
  // the book is also the one page with nothing illustrated to look real.
  return out;
}

/** A chapter's figure shape: its own choice, else the design's by position. */
export function figureShape(figure: string | undefined, index: number): 'tall' | 'round' | 'band' | 'none' {
  if (figure === 'tall' || figure === 'round' || figure === 'band' || figure === 'none') return figure;
  return EDITION_CHAPTER_FIGURES[index] ?? 'none';
}

const FIGURE_LABEL: Record<'tall' | 'round' | 'band', string> = {
  tall: 'figure (right margin)',
  round: 'spot (left margin)',
  band: 'wide band',
};

/** The flip-book's slots — the original table, unchanged. */
function classicSlotDescriptors(person: SlotPerson): BaseDescriptor[] {
  const out: BaseDescriptor[] = [
    { file: 'cover.png', label: 'Cover', shortLabel: 'Cover', personPath: 'image_url', briefField: 'cover_scene', size: '1024x1536', placement: 'cover', blend: 'normal', showsProtagonist: true },
    { file: 'strip-childhood.png', label: 'Childhood strip', shortLabel: 'Childhood', personPath: 'childhood_image_url', briefField: 'childhood_scene', size: '1536x640', placement: 'strip', blend: 'multiply', showsProtagonist: false },
  ];

  person.chapters.forEach((c, i) => {
    const normal = isNormalBlend(c.blend);
    const opaque = c.page_span === 'image' || c.page_span === 'both' || normal;
    out.push({
      file: `chapter-${i + 1}.png`,
      label: `Chapter ${i + 1} · illustration`,
      shortLabel: `Chapter ${i + 1}`,
      personPath: `chapters.${i}.image_url`,
      briefField: `chapters.${i}.scene`,
      size: '1024x1536',
      placement: opaque ? 'opaque' : 'single',
      blend: normal ? 'normal' : 'multiply',
      showsProtagonist: true,
    });
  });

  out.push({
    file: 'modern.png', label: 'Modern spread', shortLabel: 'Modern', personPath: 'modern.image_url', briefField: 'modern.scene',
    size: '1536x1024', placement: 'opaque', blend: person.modern?.blend === 'multiply' ? 'multiply' : 'normal', showsProtagonist: true,
  });
  out.push({
    file: 'after-treasures.png', label: 'After treasures', shortLabel: 'After', personPath: 'after_treasures.image_url', briefField: 'after_treasures.scene',
    size: '1024x1536', placement: isNormalBlend(person.after_treasures?.blend) ? 'opaque' : 'single', blend: isNormalBlend(person.after_treasures?.blend) ? 'normal' : 'multiply', showsProtagonist: true,
  });

  person.timeline.forEach((_, i) => out.push({
    file: `timeline-${i + 1}.png`, label: `Timeline ${i + 1}`, shortLabel: `Time ${i + 1}`, personPath: `timeline.${i}.image_url`, briefField: `timeline.${i}.scene`,
    size: '1024x1024', placement: 'paper', blend: 'multiply', showsProtagonist: true,
  }));
  person.treasures.forEach((_, i) => out.push({
    file: `treasure-${i + 1}.png`, label: `Treasure ${i + 1}`, shortLabel: `Treas ${i + 1}`, personPath: `treasures.${i}.image_url`, briefField: `treasures.${i}.scene`,
    size: '1024x1024', placement: 'paper', blend: 'multiply', showsProtagonist: false,
  }));

  return out;
}

/**
 * The four lists on a person whose rows each carry their own `image_url`, and
 * the parser for a slot's dotted `personPath` into one of them.
 *
 * This exists as ONE function because it used to exist as three regexes — in
 * imageStore (the DB write), imageSlots (the slot card's thumbnail) and
 * PersonEditor (mirroring a finished render into the live draft) — and adding
 * the Book Edition's `fun_facts` to two of the three shipped a data-loss bug:
 * a generated fun-fact image was written to the column correctly, the editor's
 * draft never learned about it because its copy of the regex did not match, and
 * the next autosave wrote the whole draft back with `image_url: null` over the
 * art that had just been paid for.
 *
 * Every caller that turns a personPath into a list index must come through
 * here, so that a fifth list can only be added in one place.
 */
export type ImageListKey = 'chapters' | 'timeline' | 'treasures' | 'fun_facts';

const IMAGE_LIST_KEYS: readonly ImageListKey[] = ['chapters', 'timeline', 'treasures', 'fun_facts'];

export function parseImageListPath(personPath: string): { list: ImageListKey; index: number } | null {
  const m = /^([a-z_]+)\.(\d+)\.image_url$/.exec(personPath);
  if (!m) return null;
  const list = m[1] as ImageListKey;
  return IMAGE_LIST_KEYS.includes(list) ? { list, index: Number(m[2]) } : null;
}

/** Read a dotted path (numeric indices allowed) out of an object as a string. */
export function readPath(source: unknown, path: string): string {
  let node: unknown = source;
  for (const key of path.split('.')) {
    if (node == null || typeof node !== 'object') return '';
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === 'string' ? node : '';
}

/** The slot's SUBJECT scene from the brief (empty when there is no brief). */
export function sceneFor(brief: AnyBrief | null, briefField: string): string {
  return brief ? readPath(brief, briefField) : '';
}

/**
 * The full assembled prompt for a slot: the "Edit full prompt" override
 * verbatim if present, otherwise the style block + the scene + the fixed
 * composition block — byte-identical to `buildSlots` for a painted flip-book.
 * Empty when there is no scene and no override (nothing to generate yet).
 *
 * It takes the descriptor rather than a loose placement so that the art style
 * cannot be dropped on the way in. It used to take `(scene, placement)`, and a
 * fourth optional argument for the hand would have been forgotten by exactly
 * one of the five callers — which does not fail, it just quietly renders the
 * wrong medium and bills for it.
 */
export function promptFor(
  slot: Pick<SlotDescriptor, 'placement' | 'art'>,
  scene: string,
  override?: SlotOverride,
): string {
  if (override?.fullPrompt) return override.fullPrompt;
  if (!scene.trim()) return '';
  const { style, composition } = fixedBlocksFor(slot);
  return `${style}\n\nNew scene: ${scene}\n\n${composition}`;
}

/**
 * The fixed style + composition blocks a slot always carries, shown collapsed
 * as a read-only preamble (the scene is the editable part between them).
 */
export function fixedBlocksFor(slot: Pick<SlotDescriptor, 'placement' | 'art'>):
  { style: string; composition: string } {
  return { style: styleFor(slot.placement, slot.art), composition: tailFor(slot.placement, slot.art) };
}

/**
 * What "⧉ Copy prompt + parameters" puts on the clipboard: the prompt plus the
 * generation parameters that are NOT prompt text — the pixel size and, for
 * multiply slots, the flat-white-background requirement (the design's callout).
 */
export function copyPayload(prompt: string, size: string, blend: SlotBlend): string {
  const footer = blend === 'multiply'
    ? `\nThe background must be pure flat white (#FFFFFF) — off-white or textured backgrounds will show as a box on the page.`
    : '';
  return `${prompt}\n\n---\nParameters (not prompt text):\nsize ${size.replace('x', '×')}${footer}`;
}

/** Whether a scene opens with the character sheet verbatim (the art anchor). */
export function includesCharacterSheet(scene: string, characterSheet: string): boolean {
  const cs = characterSheet.trim();
  if (!cs) return false;
  return scene.trim().toLowerCase().startsWith(cs.toLowerCase());
}

/** Resolve a slot's glanceable status from its art, source and any job state. */
export function slotStatus(o: {
  imageUrl: string | null | undefined;
  source?: SlotOverride['source'];
  hasPrompt: boolean;
  jobState?: 'running' | 'failed';
}): SlotStatus {
  if (o.jobState === 'running') return 'generating';
  if (o.jobState === 'failed') return 'failed';
  if (o.imageUrl && o.imageUrl.trim()) return o.source === 'uploaded' ? 'uploaded' : 'generated';
  return o.hasPrompt ? 'prompt-ready' : 'empty';
}

// ── The shared-modal adapter ─────────────────────────────────────────────────
// Phase 2 of the Daily Gold plan puts both products' slots behind one
// descriptor interface so a single modal can serve them (R6.11/R6.12).
//
// The book's SlotDescriptor keeps its own extra fields — personPath,
// briefField, showsProtagonist — because the book pipeline genuinely needs
// them and buildSlots depends on their exact shape. Rather than reshape a live
// pipeline, a descriptor is *projected* onto the shared interface here. The
// modal sees one type; the book keeps its own.

/**
 * How the page composites a book slot — the modal previews through this.
 *
 * The paper under the multiply is the paper the picture actually lands on, so a
 * pencil slot is previewed on the Book Edition's leaf (#FBF7F0) and a flip-book
 * spot on the parchment (#F5F0E7). Getting this wrong is not cosmetic: the
 * preview is where an admin decides whether a drawing's whites are clean.
 */
function treatmentFor(d: SlotDescriptor): SlotTreatment {
  if (d.blend !== 'multiply') return { kind: 'none' };
  return { kind: 'multiply', paper: d.art === 'pencil' ? '#FBF7F0' : '#F5F0E7' };
}

/** Project a book slot onto the shared image-slot interface. */
export function toImageSlot(d: SlotDescriptor): ImageSlot {
  const { style, composition } = fixedBlocksFor(d);
  return {
    key: d.file,
    label: d.label,
    shortLabel: d.shortLabel,
    size: d.size,
    quality: BOOK_IMAGE_QUALITY,
    style,
    composition,
    treatment: treatmentFor(d),
    sceneSource: d.briefField,
    // A multiply slot vanishes into the page anywhere its background is not
    // pure white, so uploads are checked at the corner pixels.
    needsWhiteBackground: d.blend === 'multiply',
  };
}
