// @ts-nocheck — untyped .jsx from before checkJs was on; 7 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * TreasurySkeleton — the museum with the lights still coming on: what stands
 * in for /treasury while the saved items are fetched.
 *
 * The generic DGContentSkeleton is wrong for this one destination: the
 * treasury is not a flowing document of cards but a viewport-locked, centred,
 * unscrollable stage (see TreasuryView / museumCss.js), and a top-left band
 * of light cards collapsing into that reads as a different page arriving.
 * So this ghost copies the stage itself — the same height, padding and
 * parchment radial as `.tv-museum`, and the entrance hall's own furniture:
 * the letterspaced tab, the fluted columns flanking the title, the tilted
 * Admit One ticket, the footsteps, the door. The real entrance then plays
 * its choreography over a frame that never moved.
 *
 * The `--tv-*` custom properties are TreasuryView's own and are not set while
 * it is still loading, so every colour here is taken from the theme tokens
 * they are derived from. `--dg-tabbar-h` and `--dg-gold` are the shell's and
 * are already ours.
 */
import { useTheme } from '@/components/theme/ThemeContext';
import { Bar, SKELETON_CSS } from '@/components/dailygold/DGContentSkeleton';

// The .tv-col literals from museumCss.js — the entrance facade's fluting.
const COLUMN = {
  width: 22,
  borderRadius: 4,
  flexShrink: 0,
  background: 'repeating-linear-gradient(90deg, #EFE4CC 0 4px, #D9C69E 4px 8px)',
  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.14)',
};

export default function TreasurySkeleton() {
  const { theme } = useTheme();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="tv-skel"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100svh - var(--dg-tabbar-h, 0px))',
        padding: '0.7rem',
        display: 'flex',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 0%, ${theme.bgCard} 0%, ${theme.bgSoft} 45%, ${theme.bgPrimary} 100%)`,
      }}
    >
      <style>{SKELETON_CSS}</style>
      {/* The same shell release .tv-museum performs: without it the shell's
          own min-height adds a phantom scroll under the fixed stage. */}
      <style>{`.dg-shell:has(> .tv-skel) { min-height: 0; }`}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Opening your museum
      </span>

      <div aria-hidden="true" style={{ flex: 1, maxWidth: 1100, margin: 'auto', textAlign: 'center', padding: '2rem 1rem' }}>
        {/* The house's own tab — static on every visit, so it says its word */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0.35rem 1.6rem',
          borderTop: `2px solid ${theme.accentGold}66`,
          borderBottom: `2px solid ${theme.accentGold}66`,
          fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.42em',
          textTransform: 'uppercase', color: theme.textMuted, marginBottom: '1rem',
        }}>
          Maison d&rsquo;Or
        </div>

        {/* The facade: fluted columns flanking "My Treasury" and its sub line */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: '1.8rem' }}>
          <div style={COLUMN} />
          <div style={{ alignSelf: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', margin: '0 0 0.4rem' }}>
              <Bar w={20} h={20} radius="50%" />
              <Bar w="clamp(150px, 22vw, 230px)" h="clamp(31px, 4.8vw, 46px)" />
              <Bar w={20} h={20} radius="50%" />
            </div>
            <Bar w="min(220px, 80%)" h={22} style={{ margin: '0 auto' }} />
          </div>
          <div style={COLUMN} />
        </div>

        {/* The Admit One ticket, tilted as it will land */}
        <div style={{
          display: 'inline-block', marginTop: '1.2rem', padding: '0.5rem 1.3rem',
          rotate: '-2deg',
          border: `1.5px dashed ${theme.accentGold}88`,
          borderRadius: 6,
          background: theme.bgCard,
        }}>
          <Bar w={110} h={13} style={{ margin: '0 auto' }} />
          <Bar w={180} h={16} style={{ margin: '5px auto 0' }} />
        </div>

        {/* Footsteps toward the first door, then the door itself */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: '1.8rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} style={{
                width: 7, height: 11, borderRadius: '50%',
                background: `${theme.accentGold}77`,
                transform: `translateX(${i % 2 ? 7 : -7}px) rotate(${i % 2 ? 8 : -8}deg)`,
              }} />
            ))}
          </div>
          <Bar w="min(300px, 80%)" h={46} radius={23} style={{ background: `${theme.bgCard}B0`, border: `1.5px dashed ${theme.accentGold}66` }} />
        </div>
      </div>
    </div>
  );
}
