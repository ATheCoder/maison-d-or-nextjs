'use client';
/**
 * DGContentSkeleton — what the right-hand side of the shell shows while the
 * next destination is being fetched.
 *
 * Rendered by app/(dg)/loading.tsx, which Next.js mounts inside the (dg)
 * layout's <main>. That placement is the whole point: the rail and the tab bar
 * are layout, they stay mounted and interactive, and only this replaces the
 * departing page's content. A press on the rail is answered immediately even
 * though every destination in the group is force-dynamic and has to wait on the
 * database.
 *
 * Shaped like the pages it stands in for rather than a spinner — a masthead
 * line, a title, and a band of cards — so the layout does not jump when the
 * real content lands. It has no idea which destination is coming, so it stays
 * generic on purpose.
 *
 * Motion: the sweep is a plain CSS animation inside `.dg-root`, so the shell's
 * own `prefers-reduced-motion` block already flattens it to a still frame —
 * nothing extra to declare here (see NAV_SHELL_CSS in DGPageShell).
 */
import { useTheme } from '@/components/theme/ThemeContext';

export const SKELETON_CSS = `
  .dg-skel {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    background: color-mix(in srgb, var(--dg-gold) 12%, transparent);
  }
  .dg-skel::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--dg-gold) 16%, transparent) 50%,
      transparent 100%
    );
    animation: dgSkelSweep 1.6s ease-in-out infinite;
  }
  @keyframes dgSkelSweep { to { transform: translateX(100%); } }
`;

/** A single shimmering block. `w` and `h` take any CSS length. */
export function Bar({ w = '100%', h = 14, radius = 10, style }) {
  return <div className="dg-skel" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

export default function DGContentSkeleton() {
  const { theme } = useTheme();

  return (
    // role="status" + a single sr-only sentence: a screen reader hears "Loading"
    // once, not a reading of every placeholder bar below it.
    <div role="status" aria-live="polite" aria-busy="true" style={{ padding: 'clamp(1.25rem, 3vw, 2rem)' }}>
      <style>{SKELETON_CSS}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Loading
      </span>

      {/* Masthead rule + eyebrow, the shape every page in the group opens with */}
      <Bar w="clamp(120px, 20vw, 180px)" h={10} />
      <Bar w="min(100%, 520px)" h={34} style={{ marginTop: '1rem' }} />
      <div aria-hidden="true" style={{
        height: 1, margin: '1.5rem 0',
        background: `${theme.accentGold}26`,
      }} />

      {/* The band: three cards on wide screens, collapsing exactly as .dg-band does */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 'clamp(1rem, 2vw, 1.5rem)',
        alignItems: 'start',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            padding: '1.25rem',
            borderRadius: theme.radius,
            background: theme.bgCard,
            border: `1px solid ${theme.accentGold}1F`,
          }}>
            <Bar w="60%" h={12} />
            <Bar h={120} radius={8} style={{ marginTop: '1rem' }} />
            <Bar w="85%" h={10} style={{ marginTop: '1rem' }} />
            <Bar w="70%" h={10} style={{ marginTop: '0.6rem' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
