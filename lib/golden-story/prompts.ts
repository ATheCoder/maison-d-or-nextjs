/**
 * Fixed art-prompt blocks and the pure slot table — ported verbatim from
 * scripts/generate-story-openrouter.mjs so the CLI and the editor assemble
 * byte-identical prompts. Every block except the per-slot SUBJECT scene stays
 * byte-identical across a story; art the site renders with
 * mix-blend-mode: multiply must sit on plain flat WHITE (#FFFFFF) so multiply
 * makes it vanish into the page's own parchment.
 */
import type { Brief } from './brief.ts';

export const STYLE = `Richly detailed children's storybook illustration in classic European picture-book style: layered watercolor and gouache washes over fine brown-ink linework, painterly texture with deep warm shadows. Full-color but aged, warm palette — terracotta, chestnut brown, ochre, sage and olive green, dusty blue-grey, cream — bathed in glowing golden-hour light. Not monochrome, not sepia-toned, not line art.`;

// The childhood landscape strip: it sits at the bottom of the page with the
// text above it, so the bottom edge bleeds off the page fully painted, the
// top must dissolve into white where it meets the text, and the sides are
// left to the model — they're cropped by the page edge either way.
export const STRIP_BLEED = `The painting fills the entire frame and stays fully finished all the way to the bottom edge, bleeding off the bottom with no fading, no vignette and no white margin there. Toward the top edge the paint becomes progressively paler, looser and unfinished — thin dry washes dissolving into plain white paper, so the top of the frame ends in pure flat white (#FFFFFF) with no texture, no gradients and no shadows. The left and right edges may either stay fully painted to the edge or dissolve softly into white — both are fine. Never a circle, oval or medallion shape. No frame, no border, no text, no lettering, no signature.`;

// Single-leaf chapter plates (page_span "single"): the leaf overlays the
// title + narrative in the top-left, so the art is anchored bottom-right,
// bleeding off the right and bottom edges with NO fading there, and dissolves
// into white only toward the top and left where the text sits.
export const SINGLE_BLEED = `The painting is anchored to the bottom-right of the frame: the subject and richest detail sit in the lower right, and the paint stays fully finished all the way to the right edge and the bottom edge, bleeding off those two edges with no fading, no vignette and no white margin there. Only toward the top edge and the left edge does the paint become progressively paler, looser and unfinished — thin dry washes dissolving into plain white paper, leaving the upper-left region of the frame as pure flat white (#FFFFFF) with no texture, no gradients and no shadows. Never a circle, oval or medallion shape. No frame, no border, no text, no lettering, no signature.`;

// The cover: fully opaque, the CSS gradient overlay carries the title.
export const COVER_BLEED = `Full-bleed scene filling the entire frame edge to edge, rich background detail, muted warm tones, darker toward the top and bottom edges. No blank margins, no vignette, no frame, no border, no text, no signature.`;

// Other blend:"normal" slots (modern spread, final image-only chapter):
// opaque edge-to-edge art shown as-is.
export const OPAQUE = `Full-bleed scene filling the entire frame edge to edge with rich detail everywhere — no blank margins, no vignette, no frame, no border, no text, no lettering, no signature.`;

// Spot art (timeline, treasures) rendered with the multiply blend: subject on
// flat pure white so only the paint prints onto the page.
export const PAPER = `Painted directly on a plain white background: a single uniform flat color (#FFFFFF) with no paper texture, no gradients and no shadows in the empty areas. The scene fills almost the entire frame; only at the outer edges does the paint break up and dissolve into untouched white with soft, irregular, feathered watercolor edges — never a circle, oval, or any geometric medallion shape, and never a small image floating in empty space. No frame, no border, no text, no lettering, no signature.`;

// Story brief counts — enforced by instruction in WRITER_SYSTEM (structured
// outputs can't express minItems).
export const CHAPTERS = 4;
export const TIMELINE = 5;
export const TREASURES = 6;
export const LESSONS = 4;

