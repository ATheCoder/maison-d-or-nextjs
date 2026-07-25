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
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import FlagSealMedallion from './FlagSealMedallion';
import { COUNTRIES } from '@/lib/countries';


export default function FlagCollectionView({ childId, onClose }) {
  const [earnedSeals, setEarnedSeals] = useState([]);
  const [selectedSeal, setSelectedSeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) { setLoading(false); return; }
    base44.entities.FlagSeal.filter({ child_id: childId }, '-first_earned_date', 200)
      .then(seals => { setEarnedSeals(seals); setLoading(false); })
      .catch(() => setLoading(false));
  }, [childId]);

  const earnedCodes = new Set(earnedSeals.map(s => s.country_code));
  const earnedMap = Object.fromEntries(earnedSeals.map(s => [s.country_code, s]));
  const earnedCount = earnedCodes.size;

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
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1100,
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 0%, #F5EDD8 0%, #EDE0C4 40%, #E0CFA8 100%)',
          padding: '2rem 1.5rem 4rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: '50%', width: 38, height: 38, cursor: 'pointer',
              fontSize: '1.1rem', color: '#8B7355', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 700, color: '#3C2E1A', margin: '0 0 0.4rem',
          }}>
            My Flag Collection
          </h1>
          <p style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.05rem', color: '#8B7355', margin: '0 0 0.25rem',
            fontStyle: 'italic',
          }}>
            {loading ? 'Loading your collection…' : `You have collected ${earnedCount} of ${COUNTRIES.length} countries`}
          </p>
          {!loading && earnedCount > 0 && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(201,169,110,0.2)',
              border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '4px 16px',
              fontFamily: 'Jost, sans-serif', fontSize: '0.72rem',
              color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              ✦ {Math.round((earnedCount / COUNTRIES.length) * 100)}% Complete
            </div>
          )}
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.3)' }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', color: 'rgba(201,169,110,0.7)', fontSize: '1.2rem' }}>✦</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.3)' }} />
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
              <div
                key={country.code}
                onClick={() => earned && sealData && setSelectedSeal(sealData)}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <FlagSealMedallion
                  countryCode={country.code}
                  countryName={country.name}
                  size="md"
                  earned={earned}
                  showLabel
                  onClick={earned ? () => setSelectedSeal(sealData) : undefined}
                />
              </div>
            );
          })}
        </div>

        {/* Country-count label (bottom-right like the reference image) */}
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'rgba(240,228,204,0.95)',
          border: '2px solid rgba(201,169,110,0.5)',
          borderRadius: 8, padding: '8px 16px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: '1.1rem', color: '#5C4A2A', margin: 0 }}>
            {COUNTRIES.length} Countries
          </p>
          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B7355', margin: 0 }}>
            The World
          </p>
        </div>
      </div>

      {/* Seal detail modal */}
      {selectedSeal && (
        <div
          onClick={() => setSelectedSeal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, #FDF6E8 0%, #EDE0C4 100%)',
              border: '2px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '2.5rem 2rem',
              maxWidth: 380, width: '100%', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FlagSealMedallion countryCode={selectedSeal.country_code} countryName={selectedSeal.country_name} size="lg" earned showLabel />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', margin: '0 0 2px' }}>Earned</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#3C2E1A', margin: 0 }}>{selectedSeal.times_earned}×</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', margin: '0 0 2px' }}>First collected</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#3C2E1A', margin: 0 }}>
                  {selectedSeal.first_earned_date ? new Date(selectedSeal.first_earned_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            {selectedSeal.sources?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
                {[...new Set(selectedSeal.sources)].map(src => (
                  <span key={src} style={{
                    background: 'rgba(201,169,110,0.2)', border: '1px solid rgba(201,169,110,0.4)',
                    borderRadius: 12, padding: '2px 10px',
                    fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: '#8B7355',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {src.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedSeal(null)} style={{
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '6px 20px', cursor: 'pointer',
              fontFamily: 'Jost, sans-serif', fontSize: '0.72rem',
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B7355',
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}