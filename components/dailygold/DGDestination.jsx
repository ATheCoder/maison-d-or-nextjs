'use client';
import { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolveLocation } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import DGModal from '@/components/dailygold/DGModal';

// `itemType` is the treasury enum each card saves under. The edition column it
// reads and the type it saves as are separate things: the column can be
// renamed without orphaning every save made under the old name.
const DETAIL_CARDS = [
  { key: 'taste_of_day', itemType: 'taste', label: 'Taste of the Day', emoji: '🍵' },
  { key: 'sound_of_day', itemType: 'sound', label: 'Sound of the Day', emoji: '🎵' },
  { key: 'nature_detail', itemType: 'nature', label: 'Nature Detail', emoji: '🌿' },
  { key: 'tiny_phrase', itemType: 'phrase', label: 'Tiny Phrase', emoji: '✍️' },
];

function DetailCard({ card, data, onTrack, theme, savedSet, editionDate, iso2, countryName }) {
  const content = data?.[card.key];
  const title = content?.name || content?.word || '—';
  // tiny_phrase also carries a translation and the language it is in. Both are
  // stored on the edition and neither had anywhere to render.
  const subtitle = content?.translation || null;
  const label = content?.language ? `${card.label} · ${content.language}` : card.label;

  return (
    <div
      onMouseEnter={() => onTrack?.('geography', card.label)}
      onClick={() => onTrack?.('geography', card.label)}
      style={{
        padding: '0.75rem',
        borderRadius: theme.radiusSmall,
        background: theme.bgSoft,
        border: `1px solid ${theme.accentGold}12`,
        position: 'relative',
      }}
    >
      {/* Nothing authored means nothing to save — a heart over the em-dash
          placeholder would file "—" in the treasury. */}
      {savedSet && content && (
        <div style={{ position: 'absolute', top: 4, right: 4 }}>
          <TreasuryHeart
            itemType={card.itemType}
            itemId={title}
            itemTitle={title}
            itemSubtitle={card.label}
            countryCode={iso2}
            countryName={countryName}
            editionDate={editionDate}
            initialSaved={savedSet.has(`${card.itemType}:${title}`)}
            size="sm"
          />
        </div>
      )}
      <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>{card.emoji}</span>
      <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentGold, margin: '0.3rem 0 0.2rem' }}>
        {label}
      </p>
      <p style={{ fontFamily: theme.fontHeadline, fontSize: '0.85rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.3 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.72rem', color: theme.textMuted, margin: '0.2rem 0 0', lineHeight: 1.35 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function DGDestination({ dest, imageUrl, onTrack, onFlagEarned, savedSet = null, editionDate }) {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [flagTriggered, setFlagTriggered] = useState(false);

  if (!dest) return null;

  const iso2 = resolveLocation(dest.name);

  const handleDestinationView = () => {
    setModalOpen(true);
    // Trigger flag earn on first view
    if (!flagTriggered && iso2) {
      setFlagTriggered(true);
      onFlagEarned?.(dest.name?.split(',')[0].trim(), iso2, 'destination');
    }
  };

  const heroImg = imageUrl;

  return (
    <section style={{ background: theme.bgCard, borderRadius: theme.radius, border: `1px solid ${theme.accentGold}15`, overflow: 'hidden' }}>
      {/* Compact hero: the whole image is one button that opens the full story.
          The heart is its own button, so it sits beside the hero button,
          never inside it. */}
      <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden' }}>
        <button
          onClick={handleDestinationView}
          onMouseEnter={() => onTrack?.('geography', dest.name)}
          style={{
            display: 'block',
            width: '100%', height: '100%',
            padding: 0, margin: 0,
            border: 'none', background: 'none',
            font: 'inherit', textAlign: 'left',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {heroImg ? (
            <img src={heroImg} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: '3rem', opacity: 0.2 }}>🌍</span>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
          <span style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            {iso2 && <FlagSealMedallion countryCode={iso2} countryName={dest.name?.split(',')[0]} size="md" earned />}
            <span style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 700, color: theme.textHeadline, lineHeight: 1.1 }}>
              {dest.name?.split(',')[0]}
            </span>
          </span>
        </button>
        {savedSet && (
          <div style={{ position: 'absolute', bottom: '1rem', right: '1.25rem' }}>
            <TreasuryHeart
              itemType="destination"
              itemId={dest.name}
              itemTitle={dest.name?.split(',')[0]}
              itemSubtitle={dest.atmosphere?.split('.').slice(0, 1).join('.').trim() || 'Destination'}
              itemImageUrl={heroImg}
              countryCode={iso2}
              countryName={dest.name?.split(',')[0]}
              editionDate={editionDate}
              initialSaved={savedSet.has(`destination:${dest.name}`)}
              size="md"
            />
          </div>
        )}
      </div>

      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        {/* Section label */}
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.5rem' }}>
          Where in the World
        </p>

        {/* Atmosphere */}
        {dest.atmosphere && (
          <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.9rem', color: theme.textBody, margin: '0 0 1rem', lineHeight: 1.7 }}>
            {dest.atmosphere.split('.').slice(0, 2).join('.') + '.'}
          </p>
        )}

        {/* Destination Modal */}
        {modalOpen && (
          <DGModal label="Destination of the day" onClose={() => setModalOpen(false)} maxWidth={800}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9', background: theme.bgSoft }}>
              {heroImg ? (
                <img src={heroImg} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span aria-hidden="true" style={{ fontSize: '5rem', opacity: 0.2 }}>🌍</span>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 60%, ${theme.bgCard} 100%)` }} />
              <p style={{
                position: 'absolute', bottom: '1rem', left: 'clamp(1.25rem, 4vw, 2rem)', right: 'clamp(1.25rem, 4vw, 2rem)',
                fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: theme.accentGold, margin: 0,
              }}>
                {dest.continent && `${dest.continent} · `}{dest.name}
              </p>
            </div>

            <div style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
              {dest.atmosphere && (
                <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '1.15rem', color: theme.textBody, lineHeight: 1.85, margin: '0 0 1.5rem', borderLeft: `3px solid ${theme.accentGold}40`, paddingLeft: '1rem' }}>
                  {dest.atmosphere}
                </p>
              )}

              {dest.child_life?.story && (
                <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9 }}>
                  {dest.child_life.story.split('\n\n').map((para, i) => (
                    <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          </DGModal>
        )}

        {/* Detail cards — fluid grid, collapses gracefully */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '0.5rem' }}>
          {DETAIL_CARDS.map(card => (
            <DetailCard key={card.key} card={card} data={dest} theme={theme} onTrack={onTrack} savedSet={savedSet} editionDate={editionDate} iso2={iso2} countryName={dest.name?.split(',')[0]} />
          ))}
        </div>
      </div>
    </section>
  );
}
