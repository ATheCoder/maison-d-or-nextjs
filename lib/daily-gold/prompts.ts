/**
 * Daily Gold art prompts — the oil-painting house style, kept deliberately
 * separate from lib/golden-story/prompts.ts (D6).
 *
 * The Golden Story STYLE is watercolour-and-ink storybook; the Daily Gold
 * surfaces are oil painting. Mixing them makes one day look assembled from two
 * products, so the two style blocks never import from each other.
 *
 * Each COMPOSITION block below encodes a real CSS treatment the reader applies
 * to that surface. They are not decoration: an image that reads well as a
 * thumbnail dies under a radial mask, so the prompt has to ask for art that
 * survives the treatment in the first place (R3.15).
 *
 * ── REWRITTEN FOR THE GALLERY (see components/dailygold/galleryCss.ts) ──────
 *
 * Every block here used to end by describing a gradient: "the lower third
 * fades into the page", "the bottom quarter of the frame fades", "shown faded
 * under a warm cream wash with a title written across it". Those washes existed
 * because the reader printed its words *over* the pictures and needed ground to
 * print them on.
 *
 * The gallery hangs the label beneath the work, so every one of those washes is
 * gone. A painting is now shown whole, at full opacity, inside a hairline
 * frame, cropped only to the frame's aspect. Left unrewritten these prompts
 * would keep asking for art composed around a treatment that no longer exists —
 * a dead lower third in every painting, and an admin preview showing a wash the
 * reader never applies. What each block asks for now is the opposite: fill the
 * frame, and survive the crop.
 *
 * Pure and synchronous — no env, no fetch, safe on the client.
 */

/**
 * Harvested verbatim from the house style DGMoreToExplore carried, which is
 * the real style the surfaces were designed against.
 */
export const STYLE = `Fine art oil painting, luminous and painterly, in the style of a luxurious illustrated storybook. Rich warm natural light, soft visible brushstrokes, depth and atmosphere, golden hour glow. Warm cream, gold, sage, and earth tones. Elegant, serene, emotionally warm, museum-quality illustration. Soft focus background, beautiful composition. NOT flat, NOT cartoon, NOT vector, NOT simple graphic art. Oil on canvas texture, fine detail, painterly realism with a dreamy quality. No text, no watermarks, no logos.`;

/**
 * The entrance painting. Hung whole and full-bleed across the top of the page,
 * cropped hard: 21:9 on a desktop, 4:3 on a tablet, 4:5 on a phone. The only
 * words on it are on the two dark themes, where the day's headline stands in
 * the lower-left quadrant over a ramp — so that corner has to be able to go
 * dark without losing the picture.
 */
export const HERO_COMPOSITION = `Wide, calm, atmospheric landscape composition of the place itself, filling the whole frame edge to edge with no empty margin and no vignette. The subject must sit near the centre and survive being cropped to a narrow letterbox on a wide screen and to an upright portrait on a phone, so keep everything that matters well inside the middle of the frame and let the far left and right edges be open sky, haze, water or distant hills. The lower-left quadrant is where a headline is sometimes laid over the painting, so keep faces and fine detail out of it. No frame, no border, no text, no lettering, no signature.`;

/**
 * The destination's own painting, hung as the largest work on its wall at 4:3,
 * whole and unobscured. It is also the entrance's fallback on a day with no
 * masthead painting of its own, which is most days.
 */
export const DESTINATION_COMPOSITION = `Landscape composition of the place itself — architecture, coastline, street or countryside — filling a 4:3 frame completely, edge to edge. The painting is hung whole with nothing laid over it, so the whole frame is seen: no empty foreground, no dead band at the bottom, no vignette. Warm inviting daylight, a sense of somewhere a family would want to walk. No frame, no border, no text, no lettering, no signature.`;

/**
 * A good-news work on the salon wall: 4:3, hung whole. The lead is hung at
 * double size and the rest at roughly a quarter of the wall's width, so the
 * subject has to hold at both.
 */
