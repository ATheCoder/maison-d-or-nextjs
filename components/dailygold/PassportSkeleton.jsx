'use client';
/**
 * PassportSkeleton — the flag wall before the seals: what stands in for
 * /passport while the collection is fetched.
 *
 * Copies FlagCollectionView's own frame — the full-bleed parchment radial
 * (this page follows the child's theme, night mode included, so every colour
 * here is a token, not a literal), the centred header with its count badge,
 * the rule–✦–rule divider, and the medallion mosaic on the page's own
 * minmax(72px) tracks. The medallion ghosts are the real `md` 56px face with
 * its caption. Forty of them stand for the ~two hundred real ones: the rest
 * begin far below the fold, and the mosaic simply keeps going when the ink
 * lands.
 *
 * The divider is furniture — it says the same thing on every render — so it
 * is drawn real; the shimmer is reserved for what is genuinely unknown.
 */
import { useTheme } from '@/components/theme/ThemeContext';
import { Bar, SKELETON_CSS } from './DGContentSkeleton';

export default function PassportSkeleton() {
  const { theme } = useTheme();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <style>{SKELETON_CSS}</style>
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Opening your flag collection
      </span>

      <div
        aria-hidden="true"
        style={{
          width: '100%',
          minHeight: '100vh',
          background: `radial-gradient(ellipse at 50% 0%, ${theme.bgCard} 0%, ${theme.bgSoft} 45%, ${theme.bgPrimary} 100%)`,
          padding: '2rem 1.5rem 4rem',
        }}
      >
        {/* Header: "My Flag Collection", the italic count line, the badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <Bar w="min(300px, 70%)" h="clamp(31px, 4.8vw, 46px)" style={{ marginBottom: '0.4rem' }} />
          <Bar w="min(320px, 85%)" h={24} style={{ marginBottom: '0.6rem' }} />
          <Bar w={190} h={30} radius={20} style={{ background: `${theme.accentGold}26`, border: `1px solid ${theme.accentGold}40` }} />
        </div>

        {/* Decorative divider — the page's own, drawn as itself */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: `${theme.accentGold}30` }} />
          <span style={{ fontFamily: theme.fontHeadline, color: `${theme.accentGold}B0`, fontSize: '1.2rem' }}>✦</span>
          <div style={{ flex: 1, height: 1, background: `${theme.accentGold}30` }} />
        </div>

        {/* The seal mosaic: 56px medallions with their captions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: '1rem 0.75rem',
        }}>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <Bar w={56} h={56} radius="50%" style={{ margin: '0 auto' }} />
              <Bar w={44} h={10} style={{ margin: '6px auto 0' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
