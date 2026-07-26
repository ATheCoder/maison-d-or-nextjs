/**
 * The image-slot model for the Daily Gold surfaces, and the shared descriptor
 * interface the one image modal is parameterised by (R6.11).
 *
 * The modal is parameterised by a slot descriptor, not by a screen: it takes
 * the size, the read-only style preamble, where the editable scene comes from,
 * and the treatment to preview through. That is the whole reason a single
 * component can serve the day editor, the almanac and the Golden Story editor
 * — see `toImageSlot` in lib/golden-story/slots.ts for the book's adapter.
 *
 * Pure and synchronous — no env, no fetch, safe on the client.
 */
import { COMPOSITION, STYLE, type DailyGoldPlacement } from './prompts.ts';

/**
 * The model-side render quality, passed through to OpenRouter's `/images`.
 * The endpoint validates this against exactly these four values.
 */
export type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

/**
 * How the reader treats a slot's image, so the modal can show what a family
 * actually sees rather than the raw file (R3.15). These are descriptions of
 * real CSS in the reader components, not aspirations.
 */
export type SlotTreatment =
  | { kind: 'none' }
  /** Radial mask + opacity + a cream wash — the masthead. */
  | { kind: 'mask-wash'; opacity: number; mask: string; wash: string }
  /** A gradient fading the lower part of the frame into the page. */
  | { kind: 'bottom-gradient'; from: string; colour: string }
  /** Multiply onto parchment — Golden Story spot art. */
  | { kind: 'multiply'; paper: string };

/**
 * One image slot, in the shape the shared modal consumes. Both products'
 * descriptors reduce to this.
 */
export type ImageSlot = {
  /** Stable identity: 'hero', 'destination', 'news:0', 'history:2019:1', 'moment:3'. */
  key: string;
  /** Human label for the modal header. */
  label: string;
  /** Short caption for a status tile. */
  shortLabel: string;
  /** Pixel size to request, e.g. '1536x1024'. */
  size: string;
  /** Model-side render quality — a per-slot cost/fidelity choice, see below. */
  quality: ImageQuality;
  /** The fixed read-only style preamble. */
  style: string;
  /** The fixed read-only composition block. */
  composition: string;
  /** How the reader renders it — what the modal previews through. */
  treatment: SlotTreatment;
  /**
   * Where the editable scene text lives, as a dotted path on the subject.
   * The modal reads and writes through this rather than knowing any schema.
   */
  sceneSource: string;
  /** True when the art must sit on flat white (the corner-pixel upload rule). */
  needsWhiteBackground: boolean;
};

export type SlotStatus = 'empty' | 'prompt-ready' | 'generating' | 'painted' | 'uploaded' | 'failed';

// ── The reader's real treatments ─────────────────────────────────────────────
// Lifted from the components so the modal's preview and the page agree by
// construction: DGHero.jsx:188-201, DGDestination.jsx, DGGoodNews.jsx:75,
// DGOnThisDay.jsx, DGGreatestMoments.jsx:59.

const HERO_TREATMENT: SlotTreatment = {
  kind: 'mask-wash',
  opacity: 0.75,
  mask: 'radial-gradient(ellipse 100% 90% at 50% 50%, black 40%, transparent 100%)',
  wash: 'linear-gradient(160deg, rgba(243,233,216,0.6) 0%, rgba(240,228,208,0.5) 40%, rgba(243,233,216,0.6) 100%)',
};

const gradient = (from: string, colour: string): SlotTreatment =>
  ({ kind: 'bottom-gradient', from, colour });

// ── Size and quality ─────────────────────────────────────────────────────────
// Landscape 3:2 everywhere: every Daily Gold surface is a wide card, and one
// aspect ratio keeps a rejected render from being unusable in a neighbouring
// slot. The *resolution* differs by surface, because the display sizes do.
//
// Two hard API constraints, both established against the live endpoint on
// 2026-07-26 (the same way the model id in openrouter.ts was): both dimensions
// must be divisible by 16, and the request is rejected below a minimum pixel
// budget — 1008×672 (677k px) is accepted, 960×640 (614k px) is not. Staying on
// the 48n×32n ladder is what keeps a size both exactly 3:2 and divisible by 16.

/** The masthead and the destination card — the two largest paintings. */
const LANDSCAPE = '1536x1024';

/**
 * The three list surfaces. Their art is never shown large or unobscured: the
 * biggest is the good-news modal hero at 720×300 CSS px, and every one of them
 * renders under a gradient wash that fades the lower half into the page
 * (`gradient(...)` below) — so detail beyond ~1000px is paid for and thrown
 * away. This is the smallest exact-3:2 size the endpoint accepts, and still
 * 1.4× that widest slot.
 *
 * The rejection message calls it the *current* minimum pixel budget, so this
 * sits exactly on a floor that OpenAI can raise. If these three surfaces ever
 * start failing to render with a 400 about pixel budget, the fix is one rung up
 * the ladder: '1056x704'.
 */
const LANDSCAPE_SMALL = '1008x672';

/** The masthead behind the edition title. */
export function heroSlot(): ImageSlot {
  return {
    key: 'hero',
    label: 'Masthead painting',
    shortLabel: 'Masthead',
    size: LANDSCAPE,
    quality: 'medium',
    style: STYLE,
    composition: COMPOSITION.hero,
    treatment: HERO_TREATMENT,
    sceneSource: 'hero_scene',
    needsWhiteBackground: false,
  };
}

/** The destination card and its modal. */
export function destinationSlot(): ImageSlot {
  return {
    key: 'destination',
    label: 'Destination painting',
    shortLabel: 'Destination',
    size: LANDSCAPE,
    quality: 'medium',
    style: STYLE,
    composition: COMPOSITION.destination,
    treatment: gradient('55%', 'rgba(247,242,232,1)'),
    sceneSource: 'destination_scene',
    needsWhiteBackground: false,
  };
}

