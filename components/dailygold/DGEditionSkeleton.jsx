'use client';
/**
 * DGEditionSkeleton — the paper before the ink: what the reader sees while the
 * edition itself is still being fetched.
 *
 * Rendered by app/daily-gold-edition/loading.tsx, which Next.js mounts inside
 * the route layout's <main class="dg-shell"> — so the rail, the tab bar and the
 * identity header are never replaced, only the reading column is. Being inside
 * `.dg-root` also means three things are already ours and must not be
 * re-declared here: `--dg-gold` (set on the root by the chrome), the `dgFadeIn`
 * keyframe from NAV_SHELL_CSS, and that stylesheet's blanket
 * `prefers-reduced-motion` clamp, which flattens every animation below to a
 * still frame without this file saying a word about it.
 *
 * Unlike DGContentSkeleton — which stands in for any destination in the (dg)
 * group and so stays deliberately generic — this one knows exactly which page
 * is coming, and mirrors it section for section in the real order: masthead and
 * hero, the wax-seal strip, the Born Today shelf, the three-card band, the
 * lower rows, the footer. The geometry is copied from those components rather
 * than approximated, so when the real day lands nothing under the reader's eye
 * jumps or reflows — the ink simply arrives on paper already the right shape.
 *
 * Accessibility: the whole frame is one `role="status"` with a single sr-only
 * sentence. Every visible part below is `aria-hidden`, so a screen reader hears
 * "Preparing today's edition" once instead of a reading of forty grey blocks.
 */
import { useTheme } from '@/components/theme/ThemeContext';
import { Bar, SKELETON_CSS } from './DGContentSkeleton';

// Motion that is this file's own. The shimmer on every Bar comes from
// SKELETON_CSS; these two are the bespoke touches — the hero plate's slow
// breath, and the gold travelling over the leather volumes on the shelf.
const EDITION_SKELETON_CSS = `
  @keyframes dgEdSkelBreathe { from { opacity: 0.35; } to { opacity: 0.75; } }

  /* Lifted wholesale from .dgbt-gleam in DGBornToday, so the light on the
     placeholder boards is the same light that will be on the real ones —
     only here it sweeps on a loop instead of waiting for a hover. */
  .dg-edskel-gleam {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(104deg,
      transparent 36%, rgba(255,240,205,0.16) 46%, rgba(255,250,235,0.30) 50%,
      rgba(255,240,205,0.14) 54%, transparent 64%);
    transform: translateX(-75%);
    animation: dgEdSkelGleam 2.2s ease-in-out infinite;
  }
  @keyframes dgEdSkelGleam {
    from { transform: translateX(-75%); }
    to   { transform: translateX(75%); }
  }
`;

// The leather boards, the gilt frame stamped into them and the shelf they
// stand on — the .dgbt-cover / .dgbt-gilt / .dgbt-ledge::after literals from
// DGBornToday, held here so all three volumes are bound the same way.
const LEATHER = 'linear-gradient(150deg, #3A281C 0%, #241812 55%, #150E08 100%)';

// A wax seal with nowhere to go — the navigator's own *disabled* medallion,
// down to the 64px face, the cream radial and the faded gold ring.
const GHOST_SEAL = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #F0EAE0 0%, #E0D8CC 60%, #D4CBBC 100%)',
  border: '2px solid color-mix(in srgb, var(--dg-gold) 35%, transparent)',
  opacity: 0.35,
  flexShrink: 0,
};

/** One volume on the podium. `delay` staggers the gleam across the three. */
function GhostVolume({ width, rotate, delay }) {
  return (
    <div style={{ width, transform: rotate, flexShrink: 0 }}>
      <div style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        borderRadius: '3px 11px 11px 3px',
        background: LEATHER,
        overflow: 'hidden',
        boxShadow: '0 14px 26px rgba(52,33,12,0.26), 0 2px 5px rgba(52,33,12,0.20)',
      }}>
        {/* Gilt rules stamped into the board (.dgbt-gilt) */}
        <div style={{
          position: 'absolute', inset: 7, pointerEvents: 'none',
          border: '1px solid rgba(226,199,140,0.34)',
          borderRadius: '2px 7px 7px 2px',
        }} />
        <div className="dg-edskel-gleam" style={{ animationDelay: delay }} />
      </div>

      {/* The shelf the volume stands on (.dgbt-ledge::after) */}
      <div style={{ position: 'relative', height: 15 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 12, height: 1,
          background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--dg-gold) 35%, transparent), transparent)',
        }} />
      </div>
    </div>
  );
}

