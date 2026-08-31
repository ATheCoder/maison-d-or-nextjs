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

// Other blend:"normal" slots (modern spread, final chapter): opaque
// edge-to-edge art shown as-is. The final chapter is no longer wordless —
// docs/golden-stories-bible.md Standing decision 3 — so its text now sits over
// this art behind the legibility wash. The prompt is unchanged by that: rich
// detail everywhere is still what the spread wants, and reserving a corner for
// the words (as SINGLE_BLEED does) would cost the drama the spread is for.
export const OPAQUE = `Full-bleed scene filling the entire frame edge to edge with rich detail everywhere — no blank margins, no vignette, no frame, no border, no text, no lettering, no signature.`;

// Spot art (timeline, treasures) rendered with the multiply blend: subject on
// flat pure white so only the paint prints onto the page.
export const PAPER = `Painted directly on a plain white background: a single uniform flat color (#FFFFFF) with no paper texture, no gradients and no shadows in the empty areas. The scene fills almost the entire frame; only at the outer edges does the paint break up and dissolve into untouched white with soft, irregular, feathered watercolor edges — never a circle, oval, or any geometric medallion shape, and never a small image floating in empty space. No frame, no border, no text, no lettering, no signature.`;

// ── The Book Edition ─────────────────────────────────────────────────────────
// A second design (StoryFormat 'edition') read as a scrolling editorial
// longread rather than a flip-book, so its art is a different job.
//
// The flip-book asks the painter to do the feathering: most of its plates are
// painted on flat white and multiplied into the parchment, and the bleed blocks
// above spend most of their words telling the model where to dissolve. The Book
// Edition asks for the opposite. Every plate here is OPAQUE and fills its frame
// edge to edge; the page then cuts the shape with a CSS mask — a soft radial
// for the tall figure, a circle for the round one, a feathered band for the
// strip. A model that leaves white margins under those masks produces a pale
// bruise on cream paper, so "no blank margins" is the load-bearing sentence in
// every block below and the reason none of them is `PAPER`.
//
// The register shifts with it. The flip-book is a picture book; the Book
// Edition is a collectible magazine — bigger type, longer reading, one
// photograph-scaled image at a time — so its style block asks for a heavier,
// more cinematic paint than the storybook washes. The two are deliberately
// different products and must not be reconciled into one string.

export const EDITION_STYLE = `Cinematic painted editorial illustration in the manner of a collectible biography: oil and gouache worked over a warm toned ground, visible brush and palette-knife texture, fine drybrush detail on faces and hands. Strong directional light with deep warm shadow and a single clear focal point. Restrained, aged palette — chestnut and umber, terracotta, ochre and old gold, sage and olive, dusty slate blue, bone cream. Painterly and tactile, never photographic, never digital-looking, never line art, never monochrome or sepia.`;

// The hero portrait behind the title. The page lays a dark scrim over the top
// and bottom and prints the name across the foot, so the face wants to sit high
// and the lower third wants to be quiet — busy detail down there fights the
// title. Deliberately NOT a cover in the flip-book sense: there is no medallion,
// no frame, and the art is cropped hard on both phone and desktop.
export const HERO_BLEED = `Full-bleed portrait filling the entire frame edge to edge with no blank margins, no vignette, no frame and no border. Compose it as a tall portrait: the subject's head and shoulders sit in the upper half of the frame and the lower third is quiet — background, atmosphere or plain shadow — because the title is printed across it. Keep the top and bottom edges naturally darker than the middle. The image is cropped on both sides at some viewing sizes, so nothing that matters may sit at the extreme left or right edge. No text, no lettering, no signature.`;

// The tall figure floated into the running text (3:4). Since 2026-08-31 the
// page prints it as a crisp rounded rectangle with a shadow, not a radial
// fade, so the corners survive and have to be worth printing — the prompt no
// longer tells the painter they are expendable.
export const VIGNETTE_TALL = `Full-bleed upright scene filling the entire frame edge to edge with no blank margins, no white background, no vignette, no frame and no border. The subject sits centred and slightly high in the frame with generous painted atmosphere all around it, and the four corners carry quiet background that is still fully painted, because the picture is printed as a clean upright rectangle with every corner visible. No text, no lettering, no signature.`;

// The round spot floated into the text, and the fun-fact spot in its card. Both
// are cut as an upright OVAL since 2026-08-31 — 4:5, not the old circle — so
// the art is painted 4:5 too and the only thing discarded is the four corners.
// Everything outside the inscribed ellipse is gone, which is the one thing the
// model must know.
export const VIGNETTE_ROUND = `Full-bleed upright scene, taller than it is wide, filling the entire frame edge to edge with no blank margins, no white background, no frame and no border. The picture is printed as an upright OVAL cut from the middle of the frame, so the whole subject must sit well inside that central oval and the four corners must carry nothing but background — anything painted into a corner is cut away. One clear subject, close in, richly painted. No text, no lettering, no signature.`;

