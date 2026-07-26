'use client';
/**
 * FlagCollectionView — full-screen parchment collection of every country flag
 * seal. Shows earned (full color) and unearned (greyed) seals.
 *
 * The country list is imported, never local: this file used to carry a sixth
 * copy of the table, labelled "197 UN-recognised countries" while holding 193
 * entries — and the wrong 193, omitting Côte d'Ivoire and including Vatican
 * City, a UN observer. Every total on screen derives from COUNTRIES.length so
 * the copy cannot drift from the data again.
 *
 * Overlay behaves as a dialog: role="dialog", Escape closes, focus moves in on
 * open and is restored on close, body scroll locks while open. The per-seal
 * detail view rides on DGModal, nested above this overlay.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import FlagSealMedallion from './FlagSealMedallion';
import DGModal from './DGModal';
import { COUNTRIES } from '@/lib/countries';
import { useTheme } from '@/components/theme/ThemeContext';


export default function FlagCollectionView({ childId, onClose }) {
  const { theme } = useTheme();
  const [earnedSeals, setEarnedSeals] = useState([]);
  const [selectedSeal, setSelectedSeal] = useState(null);
  const [loading, setLoading] = useState(!!childId);
  const panelRef = useRef(null);
  const sealOpenRef = useRef(false);

  useEffect(() => {
    sealOpenRef.current = !!selectedSeal;
  }, [selectedSeal]);

  useEffect(() => {
    if (!childId) return;
    base44.entities.FlagSeal.filter({ child_id: childId }, '-first_earned_date', 200)
      .then(seals => { setEarnedSeals(seals); setLoading(false); })
      .catch(() => setLoading(false));
  }, [childId]);

  // Dialog behaviour: focus in on open (restore on close), Escape closes,
  // body scroll locked while open. When the seal-detail DGModal is open it
  // owns Escape (and stops propagation); the ref guard is belt-and-braces.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !sealOpenRef.current) onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [onClose]);

  const earnedCodes = new Set(earnedSeals.map(s => s.country_code));
  const earnedMap = Object.fromEntries(earnedSeals.map(s => [s.country_code, s]));
  const earnedCount = earnedCodes.size;

  const badgeStyle = {
    display: 'inline-block',
    background: `${theme.accentGold}26`,
    border: `1px solid ${theme.accentGold}40`,
    borderRadius: 20, padding: '4px 16px',
    fontFamily: theme.fontBody, fontSize: '0.72rem',
    color: theme.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,12,8,0.88)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="My flag collection"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1100,
          minHeight: '100vh',
          background: `radial-gradient(ellipse at 50% 0%, ${theme.bgCard} 0%, ${theme.bgSoft} 45%, ${theme.bgPrimary} 100%)`,
          padding: '2rem 1.5rem 4rem',
          position: 'relative',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={onClose}
            aria-label="Close collection"
            style={{
              position: 'absolute', top: 12, right: 12,
              background: `${theme.accentGold}26`, border: `1px solid ${theme.accentGold}40`,
              borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
              fontSize: '1.1rem', color: theme.textBody, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><span aria-hidden="true">×</span></button>

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
            {loading ? 'Loading your collection…' : `You have collected ${earnedCount} of ${COUNTRIES.length} countries`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={badgeStyle}>
              {COUNTRIES.length} Countries · The World
            </div>
            {!loading && earnedCount > 0 && (
              <div style={badgeStyle}>
                <span aria-hidden="true">✦ </span>{Math.round((earnedCount / COUNTRIES.length) * 100)}% Complete
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
            const earned = earnedCodes.has(country.code);
            const sealData = earnedMap[country.code];
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => earned && sealData && setSelectedSeal(sealData)}
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

      {/* Seal detail modal — nested above this overlay */}
      {selectedSeal && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 2100 }}>
          <DGModal label={`${selectedSeal.country_name} flag seal`} maxWidth={400} onClose={() => setSelectedSeal(null)}>
            <div style={{ padding: '2.5rem 2rem 2rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <FlagSealMedallion countryCode={selectedSeal.country_code} countryName={selectedSeal.country_name} size="lg" earned showLabel />
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.textMuted, margin: '0 0 2px' }}>Earned</p>
                  <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', color: theme.textBody, margin: 0 }}>{selectedSeal.times_earned}×</p>
                </div>
                <div>
                  <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.textMuted, margin: '0 0 2px' }}>First collected</p>
                  <p style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', color: theme.textBody, margin: 0 }}>
                    {selectedSeal.first_earned_date ? new Date(selectedSeal.first_earned_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                      {src.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DGModal>
        </div>
      )}
    </div>
  );
}
