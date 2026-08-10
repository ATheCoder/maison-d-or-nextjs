// @ts-nocheck — untyped .jsx from before checkJs was on; 10 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * FlagCollectionView — the /passport page body: a full-screen parchment wall
 * of every country flag seal, earned in full colour and unearned greyed.
 *
 * Server-fed: the route resolves the child and passes the seals down, so this
 * component fetches nothing. Only the seal-detail panel (DGModal, which owns
 * its own focus and Escape handling) is interactive state.
 *
 * The country list is imported, never local: this file used to carry a sixth
 * copy of the table, labelled "197 UN-recognised countries" while holding 193
 * entries — and the wrong 193, omitting Côte d'Ivoire and including Vatican
 * City, a UN observer. Every total on screen derives from COUNTRIES.length so
 * the copy cannot drift from the data again.
 */
import { useState } from 'react';
import FlagSealMedallion from './FlagSealMedallion';
import DGModal from './DGModal';
import { COUNTRIES } from '@/lib/countries';
import { useTheme } from '@/components/theme/ThemeContext';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';

/**
 * @param {{
 *   seals?: Array<{ country_code: string, country_name: string, first_earned_date: string, last_earned_date: string, times_earned: number, sources: string[] }>,
 *   earnedCount?: number,
 *   totalCountries?: number,
 * }} props
 */
export default function FlagCollectionView({ seals = [], earnedCount = 0, totalCountries = COUNTRIES.length }) {
  const { theme } = useTheme();
  const [selectedSeal, setSelectedSeal] = useState(null);

  const earnedMap = Object.fromEntries(seals.map(s => [s.country_code, s]));

  const badgeStyle = {
    display: 'inline-block',
    background: `${theme.accentGold}26`,
    border: `1px solid ${theme.accentGold}40`,
    borderRadius: 20, padding: '4px 16px',
    fontFamily: theme.fontBody, fontSize: '0.72rem',
    color: theme.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase',
  };

  return (
    /* A <div>, not a <main> — DGPageShell owns the page's <main> landmark. */
    <div
      /* No dark backdrop and no width cap: the parchment gradient fills the
         shell's content area at any width, like the edition page — a capped
         column here left bare shell bands beside the page on wide screens. */
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: `radial-gradient(ellipse at 50% 0%, ${theme.bgCard} 0%, ${theme.bgSoft} 45%, ${theme.bgPrimary} 100%)`,
          padding: '2rem 1.5rem 4rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: theme.fontHeadline,
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 700, color: theme.textHeadline, margin: '0 0 0.4rem',
          }}>
            My Flag Collection
          </h1>
          <p style={{
            fontFamily: theme.fontBody,
            fontSize: '1rem', color: theme.textMuted, margin: '0 0 0.6rem',
            fontStyle: 'italic',
          }}>
            {earnedCount === 0
              ? 'Your passport is waiting for its first stamp.'
              : `You have collected ${earnedCount} of ${totalCountries} countries`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={badgeStyle}>
              {totalCountries} Countries · The World
            </div>
            {earnedCount > 0 && (
              <div style={badgeStyle}>
                <span aria-hidden="true">✦ </span>{Math.round((earnedCount / totalCountries) * 100)}% Complete
              </div>
            )}
          </div>
        </div>

        {/* Decorative divider */}
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: `${theme.accentGold}30` }} />
          <span style={{ fontFamily: theme.fontHeadline, color: `${theme.accentGold}B0`, fontSize: '1.2rem' }}>✦</span>
          <div style={{ flex: 1, height: 1, background: `${theme.accentGold}30` }} />
        </div>

        {/* Seal grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: '1rem 0.75rem',
        }}>
          {COUNTRIES.map(country => {
            const sealData = earnedMap[country.code];
            const earned = !!sealData;
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => earned && setSelectedSeal(sealData)}
                disabled={!earned}
                aria-label={earned ? `${country.name}, collected` : `${country.name}, not collected yet`}
                style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
                  background: 'transparent', border: 'none',
                  padding: 0, minHeight: 44,
                  cursor: earned ? 'pointer' : 'default',
                }}
              >
                <span aria-hidden="true" style={{ display: 'flex', justifyContent: 'center' }}>
                  <FlagSealMedallion
                    countryCode={country.code}
                    countryName={country.name}
                    size="md"
                    earned={earned}
                    showLabel
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seal detail modal */}
      {selectedSeal && (
        <DGModal label={`${selectedSeal.country_name} flag seal`} maxWidth={400} onClose={() => setSelectedSeal(null)}>
          <div style={{ padding: '2.5rem 2rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FlagSealMedallion countryCode={selectedSeal.country_code} countryName={selectedSeal.country_name} size="lg" earned showLabel />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <div>
                <DGEyebrow tracking="tight" color={theme.textMuted} style={{ margin: '0 0 2px' }}>Seen on</DGEyebrow>
                {/* timesEarned counts distinct edition days, not raw triggers */}
                <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', color: theme.textBody, margin: 0 }}>
                  {selectedSeal.times_earned} {selectedSeal.times_earned === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div>
                <DGEyebrow tracking="tight" color={theme.textMuted} style={{ margin: '0 0 2px' }}>First collected</DGEyebrow>
                <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', color: theme.textBody, margin: 0 }}>
                  {selectedSeal.first_earned_date ? new Date(`${selectedSeal.first_earned_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            {selectedSeal.sources?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[...new Set(selectedSeal.sources)].map(src => (
                  <span key={src} style={{
                    background: `${theme.accentGold}26`, border: `1px solid ${theme.accentGold}40`,
                    borderRadius: 12, padding: '2px 10px',
                    fontFamily: theme.fontBody, fontSize: '0.7rem', color: theme.textMuted,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {src.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </DGModal>
      )}
    </div>
  );
}
