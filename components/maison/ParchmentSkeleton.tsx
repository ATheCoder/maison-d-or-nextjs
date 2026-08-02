import type { CSSProperties, ReactNode } from 'react';

/**
 * ParchmentSkeleton — the shimmer, the reduced-motion escape hatch and the
 * single "Loading" announcement, in one place, for every route that lives
 * OUTSIDE the themed `.dg-root` shell.
 *
 * Inside `.dg-root` the shell does this work for us: DGContentSkeleton can lean
 * on `var(--dg-gold)` and on NAV_SHELL_CSS's own `prefers-reduced-motion` block,
 * so it declares neither. The parchment routes have neither luxury. They hardcode
 * the palette — C = { gold:'#C9A96E', ivory:'#F5F0E7', ink:'#241A0C',
 * brown:'#5C4A2A', muted:'#8B7355' } — and inherit no motion handling at all, so
 * anything that moves has to bring its own `@media (prefers-reduced-motion)`
 * clause. Six loading states repeating that by hand is six chances for one of
 * them to drift: a sweep that keeps sweeping for a child who asked for stillness,
 * or a screen that announces its placeholder bars one by one. Those are bugs, not
 * differences of taste, which is exactly the kind of thing that belongs in a
 * shared primitive.
 *
 * No 'use client', no hooks, no theme context — on purpose. `loading.tsx` files
 * are server components, and a client boundary here would drag every consumer
 * across it for a handful of grey rectangles.
 *
 * What is NOT shared: the look. Cards, shells, mastheads and page furniture stay
 * copied per file, the way the rest of this repo does it — each loading state is
 * shaped like the page it stands in for, and that shape is nobody else's business.
 */

/**
 * Drop this into a <style> tag once per screen (SkeletonStatus does it for you).
 * Gold is written out as rgba rather than var(--dg-gold): outside `.dg-root`
 * that custom property is simply not defined, and a skeleton with no background
 * is an invisible skeleton.
 *
 * `.mdo-anim` is the opt-in hook for a consumer's own entrance/breathing
 * animations — tag the element with it and the reduced-motion block below stops
 * it dead along with the sweep. mdoSkelBreathe and mdoSkelFade are here for the
 * same reason the sweep is: so six screens share one definition of "gently".
 */
export const PARCHMENT_SKELETON_CSS = `
  .mdo-skel {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    background: rgba(201,169,110,0.14);
  }
  .mdo-skel::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(201,169,110,0.20) 50%,
      transparent 100%
    );
    animation: mdoSkelSweep 1.6s ease-in-out infinite;
  }
  @keyframes mdoSkelSweep { to { transform: translateX(100%); } }
  @keyframes mdoSkelBreathe { from { opacity: .45 } to { opacity: .8 } }
  @keyframes mdoSkelFade { from { opacity: 0 } to { opacity: 1 } }
  @media (prefers-reduced-motion: reduce) {
    .mdo-skel::after { animation: none; opacity: 0; }
    .mdo-anim { animation: none !important; }
  }
`;

/** A single shimmering block. `w` and `h` take any CSS length. */
export function SkeletonBar({
  w = '100%',
  h = 14,
  radius = 10,
  style,
}: {
  w?: number | string;
  h?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return <div className="mdo-skel" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

/**
 * The a11y wrapper every parchment loading state opens with: it carries the CSS,
 * the live region, and the one sentence a screen reader is meant to hear.
 *
 * role="status" + a single sr-only label: the reader hears "Loading today's
 * edition" once, not a recital of every placeholder bar inside. That is why
 * consumers must not add sr-only text of their own — one sentence per screen.
 */
export function SkeletonStatus({
  label,
  style,
  children,
}: {
  label: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" style={style}>
      <style>{PARCHMENT_SKELETON_CSS}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        {label}
      </span>

      {children}
    </div>
  );
}