/** A good-news item by display position; 0 is the lead. */
export function newsSlot(position: number): ImageSlot {
  const lead = position === 0;
  return {
    key: `news:${position}`,
    label: lead ? 'Lead story painting' : `Story ${position + 1} painting`,
    shortLabel: lead ? 'Lead' : `Story ${position + 1}`,
    size: LANDSCAPE_SMALL,
    quality: 'low',
    style: STYLE,
    composition: COMPOSITION.news,
    treatment: gradient('30%', 'rgba(247,242,232,0.87)'),
    sceneSource: `news.${position}.scene`,
    needsWhiteBackground: false,
  };
}

/** An On This Day event, identified by its year and position within that year. */
export function historySlot(year: number, position: number): ImageSlot {
  return {
    key: `history:${year}:${position}`,
    label: `${year} · event ${position + 1} painting`,
    shortLabel: `${year}·${position + 1}`,
    size: LANDSCAPE_SMALL,
    quality: 'low',
    style: STYLE,
    composition: COMPOSITION.history,
    treatment: gradient('40%', 'rgba(255,248,238,0.95)'),
    sceneSource: `history.${year}.${position}.scene`,
    needsWhiteBackground: false,
  };
}

/** A Greatest Moments rung, 1–10. */
export function momentSlot(rank: number): ImageSlot {
  return {
    key: `moment:${rank}`,
    label: `Moment ${rank} painting`,
    shortLabel: `#${rank}`,
    size: LANDSCAPE_SMALL,
    quality: 'low',
    style: STYLE,
    composition: COMPOSITION.moment,
    treatment: gradient('40%', '#F7F2E8'),
    sceneSource: `moments.${rank}.scene`,
    needsWhiteBackground: false,
  };
}

/** Parse a slot key back into its parts — the inverse of the builders above. */
export function parseSlotKey(key: string):
  | { kind: 'hero' | 'destination' }
  | { kind: 'news'; position: number }
  | { kind: 'history'; year: number; position: number }
  | { kind: 'moment'; rank: number }
  | null {
  if (key === 'hero' || key === 'destination') return { kind: key };
  const parts = key.split(':');
  if (parts[0] === 'news' && parts.length === 2) {
    const position = Number(parts[1]);
    return Number.isInteger(position) && position >= 0 ? { kind: 'news', position } : null;
  }
  if (parts[0] === 'history' && parts.length === 3) {
    const year = Number(parts[1]);
    const position = Number(parts[2]);
    return Number.isInteger(year) && Number.isInteger(position) && position >= 0
      ? { kind: 'history', year, position } : null;
  }
  if (parts[0] === 'moment' && parts.length === 2) {
    const rank = Number(parts[1]);
    return Number.isInteger(rank) && rank >= 1 && rank <= 10 ? { kind: 'moment', rank } : null;
  }
  return null;
}

/**
 * The descriptor for a slot key — the inverse of the five builders above.
 *
 * Server code (rendering, the asks) works from a stored key rather than from a
 * screen, so it needs the same descriptor the modal is handed. Returns null for
 * an unparseable key, which is also the validation server actions rely on.
 */
export function slotForKey(key: string): ImageSlot | null {
  const parsed = parseSlotKey(key);
  if (!parsed) return null;
  switch (parsed.kind) {
    case 'hero': return heroSlot();
    case 'destination': return destinationSlot();
    case 'news': return newsSlot(parsed.position);
    case 'history': return historySlot(parsed.year, parsed.position);
    case 'moment': return momentSlot(parsed.rank);
  }
}

/**
 * The staging key a Path-A render writes to before it is accepted.
 *
 * A separate prefix from the canonical keys, and the job id in the name, for
 * the same two reasons the book's staging keys carry it: every ✦ Regenerate is
 * a fresh object with no CDN cache to fight, and an abandoned preview is
 * identifiable enough to sweep up. Colons in a slot key become dashes — they
 * are legal in an S3 key but a nuisance in every tool that touches one.
 */
export function stagingKeyFor(slotKey: string, subjectKey: string, jobId: number): string | null {
  if (!parseSlotKey(slotKey)) return null;
  return `daily-gold-staging/${subjectKey}/${slotKey.replace(/:/g, '-')}.${jobId}.webp`;
}

/** The R2 key a slot's art is stored under (spec §8.4). */
export function storageKeyFor(slotKey: string, subjectKey: string): string | null {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return null;
  switch (parsed.kind) {
    case 'hero':
      return `hero-media/${subjectKey}.webp`;
    case 'destination':
      return `destination-media/${subjectKey}.webp`;
    case 'news':
      return `news-media/${subjectKey}/${parsed.position}.webp`;
    case 'history':
      return `history-media/${subjectKey}/year-${parsed.year}-${parsed.position}.webp`;
    case 'moment':
      return `moment-media/${subjectKey}/rank-${parsed.rank}.webp`;
  }
}

/** Resolve a slot's glanceable status — same vocabulary as the person editor. */
export function slotStatus(o: {
  imageUrl?: string | null;
  uploaded?: boolean;
  hasPrompt: boolean;
  jobState?: 'running' | 'failed';
}): SlotStatus {
  if (o.jobState === 'running') return 'generating';
  if (o.jobState === 'failed') return 'failed';
  if (o.imageUrl && o.imageUrl.trim()) return o.uploaded ? 'uploaded' : 'painted';
  return o.hasPrompt ? 'prompt-ready' : 'empty';
}

export type { DailyGoldPlacement };
