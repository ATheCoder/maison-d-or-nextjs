/**
 * The front door: /login, /signup, /forgot-password, /reset-password and
 * /welcome. A route group, so none of those URLs change — what changes is
 * that the five pages now share the one thing they must agree on.
 *
 * ── Why the theme pin is here, and why it is not optional ──────────────────
 *
 * These pages used to be theme-immune by being token-immune: guardianSurface
 * spelled every colour out as a hex literal, precisely so "the Daily Gold
 * themes repaint --gold and the front door should not change colour with
 * them". That worked, at the price of a second design system — its own
 * palette, its own field, its own button, drifting against the house set.
 *
 * The pin buys the same immunity from the tokens instead. ThemeProvider
 * mirrors the reader's theme onto <html> in an effect, and a client-side
 * navigation out of the Daily Gold group into /login keeps that attribute on
 * the same document — so a reader who chose navy would otherwise carry navy
 * into the front door. `data-theme="parchment"` re-scopes it back to the
 * house default at this boundary, whatever sits above. Same trick, same
 * reason, as app/admin/layout.tsx.
 *
 * ── What is deliberately NOT here ─────────────────────────────────────────
 *
 * The shell. Not because the five pages disagree about the wash — they do
 * not — but because they disagree about the PHOTOGRAPH: /login, /signup and
 * /welcome stand on the drawing room, /forgot-password and /reset-password on
 * the flat wash, and so does AuthCardFallback, on purpose, because a
 * placeholder has no business pulling a background image down the same wire
 * the form it is standing in for is waiting on. A shell on this layout would
 * start that request during the Suspense fallback and undo the decision. So
 * each page wears `.front-door` itself, and the three that want the room add
 * `.front-door-photo` beside it; both live in globals.css.
 *
 * Which leaves this layout doing exactly one thing, and `display: contents`
 * is how it does it without becoming a box in anybody's layout — the same
 * shape ThemeProvider uses for the same reason.
 */
export default function FrontDoorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="parchment" style={{ display: 'contents' }}>
      {children}
    </div>
  );
}
