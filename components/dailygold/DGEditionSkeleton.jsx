'use client';
/**
 * DGEditionSkeleton — the paper before the ink: what the reader sees while the
 * edition itself is still being fetched.
 *
 * Rendered by app/(dg)/daily-gold-edition/loading.tsx, which Next.js mounts
 * inside the group layout's <main class="dg-shell"> — so the rail, the tab bar and the
 * identity header are never replaced, only the reading column is. Being inside
 * `.dg-root` also means three things are already ours and must not be
 * re-declared here: `--dg-gold` (set on the root by the chrome), the `dgFadeIn`
 * keyframe from NAV_SHELL_CSS, and that stylesheet's blanket
 * `prefers-reduced-motion` clamp, which flattens every animation below to a
 * still frame without this file saying a word about it.
 *
 * Unlike DGContentSkeleton — which stands in for any destination in the (dg)
 * group and so stays deliberately generic — this one knows exactly which page
 * is coming, and mirrors it section for section in the real order: hero,
 * the wax-seal strip, the Born Today shelf, the three-card band, the
 * inspiration band, the destination card, More to Explore, the values strip,
 * the footer. The geometry is copied from those components rather
 * than approximated, so when the real day lands nothing under the reader's eye
 * jumps or reflows — the ink simply arrives on paper already the right shape.
 *
 * Three things the day's data decides that this file cannot know, all
 * accepted: the signed-out CTA / welcome flourish that can sit above the hero
 * (session state is the page's business), the Born Today overflow shelf for
 * days with more than three lives, and the band's third column disappearing on
 * a day with no good news. Everything below models the common case.
 *
 * Accessibility: the whole frame is one `role="status"` with a single sr-only
 * sentence. Every visible part below is `aria-hidden`, so a screen reader hears
 * "Preparing today's edition" once instead of a reading of forty grey blocks.
 */
import { useTheme } from '@/components/theme/ThemeContext';
import { Bar, SKELETON_CSS } from './DGContentSkeleton';

