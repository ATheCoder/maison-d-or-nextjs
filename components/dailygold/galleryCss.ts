/**
 * GALLERY_CSS — the stylesheet for the Daily Gold reading column.
 *
 * The page is a gallery: the paintings are the page and every word is a
 * label — small, precise, hung *beneath* the work rather than printed over it.
 * That one inversion is what deletes the four stacked gradient washes, every
 * text shadow, and the eight different card treatments the reading column used
 * to carry. Ported from `.design-sync/redesigns/06-gallery.html`, which stays
 * the reference drawing.
 *
 * Emitted once, by DailyGoldEditionPage — the same shape NAV_SHELL_CSS has in
 * DGPageShell and SKELETON_CSS in DGContentSkeleton. Sections below it style
 * themselves by wearing these classes, not by restating geometry inline.
 *
 * ── Two rules that are NOT in the mockup ───────────────────────────────────
 *
 * The mockup is drawn dark, because a gallery is dark so the pictures can be
 * light. This page is not: it hangs on whichever of the seven [data-theme]
 * grounds the reader chose. `.design-sync/redesigns/06-gallery-themes.html`
 * measured what that costs, and two rules came out of it.
 *
 * 1 · GOLD AS INK IS ALWAYS --accent-readable. Bare --accent measures
 *     2.20–2.96:1 as small text on the five pale families; --accent-readable
 *     is 5.17–6.16:1 there and resolves to the identical gold-bright on dark
 *     and navy, so the swap costs the dark rooms nothing. Bare --accent below
 *     appears only on rules, hairlines and ornament — never on a glyph.
 *
 * 2 · DIMMING INVERTS. A closed room fades TOWARDS the wall, and on a lit
 *     ground that means brighter, not darker. brightness(0.55) on espresso
 *     becomes brightness(1.06) plus a heavier veil on parchment. Written as
 *     the light rule first and a [data-theme] override for the two dark
 *     grounds, because five of the seven are light.
 *
 * ── The hairline frame ────────────────────────────────────────────────────
 *
 * Every work wears one. Unframed — as the mockup hangs them — a painting ends
 * where its own paint stops matching the wall, so each ground eats the edge of
 * whichever works match it in value and the set flips completely between dark
 * and light: the lead portrait measures 1.01:1 against espresso and 14.32:1
 * against parchment, and the pale watercolours run it exactly backwards. The
 * hairline closes that on all seven walls at once. Do not remove it to "match
 * the mockup" — the mockup only ever hung on one ground.
 */

