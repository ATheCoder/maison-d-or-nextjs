'use client';
/**
 * DGChromeSkeleton — the navigation chrome, drawn empty.
 *
 * The Suspense fallback the edition layout shows while the session reads
 * resolve (see app/daily-gold-edition/layout.tsx). Where DGContentSkeleton
 * covers the right-hand side of a shell whose rail is already standing, this
 * covers the moment there is no rail yet: an entry navigation into the edition
 * whose layout the client cache cannot serve — above all the landing after a
 * profile switch, which purges that cache precisely so no stale identity can
 * be committed (see setActiveProfile in app/profiles/actions.ts).
 *
 * Geometry comes from the real classes: NAV_SHELL_CSS lays this ghost rail,
 * identity header and tab bar out exactly where DGChromeFrame will put the
 * real ones — including the compact-rail and mobile breakpoints — so the
 * chrome lands on its own outline. The monogram is not a ghost: it is the one
 * part of the rail that depends on no identity, so it renders real and holds
 * still through the swap.
 *
 * The identity is unresolved by definition here, so the ghost stays neutral:
 * one identity row, three destination rows, a shelf of two — the signed-in
 * common case. Colours are the default Light & Airy palette, hardcoded like
 * every other skeleton in the house (the theme provider this shell will mount
 * is part of what is still loading).
 *
 * Motion: the sweep is SKELETON_CSS inside .dg-root, so NAV_SHELL_CSS's
 * prefers-reduced-motion block already flattens it.
 */
import { NAV_SHELL_CSS } from '@/components/dailygold/DGPageShell';
import { SKELETON_CSS, Bar } from '@/components/dailygold/DGContentSkeleton';
import DGEditionSkeleton from '@/components/dailygold/DGEditionSkeleton';

// Light & Airy, by hand — themes.jsx resolves these same values from the
// design system (COLORS.gold / parchment / mocha).
const C = { gold: '#C8A96B', parchment: '#F5F0E7', mocha: '#4A3B2A' };

function GhostRailItem({ labelWidth }) {
  return (
    <div className="dg-rail-item">
      <Bar w={20} h={20} radius="50%" style={{ flexShrink: 0 }} />
      <span className="dg-rail-label" style={{ display: 'inline-flex' }}>
        <Bar w={labelWidth} h={12} />
      </span>
    </div>
  );
}

export default function DGChromeSkeleton() {
  return (
    <div
      className="dg-root"
      style={{
        '--dg-gold': C.gold,
        backgroundColor: C.parchment,
        backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
        color: C.mocha,
      }}
    >
      <style>{NAV_SHELL_CSS}</style>
      <style>{SKELETON_CSS}</style>

      {/* The rail, empty. aria-hidden as a whole: DGEditionSkeleton below
          already announces the one "loading" a screen reader needs. */}
      <nav className="dg-rail" aria-hidden="true">
        <div style={{
          width: 44, height: 44, borderRadius: '50%', alignSelf: 'center',
          background: `linear-gradient(135deg, ${C.gold}30 0%, ${C.gold}10 100%)`,
          border: `1px solid ${C.gold}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.15rem', color: C.gold,
          flexShrink: 0,
        }}>
          M
        </div>

        {/* Identity block: avatar circle + the two caption lines */}
        <div className="dg-rail-item dg-rail-id" style={{ marginTop: '1.5rem' }}>
          <Bar w={36} h={36} radius="50%" style={{ flexShrink: 0 }} />
          <span className="dg-rail-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
            <Bar w={34} h={9} />
            <Bar w={82} h={13} />
          </span>
        </div>

        {/* Destinations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: '1.5rem' }}>
          <GhostRailItem labelWidth={78} />
          <GhostRailItem labelWidth={64} />
          <GhostRailItem labelWidth={88} />
        </div>

        {/* The shelf, in case a reader arrives */}
        <div aria-hidden="true" style={{ height: 1, background: `${C.gold}26`, margin: '1.25rem 0.5rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <GhostRailItem labelWidth={70} />
          <GhostRailItem labelWidth={58} />
        </div>
      </nav>

      {/* Mobile tab bar, empty */}
      <div className="dg-tabbar" aria-hidden="true" style={{ background: 'rgba(250, 246, 236, 0.95)', borderTop: `1px solid ${C.gold}26` }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '0.35rem 0.5rem',
          }}>
            <Bar w={20} h={20} radius="50%" />
            <Bar w={34} h={8} />
          </span>
        ))}
      </div>

      <main className="dg-shell">
        {/* Mobile identity header, empty */}
        <div className="dg-idheader" aria-hidden="true" style={{ background: 'rgba(250, 246, 236, 0.95)', borderBottom: `1px solid ${C.gold}26` }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <Bar w={32} h={32} radius="50%" style={{ flexShrink: 0 }} />
            <Bar w={110} h={13} />
          </span>
        </div>

        {/* The same paper-ghost the route's loading.tsx shows, so the content
            column never changes shape as the chrome resolves around it. */}
        <DGEditionSkeleton />
      </main>
    </div>
  );
}
