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
import { STYLE, COVER_BLEED, STRIP_BLEED, SINGLE_BLEED, OPAQUE, PAPER, type SlotPlacement, type SlotBlend } from './prompts.ts';
import type { Brief } from './brief.ts';
import type { SlotOverride } from '@/src/db/schema';
import type { ImageQuality, ImageSlot, SlotTreatment } from '@/lib/daily-gold/slots.ts';

/**
 * The book renders every slot at one quality — its art is printed-page sized
 * and shown unobscured, so there is nothing here to trade away (unlike the
 * Daily Gold list surfaces, which vary it per slot). Lives here rather than in
 * imageStore.ts so the client-side modal and the server renderer read one
 * value; imageStore.ts is `server-only` and cannot be imported by either.
 */
export const BOOK_IMAGE_QUALITY: ImageQuality = 'medium';

// The person shape this reads — a structural subset of EditorPerson, declared
// locally so the module stays free of the server actions' types.
export type SlotPerson = {
  image_url?: string | null;
  childhood_image_url?: string | null;
  modern?: { image_url?: string | null; blend?: string } | null;
  after_treasures?: { image_url?: string | null; blend?: string } | null;
  chapters: { image_url?: string | null; page_span?: string; blend?: string }[];
  timeline: { image_url?: string | null }[];
  treasures: { image_url?: string | null }[];
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
};

const TAIL: Record<SlotPlacement, string> = {
  cover: COVER_BLEED,
  strip: STRIP_BLEED,
  single: SINGLE_BLEED,
  opaque: OPAQUE,
  paper: PAPER,
};

const isNormalBlend = (blend?: string): boolean => blend === 'normal' || blend === 'none';

/** The ordered slot descriptors for a person — one per image the book holds. */
export function slotDescriptors(person: SlotPerson): SlotDescriptor[] {
  const out: SlotDescriptor[] = [
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
export function sceneFor(brief: Brief | null, briefField: string): string {
  return brief ? readPath(brief, briefField) : '';
}

/**
 * The full assembled prompt for a slot: the "Edit full prompt" override
 * verbatim if present, otherwise STYLE + the scene + the placement's fixed
 * bleed block — byte-identical to `buildSlots`. Empty when there is no scene
 * and no override (nothing to generate yet).
 */
export function promptFor(scene: string, placement: SlotPlacement, override?: SlotOverride): string {
  if (override?.fullPrompt) return override.fullPrompt;
  if (!scene.trim()) return '';
  return `${STYLE}\n\nNew scene: ${scene}\n\n${TAIL[placement]}`;
}

/**
 * The fixed style + composition blocks a slot always carries, shown collapsed
 * as a read-only preamble (the scene is the editable part between them).
 */
export function fixedBlocksFor(placement: SlotPlacement): { style: string; composition: string } {
  return { style: STYLE, composition: TAIL[placement] };
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

/** How the page composites a book slot — the modal previews through this. */
function treatmentFor(blend: SlotBlend): SlotTreatment {
  return blend === 'multiply'
    // Spot art multiplies onto the leaf's parchment, which is what makes the
    // flat-white background rule load-bearing rather than cosmetic.
    ? { kind: 'multiply', paper: '#F5F0E7' }
    : { kind: 'none' };
}

/** Project a book slot onto the shared image-slot interface. */
export function toImageSlot(d: SlotDescriptor): ImageSlot {
  return {
    key: d.file,
    label: d.label,
    shortLabel: d.shortLabel,
    size: d.size,
    quality: BOOK_IMAGE_QUALITY,
    style: STYLE,
    composition: TAIL[d.placement],
    treatment: treatmentFor(d.blend),
    sceneSource: d.briefField,
    // A multiply slot vanishes into the page anywhere its background is not
    // pure white, so uploads are checked at the corner pixels.
    needsWhiteBackground: d.blend === 'multiply',
  };
}