export const GALLERY_CSS = `
/* ═══ the room ═════════════════════════════════════════════════════════════
   One gutter for the whole gallery, declared once per device so a wall never
   has to know which shell it is hanging in. */
.gl {
  --gut: clamp(28px, 5vw, 72px);
  font-family: var(--face-sans);
  color: var(--text-primary);
}

/* ── the label: the single typographic unit of the whole design ─────────── */
.lab { max-width: 34ch; }
.lab .t { font-family: var(--face-display); font-size: 17px; font-weight: 560; line-height: 1.25; margin: 0 0 4px; color: var(--text-primary); }
.lab .t-big { font-size: 27px; }
.lab .s { font-family: var(--face-display); font-style: italic; font-size: 13.5px; color: var(--accent-readable); margin: 0 0 6px; line-height: 1.35; }
.lab .m { font-size: 9.5px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-faint); margin: 0; }
.lab .b { font-size: 13.5px; line-height: 1.62; color: var(--text-secondary); margin: 8px 0 0; }
.lab .go {
  font-family: var(--face-sans);
  font-size: 9.5px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--accent-readable);
  background: none; border: 0; padding: 10px 0 0; margin: 0;
  cursor: pointer; display: block; text-align: left; text-decoration: none;
}
.lab .go:hover { color: var(--text-primary); }
/* a work whose story is not written: says so, and is not a door */
.lab .go-none { text-transform: none; letter-spacing: 0.02em; font-style: italic; font-size: 12px; color: var(--text-faint); cursor: default; }
.lab .go-none:hover { color: var(--text-faint); }
/* the hairline every label hangs from */
.lab-rule { border-top: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); padding-top: 11px; }

/* ── the eyebrow that names a wall ──────────────────────────────────────── */
/* The rule lives on the wall itself rather than on a .wall + .wall adjacency, because
   every wall is wrapped in a TrackedSection's div — no two of them are ever
   adjacent siblings, so an adjacency selector would draw nothing at all. The
   wall that opens the gallery opts out; it follows the entrance, not a wall. */
.wall { padding: 76px 0; border-top: 1px solid color-mix(in srgb, var(--accent) 14%, transparent); }
.wall-first { border-top: 0; padding-top: 56px; }
.wall-h { padding: 0 var(--gut); margin-bottom: 26px; }
.wall-h small { font-family: var(--face-sans); font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent-readable); display: block; margin-bottom: 12px; }
.wall-h b { font-family: var(--face-display); font-size: 34px; font-weight: 560; display: block; line-height: 1.1; letter-spacing: -0.014em; color: var(--text-primary); }
.wall-h p { font-family: var(--face-display); font-style: italic; font-size: 15px; color: var(--text-secondary); margin: 9px 0 0; max-width: 52ch; }

/* ── a hung work ────────────────────────────────────────────────────────────
   --ar is the frame's aspect, set per call site. The hairline is the frame;
   the ::before is the gallery light, a soft wash from above. A work with no
   painting keeps the frame and shows the wall inside it — a canvas away for
   restoration, not a broken card. That is today's ordinary case for On This
   Day and for every unauthored sense, so it has to look intended. */
/* The wrapper is the positioning context, not the frame: where the painting
   is a door, the seal and the heart hang beside that door rather than inside
   it — a heart nested in a link is a heart that navigates. */
.gl-hung { position: relative; }
.gl-art {
  position: relative;
  aspect-ratio: var(--ar, 4 / 3);
  overflow: hidden;
  background-color: color-mix(in srgb, var(--surface-tint) 70%, var(--surface-page));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  box-shadow: var(--shadow-card);
}
.gl-art > img { display: block; width: 100%; height: 100%; object-fit: cover; }
.gl-art::before {
  content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: linear-gradient(190deg, color-mix(in srgb, var(--palette-ivory) 20%, transparent) 0%, transparent 46%);
}
/* the mark on an empty frame: a hairline cross, not an emoji */
.gl-art-bare::after {
  content: ''; position: absolute; z-index: 1;
  left: 50%; top: 50%; width: 22px; height: 22px;
  transform: translate(-50%, -50%) rotate(45deg);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
}
.gl-seal { position: absolute; top: 10px; left: 10px; z-index: 4; }
.gl-heart { position: absolute; top: 8px; right: 8px; z-index: 4; }
/* the whole frame is the door, where there is one to open */
.gl-door { display: block; width: 100%; padding: 0; border: 0; background: none; font: inherit; text-align: left; cursor: pointer; }

/* ═══ the entrance ═════════════════════════════════════════════════════════
   One painting, the day's name, and the turner. Nothing else. */
.gl-entry { position: relative; }
.gl-entry-art { position: relative; aspect-ratio: 21 / 9; overflow: hidden; background-color: var(--surface-tint); }
.gl-entry-art > img { display: block; width: 100%; height: 100%; object-fit: cover; }
/* The label stands bottom-left on the two dark grounds, so the ground there
   has to be genuinely dark: two ramps, up from the foot and in from the left.
   On the five lit grounds the label hangs beneath the painting instead (the
   [data-theme] block below) and this ramp is only a settling wash. */
.gl-entry-art::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top, var(--surface-page) 0%, color-mix(in srgb, var(--surface-page) 55%, transparent) 26%, transparent 62%);
}
.gl-entry-in { padding: 26px var(--gut) 0; position: relative; z-index: 2; }
.gl-entry-in .eye { font-family: var(--face-sans); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent-readable); margin: 0 0 16px; }
.gl-entry-in h1 {
  font-family: var(--face-display); font-size: clamp(40px, 6.6vw, 104px); font-weight: 300;
  margin: 0 0 14px; line-height: 0.98; letter-spacing: -0.02em; color: var(--text-primary);
  font-variation-settings: 'opsz' 144;
}
.gl-entry-in h1 em { font-style: italic; font-weight: 400; color: var(--accent-readable); }
.gl-entry-in .sub { font-size: 15.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; max-width: 42ch; }

/* The two cinematic grounds get the mockup's own entrance: the label stands
   IN the painting, over the ramp. The five lit grounds do not — there the
   ramp has to build the whole readable ground itself and bleaches most of the
   painting to do it, which is the one thing this design will not spend. */
[data-theme="dark"] .gl-entry-art::after,
[data-theme="navy"] .gl-entry-art::after {
  background:
    linear-gradient(to top, var(--surface-page) 0%, color-mix(in srgb, var(--surface-page) 88%, transparent) 34%, color-mix(in srgb, var(--surface-page) 30%, transparent) 66%, transparent 88%),
    linear-gradient(to right, color-mix(in srgb, var(--surface-page) 88%, transparent) 0%, color-mix(in srgb, var(--surface-page) 40%, transparent) 38%, transparent 62%);
}
/* Both children take the same grid cell, so the entrance is as tall as the
   TALLER of the painting and the words. Absolute positioning was the mockup's
   answer and it only held at the width the mockup was drawn at: at 1176px of
   wall a 21:9 painting is 504px tall and the label block fits under it, and at
   1023px it is 438px and the headline hangs off the top of the page. Here the
   painting simply stretches to make room, which is also what a gallery would
   do. */
[data-theme="dark"] .gl-entry,
[data-theme="navy"] .gl-entry { display: grid; }
/* The painting has to be worth standing in front of even when the day's
   headline is short, so it takes a floor as well as an aspect. */
[data-theme="dark"] .gl-entry-art,
[data-theme="navy"] .gl-entry-art { min-height: min(72vh, 660px); }
[data-theme="dark"] .gl-entry > .gl-entry-art,
[data-theme="navy"] .gl-entry > .gl-entry-art,
[data-theme="dark"] .gl-entry > .gl-entry-in,
[data-theme="navy"] .gl-entry > .gl-entry-in { grid-area: 1 / 1; }
/* padding-top, not a margin: the label is what sets the row's height when the
   words run long, and 80px of it is the air above the eyebrow that keeps the
   headline off the top edge of the page. */
[data-theme="dark"] .gl-entry-in,
[data-theme="navy"] .gl-entry-in { align-self: end; padding: 80px var(--gut) 40px; }

/* the day navigator: two seals and a date, on the label's own line */
.gl-turn {
  display: flex; align-items: center; gap: 18px;
  margin-top: 30px; padding-top: 22px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
  max-width: 620px;
}
.gl-turn-mid { flex: 1; min-width: 0; text-align: left; }
.gl-turn-mid b { font-family: var(--face-display); font-style: italic; font-size: 16px; display: block; font-weight: 500; color: var(--text-primary); }
.gl-turn-mid small { font-family: var(--face-sans); font-size: 9.5px; letter-spacing: 0.17em; text-transform: uppercase; color: var(--text-faint); }

/* ═══ a hung wall ══════════════════════════════════════════════════════════
   --cols is computed per wall from the number of works it actually holds, so
   the lead's 2x2 never leaves a hole beside it on a four-person day. See
   hangColumns() in gallery/columns.ts for the arithmetic. */
.gl-hang {
  padding: 0 var(--gut);
  display: grid;
  grid-template-columns: repeat(var(--cols, 5), minmax(0, 1fr));
  gap: 44px 30px;
  align-items: start;
}
.gl-work { position: relative; min-width: 0; }
.gl-work .lab { margin-top: 16px; max-width: none; }
/* the first work is hung larger and given the wall's centre */
.gl-work-1 { grid-column: span 2; grid-row: span 2; }
.gl-work-1 .lab { margin-top: 20px; }
/* a work with no story behind it hangs quieter than the rest */
.gl-work-quiet .gl-art { filter: brightness(0.92) saturate(0.8); }
[data-theme="dark"] .gl-work-quiet .gl-art,
[data-theme="navy"] .gl-work-quiet .gl-art { filter: brightness(0.82) saturate(0.8); }

/* ── the destination wall: the destination's own painting, then the four
   senses at 1:1 ────────────────────────────────────────────────────────────
   The lead takes the same 2x2 in a four-column hang that rank one takes on
   every other wall, so "largest work, top-left corner" means one thing across
   the whole gallery — and the four senses fall into the four cells beside it
   exactly, at any width. The mockup put all five on one row instead; that was
   drawn at 1176px of wall and squeezes the lead to a thumbnail below it. */
.gl-hang-dest { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 34px 26px; }
.gl-hang-dest > .gl-work:first-child { grid-column: span 2; grid-row: span 2; }
/* A sense with no painting authored yet: the label takes the frame's own
   square, on a tinted ground — a plate on the wall rather than a hole in it.
   This is the common case, not the fallback: the senses only got image columns
   when this wall was built, so every day authored before then has four. */
.gl-plate {
  display: flex; flex-direction: column; justify-content: flex-end;
  aspect-ratio: 1 / 1; padding: 14px;
  background: color-mix(in srgb, var(--surface-tint) 55%, var(--surface-page));
}
.gl-plate .lab { max-width: none; }
.gl-plate .lab .t { font-size: 15px; }

/* ── the salon hang (Good News) ─────────────────────────────────────────────
   The lead takes the corner at double size; the rest hang beside and beneath
   it, in rows. A grid, so an eleventh story opens a new row rather than an
   edge — nothing in this design scrolls sideways at any width. */
.gl-salon {
  padding: 0 var(--gut);
  display: grid;
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  gap: 40px 30px;
  align-items: start;
}
.gl-frame { position: relative; min-width: 0; }
.gl-frame .lab { margin-top: 15px; max-width: none; }
.gl-frame-1 { grid-column: span 2; grid-row: span 2; }

/* ── the year room (On This Day) ───────────────────────────────────────────
   The year set enormous and hollow, behind the work. It is absolutely
   positioned, so its ink still counts towards the page's scrollable width —
   the max-width/clip pair is what keeps a 260px numeral from being the one
   thing on the page that reaches past the wall. */
.gl-year-room { position: relative; padding: 0 var(--gut); }
.gl-ghost {
  position: absolute; z-index: 0; left: var(--gut); top: 0;
  max-width: calc(100% - var(--gut) * 2); overflow: hidden;
  font-family: var(--face-display); font-size: clamp(140px, 17vw, 260px); font-weight: 300;
  line-height: 0.8; letter-spacing: -0.03em;
  color: transparent; -webkit-text-stroke: 1px color-mix(in srgb, var(--accent) 26%, transparent);
  pointer-events: none; user-select: none;
}
.gl-year-grid {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 44px; align-items: end; padding-top: 78px;
}
.gl-year-nav { display: flex; align-items: center; gap: 16px; padding: 0 var(--gut); margin-bottom: 8px; }
.gl-year-nav .n { font-family: var(--face-sans); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-faint); }
.gl-year-lab { margin-top: 16px; max-width: 46ch; }
.gl-year-empty { position: relative; z-index: 1; padding: 20px 0; }
.gl-year-empty p { font-family: var(--face-display); font-style: italic; font-size: 20px; color: var(--text-secondary); margin: 0 0 4px; }
.gl-year-empty .go { min-height: 44px; padding-top: 14px; }

/* ── the ledger (Greatest Moments) ──────────────────────────────────────────
   Rank one hung as a work with its story, and all ten as a slim index beside
   it: the invitation and the contents page, without a modal in between. */
.gl-ledger { padding: 0 var(--gut); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 52px; align-items: start; }
.gl-list { display: flex; flex-direction: column; min-width: 0; }
.gl-row {
  display: grid; grid-template-columns: 26px 52px minmax(0, 1fr) 40px;
  gap: 14px; align-items: baseline;
  padding: 13px 0; min-height: 44px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
  background: none; border-left: 0; border-right: 0; border-top: 0;
  width: 100%; text-align: left; font: inherit; cursor: pointer;
}
.gl-row:first-child { border-top: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); }
.gl-row:hover .t { color: var(--accent-readable); }
.gl-row .n { font-family: var(--face-sans); font-size: 9.5px; letter-spacing: 0.1em; color: var(--text-faint); }
.gl-row .y { font-family: var(--face-display); font-size: 14px; font-weight: 560; color: var(--accent-readable); }
.gl-row .t { font-family: var(--face-display); font-size: 15px; font-weight: 500; line-height: 1.32; color: var(--text-primary); }
.gl-row-1 { padding: 17px 0; }
.gl-row-1 .y, .gl-row-1 .t { font-size: 19px; }
.gl-row .h { justify-self: end; }
/* The row is a button, so its heart cannot live inside it — it floats over the
   row's own last column, which the grid holds open at 40px for exactly this. */
.gl-row-wrap { position: relative; }
.gl-row-heart { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }

/* ── the quiet room (inspiration) ───────────────────────────────────────── */
.gl-quiet { text-align: center; padding: 108px clamp(28px, 8vw, 120px); }
.gl-quiet small { font-family: var(--face-sans); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent-readable); }
.gl-quiet .q { font-family: var(--face-display); font-style: italic; font-weight: 300; font-size: clamp(30px, 4.6vw, 62px); line-height: 1.28; margin: 30px auto 24px; max-width: 24ch; color: var(--text-primary); }
.gl-quiet cite { font-family: var(--face-sans); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-style: normal; color: var(--accent-readable); }
.gl-quiet p { font-family: var(--face-sans); font-size: 13px; color: var(--text-faint); margin: 12px 0 0; }

/* ── the closed rooms ───────────────────────────────────────────────────────
   Dimmed rather than decorated: brightness and a scrim say "not open" more
   clearly than a "coming soon" eyebrow on a fully lit card. And dimming
   INVERTS — a closed room fades towards the wall, which on a lit ground means
   brighter. The light rule is the default because five of the seven grounds
   are light; the two cinematic ones override it. */
.gl-closed { padding: 0 var(--gut); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 30px; }
.gl-cw { position: relative; min-width: 0; }
.gl-cw .lab { margin-top: 15px; max-width: none; }
.gl-cw .gl-art { box-shadow: none; }
/* :not(.gl-art-bare) — dimming a painting says "not open"; dimming an EMPTY
   frame just brightens the wall inside it and rubs out its own hairline mark.
   All three closed rooms are unpainted today, so this is the case that shows. */
.gl-cw .gl-art:not(.gl-art-bare) { filter: brightness(1.06) saturate(0.82); }
.gl-cw .gl-art:not(.gl-art-bare)::after {
  content: ''; position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: color-mix(in srgb, var(--surface-page) 55%, transparent);
}
[data-theme="dark"] .gl-cw .gl-art:not(.gl-art-bare),
[data-theme="navy"] .gl-cw .gl-art:not(.gl-art-bare) { filter: brightness(0.55) saturate(0.7); }
[data-theme="dark"] .gl-cw .gl-art:not(.gl-art-bare)::after,
[data-theme="navy"] .gl-cw .gl-art:not(.gl-art-bare)::after { background: color-mix(in srgb, var(--surface-page) 30%, transparent); }

/* ── the values and the tail ────────────────────────────────────────────── */
.gl-vals { display: flex; align-items: center; justify-content: center; gap: 30px; flex-wrap: wrap; padding: 60px var(--gut) 0; }
.gl-vals span { font-family: var(--face-display); font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-readable); }
.gl-foot { text-align: center; padding: 46px 30px 76px; }
.gl-foot p { font-family: var(--face-display); font-style: italic; font-size: 20px; color: var(--text-secondary); max-width: 520px; margin: 0 auto 18px; line-height: 1.45; }
.gl-foot small { font-family: var(--face-display); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-faint); }

/* ═══ NARROW DESKTOP · to 1279 ═════════════════════════════════════════════
   The mockup was drawn at 1400 with a 224px rail — 1176px of wall, which is
   what five columns and a 72px gutter were measured against. Below that the
   wall runs out before the works do, so every hang drops one column and the
   lead keeps its 2x2. Rank is carried by SIZE rather than by position in a
   queue, so nothing about the reading order has to be re-explained when the
   shape changes: the biggest work is still first. */
@media (max-width: 1279px) {
  .gl { --gut: clamp(28px, 4vw, 44px); }
  .gl-hang:not(.gl-hang-dest) { grid-template-columns: repeat(min(var(--cols, 5), 4), minmax(0, 1fr)); }
  .gl-hang, .gl-salon { gap: 36px 24px; }
  /* :not(.gl-work-1), so shrinking the satellites cannot reach past .t-big and
     shrink the lead label with them */
  .gl-hang .gl-work:not(.gl-work-1) .lab .t { font-size: 14.5px; }
  .gl-hang .gl-work:not(.gl-work-1) .lab .s { font-size: 12px; }
  .gl-salon .gl-frame:not(.gl-frame-1) .lab .t { font-size: 15px; }
  .gl-salon .gl-frame:not(.gl-frame-1) .lab .b { font-size: 12.5px; }
  .lab .t-big { font-size: 23px; }
}

/* ═══ TABLET · to 1023 ═════════════════════════════════════════════════════
   Where the shell folds its rail to 84px of icons, and the two walls that are
   LAID OUT rather than hung go single-column. Split in two at this width the
   ledger's headlines get a 170px measure and four-line rows; full width they
   read in one line each. Labels stay beneath their work everywhere — that is
   the variant, not a layout preference. */
@media (max-width: 1023px) {
  .gl { --gut: 30px; }
  .wall { padding: 54px 0; }
  .wall-first { padding-top: 40px; }
  .wall-h { margin-bottom: 22px; }
  .wall-h b { font-size: 28px; }
  .wall-h p { font-size: 14px; }

  /* The entrance turns from a letterbox into a plate. A portrait tablet's
     first screen is tall, and at 21:9 the painting would be a strip. */
  .gl-entry-art { aspect-ratio: 4 / 3; }
  .gl-entry-in h1 { font-size: 46px; }
  .gl-entry-in .sub { font-size: 14.5px; max-width: 40ch; }

  .gl-ghost { font-size: 132px; }
  .gl-year-grid { grid-template-columns: minmax(0, 1fr); gap: 44px; padding-top: 56px; align-items: start; }
  .gl-ledger { grid-template-columns: minmax(0, 1fr); gap: 36px; }

  /* One more column goes at the tablet fold. The salon's works are 4:3 and
     survive being small; the portraits are 3:4 and do not. */
  .gl-hang:not(.gl-hang-dest) { grid-template-columns: repeat(min(var(--cols, 5), 3), minmax(0, 1fr)); }
  .gl-salon { grid-template-columns: repeat(min(var(--cols, 4), 3), minmax(0, 1fr)); }

  .gl-quiet { padding: 76px 46px; }
  .gl-quiet .q { font-size: 34px; }
  .gl-closed { gap: 22px; }
  .gl-closed .lab .t { font-size: 15px; }
  .gl-vals { gap: 22px; padding-top: 48px; }
  .gl-foot { padding: 40px 30px 60px; }
}

/* ═══ PHONE · to 767 ═══════════════════════════════════════════════════════
   One work at a time. The lead keeps the full width and the satellites pair
   up beneath it, so size still carries rank; nothing here is a queue the
   reader has to push sideways. */
@media (max-width: 767px) {
  .gl { --gut: 16px; }
  .wall { padding: 34px 0; }
  .wall-h { margin-bottom: 18px; }
  .wall-h b { font-size: 25px; }

  .gl-entry-art { aspect-ratio: 4 / 5; }
  .gl-entry-in { padding-top: 20px; }
  .gl-entry-in h1 { font-size: 38px; }
  .gl-entry-in .eye { margin-bottom: 10px; }
  .gl-entry-in .sub { font-size: 14px; }
  [data-theme="dark"] .gl-entry-art,
  [data-theme="navy"] .gl-entry-art { min-height: min(64vh, 520px); }
  [data-theme="dark"] .gl-entry-in,
  [data-theme="navy"] .gl-entry-in { padding-top: 48px; padding-bottom: 20px; }
  .gl-turn { margin-top: 18px; padding-top: 16px; gap: 12px; max-width: none; }
  .gl-turn-mid b { font-size: 13.5px; }
  .gl-turn-mid small { font-size: 8.5px; }

  /* Two columns, and the lead spans both: the biggest work is still first. */
  .gl-hang,
  .gl-salon { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; }
  .gl-work-1,
  .gl-frame-1,
  .gl-hang-dest > .gl-work:first-child { grid-column: 1 / -1; grid-row: auto; }
  .gl-hang .gl-work:not(.gl-work-1) .lab .t,
  .gl-salon .gl-frame:not(.gl-frame-1) .lab .t { font-size: 14px; }
  .gl-work .lab, .gl-frame .lab { margin-top: 11px; }
  .lab .t-big { font-size: 21px; }
  /* the satellites' body copy is the first thing to go: at 170px it is four
     words a line, and the label above it already says the thing */
  .gl-salon .gl-frame:not(.gl-frame-1) .lab .b { display: none; }

  .gl-ghost { font-size: 96px; }
  .gl-year-grid { padding-top: 40px; gap: 34px; }
  .gl-ledger { gap: 28px; }
  .gl-row { grid-template-columns: 22px 42px minmax(0, 1fr) 40px; gap: 10px; }
  .gl-row .t { font-size: 14px; }
  .gl-row-1 .y, .gl-row-1 .t { font-size: 16px; }

  .gl-quiet { padding: 56px 24px; }
  .gl-quiet .q { font-size: 27px; margin: 22px auto 18px; }
  .gl-closed { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .gl-vals { gap: 14px 20px; padding-top: 40px; }
  .gl-vals span { font-size: 11px; }
  .gl-foot { padding: 36px 20px 48px; }
  .gl-foot p { font-size: 17px; }
}
`;