// The full-width band between two chapters (wide, with an italic caption under
// it). It is a horizontal slice of a scene, so it wants a wide subject and a
// middle-weighted composition. Unlike the two margin figures this one is NOT
// feathered — since 2026-08-31 the page prints it as a crisp 12:5 rectangle
// (.plateBand), so the prompt no longer promises the painter that the edges
// dissolve. It used to, and that lie was expensive: the edges were painted as
// throwaway and then shown in full. It is painted at 1536x640, the frame's own
// ratio, so nothing is cropped either — keep the two in step.
export const BAND_BLEED = `Full-bleed wide horizontal scene filling the entire frame edge to edge with no blank margins, no white background, no vignette, no frame and no border. Compose it as a wide panoramic slice, 12:5: the subject and all the detail that matters sit across the middle of the frame, and the top, bottom, left and right edges carry quiet background that is still fully painted and worth looking at, because the picture is printed as a clean rectangle with every edge visible. No text, no lettering, no signature.`;

// The fun-fact card's picture: not a cut shape at all, but a panel bleeding to
// the card's right edge and corners at roughly a third of its width. The panel
// is upright and its height follows the fact's text, so the crop is unknowable
// at painting time — hence a square painting with everything kept off the
// edges. It shared VIGNETTE_ROUND until 2026-08-31, when the card stopped
// cutting an oval out of it.
export const SPOT_PANEL = `Full-bleed square scene filling the entire frame edge to edge with no blank margins, no white background, no vignette, no frame and no border. It is printed as a narrow upright panel cropped out of the middle of this square, so the one subject must sit in the centre of the frame and stay well clear of all four edges; nothing is faded, but the left and right of the painting are cropped away. One clear subject, close in, richly painted. No text, no lettering, no signature.`;

// A treasure card's square plate. Unmasked and hard-cropped by the card, so
// this is the one block that wants the subject to run right to the edges.
export const CARD_FILL = `Full-bleed square image filling the entire frame edge to edge with no blank margins, no white background, no vignette, no frame and no border. A single object or place, painted large and close so it fills the frame and touches all four edges, lit from one side, set against a simple painted background that does not compete with it. No people unless the subject itself is a person. No text, no lettering, no signature.`;

// Story brief counts — enforced by instruction in WRITER_SYSTEM (structured
// outputs can't express minItems).
export const CHAPTERS = 4;
export const TIMELINE = 5;
export const TREASURES = 6;
export const LESSONS = 4;

// The Book Edition's own counts. Six chapters rather than four because the
// design carries the whole life in one scroll instead of pacing it across
// spreads, and it prints its chapter eyebrows as words ("Chapter one" …
// "Chapter six"), so the number is part of the layout rather than a knob.
// FUN_FACTS is new to this format — the flip-book keeps its facts inside the
// spreads that earned them; the Book Edition also gives three of them a room.
export const EDITION_CHAPTERS = 6;
export const EDITION_TIMELINE = 5;
export const EDITION_TREASURES = 6;
export const EDITION_LESSONS = 4;
export const EDITION_FUN_FACTS = 3;
export const EDITION_TRAITS = 3;

// Which chapters carry a figure, and which shape. Fixed by the design rather
// than chosen per story: the mock alternates a right-floated tall figure, a
// full-width band and a left-floated circle so the eye is never pulled to the
// same margin twice running.
//
// Every chapter carries one. The table used to leave chapters three, five and
// six as unbroken text, which front-loaded the whole book: all the art landed
// in the first four chapters and the climax, the redemption and the ending were
// three consecutive walls of grey. Against the bible's benchmark — every spread
// should feel like an illustrated collectible book — the last third read as a
// blog post, so that rule is retired (see the bible's Standing decisions). The
// book now closes on a band, the widest of the three shapes. Every shape prints
// the chapter's caption; that was true of the band alone until 2026-08-31, when
// the tall and round figures stopped dropping theirs.
//
// slotDescriptors reads this table, so a person with more or fewer chapters
// than EDITION_CHAPTERS simply gets figures where the table has entries; a
// chapter's own `figure` still overrides it, including back to 'none'.
export const EDITION_CHAPTER_FIGURES: readonly ('tall' | 'round' | 'band' | 'none')[] =
  ['tall', 'band', 'round', 'tall', 'round', 'band'];

// How the art meets the page — the fixed bleed block used and the compositing
// blend the site renders it with (GoldenStory defaults to 'multiply' unless
// blend is 'normal'/'none').
export type SlotPlacement =
  // Flip-book placements.
  | 'cover' | 'strip' | 'single' | 'opaque' | 'paper'
  // Book Edition placements — all opaque; the page's CSS masks do the shaping.
  | 'hero' | 'vignette-tall' | 'vignette-round' | 'band' | 'spot-panel' | 'card';
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
