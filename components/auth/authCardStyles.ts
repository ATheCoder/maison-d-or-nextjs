/**
 * The look of the signed-out pages — /login, /signup, /forgot-password,
 * /reset-password — in one place, because they are one surface. A visitor
 * moves between all four mid-task, and until now each carried its own copy of
 * the same palette and the same three style objects, which is three chances
 * for them to drift apart.
 *
 * The type is the editorial one the rest of the house speaks (see
 * app/(site)/page.tsx and the tokens at the top of globals.css): Playfair at
 * 300 with the letter-spacing left open, Lato at 300, gold hairlines. What
 * stood here before was Playfair at 600 lettered in Lato 700 — the type of a
 * generic product sign-up, sitting on this house's photograph.
 *
 * The corners are the *guardian* geometry, not the editorial one: 18px card,
 * 10px field, 12px button, the same radii the welcome wizard, the grown-up
 * gate, the profile picker and FamilyManager all wear. A visitor crosses from
 * /signup straight into /welcome, and near-square corners on this side of that
 * door made the two rooms look like two different products. Keep the three
 * radii in step with those surfaces rather than with the homepage.
 * Nothing about the layout changed; it is the same card at the same width.
 *
 * Colours are spelled out rather than read from var(--gold) and friends, the
 * same way the other guardian surfaces do it (globals.css `.mdo-dp`,
 * FamilyManager, the welcome wizard): the Daily Gold themes repaint those
 * tokens at runtime, and the front door should look like itself no matter
 * which theme the last reader left behind. The values below ARE the classic
 * palette from globals.css — keep them in step by hand if that ever changes.
 *
 * Stateful bits (hover, focus, disabled, autofill) can't live in an inline
 * style, so the field, the submit button and the links are dressed by
 * `.mdo-auth-*` classes in globals.css instead. Same split, and same reason,
 * as the date picker.
 */
import type { CSSProperties } from 'react';

export const C = {
  gold: '#C9A96E', // --gold
  goldDeep: '#A8843F', // pressed gold — the date picker's confirm uses the same
  brown: '#2C2416', // --brown: headings, and whatever the visitor types
  taupe: '#8B7355', // --taupe: labels, captions, running prose
  border: '#E8DDD0', // --border
  // Not --ivory (#FAF7F2). This is the paint under /signup's drawing-room
  // photograph, picked to match the wall in it so a failed image load reads as
  // a warm empty room rather than a white flash.
  wall: '#F5F0E7',
  red: '#A4442E',
};

/** Full-height centred shell for the three pages with no photograph. */
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
 * The card: the welcome wizard's 18px corners, a hairline border, and the gold
 * rule along the top that every editorial card on the homepage wears. /signup
 * layers a glass fill and a deeper shadow over this, because it has a
 * photograph to lift off; the rest keep it as it is.
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
