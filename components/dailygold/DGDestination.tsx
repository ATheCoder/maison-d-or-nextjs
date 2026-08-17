'use client';
/**
 * DGDestination — where in the world today's edition goes.
 *
 * Unlike its sibling sections this one does not take an `EditionRecord`: it
 * takes the destination view-model DailyGoldEditionPage assembles out of the
 * edition's flat columns. That shape is declared here, and imported from here by
 * the page, because the component is the one that decides what it needs — the
 * page's `mapRecord` is then checked against it rather than the other way round.
 */
import { useState } from 'react';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolveLocation } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import DGModal from '@/components/dailygold/DGModal';
import DGCard from '@/components/dailygold/DGCard';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import type { SavedItemType } from '@/lib/saved-item-input';
import type { OnFlagEarned } from '@/components/dailygold/useFlagEarn';

/**
 * One of the four small cards below the hero. Taste, sound and nature carry a
 * `name`; the phrase carries a `word` plus its translation and language. They
 * share a type because the card that renders them is one component reading
 * `name || word` — that union *is* what it consumes.
 */
export type DestinationDetail = {
  name?: string | null;
  word?: string | null;
  translation?: string | null;
  language?: string | null;
};

/** The edition's destination columns, assembled into what this section reads. */
export type DestinationView = {
  name: string | null;
  continent: string | null;
  atmosphere: string | null;
  image_url: string | null;
  taste_of_day: DestinationDetail | null;
  sound_of_day: DestinationDetail | null;
  nature_detail: DestinationDetail | null;
  tiny_phrase: DestinationDetail | null;
  child_life: { story: string } | null;
};

/** The four `DestinationView` fields DETAIL_CARDS may point at. */
type DetailKey = 'taste_of_day' | 'sound_of_day' | 'nature_detail' | 'tiny_phrase';

// `itemType` is the treasury enum each card saves under. The edition column it
// reads and the type it saves as are separate things: the column can be
// renamed without orphaning every save made under the old name.
const DETAIL_CARDS: { key: DetailKey; itemType: SavedItemType; label: string; emoji: string }[] = [
  { key: 'taste_of_day', itemType: 'taste', label: 'Taste of the Day', emoji: '🍵' },
  { key: 'sound_of_day', itemType: 'sound', label: 'Sound of the Day', emoji: '🎵' },
  { key: 'nature_detail', itemType: 'nature', label: 'Nature Detail', emoji: '🌿' },
  { key: 'tiny_phrase', itemType: 'phrase', label: 'Tiny Phrase', emoji: '✍️' },
];

