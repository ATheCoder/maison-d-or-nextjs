/**
 * The look of the grown-up surfaces — /login, /signup, /forgot-password,
 * /reset-password and /welcome — in one place, because they are one surface.
 *
 * This was `components/auth/authCardStyles.ts` and covered only the four
 * signed-out pages. The welcome wizard sat directly behind them carrying its
 * own copy of the same primitives — its own palette, its own field, its own
 * gold button — and the copies had drifted: Playfair 600 where the front door
 * had settled on 300, Lato 700 where the front door had settled on 400, a card
 * with no gold rule along its top, and fields with no focus ring at all because
 * an inline style cannot carry one. A visitor crosses from /signup into
 * /welcome in a single click, so the two were reading as two products.
 *
 * The type is the editorial one the rest of the house speaks (see
 * app/(site)/page.tsx and the tokens at the top of globals.css): Playfair at
 * 300 with the letter-spacing left open, Lato at 300, gold hairlines.
 *
 * The corners are the *guardian* geometry, not the editorial one: 18px card,
 * 10px field, 12px button, the same radii the grown-up gate, the profile picker
 * and FamilyManager all wear. Keep the three radii in step with those surfaces
 * rather than with the homepage.
 *
 * Colours are spelled out rather than read from var(--gold) and friends, the
 * same way the other guardian surfaces do it (globals.css `.mdo-dp`,
 * FamilyManager): the Daily Gold themes repaint those tokens at runtime, and
 * the front door should look like itself no matter which theme the last reader
 * left behind. The values below ARE the classic palette from globals.css — keep
 * them in step by hand if that ever changes.
 *
 * Stateful bits (hover, focus, disabled, autofill) can't live in an inline
 * style, so fields, buttons and links are dressed by `.mdo-guardian-*` classes
 * in globals.css instead. Same split, and same reason, as the date picker.
 */
import type { CSSProperties } from 'react';

export const C = {
  gold: '#C9A96E', // --gold
  goldDeep: '#A8843F', // pressed gold — the date picker's confirm uses the same
  brown: '#2C2416', // --brown: headings, and whatever the visitor types
  /**
   * The mid-tone between `brown` and `taupe`. It arrived as the wizard's
   * private `C.brown` and is kept because it earns its place: it is the weight
   * for a line of prose that has to carry real instruction — the sentence under
   * a step's heading, the copy inside a dashed callout — where `taupe` reads as
   * a caption and `brown` reads as another heading.
   */
  umber: '#5C4A2A',
  taupe: '#8B7355', // --taupe: labels, captions, running prose
  border: '#E8DDD0', // --border
  // Not --ivory (#FAF7F2). This is the paint under /signup's drawing-room
  // photograph, picked to match the wall in it so a failed image load reads as
  // a warm empty room rather than a white flash.
  wall: '#F5F0E7',
  red: '#A4442E',
};

/**
 * Field and button geometry as numbers, not just as CSS. The `.mdo-guardian-*`
 * rules own the real thing; these exist so the two skeletons (AuthCardFallback
 * and app/welcome/loading.tsx) can hold a shape the real control lands into
 * exactly, instead of each guessing at it and drifting.
 *
 * The heights are the computed ones: padding + a line of the control's own type
 * + the border. Recompute them if the padding or font-size in globals.css
 * moves.
 */
export const FIELD_RADIUS = 10;
export const FIELD_HEIGHT = 42; // 0.75rem×2 + 0.85rem line + 1px border ×2
export const BUTTON_RADIUS = 12;
export const BUTTON_HEIGHT = 46; // 0.95rem×2 + 0.7rem line + 1px border ×2

/** Full-height centred shell for the pages with no photograph. */
export const shellStyle: CSSProperties = {
  minHeight: '100vh',
  background: C.wall,
  backgroundImage:
    'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

/**
 * The same shell with the drawing room hung over its gradient wash — the front
 * door proper: /login, /signup and, one click later, /welcome. `C.wall` stays
 * underneath as the paint under the photo: it is what shows if the image 404s
 * or has yet to decode, and it matches the wall in the picture closely enough
 * that the failure reads as a warm empty room rather than a white flash.
 *
 * The vignette sits *above* the photo, settling the gilt frames at the edges so
 * they frame the card instead of pulling the eye outward.
 *
 * Not used by the two skeletons: a placeholder has no business pulling a
 * background image down the same wire the form it is standing in for is waiting
 * on. See the note at the top of AuthCardFallback.
 */
export const photoShellStyle: CSSProperties = {
  ...shellStyle,
  backgroundImage:
    "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(120,95,55,0.10) 100%), url('/auth/maison-drawing-room.webp')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

/**
 * The card: 18px corners, a hairline border, and the gold rule along the top
 * that every editorial card on the homepage wears. The pages that stand on the
 * photograph layer `glassCardStyle` over this, because they have a room to lift
 * off; the rest keep it as it is.
 */
export const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 400,
  background: 'rgba(255,250,242,0.86)',
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  borderTop: `1px solid ${C.gold}`,
  boxShadow: '0 2px 20px rgba(44,36,22,0.06)',
  padding: '2.75rem 2.25rem',
};

/**
 * What a card wears when it stands on `photoShellStyle` rather than on flat
 * paint — spread over `cardStyle` or `wideCardStyle`, never used alone.
 *
 * The wall behind the card in the photograph reads ~#F3E7D0; this fill
 * composites brighter than that, so the card lifts off the room instead of
 * dissolving into it. The shadow does the rest of the separating — deeper than
 * the flat-wash pages need, because here there is a room behind it — and the
 * border warms from the plain hairline to gold at 42%, which is what keeps the
 * blurred edge legible against a photograph rather than against paint.
 */
export const glassCardStyle: CSSProperties = {
  background: 'rgba(255,250,242,0.82)',
  backdropFilter: 'blur(10px) saturate(1.08)',
  WebkitBackdropFilter: 'blur(10px) saturate(1.08)',
  border: '1px solid rgba(201,169,110,0.42)',
  borderTop: `1px solid ${C.gold}`,
  boxShadow:
    '0 24px 60px rgba(92,72,38,0.20), 0 2px 10px rgba(92,72,38,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
};

/**
 * The wizard's card is the same card, wider. The extra 80px is not decoration:
 * /welcome asks for an emblem and a colour scheme, and both are swatch grids
 * that wrap badly at 400. Everything else — fill, corners, the gold rule —
 * stays shared, which is the whole point.
 */
export const wideCardStyle: CSSProperties = {
  ...cardStyle,
  maxWidth: 480,
  padding: '2.5rem 2rem',
};

/** Gold, tracked, uppercase — the house eyebrow, above the title. */
export const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.58rem',
  fontWeight: 300,
  letterSpacing: '0.28em',
  // Tracking is added after the last letter too, so a centred line sits half a
  // space to the left of centre without this.
  textIndent: '0.28em',
  textTransform: 'uppercase',
  color: C.gold,
  textAlign: 'center',
  margin: '0 0 0.9rem',
};