export default function DGEditionSkeleton() {
  const { theme } = useTheme();

  // The hairline the section headers open and close with, and the one under
  // the footer line — the same rule at two weights, as on the real page.
  const goldRule = (dir) => `linear-gradient(to ${dir}, transparent, ${theme.accentGold}88)`;

  return (
    // The same entrance the day itself plays (dgFadeIn, from NAV_SHELL_CSS), so
    // the skeleton arrives the way the content it stands in for will.
    <div role="status" aria-live="polite" aria-busy="true" style={{ animation: 'dgFadeIn 0.4s ease-out' }}>
      <style>{SKELETON_CSS}</style>
      <style>{EDITION_SKELETON_CSS}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Preparing today&rsquo;s edition
      </span>

      {/* ── 1. MASTHEAD + HERO ─────────────────────────────────────────────
          Eyebrow, masthead, date line, then the plate the hero image will
          fill. The plate carries a single gold ✦ breathing in its centre —
          the one place in this file that says "something is coming" rather
          than only holding a shape. */}
      <div aria-hidden="true" style={{
        padding: 'clamp(1rem, 3vw, 2rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <Bar w={140} h={10} />
        <Bar w="min(60%, 420px)" h={40} style={{ marginTop: '1rem' }} />
        <Bar w={200} h={12} style={{ marginTop: '0.9rem' }} />

        <div style={{ position: 'relative', width: '100%', marginTop: '1.75rem' }}>
          <Bar h="clamp(200px, 34vh, 340px)" radius={theme.radius} />
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--dg-gold)', fontSize: '2rem', lineHeight: 1,
            animation: 'dgEdSkelBreathe 3s ease-in-out infinite alternate',
          }}>
            ✦
          </span>
        </div>
      </div>

      {/* ── 2. WAX-SEAL STRIP ──────────────────────────────────────────────
          The navigator's own geometry: two 64px medallions flanking the date,
          on the same gap, the same padding, and closed by the same fading
          gradient hairline — so the strip does not shift a pixel when the
          real seals take over.

          The seals are drawn static, and deliberately so. They are furniture,
          not content: nothing is loading *about* them, and a pair of pulsing
          discs would read as two more spinners. The one thing that is
          genuinely unknown here is the date, so the shimmer lives in the bar
          that stands for it and nowhere else. They copy the navigator's
          *disabled* seal, which is exactly what a seal with nowhere to go
          looks like. */}
      <div aria-hidden="true" style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        padding: '1.75rem 1.5rem 1.5rem',
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
          background: `linear-gradient(to right, transparent, ${theme.accentGold}33 25%, ${theme.accentGold}33 75%, transparent)`,
          pointerEvents: 'none',
        }} />

        <div style={GHOST_SEAL} />

        <div style={{
          flex: 1,
          maxWidth: 340,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <Bar w="min(220px, 60%)" h={14} />
          {/* Thin gold rule beneath the date, as on the navigator */}
          <div style={{
            width: '100%', height: 1, marginTop: '0.5rem',
            background: `linear-gradient(to right, transparent, ${theme.accentGold}50, transparent)`,
          }} />
        </div>

        <div style={GHOST_SEAL} />
      </div>

      {/* ── 3. BORN TODAY SHELF ────────────────────────────────────────────
          The one section skeletoned as itself rather than as boxes. Three
          leather volumes on the podium in the real proportions — the lead
          largest and square on, its flanks narrower and turned inward — each
          with its gilt frame, its ledge, and a gold gleam crossing the boards
          on a stagger. It costs a few lines and it is the difference between
          "the page is broken" and "the shelf is being set". */}
      <div aria-hidden="true" style={{ padding: '5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
            <div style={{ height: 1, width: 36, background: goldRule('right') }} />
            <Bar w={150} h={10} />
            <div style={{ height: 1, flex: 1, background: goldRule('left') }} />
          </div>
          <Bar w="min(340px, 70%)" h={34} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          perspective: '1500px',
        }}>
          {/* Widths and inward rotations echo .dgbt-cell--featl / --lead /
              --featr; the flanks are angled a little less steeply than the
              real 16deg, since there is no portrait here for the turn to
              foreshorten. */}
          <GhostVolume width="min(26vw, 245px)" rotate="rotateY(10deg)" delay="0.35s" />
          <GhostVolume width="min(38vw, 350px)" rotate="none" delay="0s" />
          <GhostVolume width="min(26vw, 245px)" rotate="rotateY(-10deg)" delay="0.7s" />
        </div>
      </div>

      {/* ── 4. THE BAND ────────────────────────────────────────────────────
          The .dg-band literals from PAGE_CSS, copied exactly — including the
          two gold hairline borders — so the three cards land where the three
          tracked sections will, and step 3 → 2 → 1 columns on the same
          breakpoints without anyone having to keep two numbers in sync by
          eye. The cards themselves are DGContentSkeleton's card block. */}
      <div aria-hidden="true" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 'clamp(1rem, 2vw, 1.5rem)',
        padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 2rem)',
        alignItems: 'start',
        borderTop: '1px solid color-mix(in srgb, var(--dg-gold) 10%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--dg-gold) 10%, transparent)',
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

      {/* ── 5. LOWER ROWS ──────────────────────────────────────────────────
          The inspiration band, the destination plate with its notes beside
          it, and the More to Explore heading. Below this the real page still
          has the values strip and the For Parents card, but they sit far
          past the fold on every screen — a reader will never see them
          un-inked, so standing in for them would only be work. */}
      <div aria-hidden="true" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
        <Bar h={72} />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(1rem, 2vw, 1.5rem)',
          marginTop: '2rem',
        }}>
          <Bar h={180} radius={theme.radius} style={{ flex: '1 1 260px' }} />
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Bar w="70%" h={12} />
            <Bar w="95%" h={10} />
            <Bar w="80%" h={10} />
          </div>
        </div>

        <Bar w="50%" h={24} style={{ marginTop: '2.5rem' }} />
      </div>

      {/* ── 6. FOOTER ──────────────────────────────────────────────────────
          The rule–line–rule colophon, held back at 0.6 opacity: it is the
          quietest thing on the real page and it should not be the loudest
          thing on this one. */}
      <div aria-hidden="true" style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
        opacity: 0.6,
      }}>
        <div style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
        <Bar w="min(320px, 70%)" h={12} />
        <div style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
      </div>
    </div>
  );
}