function DetailCard({
  card,
  data,
  savedSet,
  editionDate,
  iso2,
  countryName,
}: {
  card: (typeof DETAIL_CARDS)[number];
  data: DestinationView;
  savedSet?: Set<string> | null;
  editionDate?: string;
  iso2: string | null;
  countryName?: string | null;
}) {
  const content = data?.[card.key];
  const title = content?.name || content?.word || '—';
  // tiny_phrase also carries a translation and the language it is in. Both are
  // stored on the edition and neither had anywhere to render.
  const subtitle = content?.translation || null;
  const label = content?.language ? `${card.label} · ${content.language}` : card.label;

  // A stat card is read where it stands: it opens nothing, so it reports
  // nothing. The hover and click trackers that used to sit on this tile fired
  // twice for one pointer and counted a cursor crossing it as a child choosing
  // to look at it.
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-tint)',
        border: '1px solid var(--border-fine)',
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
      <DGEyebrow tracking="tight" color="var(--accent-readable)" style={{ margin: '0.3rem 0 0.2rem' }}>
        {label}
      </DGEyebrow>
      <p style={{ fontFamily: 'var(--face-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-readable)', margin: 0, lineHeight: 1.3 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontFamily: 'var(--face-display)', fontStyle: 'italic', fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.35 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function DGDestination({
  dest,
  imageUrl,
  onFlagEarned,
  savedSet = null,
  editionDate,
}: {
  /** Null on a day whose edition authored no destination at all. */
  dest?: DestinationView | null;
  imageUrl?: string | null;
  onFlagEarned?: OnFlagEarned;
  /** The reader's saved treasury keys, or null when there is no reader. */
  savedSet?: Set<string> | null;
  editionDate?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [flagTriggered, setFlagTriggered] = useState(false);

  if (!dest) return null;

  const iso2 = resolveLocation(dest.name);
  const shortName = dest.name?.split(',')[0].trim() ?? null;
  // The country code where there is one: it is the id the flag seals and the
  // treasury already file this place under. A destination can be authored with
  // taste, sound and atmosphere but no country named, and there is nothing
  // better to call that one.
  const destinationId = iso2 || dest.name || 'unnamed';

  // The hero is the door: opening the modal is the open worth reporting, and
  // the modal reports it itself (mount == open), so there is nothing to emit
  // here. Hovering the door is not walking through it.
  const handleDestinationView = () => {
    setModalOpen(true);
    // Trigger flag earn on first view
    if (!flagTriggered && iso2) {
      setFlagTriggered(true);
      onFlagEarned?.(shortName, iso2, 'destination');
    }
  };

  const heroImg = imageUrl;

  return (
    /* The one card in the section set that wears no shadow — it is the page's
       widest block and the soft shadow reads as a bruise at that width. */
    <DGCard as="section" borderAlpha="15" style={{ overflow: 'hidden', boxShadow: 'none' }}>
      {/* Compact hero: the whole image is one button that opens the full story.
          The heart is its own button, so it sits beside the hero button,
          never inside it. */}
      <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden' }}>
        <button
          onClick={handleDestinationView}
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
          <DGHeroImage
            imageUrl={heroImg}
            aspectRatio="16 / 9"
            alt={dest.name ?? ''}
            fallback={<span aria-hidden="true" style={{ fontSize: '3rem', opacity: 0.2 }}>🌍</span>}
          >
            <span style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              {iso2 && <FlagSealMedallion countryCode={iso2} countryName={shortName} size="md" earned />}
              <span style={{ fontFamily: 'var(--face-display)', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 700, color: 'var(--accent-readable)', lineHeight: 1.1 }}>
                {shortName}
              </span>
            </span>
          </DGHeroImage>
        </button>
        {/* An unnamed destination has no stable id to file the save under, and
            would land in the treasury as a blank card — the same rule the detail
            cards apply to an unauthored slot. */}
        {savedSet && dest.name && (
          <div style={{ position: 'absolute', bottom: '1rem', right: '1.25rem' }}>
            <TreasuryHeart
              itemType="destination"
              itemId={dest.name}
              itemTitle={shortName}
              itemSubtitle={dest.atmosphere?.split('.').slice(0, 1).join('.').trim() || 'Destination'}
              itemImageUrl={heroImg}
              countryCode={iso2}
              countryName={shortName}
              editionDate={editionDate}
              initialSaved={savedSet.has(`destination:${dest.name}`)}
              size="md"
            />
          </div>
        )}
      </div>

      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        {/* Section label */}
        <DGEyebrow tracking="wide" style={{ margin: '0 0 0.5rem' }}>
          Where in the World
        </DGEyebrow>

        {/* Atmosphere */}
        {dest.atmosphere && (
          <p style={{ fontFamily: 'var(--face-display)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0 0 1rem', lineHeight: 1.7 }}>
            {dest.atmosphere.split('.').slice(0, 2).join('.') + '.'}
          </p>
        )}

        {/* Destination Modal */}
        {modalOpen && (
          <DGModal
            label="Destination of the day"
            onClose={() => setModalOpen(false)}
            maxWidth={800}
            tracking={{
              contentType: 'destination',
              contentId: destinationId,
              label: dest.name,
              section: 'destination',
            }}
          >
            <DGHeroImage
              imageUrl={heroImg}
              aspectRatio="16 / 9"
              alt={dest.name ?? ''}
              scrimFrom={60}
              fallback={<span aria-hidden="true" style={{ fontSize: '5rem', opacity: 0.2 }}>🌍</span>}
            >
              <DGEyebrow tracking="wide" color="var(--accent-readable)" style={{
                position: 'absolute', bottom: '1rem', left: 'clamp(1.25rem, 4vw, 2rem)', right: 'clamp(1.25rem, 4vw, 2rem)',
              }}>
                {dest.continent && `${dest.continent} · `}{dest.name}
              </DGEyebrow>
            </DGHeroImage>

            <div style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
              {dest.atmosphere && (
                <p style={{ fontFamily: 'var(--face-display)', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.85, margin: '0 0 1.5rem', borderLeft: '3px solid color-mix(in srgb, var(--accent) 25%, transparent)', paddingLeft: '1rem' }}>
                  {dest.atmosphere}
                </p>
              )}

              {dest.child_life?.story && (
                <div style={{ fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.9 }}>
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
            <DetailCard key={card.key} card={card} data={dest} savedSet={savedSet} editionDate={editionDate} iso2={iso2} countryName={shortName} />
          ))}
        </div>
      </div>
    </DGCard>
  );
}