export const NEWS_COMPOSITION = `A single clear, gentle subject filling a 4:3 frame, painted from life rather than symbolically — a real moment rather than an abstract idea. The painting is hung whole with nothing laid over it, so it must read complete on its own: no dead band anywhere in the frame, no vignette. It is shown both large and at about a quarter of that size, so one clear subject rather than a busy scene. Hopeful, warm and specific. Nothing distressing, no crowds in conflict, no injury, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/**
 * An On This Day work in the year room: the year's lead event at 16:10, the
 * rest at 4:3, both hung whole beneath an enormous hollow numeral that sits
 * *behind* the work, never over it.
 */
export const HISTORY_COMPOSITION = `A simple, bold subject, large and clear in a wide landscape frame — one thing, readable at a glance. The painting is hung whole with nothing laid over it: fill the frame edge to edge, no dead band, no vignette. Historical scene painted warmly and calmly, suitable for a child of seven: no violence, no weapons pointed at anyone, no distress, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/**
 * A greatest moment. Rank one hangs as a work at 4:3 beside the ledger's index
 * of ten; the other nine are index rows with no picture at all, so this art is
 * only ever seen large. The thumbnail requirement the old block carried is
 * gone with the thumbnails.
 */
export const MOMENT_COMPOSITION = `A single iconic subject, large and centred, filling a landscape frame edge to edge with a simple uncluttered background. The painting is hung whole and shown large, with nothing laid over it — no dead band, no vignette, no empty foreground. A great moment in human history rendered with warmth and wonder rather than drama; nothing frightening, no violence, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/**
 * One of the day's four senses — a taste, a sound, a detail of nature, a word.
 * Hung small and SQUARE beside the destination's own painting, so a landscape
 * render is centre-cropped to 1:1 and roughly a third of its width is thrown
 * away. Everything has to be in the middle.
 *
 * These are the smallest works on the page and the most abstract subjects on
 * it, which is the same problem twice: a sound has no picture. So the ask is
 * for the concrete object a child would actually meet — the bowl, the bamboo,
 * the moss, the handwritten word — rather than for the idea of it.
 */
export const SENSE_COMPOSITION = `One concrete object or close detail, centred and filling the middle of the frame, painted at close range against a simple soft background. The image is cropped to a SQUARE and hung small, so everything that matters must sit well inside the centre — nothing important near the left or right edge — and it must read at about two hundred pixels across. A single subject, no scene, no people, no hands, nothing busy. Still-life intimacy: the thing itself, warmly lit. No frame, no border, no text, no lettering, no signature.`;

/** Which composition block a surface uses. */
export type DailyGoldPlacement = 'hero' | 'destination' | 'news' | 'history' | 'moment' | 'sense';

export const COMPOSITION: Record<DailyGoldPlacement, string> = {
  hero: HERO_COMPOSITION,
  destination: DESTINATION_COMPOSITION,
  news: NEWS_COMPOSITION,
  history: HISTORY_COMPOSITION,
  moment: MOMENT_COMPOSITION,
  sense: SENSE_COMPOSITION,
};

/**
 * The full prompt for a slot: style, then the editable scene, then the fixed
 * composition block. Same three-part shape as the Golden Story assembler, so
 * one modal can show "read-only preamble / editable scene" for both.
 *
 * Empty when there is no scene — there is nothing to generate yet, which is a
 * normal state, not an error (R6.2).
 */
export function buildPrompt(scene: string, placement: DailyGoldPlacement): string {
  if (!scene.trim()) return '';
  return `${STYLE}\n\nScene: ${scene.trim()}\n\n${COMPOSITION[placement]}`;
}

/**
 * The fixed blocks a slot always carries, shown collapsed as a read-only
 * preamble with the scene editable between them.
 */
export function fixedBlocksFor(placement: DailyGoldPlacement): { style: string; composition: string } {
  return { style: STYLE, composition: COMPOSITION[placement] };
}
