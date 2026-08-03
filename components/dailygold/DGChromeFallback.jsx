'use client';
/**
 * The static shell for the whole (dg) group — what a hard navigation paints
 * before anyone is known.
 *
 * Under Cache Components every route must produce a prerendered shell, and a
 * shell is by definition the same HTML for every reader. app/(dg)/layout.tsx
 * cannot therefore await the session above this point, so its identity read
 * sits inside a Suspense boundary and this is that boundary's fallback: the
 * frame's geometry with nobody in it.
 *
 * Theme-neutral by design, and that is a decision rather than an oversight.
 * The reader's palette comes from their profile, which comes from the session
 * — so no prerendered shell can carry it, whatever shape this file takes. The
 * choice is between painting the real chrome in the default palette and
 * recolouring it when the identity lands, or painting an empty frame that is
 * replaced wholesale by the correct one. This is the second: a reader on a
 * dark theme sees a neutral frame give way to their own colours, never their
 * own rail in somebody else's palette.
 *
 * What it deliberately does *not* draw is a content skeleton. Each destination
 * has its own loading.tsx, and drawing a second skeleton here would put one
 * inside the other — the reading column mounted, destroyed and rebuilt,
 * replaying its 0.4s dgFadeIn the moment the chrome resolved. That was the
 * flashing that merging the two layouts (see DGAppChrome) existed to end, and
 * an empty <main> is what keeps it ended: the content column mounts once, when
 * the real chrome does, and goes straight to its own skeleton.
 *
 * This is only ever seen on an entry navigation. A client-side move between
 * rail destinations keeps the layout mounted, so the chrome never unresolves.
 */
import { NAV_SHELL_CSS } from '@/components/dailygold/DGPageShell';
import { THEMES, DEFAULT_THEME } from '@/components/theme/themes';

const neutral = THEMES[DEFAULT_THEME];

export default function DGChromeFallback() {
  return (
    <div
      className="dg-root"
      aria-busy="true"
      style={{
        '--dg-gold': neutral.accentGold,
        backgroundColor: neutral.bgPrimary,
        fontFamily: neutral.fontBody,
        color: neutral.textBody,
      }}
    >
      <style>{NAV_SHELL_CSS}</style>
      {/* The rail's column, empty. Reserving it is the point: the shell and the
          real chrome agree on where the content starts, so nothing shifts
          sideways when the identity lands. */}
      <div className="dg-rail" />
      <main className="dg-shell" />
    </div>
  );
}