/** Playfair at 300, tracked open: every heading in the house is this. */
export const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'clamp(1.4rem, 5vw, 1.7rem)',
  fontWeight: 300,
  letterSpacing: '0.08em',
  lineHeight: 1.3,
  color: C.brown,
  textAlign: 'center',
  margin: '0 0 1.4rem',
};

/**
 * Great Vibes in gold — the flourish the homepage hero opens with, above the
 * wordmark. Only /signup uses it: it is the same greeting, at the same door.
 */
export const flourishStyle: CSSProperties = {
  fontFamily: 'var(--font-script)',
  // Great Vibes sets small for its point size — the homepage hero runs it at
  // 1.6–2.2rem against a 4.2rem wordmark; this is the same relationship.
  fontSize: '1.95rem',
  fontWeight: 300,
  letterSpacing: '0.05em',
  lineHeight: 1,
  color: C.gold,
  textAlign: 'center',
  margin: '0 0 0.4rem',
};

/** Playfair italic — the house's caption voice, for a line of promise. */
export const leadStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontStyle: 'italic',
  fontSize: '0.98rem',
  fontWeight: 300,
  lineHeight: 1.7,
  color: C.taupe,
  textAlign: 'center',
  margin: '0 0 0.7rem',
};

/**
 * The line under a wizard step's heading — what this step is for, in one
 * sentence. Distinct from `leadStyle`: that one is a flourish under a greeting
 * and speaks in Playfair italic, this one is an instruction and speaks in the
 * body face, at `umber` so it carries.
 */
export const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.85rem',
  fontWeight: 300,
  lineHeight: 1.6,
  color: C.umber,
  textAlign: 'center',
  margin: '0 0 1.75rem',
};

/** Running prose: Lato 300 at the body line-height the whole site uses. */
export const bodyStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.8rem',
  fontWeight: 300,
  lineHeight: 1.75,
  color: C.taupe,
  textAlign: 'center',
  margin: '0 0 1.6rem',
};

/**
 * The hairline between what the page says and what it asks for. Fades out at
 * both ends so it reads as a rule drawn on the card, not a border dividing it.
 */
export const ruleStyle: CSSProperties = {
  height: 1,
  border: 0,
  background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)',
  margin: '0 0 1.6rem',
};

/** Field label — the eyebrow again, quieter and left-aligned. */
export const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.58rem',
  fontWeight: 300,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: C.taupe,
  margin: '0 0 0.45rem',
};

/**
 * The note under a field: why we are asking, or what we made of the answer.
 * Quieter than the field, and left-aligned with it.
 */
export const hintStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.72rem',
  fontWeight: 300,
  lineHeight: 1.5,
  color: C.taupe,
  margin: '0.45rem 0 0',
};

/**
 * A panel set off from the form — a reassurance, or the result of something
 * just done. The dashed gold edge is what marks it as an aside rather than
 * another field; `umber` is the prose weight, because these say something the
 * grown-up is meant to actually read.
 */
export const noteStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.76rem',
  fontWeight: 300,
  lineHeight: 1.6,
  color: C.umber,
  background: 'rgba(201,169,110,0.1)',
  border: '1px dashed rgba(201,169,110,0.45)',
  borderRadius: FIELD_RADIUS,
  padding: '0.75rem 0.9rem',
};

/** What went wrong, in the one red the house owns. */
export const errorStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.78rem',
  fontWeight: 300,
  lineHeight: 1.6,
  color: C.red,
  margin: '0 0 1rem',
};

/** The way on to the other door, under the button. */
export const footerStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.78rem',
  fontWeight: 300,
  color: C.taupe,
  textAlign: 'center',
  margin: '1.6rem 0 0',
};