// How the art meets the page — the fixed bleed block used and the compositing
// blend the site renders it with (GoldenStory defaults to 'multiply' unless
// blend is 'normal'/'none').
export type SlotPlacement = 'cover' | 'strip' | 'single' | 'opaque' | 'paper';
export type SlotBlend = 'normal' | 'multiply';

// One image slot: the assembled prompt plus the display metadata screens ②/④
// render (label, placement, blend, and which brief field its scene comes from).
export type Slot = {
  file: string;
  size: string;
  prompt: string;
  label: string;
  placement: SlotPlacement;
  blend: SlotBlend;
  // Dotted path into the brief the SUBJECT scene is read from, e.g.
  // 'cover_scene' or 'chapters.1.scene'.
  briefField: string;
};

/**
 * The slot table: one entry per image, mirroring the leonardo layout —
 * white-paper multiply plates for chapters 1–3 / childhood / after-treasures /
 * spots, and opaque blend:"normal" art for the cover, modern spread and final
 * chapter. Pure: given a brief it always returns the same slots, and the
 * `prompt`/`file`/`size` fields are byte-identical to the original CLI.
 */
export function buildSlots(brief: Brief): Slot[] {
  const scene = (
    file: string,
    size: string,
    text: string,
    tail: string,
    meta: { label: string; placement: SlotPlacement; blend: SlotBlend; briefField: string },
  ): Slot => ({ file, size, prompt: `${STYLE}\n\nNew scene: ${text}\n\n${tail}`, ...meta });

  const last = brief.chapters.length - 1;
  return [
    scene('cover.png', '1024x1536', brief.cover_scene, COVER_BLEED, {
      label: 'Cover',
      placement: 'cover',
      blend: 'normal',
      briefField: 'cover_scene',
    }),
    scene('strip-childhood.png', '1536x640', brief.childhood_scene, STRIP_BLEED, {
      label: 'Childhood strip',
      placement: 'strip',
      blend: 'multiply',
      briefField: 'childhood_scene',
    }),
    ...brief.chapters.map((c, i) =>
      scene(`chapter-${i + 1}.png`, '1024x1536', c.scene, i === last ? OPAQUE : SINGLE_BLEED, {
        label: `Chapter ${i + 1} · illustration`,
        placement: i === last ? 'opaque' : 'single',
        blend: i === last ? 'normal' : 'multiply',
        briefField: `chapters.${i}.scene`,
      }),
    ),
    scene('modern.png', '1536x1024', brief.modern.scene, OPAQUE, {
      label: 'Modern spread',
      placement: 'opaque',
      blend: 'normal',
      briefField: 'modern.scene',
    }),
    scene('after-treasures.png', '1024x1536', brief.after_treasures.scene, SINGLE_BLEED, {
      label: 'After treasures',
      placement: 'single',
      blend: 'multiply',
      briefField: 'after_treasures.scene',
    }),
    ...brief.timeline.map((t, i) =>
      scene(`timeline-${i + 1}.png`, '1024x1024', t.scene, PAPER, {
        label: `Timeline ${i + 1}`,
        placement: 'paper',
        blend: 'multiply',
        briefField: `timeline.${i}.scene`,
      }),
    ),
    ...brief.treasures.map((t, i) =>
      scene(`treasure-${i + 1}.png`, '1024x1024', t.scene, PAPER, {
        label: `Treasure ${i + 1}`,
        placement: 'paper',
        blend: 'multiply',
        briefField: `treasures.${i}.scene`,
      }),
    ),
  ];
}

/** The regeneration cheat-sheet written to art/raw/<slug>/prompts.md by the CLI. */
export function toPromptsMd(brief: Brief, slots: Slot[]): string {
  const rows = slots.map((s) => `## ${s.file} (${s.size})\n\n${s.prompt}\n`);
  return `# Image prompts — ${brief.name}\n\nGolden thread: ${brief.golden_thread}\nCharacter sheet: ${brief.character_sheet}\n\nRegenerate any image with its prompt below (size is a generation parameter, not prompt text) and save the PNG straight into public/stories/<slug>/ — no post-processing needed. Or re-render single slots via: npm run generate:story:openrouter -- "<Name>" --reuse-brief --only <slot>.\n\n${rows.join('\n')}`;
}
