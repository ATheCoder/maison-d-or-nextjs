/**
 * MUSEUM_CSS — the stylesheet for the paged museum (/treasury).
 *
 * Ported from docs/treasury-museum-redesign-mock.html, which is the source of
 * truth for every colour, timing, keyframe and layout value here. The mock's
 * literal palette is replaced by `--tv-*` custom properties that TreasuryView
 * fills from the active theme; what stays literal are the *physical materials*
 * — wax red, coin gold, brass, wood browns, push-pin red, the plum gallery and
 * the night sky — the same house rule the old Treasury already followed for
 * wax and coins.
 *
 * Two classes drive everything dynamic:
 *   `.tv-js`     on the stage — present only when motion is allowed. Without
 *                it every element is simply visible (no-JS and reduced-motion
 *                both land here), so nothing can be animated into invisibility.
 *   `.tv-enter`  on a slide's stage element, plus `.tv-in` on each of its
 *                items — added on arrival, removed on leave, which is what
 *                makes the entrance show replay every single visit.
 *
 * Entrance and ambient animations use the independent transform properties
 * (`translate` / `rotate` / `scale`) wherever the element already carries a
 * layout `transform` (card tilts, timeline centring) so the two never fight.
 */
export const MUSEUM_CSS = `
  /* ── The stage ───────────────────────────────────────────────────────────
     One screen, no document scroll. The shell keeps content clear of the
     mobile tab bar with padding, so the stage is the viewport minus that bar;
     its own min-height would otherwise add a phantom scroll under us. */
  .dg-shell:has(> .tv-museum) { min-height: 0; }
  .tv-museum {
    position: relative;
    width: 100%;
    height: calc(100vh - var(--dg-tabbar-h, 0px));
    height: calc(100svh - var(--dg-tabbar-h, 0px));
    padding: 0.7rem;
    display: flex;
    overflow: hidden;
    overscroll-behavior: contain;
    font-family: var(--tv-fontB);
    background: radial-gradient(ellipse at 50% 0%, var(--tv-card) 0%, var(--tv-soft) 45%, var(--tv-bg) 100%);
  }
  .tv-viewport { flex: 1; max-width: 1100px; margin: 0 auto; overflow: hidden; }
  .tv-track {
    display: flex; height: 100%;
    transition: transform 0.85s cubic-bezier(0.25, 0.7, 0.3, 1);
    will-change: transform;
  }
  /* The glide takes .85s; a pile opened mid-flight would measure its FLIP
     coordinates against a track that keeps moving. Nothing is clickable
     until the stage has settled. */
  .tv-track.tv-gliding { pointer-events: none; }
  .tv-slide {
    flex: 0 0 100%; max-width: 100%; height: 100%;
    overflow-y: auto; overflow-x: hidden; display: flex;
  }
  .tv-sinner { margin: auto; width: 100%; }

  /* ── Shared signage and navigation ─────────────────────────────────────── */
  .tv-roomnav {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    margin-top: 1.8rem; position: relative; z-index: 3;
  }
  .tv-steps { display: flex; flex-direction: column; gap: 7px; }
  .tv-step { width: 7px; height: 11px; border-radius: 50%; background: var(--tv-gold-77); }
  .tv-step:nth-child(odd) { transform: translateX(-7px) rotate(-8deg); }
  .tv-step:nth-child(even) { transform: translateX(7px) rotate(8deg); }
  .tv-navrow { display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap; }
  .tv-door {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
    min-height: 40px; padding: 0 1.15rem; border-radius: 20px; cursor: pointer;
    background: var(--tv-card-b0); border: 1.5px dashed var(--tv-gold-66);
    font-family: var(--tv-fontB); font-size: 0.62rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--tv-muted); text-align: center;
    transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }
  .tv-door b { color: var(--tv-gold); font-weight: 700; }
  .tv-door:active { transform: translateY(0); }
  .tv-door:focus-visible { outline: 3px solid var(--tv-gold); outline-offset: 3px; }
  .tv-door-back { width: 40px; padding: 0; flex-shrink: 0; }
  .tv-door-lg { min-height: 46px; padding: 0 1.5rem; font-size: 0.7rem; }

  .tv-roomno {
    text-align: center; font-family: var(--tv-fontB); font-size: 0.55rem;
    letter-spacing: 0.34em; text-transform: uppercase;
    color: var(--tv-gold-99); margin: 0 0 0.55rem;
  }
  .tv-seal {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    background: radial-gradient(circle at 35% 30%, #8B2020 0%, #6B1515 60%, #4A0F0F 100%);
    border: 2px solid #A83030; box-shadow: 0 2px 8px rgba(100, 20, 20, 0.4);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255, 220, 180, 0.75); font-size: 0.62rem; font-family: var(--tv-fontH);
  }
  .tv-dv { text-align: center; margin: 0 0 1.7rem; position: relative; z-index: 2; }
  .tv-dv h2 {
    font-family: var(--tv-fontH); font-size: 1.25rem; font-weight: 700;
    color: var(--tv-headline); line-height: 1.2; margin: 0;
  }
  .tv-tag {
    font-family: var(--tv-fontB); font-size: 0.57rem; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--tv-muted); margin: 3px 0 0;
  }

  /* ── The entrance hall ─────────────────────────────────────────────────── */
  .tv-entr { text-align: center; padding: 2rem 1rem; }
  .tv-entab {
    display: inline-flex; align-items: center; padding: 0.35rem 1.6rem;
    border-top: 2px solid var(--tv-gold-66); border-bottom: 2px solid var(--tv-gold-66);
    font-family: var(--tv-fontB); font-size: 0.6rem; letter-spacing: 0.42em;
    text-transform: uppercase; color: var(--tv-muted); margin-bottom: 1rem;
  }
  .tv-facade { display: flex; align-items: stretch; justify-content: center; gap: 1.8rem; }
  .tv-col {
    width: 22px; border-radius: 4px; position: relative; flex-shrink: 0;
    background: repeating-linear-gradient(90deg, #EFE4CC 0 4px, #D9C69E 4px 8px);
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.14);
  }
  .tv-col::before, .tv-col::after {
    content: ''; position: absolute; left: -6px; right: -6px; height: 8px;
    background: #D9C69E; border-radius: 2px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }
  .tv-col::before { top: -2px; }
  .tv-col::after { bottom: -2px; }
  .tv-hdr { display: flex; align-items: center; justify-content: center; gap: 0.9rem; margin: 0 0 0.4rem; }
  .tv-hdr h1 {
    font-family: var(--tv-fontH); font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 700; color: var(--tv-headline); margin: 0;
  }
  .tv-sub { font-family: var(--tv-fontB); font-size: 1rem; color: var(--tv-muted); font-style: italic; margin: 0; }
  .tv-ticket {
    display: inline-block; margin-top: 1.2rem; padding: 0.5rem 1.3rem; rotate: -2deg;
    border: 1.5px dashed var(--tv-gold-88); border-radius: 6px;
    background: var(--tv-card); box-shadow: var(--tv-shadow);
  }
  .tv-ticket .tv-t-a {
    font-family: var(--tv-fontB); font-size: 0.6rem; letter-spacing: 0.3em;
    text-transform: uppercase; color: #A83030; font-weight: 700; margin: 0;
  }
  .tv-ticket .tv-t-b {
    font-family: var(--tv-fontH); font-style: italic; font-size: 0.88rem;
    color: var(--tv-body); margin: 2px 0 0;
  }

  /* CardSurface renders a <button> for modal treasures and an <a> for person
     stamps; both need the same reset before their card class dresses them.
     It has to sit *above* the rooms: the reset and each room's card class
     carry the same specificity, so whichever comes last would win, and a
     stamp stripped of its paper is just a hole in the wall. */
  .tv-card {
    font: inherit; color: inherit; text-align: left; margin: 0;
    background: none; border: none; text-decoration: none; cursor: pointer;
    transition: box-shadow 0.3s ease;
  }

  /* ── A room: a full-screen wall with its exhibit centred ───────────────── */
  .tv-room {
    position: relative; border-radius: 18px; border: 1px solid var(--tv-gold-22);
    padding: 1.5rem 1.2rem 1.6rem; overflow: hidden;
    min-height: calc(100vh - 1.4rem);
    min-height: calc(100svh - var(--dg-tabbar-h, 0px) - 1.4rem);
    display: flex; flex-direction: column; justify-content: center;
  }

  /* ══ ROOM I — The Hall of Heroes ═══════════════════════════════════════
     A dark plum gallery: portraits hang from brass rings off a picture rail. */
  .tv-room-gallery {
    border-color: var(--tv-gold-3d);
    background:
      repeating-linear-gradient(90deg, var(--tv-gold-14) 0 3px, transparent 3px 36px),
      linear-gradient(#3B2331, #291721);
  }
  .tv-plate {
    display: inline-flex; align-items: center; gap: 12px; text-align: left;
    padding: 0.6rem 1.5rem; border: 2px solid var(--tv-gold-66); border-radius: 6px;
    background: linear-gradient(#FBF8F1, #F1E6CE);
    box-shadow: inset 0 0 0 3px #FBF8F1, inset 0 0 0 4px var(--tv-gold-33), 0 2px 6px rgba(100, 70, 20, 0.12);
  }
  /* The nameplate is parchment — a physical object — so its ink is literal
     too, or a dark palette would print pale text on pale paper. */
  .tv-plate h2 { color: #7A5B22; }
  .tv-plate .tv-tag { color: #8B7355; }
  .tv-rail {
    height: 3px; border-radius: 2px; margin: 0 0.6rem 2rem;
    background: linear-gradient(90deg, transparent, var(--tv-gold-66) 10%, var(--tv-gold-66) 90%, transparent);
    box-shadow: 0 1px 2px rgba(100, 70, 20, 0.15);
  }
  .tv-stamps { display: flex; flex-wrap: wrap; gap: 1.5rem 1.3rem; justify-content: center; }
  .tv-stamp-w { position: relative; transform: rotate(var(--tilt, 0deg)); }
  .tv-stamps .tv-stamp-w:nth-child(even) { margin-top: 28px; }
  .tv-hook {
    position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
    width: 12px; height: 12px; border: 2.5px solid #A8893A; border-radius: 50%;
    background: transparent; z-index: 3; box-shadow: 0 1px 2px rgba(100, 70, 20, 0.3);
  }
  .tv-stamp {
    display: block; width: 138px; background: var(--tv-card);
    border: 2px dashed var(--tv-gold-66); border-radius: 4px; padding: 6px;
    box-shadow: var(--tv-shadow);
  }
  .tv-stamp .tv-pic { aspect-ratio: 5/6; overflow: hidden; background: var(--tv-gold-14); }
  .tv-stamp .tv-cap { padding: 0.5rem 0.15rem 0.25rem; text-align: center; }
  .tv-stamp .tv-cap .tv-t {
    font-family: var(--tv-fontH); font-size: 0.82rem; font-weight: 600;
    color: var(--tv-headline); line-height: 1.25; margin: 0;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .tv-stamp .tv-cap .tv-s {
    font-family: var(--tv-fontB); font-size: 0.58rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--tv-muted); margin: 3px 0 0;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  /* ══ ROOM II — The Map Room ════════════════════════════════════════════ */
  .tv-room-map { background: linear-gradient(var(--tv-gold-08), var(--tv-gold-0e)); }
  .tv-routes, .tv-compass { position: absolute; pointer-events: none; }
  .tv-compass { right: -30px; top: -24px; opacity: 0.13; }
  .tv-routes { inset: 0; width: 100%; height: 100%; opacity: 0.6; }
  .tv-dv-map .tv-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .tv-dv-map .tv-dots { flex: 1; max-width: 180px; border-top: 2px dashed var(--tv-gold-55); }
  .tv-postcards { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 1.9rem; justify-content: center; }
  .tv-postcard-w { position: relative; transform: rotate(var(--tilt, 0deg)); }
  .tv-postcards .tv-postcard-w:nth-child(3n+2) { margin-top: 26px; }
  .tv-tape {
    position: absolute; top: -9px; width: 58px; height: 19px;
    background: var(--tv-gold-4a); z-index: 3; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
  .tv-tape-l { left: 14px; transform: rotate(-5deg); }
  .tv-tape-r { right: 14px; transform: rotate(4deg); }
  .tv-postcard {
    display: block; width: 248px; background: var(--tv-card);
    border: 1px solid var(--tv-gold-40); border-radius: 6px; padding: 8px;
    box-shadow: var(--tv-shadowDeep);
  }
  .tv-postcard .tv-pic { aspect-ratio: 3/2; overflow: hidden; border-radius: 2px; background: var(--tv-gold-14); }
  .tv-postcard .tv-cap { padding: 0.6rem 0.3rem 0.3rem; }
  .tv-postcard .tv-t {
    font-family: var(--tv-fontH); font-style: italic; font-size: 1rem; font-weight: 600;
    color: var(--tv-headline); line-height: 1.25; margin: 0;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .tv-postcard .tv-s {
    font-family: var(--tv-fontB); font-size: 0.6rem; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--tv-muted); margin: 4px 0 0;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  /* ══ ROOM III — The Good News Press ════════════════════════════════════ */
  .tv-room-press {
    background:
      radial-gradient(var(--tv-gold-14) 1px, transparent 1.4px) 0 0/12px 12px,
      linear-gradient(var(--tv-card), var(--tv-soft));
  }
  .tv-dv-press {
    border-top: 3px double var(--tv-gold-77); border-bottom: 3px double var(--tv-gold-77);
    padding: 0.7rem 0 0.6rem; max-width: 640px; margin: 0 auto 1.6rem;
  }
  .tv-dv-press h2 { text-transform: uppercase; letter-spacing: 0.1em; font-size: 1.35rem; }
  .tv-clippings { columns: 238px; column-gap: 1.1rem; max-width: 1010px; margin: 0 auto; position: relative; z-index: 2; }
  .tv-clip-w { position: relative; break-inside: avoid; width: 100%; display: inline-block; margin: 0 0 1.1rem; }
  .tv-pin {
    position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
    width: 14px; height: 14px; border-radius: 50%; z-index: 3;
    background: radial-gradient(circle at 35% 30%, #C84040, #7A1818);
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.28);
  }
  .tv-clip {
    display: block; background: var(--tv-card); border: 1px solid var(--tv-gold-30);
    box-shadow: inset 0 0 0 3px var(--tv-card), inset 0 0 0 4px var(--tv-gold-30), var(--tv-shadowSoft);
    padding: 0.9rem 1rem 1rem;
  }
  .tv-clip .tv-eyebrow {
    font-family: var(--tv-fontB); font-size: 0.58rem; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--tv-gold);
    margin: 0 0 0.55rem; padding: 0 2.2rem 0.45rem 0; border-bottom: 1px solid var(--tv-gold-30);
  }
  .tv-clip .tv-pic { aspect-ratio: 16/9; overflow: hidden; margin-bottom: 0.6rem; border: 1px solid var(--tv-gold-25); }
  /* Uniform by construction — every visible clipping carries its picture and
     reserves three headline lines plus a dateline, so the column packer can
     be trusted to place exactly as many as were measured for. */
  .tv-clip h3 {
    font-family: var(--tv-fontH); font-size: 0.95rem; font-weight: 600;
    color: var(--tv-headline); line-height: 1.35; margin: 0;
    min-height: calc(0.95rem * 1.35 * 3);
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  }
  .tv-clip .tv-s {
    font-family: var(--tv-fontB); font-style: italic; font-size: 0.72rem;
    color: var(--tv-muted); margin: 0.4rem 0 0; min-height: calc(0.72rem * 1.4);
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  /* ══ ROOM IV — The Hall of Time: night sky, one golden thread ══════════ */
  .tv-room-time {
    border-color: var(--tv-gold-3d);
    background: radial-gradient(ellipse at 50% 0%, #272D4C 0%, #151A32 78%);
  }
  .tv-room-time .tv-tag { color: #B4A886; }
  .tv-star {
    position: absolute; width: 2.5px; height: 2.5px; border-radius: 50%;
    background: #FFE08A; opacity: 0.2; pointer-events: none;
    animation: tvTwinkle 4s ease-in-out var(--sd, 0s) infinite;
  }
  @keyframes tvTwinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.75; } }
  .tv-timeline { position: relative; max-width: 880px; margin: 0 auto; padding: 0.6rem 0 0.2rem; }
  .tv-timeline::before {
    content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 3px;
    transform: translateX(-50%); border-radius: 2px;
    background: linear-gradient(transparent, var(--tv-gold-77) 4%, var(--tv-gold-77) 96%, transparent);
  }
  .tv-trow { position: relative; width: 50%; padding: 0 2.2rem 1.1rem 0; display: flex; justify-content: flex-end; }
  .tv-trow-r { margin-left: 50%; padding: 0 0 1.1rem 2.2rem; justify-content: flex-start; }
  .tv-trow::after {
    content: ''; position: absolute; top: 30px; right: -8px; width: 13px; height: 13px;
    border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFE08A, #A8893A);
    border: 2px solid #A8893A; box-shadow: 0 0 0 3px var(--tv-gold-33), 0 1px 3px rgba(100, 70, 20, 0.3);
  }
  .tv-trow-r::after { right: auto; left: -8px; }
  .tv-plaque-w { position: relative; width: min(100%, 372px); }
  .tv-plaque {
    display: flex; align-items: center; gap: 0.9rem; background: var(--tv-card);
    border: 1px solid var(--tv-gold-25); border-radius: var(--tv-radius-sm);
    box-shadow: var(--tv-shadowSoft); padding: 0.85rem 3rem 0.85rem 0.9rem;
  }
  .tv-coin {
    width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0;
    background: radial-gradient(circle at 35% 30%, #FFE08A 0%, #C8A96B 55%, #A8893A 100%);
    border: 1.5px solid #A8893A; box-shadow: 0 2px 8px rgba(200, 169, 107, 0.4);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tv-fontH); font-size: 0.82rem; font-weight: 700; color: #3D2E14;
    position: relative; overflow: hidden;
  }
  .tv-coin::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    background: linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.65) 47%, transparent 62%);
    transform: translateX(-130%); animation: tvGlint 5.2s ease-in-out var(--gd, 0s) infinite;
  }
  @keyframes tvGlint { 0%, 72% { transform: translateX(-130%); } 88%, 100% { transform: translateX(130%); } }
  .tv-plaque h3 {
    font-family: var(--tv-fontH); font-size: 0.92rem; font-weight: 600;
    color: var(--tv-headline); line-height: 1.3; margin: 0;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .tv-plaque .tv-s {
    font-family: var(--tv-fontB); font-size: 0.62rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--tv-muted); margin: 3px 0 0;
  }
  @media (max-width: 640px) {
    .tv-timeline::before { left: 9px; transform: none; }
    .tv-flow { left: 9px !important; margin-left: -3px !important; }
    .tv-trow, .tv-trow-r { width: 100%; margin-left: 0; padding: 0 0 1rem 2rem; justify-content: flex-start; }
    .tv-trow::after, .tv-trow-r::after { left: 3px; right: auto; }
  }

  /* ══ ROOM V — The Cabinet of Wonders: wood panelling, real ledges ══════ */
  .tv-room-cab {
    border-color: var(--tv-gold-3d);
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.09) 0 3px, transparent 3px 84px),
      linear-gradient(#76552F, #5A4123);
  }
  /* Light text is the only readable ink on the three dark walls. */
  .tv-room-gallery .tv-roomno, .tv-room-time .tv-roomno, .tv-room-cab .tv-roomno { color: #E3CD9B99; }
  /* A translucent pill borrows the wall behind it, and the plum, night-sky
     and wood walls swallow the label whole. On those three the doors are lit
     signs instead: the same parchment, opaque. */
  .tv-room-gallery .tv-door, .tv-room-time .tv-door, .tv-room-cab .tv-door,
  .tv-room-gallery .tv-tuck, .tv-room-time .tv-tuck, .tv-room-cab .tv-tuck { background: var(--tv-card); }
  .tv-sign {
    display: inline-flex; flex-direction: column; align-items: center; gap: 2px; position: relative;
    padding: 0.6rem 1.8rem; border-radius: 8px; border: 1px solid var(--tv-gold-66);
    background: linear-gradient(160deg, #B08D52, #8B6B3E);
    box-shadow: inset 0 1px 0 rgba(255, 235, 190, 0.4), 0 3px 8px rgba(60, 40, 10, 0.3);
  }
  .tv-sign h2 { color: #FFEFC9; }
  .tv-sign .tv-tag { color: #F1DCA8; }
  .tv-sign i {
    position: absolute; top: 6px; width: 5px; height: 5px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #FFE08A, #6B5225);
  }
  .tv-sign i.tv-l { left: 8px; }
  .tv-sign i.tv-r { right: 8px; }
  .tv-hutch {
    position: relative; max-width: 1010px; margin: 0 auto;
    padding: 1.2rem 1.2rem 0.3rem; border-radius: 12px; border: 4px solid #8B6B3E;
    background: linear-gradient(var(--tv-card), var(--tv-soft));
    box-shadow: inset 0 0 0 2px var(--tv-gold-44), 0 6px 18px rgba(60, 40, 10, 0.18);
  }
  .tv-shelfrow { display: flex; flex-wrap: wrap; gap: 0.9rem; justify-content: center; }
  .tv-ledge {
    height: 9px; margin: 12px 4px 20px; border-radius: 4px;
    background: linear-gradient(#B08D52, #8B6B3E);
    box-shadow: 0 4px 6px rgba(60, 40, 10, 0.25);
  }
  .tv-token-w { position: relative; }
  .tv-token {
    display: flex; align-items: center; gap: 0.7rem; width: 218px; height: 80px;
    background: var(--tv-card); border: 1px solid var(--tv-gold-25); border-radius: 14px;
    box-shadow: var(--tv-shadowSoft); padding: 0.7rem 2.9rem 0.7rem 0.75rem;
  }
  .tv-disc {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    background: var(--tv-gold-1f); border: 1px solid var(--tv-gold-40);
    display: flex; align-items: center; justify-content: center; font-size: 1.05rem;
    transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.6);
  }
  .tv-token .tv-txt { min-width: 0; }
  .tv-token .tv-t {
    font-family: var(--tv-fontH); font-style: italic; font-size: 0.88rem;
    color: var(--tv-headline); line-height: 1.3; margin: 0;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .tv-token .tv-s {
    font-family: var(--tv-fontB); font-size: 0.55rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--tv-muted); margin: 3px 0 0;
  }

  /* ── The rotunda finale ────────────────────────────────────────────────── */
  .tv-rot { text-align: center; padding: 2rem 1rem; }
  .tv-ring {
    width: 190px; height: 190px; border-radius: 50%; margin: 0 auto 1.1rem;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    border: 3px double var(--tv-gold-99);
    background: radial-gradient(circle, var(--tv-card), var(--tv-soft));
    box-shadow: 0 0 44px var(--tv-gold-33), inset 0 0 30px var(--tv-gold-22);
  }
  .tv-ring .tv-n { font-family: var(--tv-fontH); font-size: 3rem; font-weight: 700; color: var(--tv-headline); line-height: 1; }
  .tv-ring .tv-lbl { font-family: var(--tv-fontB); font-size: 0.62rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--tv-muted); }
  .tv-ring .tv-lbl2 { font-family: var(--tv-fontH); font-style: italic; font-size: 0.72rem; color: var(--tv-gold); }
  .tv-curated {
    display: inline-block; padding: 0.4rem 1.4rem; border: 1px solid var(--tv-gold-55);
    border-radius: 5px; background: linear-gradient(var(--tv-card), var(--tv-soft));
    font-family: var(--tv-fontH); font-style: italic; font-size: 0.92rem; color: var(--tv-body);
    box-shadow: inset 0 0 0 3px var(--tv-card), inset 0 0 0 4px var(--tv-gold-33); margin: 0;
  }
  .tv-close { font-family: var(--tv-fontH); font-style: italic; font-size: 0.85rem; color: var(--tv-muted); margin: 0; }

  /* ── Cards, hearts and the pile ────────────────────────────────────────── */
  .tv-heart { position: absolute; z-index: 10; }
  .tv-heartc { display: inline-flex; }
  .tv-emptyplate {
    width: 100%; height: 100%; background: var(--tv-gold-1f);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tv-fontH); font-size: 1.6rem; color: var(--tv-gold-66);
  }
  .tv-img { width: 100%; height: 100%; object-fit: cover; }
  .tv-img-top { object-position: center top; }
  /* A card body is an <a> or a <button>, so the boxes inside it are spans
     (a heading or paragraph inside a button is not valid phrasing content);
     they need telling to behave as the blocks the layout assumes. */
  .tv-pic, .tv-cap, .tv-txt, .tv-eyebrow,
  .tv-cap .tv-t, .tv-cap .tv-s, .tv-clip .tv-s, .tv-plaque .tv-s, .tv-token .tv-s { display: block; }

  /* The ambient glyphs are gold line drawings, like the Sun ornament. */
  .tv-glyph { fill: none; stroke: var(--tv-gold); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; }
  .tv-compass circle { stroke: var(--tv-muted); fill: none; }
  .tv-compass path { fill: var(--tv-muted); }
  .tv-compass text { fill: var(--tv-muted); font-family: var(--tv-fontH); }
  .tv-routes path { stroke: var(--tv-gold-55); }

  .tv-pile {
    position: relative; flex-shrink: 0; cursor: pointer;
    background: none; border: none; padding: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.4);
  }
  .tv-pile:active { transform: scale(0.95); transition-duration: 0.1s; }
  .tv-pile:focus-visible { outline: 3px solid var(--tv-gold); outline-offset: 4px; border-radius: 8px; }
  .tv-pl { position: absolute; inset: 0; background: var(--tv-card); transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.3, 1.4); }
  .tv-p1 { transform: rotate(-5deg) translate(-4px, 3px); }
  .tv-p2 { transform: rotate(4deg) translate(4px, 1px); }
  .tv-p3 { transform: rotate(-1.5deg) translate(0, -2px); }
  .tv-pile-h .tv-p1 { transform: rotate(-1.6deg) translate(-3px, 4px); }
  .tv-pile-h .tv-p2 { transform: rotate(1.3deg) translate(3px, 2px); }
  .tv-pface {
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; width: 100%; height: 100%; background: var(--tv-card); text-align: center;
    /* The idle breathe is the pile's "tap me" where hover never fires. */
    animation: tvBreathe 4.5s ease-in-out 1.5s infinite;
  }
  @keyframes tvBreathe {
    0%, 78%, 100% { transform: rotate(0) translateY(0); }
    85% { transform: rotate(-1.6deg) translateY(-4px); }
    92% { transform: rotate(1deg) translateY(0); }
  }
  .tv-pface b { font-family: var(--tv-fontH); font-size: 1.6rem; font-weight: 700; color: var(--tv-headline); line-height: 1; }
  .tv-pmeta { display: flex; flex-direction: column; }
  .tv-pmeta em { font-family: var(--tv-fontB); font-style: normal; font-size: 0.56rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--tv-muted); }
  .tv-pmeta i { font-family: var(--tv-fontB); font-style: normal; font-size: 0.62rem; color: var(--tv-gold); margin-top: 2px; }
  .tv-pile-stamp { width: 138px; height: 200px; }
  .tv-pile-stamp .tv-pl, .tv-pile-stamp .tv-pface { border: 2px dashed var(--tv-gold-66); border-radius: 4px; box-shadow: var(--tv-shadow); }
  .tv-pile-post { width: 248px; height: 212px; }
  .tv-pile-post .tv-pl, .tv-pile-post .tv-pface { border: 1px solid var(--tv-gold-40); border-radius: 6px; box-shadow: var(--tv-shadowDeep); }
  .tv-pile-clip { width: 100%; height: 170px; break-inside: avoid; display: inline-block; }
  .tv-pile-clip .tv-pl, .tv-pile-clip .tv-pface {
    border: 1px solid var(--tv-gold-30);
    box-shadow: inset 0 0 0 3px var(--tv-card), inset 0 0 0 4px var(--tv-gold-30), var(--tv-shadowSoft);
  }
  .tv-pile-plq { width: min(100%, 372px); height: 88px; }
  .tv-pile-plq .tv-pl, .tv-pile-plq .tv-pface { border: 1px solid var(--tv-gold-25); border-radius: var(--tv-radius-sm); box-shadow: var(--tv-shadowSoft); }
  .tv-pile-tok { width: 218px; height: 80px; }
  .tv-pile-tok .tv-pl, .tv-pile-tok .tv-pface { border: 1px solid var(--tv-gold-25); border-radius: 14px; box-shadow: var(--tv-shadowSoft); }
  .tv-pile-plq .tv-pface, .tv-pile-tok .tv-pface { flex-direction: row; gap: 10px; }
  .tv-pile-plq .tv-pmeta, .tv-pile-tok .tv-pmeta { text-align: left; }
  .tv-pilein { animation: tvPileIn 0.35s ease; }
  @keyframes tvPileIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .tv-tuck {
    display: inline-flex; align-items: center; gap: 0.5rem; min-height: 42px;
    padding: 0 1.2rem; border-radius: 21px; cursor: pointer;
    background: var(--tv-card-b0); border: 1.5px dashed var(--tv-gold-66);
    font-family: var(--tv-fontB); font-size: 0.74rem; letter-spacing: 0.06em;
    color: var(--tv-muted); transition: transform 0.25s ease, border-color 0.25s ease;
  }
  .tv-tuckrow { display: flex; justify-content: center; margin-top: 1.2rem; position: relative; z-index: 3; }

  .tv-spark {
    position: fixed; z-index: 1000; font-size: 0.85rem; color: #D4AF37; pointer-events: none;
    animation: tvSparkFly 0.7s ease-out forwards;
  }
  @keyframes tvSparkFly {
    0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(1.25) rotate(160deg); opacity: 0; }
  }
  @keyframes tvPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }
  .tv-sunspin { display: inline-flex; animation: tvSpin 75s linear infinite; }
  .tv-sunspin-rev { animation-direction: reverse; }
  @keyframes tvSpin { to { transform: rotate(360deg); } }
  .tv-wobble { animation: tvWobble 0.7s ease; }
  @keyframes tvWobble {
    0% { transform: rotate(0); } 25% { transform: rotate(-14deg) scale(1.12); }
    55% { transform: rotate(10deg) scale(1.06); } 80% { transform: rotate(-4deg); } 100% { transform: rotate(0); }
  }

  /* Hover lifts live on the wrapper, not the card: the heart is the card's
     *sibling* (a button cannot nest in a button), so lifting only the card
     would leave its heart floating behind. */
  @media (hover: hover) {
    .tv-door:hover { transform: translateY(-2px); border-color: var(--tv-gold); border-style: solid; box-shadow: 0 4px 12px rgba(100, 70, 20, 0.15); }
    .tv-stamp-w:hover, .tv-postcard-w:hover { transform: rotate(var(--tilt, 0deg)) translateY(-6px) scale(1.03); }
    .tv-clip-w:hover, .tv-plaque-w:hover, .tv-token-w:hover { translate: 0 -5px; }
    .tv-stamp-w, .tv-postcard-w { transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.3); }
    .tv-clip-w, .tv-plaque-w, .tv-token-w { transition: translate 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.3); }
    .tv-stamp-w:hover .tv-card, .tv-postcard-w:hover .tv-card,
    .tv-clip-w:hover .tv-card, .tv-plaque-w:hover .tv-card, .tv-token-w:hover .tv-card { box-shadow: var(--tv-shadowDeep); }
    .tv-stamp-w:hover .tv-heartc, .tv-postcard-w:hover .tv-heartc,
    .tv-clip-w:hover .tv-heartc, .tv-plaque-w:hover .tv-heartc, .tv-token-w:hover .tv-heartc { animation: tvPulse 0.8s ease-in-out infinite; }
    .tv-token-w:hover .tv-disc { transform: rotate(-12deg) scale(1.15); }
    .tv-pile:hover { transform: translateY(-5px); }
    .tv-pile:hover .tv-p1 { transform: rotate(-10deg) translate(-12px, 5px); }
    .tv-pile:hover .tv-p2 { transform: rotate(8deg) translate(12px, 2px); }
    .tv-pile:hover .tv-p3 { transform: rotate(-3deg) translate(-2px, -4px); }
    .tv-pile-h:hover .tv-p1 { transform: rotate(-3deg) translate(-8px, 6px); }
    .tv-pile-h:hover .tv-p2 { transform: rotate(2.5deg) translate(8px, 3px); }
    .tv-tuck:hover { transform: translateY(-2px); border-color: var(--tv-gold); }
  }

  /* ── Entrance choreography — replayed on every arrival ───────────────────
     Every rule below is the mock's, with one deliberate change: the "before"
     state is scoped to a stage that has not been entered yet, and the
     animations fill "backwards" rather than "both". A "both" fill would pin
     each card's transform for the rest of the visit, and a pinned transform
     beats the inline one the pile's FLIP writes — the cards would refuse to
     fly. Ending on the element's natural state instead costs nothing (each
     keyframe's 100% already *is* that state) and leaves hover lifts and FLIP
     free to drive the same properties afterwards. */
  .tv-js .tv-room::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background: linear-gradient(105deg, transparent 32%, rgba(255, 242, 205, 0.5) 46%, transparent 60%);
    transform: translateX(-130%);
  }
  .tv-js .tv-room.tv-enter::after { animation: tvSweep 1.1s ease 0.05s; }
  @keyframes tvSweep { to { transform: translateX(130%); } }

  .tv-js .tv-stage:not(.tv-enter) .tv-dv { opacity: 0; translate: 0 18px; }
  .tv-js .tv-enter .tv-dv { animation: tvDvIn 0.6s ease 0.1s backwards; }
  @keyframes tvDvIn { from { opacity: 0; translate: 0 18px; } to { opacity: 1; translate: 0 0; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-step { opacity: 0; }
  .tv-js .tv-enter .tv-step { animation: tvStepFall 0.45s ease backwards; }
  .tv-js .tv-enter .tv-step:nth-child(1) { animation-delay: 0.5s; }
  .tv-js .tv-enter .tv-step:nth-child(2) { animation-delay: 0.7s; }
  .tv-js .tv-enter .tv-step:nth-child(3) { animation-delay: 0.9s; }
  .tv-js .tv-enter .tv-step:nth-child(4) { animation-delay: 1.1s; }
  @keyframes tvStepFall { 0% { opacity: 0; scale: 0.3; } 100% { opacity: 1; scale: 1; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-navrow { opacity: 0; translate: 0 6px; }
  .tv-js .tv-enter .tv-navrow { animation: tvNavIn 0.5s ease 1.25s backwards; }
  @keyframes tvNavIn { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-ticket { opacity: 0; }
  .tv-js .tv-enter .tv-ticket { animation: tvTicketIn 0.7s ease 0.4s backwards; }
  @keyframes tvTicketIn {
    0% { opacity: 0; translate: 0 -10px; rotate: 4deg; }
    100% { opacity: 1; translate: 0 0; rotate: -2deg; }
  }
  .tv-js .tv-stage:not(.tv-enter) .tv-ring { opacity: 0; scale: 0.85; }
  .tv-js .tv-enter .tv-ring { animation: tvRingIn 0.7s cubic-bezier(0.2, 0.75, 0.3, 1.2) backwards; }
  @keyframes tvRingIn { from { opacity: 0; scale: 0.85; } to { opacity: 1; scale: 1; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-afterring { opacity: 0; translate: 0 10px; }
  .tv-js .tv-enter .tv-afterring { animation: tvAfterIn 0.6s ease 0.5s backwards; }
  @keyframes tvAfterIn { from { opacity: 0; translate: 0 10px; } to { opacity: 1; translate: 0 0; } }

  /* Room I — portraits drop onto their hooks and swing until they settle. */
  .tv-js .tv-stage:not(.tv-enter) .tv-stamp-w { opacity: 0; }
  .tv-js .tv-stamp-w.tv-in { animation: tvHangIn 0.9s ease var(--d, 0s) backwards; transform-origin: top center; }
  @keyframes tvHangIn {
    0%   { opacity: 0; transform: translateY(-52px) rotate(calc(var(--tilt, 0deg) - 10deg)); }
    50%  { opacity: 1; transform: translateY(2px) rotate(calc(var(--tilt, 0deg) + 6deg)); }
    75%  { transform: translateY(0) rotate(calc(var(--tilt, 0deg) - 3deg)); }
    100% { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)); }
  }
  .tv-js .tv-stage:not(.tv-enter) .tv-rail { scale: 0 1; }
  .tv-js .tv-room-gallery.tv-enter .tv-rail { animation: tvGrowX 0.7s ease 0.25s backwards; }

  /* Room II — postcards fly in like arriving mail, then the tape presses. */
  .tv-js .tv-stage:not(.tv-enter) .tv-postcard-w { opacity: 0; }
  .tv-js .tv-postcard-w.tv-in { animation: tvFlyIn 0.75s cubic-bezier(0.2, 0.75, 0.3, 1.05) var(--d, 0s) backwards; }
  @keyframes tvFlyIn {
    0%   { opacity: 0; transform: translate(var(--fx, -150px), -44px) rotate(calc(var(--tilt, 0deg) * 4)) scale(0.72); }
    100% { opacity: 1; transform: translate(0, 0) rotate(var(--tilt, 0deg)) scale(1); }
  }
  .tv-js .tv-stage:not(.tv-enter) .tv-tape { opacity: 0; }
  .tv-js .tv-postcard-w.tv-in .tv-tape { animation: tvTapePress 0.3s ease calc(var(--d, 0s) + 0.55s) backwards; }
  @keyframes tvTapePress { 0% { opacity: 0; scale: 1.6; } 100% { opacity: 1; scale: 1; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-compass { opacity: 0; rotate: -30deg; }
  .tv-js .tv-room-map.tv-enter .tv-compass { animation: tvCompassIn 1.2s ease 0.2s backwards; }
  @keyframes tvCompassIn { from { opacity: 0; rotate: -30deg; } to { opacity: 0.13; rotate: 0deg; } }

  /* Room III — each clipping is stamped down by the press, then pinned. */
  .tv-js .tv-stage:not(.tv-enter) .tv-clip-w { opacity: 0; }
  .tv-js .tv-clip-w.tv-in { animation: tvPressIn 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) var(--d, 0s) backwards; }
  @keyframes tvPressIn { 0% { opacity: 0; scale: 1.45; } 60% { opacity: 1; scale: 0.97; } 100% { opacity: 1; scale: 1; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-pin { scale: 0; }
  .tv-js .tv-clip-w.tv-in .tv-pin { animation: tvPop 0.35s cubic-bezier(0.2, 0.7, 0.3, 1.6) calc(var(--d, 0s) + 0.38s) backwards; }

  /* Room IV — the golden thread draws itself; moments step onto it. */
  .tv-js .tv-stage:not(.tv-enter) .tv-timeline::before { scale: 1 0; transform-origin: 50% 0; }
  .tv-js .tv-room-time.tv-enter .tv-timeline::before { animation: tvGrowY 1.6s ease 0.25s backwards; transform-origin: 50% 0; }
  .tv-js .tv-stage:not(.tv-enter) .tv-plaque-w { opacity: 0; }
  .tv-js .tv-trow.tv-in .tv-plaque-w { animation: tvStepInL 0.6s cubic-bezier(0.2, 0.75, 0.3, 1.1) var(--d, 0s) backwards; }
  .tv-js .tv-trow-r.tv-in .tv-plaque-w { animation-name: tvStepInR; }
  @keyframes tvStepInL { 0% { opacity: 0; translate: -56px 0; } 100% { opacity: 1; translate: 0 0; } }
  @keyframes tvStepInR { 0% { opacity: 0; translate: 56px 0; } 100% { opacity: 1; translate: 0 0; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-trow::after { scale: 0; }
  .tv-js .tv-trow.tv-in::after { animation: tvPop 0.4s cubic-bezier(0.2, 0.7, 0.3, 1.5) calc(var(--d, 0s) + 0.25s) backwards; }

  /* Room V — the sign swings, ledges grow, tokens plop onto their shelves. */
  .tv-js .tv-room-cab.tv-enter .tv-sign { animation: tvSignSwing 1.2s ease 0.15s backwards; transform-origin: 50% -6px; }
  @keyframes tvSignSwing {
    0% { rotate: -7deg; } 35% { rotate: 5deg; } 65% { rotate: -3deg; } 85% { rotate: 1.5deg; } 100% { rotate: 0deg; }
  }
  .tv-js .tv-stage:not(.tv-enter) .tv-ledge { scale: 0 1; }
  .tv-js .tv-ledge.tv-in { animation: tvGrowX 0.6s ease backwards; }
  .tv-js .tv-stage:not(.tv-enter) .tv-token-w { opacity: 0; }
  .tv-js .tv-token-w.tv-in { animation: tvPlopIn 0.55s cubic-bezier(0.25, 1.4, 0.4, 1) var(--d, 0s) backwards; }
  @keyframes tvPlopIn { 0% { opacity: 0; translate: 0 -38px; } 70% { opacity: 1; translate: 0 3px; } 100% { opacity: 1; translate: 0 0; } }
  .tv-js .tv-stage:not(.tv-enter) .tv-pile { opacity: 0; }
  .tv-js .tv-pile.tv-in { animation: tvPlopIn 0.55s cubic-bezier(0.25, 1.4, 0.4, 1) var(--d, 0s) backwards; }

  @keyframes tvPop { 0% { scale: 0; } 100% { scale: 1; } }
  @keyframes tvGrowX { to { scale: 1 1; } }
  @keyframes tvGrowY { to { scale: 1 1; } }

  /* ── Ambient life: every room keeps one small resident ─────────────────── */
  .tv-amb { position: absolute; pointer-events: none; z-index: 4; opacity: 0; }
  .tv-js .tv-feather { left: 14%; top: -30px; animation: tvFeatherFall 17s ease-in-out 2s infinite; }
  @keyframes tvFeatherFall {
    0%   { opacity: 0;   translate: 0 0;       rotate: -10deg; }
    6%   { opacity: 0.5; }
    25%  { translate: 64px 170px;  rotate: 14deg; }
    50%  { translate: -24px 350px; rotate: -12deg; }
    75%  { translate: 52px 530px;  rotate: 10deg; }
    92%  { opacity: 0.4; }
    100% { opacity: 0;   translate: 0 660px;   rotate: -6deg; }
  }
  .tv-js .tv-stamps .tv-stamp-w:nth-child(5n+2) .tv-stamp { animation: tvFrameSway 11s ease-in-out 5s infinite; transform-origin: top center; }
  .tv-js .tv-stamps .tv-stamp-w:nth-child(7n+4) .tv-stamp { animation: tvFrameSway 13s ease-in-out 8s infinite; transform-origin: top center; }
  @keyframes tvFrameSway { 0%, 86%, 100% { rotate: 0deg; } 90% { rotate: 1.8deg; } 95% { rotate: -1.4deg; } }
  .tv-js .tv-plane { left: 60%; top: 52px; opacity: 0.45; animation: tvPlaneDrift 7s ease-in-out 1s infinite; }
  @keyframes tvPlaneDrift { 0%, 100% { translate: 0 0; } 50% { translate: 30px -12px; } }
  .tv-js .tv-newsfly { left: -44px; top: 15%; animation: tvNewsTumble 23s ease-in-out 4s infinite; }
  @keyframes tvNewsTumble {
    0%   { opacity: 0;    translate: 0 0;         rotate: 0deg; }
    6%   { opacity: 0.4;  }
    30%  { translate: 330px 55px;  rotate: 300deg; }
    55%  { translate: 620px -15px; rotate: 620deg; }
    80%  { translate: 900px 45px;  rotate: 900deg; }
    94%  { opacity: 0.35; }
    100% { opacity: 0;    translate: 1150px 15px; rotate: 1080deg; }
  }
  .tv-flow {
    position: absolute; left: 50%; top: 0; width: 9px; height: 9px; margin-left: -4.5px;
    border-radius: 50%; pointer-events: none; opacity: 0;
    background: radial-gradient(circle, #FFE08A, rgba(200, 169, 107, 0) 70%);
    box-shadow: 0 0 9px 3px #FFE08A77;
  }
  .tv-js .tv-flow { animation: tvTimeFlow 8s ease-in-out 2.5s infinite; }
  @keyframes tvTimeFlow { 0% { top: 0; opacity: 0; } 8% { opacity: 0.9; } 88% { opacity: 0.9; } 100% { top: 100%; opacity: 0; } }
  .tv-js .tv-bee { left: 16%; top: 26%; font-size: 1rem; animation: tvBeeWander 13s ease-in-out 3s infinite; }
  @keyframes tvBeeWander {
    0%   { opacity: 0;    translate: 0 0;        rotate: 0deg; }
    8%   { opacity: 0.55; }
    25%  { translate: 190px -44px; rotate: 12deg; }
    45%  { translate: 360px 28px;  rotate: -10deg; }
    65%  { translate: 190px 92px;  rotate: 8deg; }
    85%  { translate: 44px 30px;   rotate: -6deg; opacity: 0.55; }
    100% { opacity: 0;    translate: 0 0;        rotate: 0deg; }
  }

  /* ── Narrow phones: long room names must not blow out the door pills ──── */
  @media (max-width: 520px) {
    .tv-museum { padding: 0.45rem; }
    .tv-room { padding: 1.2rem 0.8rem 1.3rem; }
    .tv-door { font-size: 0.56rem; letter-spacing: 0.12em; padding: 0 0.85rem; max-width: calc(100vw - 6rem); }
    .tv-door-lg { font-size: 0.6rem; }
    .tv-facade { gap: 1rem; }
    .tv-hutch { padding: 1rem 0.7rem 0.3rem; }
  }

  /* ── Calm by request: everything visible, every move instant ──────────── */
  @media (prefers-reduced-motion: reduce) {
    .tv-track { transition: none !important; }
    .tv-museum *, .tv-museum *::before, .tv-museum *::after { animation: none !important; }
  }
`;