// Motion that is this file's own. The shimmer on every Bar comes from
// SKELETON_CSS; this is the one bespoke touch — the gold travelling over the
// leather volumes on the shelf.
const EDITION_SKELETON_CSS = `
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

/**
 * A wax seal with nowhere to go — the navigator's own *disabled* medallion,
 * down to the 64px face, the cream radial, the 20%-gold ring and the inner
 * emboss ring, all under the same 0.35 opacity.
 */
function GhostSeal() {
  return (
    <div style={{
      position: 'relative',
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #F0EAE0 0%, #E0D8CC 60%, #D4CBBC 100%)',
      border: '2px solid rgba(201,169,110,0.2)',
      opacity: 0.35,
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        border: '1px solid rgba(201,169,110,0.1)',
      }} />
    </div>
  );
}

/**
 * One volume on the podium. `delay` staggers the gleam across the three;
 * `lead` gives the centre volume its heavier shadow and brighter ledge, as
 * .dgbt-cell--lead does. The flanks carry the podium's real translateZ(-70px)
 * setback and -1% overlap, angled a little less steeply than the real 16deg
 * since there is no portrait here for the turn to foreshorten.
 */
function GhostVolume({ width, transform, delay, lead, style }) {
  return (
    <div style={{ width, transform, flexShrink: 0, ...style }}>
      <div style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        borderRadius: '3px 11px 11px 3px',
        background: LEATHER,
        overflow: 'hidden',
        boxShadow: lead
          ? '0 20px 38px rgba(52,33,12,0.32), 0 2px 5px rgba(52,33,12,0.20), inset 0 1px 0 rgba(255,238,205,0.07)'
          : '0 14px 26px rgba(52,33,12,0.26), 0 2px 5px rgba(52,33,12,0.20), inset 0 1px 0 rgba(255,238,205,0.07)',
      }}>
        {/* Gilt rules stamped into the board (.dgbt-gilt) */}
        <div style={{
          position: 'absolute', inset: 7, pointerEvents: 'none',
          border: '1px solid rgba(226,199,140,0.34)',
          borderRadius: '2px 7px 7px 2px',
          boxShadow: 'inset 0 0 0 3px rgba(226,199,140,0.07)',
        }} />
        <div className="dg-edskel-gleam" style={{ animationDelay: delay }} />
      </div>

      {/* The shelf the volume stands on (.dgbt-ledge::after) — the lead's
          burns brighter, exactly as on the real podium. */}
      <div style={{ position: 'relative', height: 15 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 12, height: 1,
          background: `linear-gradient(to right, transparent, color-mix(in srgb, var(--dg-gold) ${lead ? '70%' : '35%'}, transparent), transparent)`,
        }} />
      </div>
    </div>
  );
}

export default function DGEditionSkeleton() {
  const { theme } = useTheme();

  // The hairline the section headers open and close with — the same rule at
  // two directions, as on the real page.
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

      {/* ── 1. HERO ────────────────────────────────────────────────────────
          DGHero's real column: date pill, then the big gradient title, then
          subtitle, quote, and the "Begin exploring" rule cluster. The hero's
          art is an absolutely-positioned backdrop *behind* this column, not a
          plate below it, so the ghost paints no plate — the painting will
          arrive underneath without moving a thing. */}
      <div aria-hidden="true" style={{
        padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(1.5rem, 5vw, 2.5rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 720, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Date pill: 0.6rem×2 padding + one 0.85rem uppercase line ≈ 44px,
              in the pill's own 40px radius and gold-tinted ring. */}
          <Bar w="min(300px, 85%)" h={44} radius={40} style={{ border: `1px solid ${theme.accentGold}40`, marginBottom: '1.25rem' }} />

          {/* "Daily Gold" at clamp(2.5rem, 6vw, 4.5rem), lh 1.05 → 42–76px */}
          <Bar w="clamp(220px, 34vw, 380px)" h="clamp(44px, 6.3vw, 76px)" style={{ marginBottom: '0.75rem' }} />

          {/* Subtitle: two lines at its 480px max-width */}
          <Bar w="min(480px, 100%)" h={17} style={{ marginBottom: 6 }} />
          <Bar w="min(300px, 62%)" h={17} style={{ marginBottom: '1.25rem' }} />

          {/* The italic quote line */}
          <Bar w="min(420px, 88%)" h={20} />

          {/* "Begin exploring" — rule, word, rule */}
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ height: 1, width: 32, background: `${theme.accentGold}40` }} />
            <Bar w={110} h={12} />
            <div style={{ height: 1, width: 32, background: `${theme.accentGold}40` }} />
          </div>
        </div>
      </div>

      {/* ── 2. WAX-SEAL STRIP ──────────────────────────────────────────────
          The navigator's own geometry: two 64px medallions flanking the date,
          on the same gap, the same padding, the same lifted bgSoft backing,
          and closed by the same fading gradient hairline — so the strip does
          not shift a pixel when the real seals take over.

          The seals are drawn static, and deliberately so. They are furniture,
          not content: nothing is loading *about* them, and a pair of pulsing
          discs would read as two more spinners. They copy the navigator's
          *disabled* seal, which is exactly what a seal with nowhere to go
          looks like. The shimmer lives in the date and day-count bars — the
          two things here that are genuinely unknown. */}
      <div aria-hidden="true" style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        padding: '1.75rem 1.5rem 1.5rem',
        background: `linear-gradient(180deg, ${theme.bgSoft}00 0%, ${theme.bgSoft}59 20%, ${theme.bgSoft}E6 48%, ${theme.bgSoft}E6 72%, ${theme.bgSoft}00 100%)`,
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
          background: `linear-gradient(to right, transparent, ${theme.accentGold}33 25%, ${theme.accentGold}33 75%, transparent)`,
          pointerEvents: 'none',
        }} />

        <GhostSeal />

        <div style={{
          flex: 1,
          maxWidth: 340,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* The italic date line: clamp(0.9rem, 2vw, 1.1rem) at lh 1.3 */}
          <Bar w="min(220px, 60%)" h={20} />
          {/* Thin gold rule beneath the date, as on the navigator */}
          <div style={{
            width: '100%', height: 1, marginTop: '0.5rem',
            background: `linear-gradient(to right, transparent, ${theme.accentGold}50, transparent)`,
          }} />
          {/* "Day N of M" — rendered on nearly every real day */}
          <Bar w={120} h={14} style={{ marginTop: '0.4rem' }} />
        </div>

        <GhostSeal />
      </div>

      {/* ── 3. BORN TODAY SHELF ────────────────────────────────────────────
          The one section skeletoned as itself rather than as boxes. Three
          leather volumes on the podium in the real proportions — the lead
          largest and square on, its flanks narrower, turned inward and set
          back — each with its gilt frame, its ledge, and a gold gleam
          crossing the boards on a stagger. It costs a few lines and it is the
          difference between "the page is broken" and "the shelf is being
          set". Days with more than three lives add an overflow row below the
          podium; that is the data's news, not this file's. */}
      <div aria-hidden="true" style={{ padding: '5rem clamp(1.25rem, 4vw, 3.5rem) 5.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
            <div style={{ height: 1, width: 36, background: goldRule('right') }} />
            <Bar w={180} h={12} />
            <div style={{ height: 1, flex: 1, background: goldRule('left') }} />
          </div>
          {/* "Born on This Day": clamp(1.9rem, 3.5vw, 2.7rem) at lh 1.1 */}
          <Bar w="min(340px, 70%)" h="clamp(37px, 3.9vw, 48px)" />
          {/* The italic shelf line beneath it */}
          <Bar w="min(330px, 65%)" h={16} style={{ marginTop: '0.4rem' }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          perspective: '1500px',
        }}>
          {/* Widths, setback and overlap echo .dgbt-cell--featl / --lead /
              --featr. */}
          <GhostVolume width="min(26vw, 245px)" transform="rotateY(10deg) translateZ(-70px)" delay="0.35s" style={{ marginRight: '-1%' }} />
          <GhostVolume width="min(38vw, 350px)" transform="none" delay="0s" lead />
          <GhostVolume width="min(26vw, 245px)" transform="rotateY(-10deg) translateZ(-70px)" delay="0.7s" style={{ marginLeft: '-1%' }} />
        </div>

        {/* The section's closing rule and star, at its own 0.45 */}
        <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: 14, opacity: 0.45 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.accentGold})` }} />
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 L8.5 5.5 L13 5.5 L9.5 8.5 L11 13 L7 10 L3 13 L4.5 8.5 L1 5.5 L5.5 5.5Z" fill={theme.accentGold} opacity="0.7" />
          </svg>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${theme.accentGold})` }} />
        </div>
      </div>

      {/* ── 4. THE BAND ────────────────────────────────────────────────────
          The .dg-band literals from PAGE_CSS, copied exactly — including the
          two gold hairline borders — so the three cards land where the three
          tracked sections will, and step 3 → 2 → 1 columns on the same
          breakpoints without anyone having to keep two numbers in sync by
          eye. The sections themselves sit transparent on the page — the card
          chrome belongs to the items *inside* them — so each ghost is a bare
          header over a carded body, not a carded column. */}
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
          <div key={i}>
            <Bar w="60%" h={12} />
            <div style={{
              marginTop: '1rem',
              padding: '1.25rem',
              borderRadius: theme.radius,
              background: theme.bgCard,
              border: `1px solid ${theme.accentGold}1F`,
            }}>
              <Bar h={90} radius={8} />
              <Bar w="85%" h={10} style={{ marginTop: '1rem' }} />
              <Bar w="70%" h={10} style={{ marginTop: '0.6rem' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. INSPIRATION BAND ────────────────────────────────────────────
          Full-bleed, as the real one is: the gold-tinted wash between its two
          hairlines, the rule-flanked eyebrow, the sub line, the big italic
          quote and its attribution — stacked on the band's own 0.75rem gap. */}
      <div aria-hidden="true" style={{
        background: `linear-gradient(135deg, ${theme.accentGold}26 0%, ${theme.accentGold}14 50%, ${theme.accentGold}1F 100%)`,
        borderTop: `1px solid ${theme.accentGold}40`,
        borderBottom: `1px solid ${theme.accentGold}40`,
        padding: '2rem clamp(1.5rem, 6vw, 5rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 40, height: 1, background: `${theme.accentGold}80` }} />
          <Bar w={170} h={13} />
          <div style={{ width: 40, height: 1, background: `${theme.accentGold}80` }} />
        </div>
        <Bar w={240} h={14} style={{ marginBottom: '0.5rem' }} />
        <Bar w="min(620px, 90%)" h={20} />
        <Bar w="min(440px, 70%)" h={20} />
        <Bar w={110} h={12} />
      </div>

      {/* ── 6. DESTINATION ─────────────────────────────────────────────────
          One full-width card in the page's own 0.75rem-topped wrapper: the
          16/9 hero image, then the body — label, two atmosphere lines, and
          the four-up detail grid on the card's own minmax(160px) tracks. */}
      <div aria-hidden="true" style={{ padding: '0.75rem clamp(1rem, 3vw, 2rem) 0.5rem' }}>
        <div style={{
          background: theme.bgCard,
          borderRadius: theme.radius,
          border: `1px solid ${theme.accentGold}15`,
          overflow: 'hidden',
        }}>
          <Bar h="auto" radius={0} style={{ aspectRatio: '16 / 9' }} />
          <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
            <Bar w={140} h={12} style={{ marginBottom: '0.5rem' }} />
            <Bar w="90%" h={15} />
            <Bar w="75%" h={15} style={{ margin: '0.4rem 0 1rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '0.5rem' }}>
              {[0, 1, 2, 3].map(i => <Bar key={i} h={90} radius={8} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. MORE TO EXPLORE ─────────────────────────────────────────────
          The real section's own 5rem breathing room and 1200px inner column:
          centred eyebrow, the big headline, the sub line with its 3rem drop,
          then three 16/11 plates on the section's minmax(280px) tracks. */}
      <div aria-hidden="true" style={{ padding: '5rem clamp(1.5rem, 5vw, 4rem)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Bar w={170} h={12} style={{ marginBottom: '0.75rem' }} />
          <Bar w="min(300px, 70%)" h="clamp(34px, 4.6vw, 52px)" style={{ marginBottom: '0.75rem' }} />
          <Bar w="min(320px, 60%)" h={15} style={{ marginBottom: '3rem' }} />
          <div style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
          }}>
            {[0, 1, 2].map(i => <Bar key={i} h="auto" radius={theme.radius} style={{ aspectRatio: '16 / 11' }} />)}
          </div>
        </div>
      </div>

      {/* ── 8. VALUES STRIP ────────────────────────────────────────────────
          Five words and their four divider threads, on the strip's own flat
          2rem padding. */}
      <div aria-hidden="true" style={{
        padding: '2rem clamp(1.5rem, 5vw, 4rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '1rem 2rem', flexWrap: 'wrap',
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'contents' }}>
            <Bar w={90} h={15} />
            {i < 4 && (
              <div style={{
                width: 40, height: 1,
                background: `linear-gradient(to right, transparent, ${theme.accentGold}40, transparent)`,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── 9. FOOTER ──────────────────────────────────────────────────────
          The italic colophon quote over the rule–line–rule, held back at 0.6
          opacity: it is the quietest thing on the real page and it should not
          be the loudest thing on this one. */}
      <div aria-hidden="true" style={{
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: 0.6,
      }}>
        {/* The quote: clamp(1.1rem, 2.5vw, 1.6rem) at lh 1.8, up to two lines
            inside its 600px measure */}
        <Bar w="min(480px, 85%)" h={22} />
        <Bar w="min(360px, 65%)" h={22} style={{ margin: '8px 0 1rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
          <Bar w="min(320px, 70vw)" h={14} />
          <div style={{ height: 1, width: 60, background: `${theme.accentGold}4D` }} />
        </div>
      </div>
    </div>
  );
}
