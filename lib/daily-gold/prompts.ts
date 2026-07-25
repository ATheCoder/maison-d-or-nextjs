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
 * thumbnail dies under the hero's radial mask, so the prompt has to ask for art
 * that survives the mask in the first place (R3.15).
 *
 * Pure and synchronous — no env, no fetch, safe on the client.
 */

/**
 * Harvested verbatim from DGMoreToExplore's MASTER_STYLE, which is the real
 * house style the surfaces were designed against.
 */
export const STYLE = `Fine art oil painting, luminous and painterly, in the style of a luxurious illustrated storybook. Rich warm natural light, soft visible brushstrokes, depth and atmosphere, golden hour glow. Warm cream, gold, sage, and earth tones. Elegant, serene, emotionally warm, museum-quality illustration. Soft focus background, beautiful composition. NOT flat, NOT cartoon, NOT vector, NOT simple graphic art. Oil on canvas texture, fine detail, painterly realism with a dreamy quality. No text, no watermarks, no logos.`;

/**
 * The masthead behind the edition title. The reader renders it at 0.75 opacity
 * under an elliptical radial mask that fades everything outside the centre to
 * nothing, then washes the whole thing in cream and pans it slowly for forty
 * seconds. Detail at the edges is thrown away twice over, and the title sits
 * across the middle — so the ask is for a calm, wide, centre-weighted scene
 * with nothing important where the words go.
 */
export const HERO_COMPOSITION = `Wide, calm, atmospheric landscape composition with the subject weighted to the centre of the frame and the edges kept simple and uncluttered — soft sky, haze, open water or distant hills. The centre must read clearly at low contrast because the image is shown faded under a warm cream wash with a title written across it. No single high-contrast focal point in the middle of the frame, no busy foreground detail, no strong verticals through the centre. Nothing that would compete with overlaid text. No frame, no border, no text, no lettering, no signature.`;

/**
 * The destination card (180px tall) and its modal (340px), both under a bottom
 * gradient that fades the lower third into the card colour. Subject sits
 * centre-low so the gradient lands on ground rather than on faces.
 */
export const DESTINATION_COMPOSITION = `Landscape composition of the place itself — architecture, coastline, street or countryside — with the main subject sitting slightly below centre and the sky or open space filling the upper third. The bottom quarter of the frame fades into the page under a gradient, so keep faces, focal architecture and anything that must stay legible above that band. Warm inviting daylight, a sense of somewhere a family would want to walk. No frame, no border, no text, no lettering, no signature.`;

/**
 * A good-news card: 180px in the list, 300px in the modal, both under a
 * gradient that starts at 30% height. Two-thirds of the frame is what survives.
 */
export const NEWS_COMPOSITION = `A single clear, gentle subject filling the upper two-thirds of a landscape frame, photographed-from-life feeling but painted. The lower third fades into the page under a gradient, so nothing essential belongs there. Hopeful, warm and specific rather than symbolic — a real moment rather than an abstract idea. Nothing distressing, no crowds in conflict, no injury, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/**
 * An On This Day event: a 140px band with a gradient from 40% down. The
 * shallowest surface in the product, so the subject has to be simple and large.
 */
export const HISTORY_COMPOSITION = `A simple, bold subject filling the upper half of a wide, shallow landscape frame — one clear thing, large in the frame, readable at a glance in a short horizontal band. The lower half dissolves into the page under a gradient. Historical scene painted warmly and calmly, suitable for a child of seven: no violence, no weapons pointed at anyone, no distress, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/**
 * A greatest moment: a 280px card with a gradient from 40% down, and a 46px
 * rounded thumbnail in the ladder rows — so it must also survive being tiny.
 */
export const MOMENT_COMPOSITION = `A single iconic subject, large and centred in the upper half of a landscape frame, with a simple uncluttered background — the image is also shown as a 46-pixel thumbnail, so it must remain recognisable when very small. The lower half fades into the page under a gradient. A great moment in human history rendered with warmth and wonder rather than drama; nothing frightening, no violence, no wreckage. No frame, no border, no text, no lettering, no signature.`;

/** Which composition block a surface uses. */
export type DailyGoldPlacement = 'hero' | 'destination' | 'news' | 'history' | 'moment';

export const COMPOSITION: Record<DailyGoldPlacement, string> = {
  hero: HERO_COMPOSITION,
  destination: DESTINATION_COMPOSITION,
  news: NEWS_COMPOSITION,
  history: HISTORY_COMPOSITION,
  moment: MOMENT_COMPOSITION,
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
