'use client';
/**
 * DGDestination — the destination wall: where in the world today's edition
 * goes, and the four things a child could meet there.
 *
 * It used to be one card carrying a 16:9 photograph with the place name foil'd
 * across its bottom edge, and four little tinted tiles beneath with an emoji
 * each. In the gallery it is a wall: the destination's own painting hung large
 * at the corner, the four senses hung beside it at 1:1, and every one of them
 * labelled underneath rather than over. The painting is still the door — the
 * modal, the child's-day story and the flag earn are all unchanged behind it.
 *
 * **A sense with no painting hangs as a label plate**, not as an empty frame.
 * The senses only got image columns when this wall was built, so every day
 * authored before then has four unpainted ones — which makes the plate the
 * common case, not the fallback, and it has to look like a caption card that
 * belongs on the wall rather than a picture that failed to load.
 *
 * Unlike its sibling sections this one does not take an `EditionRecord`: it
 * takes the destination view-model DailyGoldEditionPage assembles out of the
 * edition's flat columns. That shape is declared here, and imported from here
 * by the page, because the component is the one that decides what it needs —
 * the page's `mapRecord` is then checked against it rather than the other way
 * round.
 */
import { useState } from 'react';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import { resolveLocation } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import DGModal from '@/components/dailygold/DGModal';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import Wall from '@/components/dailygold/gallery/Wall';
import Work from '@/components/dailygold/gallery/Work';
import Label, { LabelAction } from '@/components/dailygold/gallery/Label';
import type { SavedItemType } from '@/lib/saved-item-input';
import type { OnFlagEarned } from '@/components/dailygold/useFlagEarn';

/**
 * One of the four small works beside the destination. Taste, sound and nature
 * carry a `name`; the phrase carries a `word` plus its translation and
 * language. They share a type because the component that hangs them is one
 * component reading `name || word` — that union *is* what it consumes.
 */
export type DestinationDetail = {
  name?: string | null;
  word?: string | null;
  translation?: string | null;
  language?: string | null;
  /** The sense's own painting, where one has been authored. */
  image_url?: string | null;
};

/** The edition's destination columns, assembled into what this wall reads. */
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

/** The four `DestinationView` fields SENSES may point at. */
type DetailKey = 'taste_of_day' | 'sound_of_day' | 'nature_detail' | 'tiny_phrase';

// `itemType` is the treasury enum each sense saves under. The edition column it
// reads and the type it saves as are separate things: the column can be
// renamed without orphaning every save made under the old name. The emoji that
// used to sit above each label is gone — this is a wall of paintings, and an
// emoji on it is a sticker.
const SENSES: { key: DetailKey; itemType: SavedItemType; label: string }[] = [
  { key: 'taste_of_day', itemType: 'taste', label: 'Taste of the day' },
  { key: 'sound_of_day', itemType: 'sound', label: 'Sound of the day' },
  { key: 'nature_detail', itemType: 'nature', label: 'Nature detail' },
  { key: 'tiny_phrase', itemType: 'phrase', label: 'Tiny phrase' },
];

function Sense({
  sense,
  data,
  savedSet,
  editionDate,
  iso2,
  countryName,
}: {
  sense: (typeof SENSES)[number];
  data: DestinationView;
  savedSet?: Set<string> | null;
  editionDate?: string;
  iso2: string | null;
  countryName?: string | null;
}) {
  const content = data?.[sense.key];
  const title = content?.name || content?.word || '—';
  // tiny_phrase also carries a translation and the language it is in. Both are
  // stored on the edition and neither had anywhere to render before.
  const subtitle = content?.translation || null;
  const meta = content?.language ? `${sense.label} · ${content.language}` : sense.label;
  const imgUrl = content?.image_url || null;

  // Nothing authored means nothing to save — a heart over the em-dash
  // placeholder would file "—" in the treasury.
  const heart = savedSet && content ? (
    <TreasuryHeart
      itemType={sense.itemType}
      itemId={title}
      itemTitle={title}
      itemSubtitle={sense.label}
      countryCode={iso2}
      countryName={countryName}
      itemImageUrl={imgUrl}
      editionDate={editionDate}
      initialSaved={savedSet.has(`${sense.itemType}:${title}`)}
      onImage={!!imgUrl}
    />
  ) : undefined;

  const label = <Label title={title} subtitle={subtitle} meta={meta} />;

  // Painted: a work like any other on the wall. Unpainted: the label takes the
  // frame's own square, on a tinted ground — a plate on the wall rather than a
  // hole in it.
  return (
    <div className="gl-work">
      {imgUrl ? (
        <>
          <Work aspect="1 / 1" imageUrl={imgUrl} alt={title} heart={heart} />
          {label}
        </>
      ) : (
        <div className="gl-hung">
          <div className="gl-plate">{label}</div>
          {heart && <span className="gl-heart">{heart}</span>}
        </div>
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

  // The painting is the door: opening the modal is the open worth reporting,
  // and the modal reports it itself (mount == open), so there is nothing to
  // emit here. Hovering the door is not walking through it.
  const openDestination = () => {
    setModalOpen(true);
    if (!flagTriggered && iso2) {
      setFlagTriggered(true);
      onFlagEarned?.(shortName, iso2, 'destination');
    }
  };

  const heroImg = imageUrl;
  const atmosphere = dest.atmosphere
    ? dest.atmosphere.split('.').slice(0, 2).join('.').trim() + (dest.atmosphere.includes('.') ? '.' : '')
    : null;

  return (
    <Wall
      first
      eyebrow={dest.continent ? `Where in the world · ${dest.continent}` : 'Where in the world'}
      title={dest.name || 'Somewhere, today'}
      lede="Four things a child could meet there today."
    >
      <div className="gl-hang gl-hang-dest">
        {/* The destination's own painting, hung largest */}
        <div className="gl-work">
          <Work
            aspect="4 / 3"
            imageUrl={heroImg}
            alt={dest.name ?? ''}
            onClick={openDestination}
            ariaLabel={`Open ${shortName ?? 'the destination'}`}
            seal={iso2 ? <FlagSealMedallion countryCode={iso2} countryName={shortName} size="md" earned /> : undefined}
            /* An unnamed destination has no stable id to file the save under,
               and would land in the treasury as a blank card — the same rule
               the senses apply to an unauthored slot. */
            heart={savedSet && dest.name ? (
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
                onImage
              />
            ) : undefined}
          />
          <Label
            size="lead"
            title={shortName ?? 'Today'}
            subtitle="Where in the world, today"
            body={atmosphere || undefined}
            action={dest.child_life?.story
              ? <LabelAction onClick={openDestination}>A child&rsquo;s day in {shortName} ›</LabelAction>
              : undefined}
          />
        </div>

        {SENSES.map(sense => (
          <Sense
            key={sense.key}
            sense={sense}
            data={dest}
            savedSet={savedSet}
            editionDate={editionDate}
            iso2={iso2}
            countryName={shortName}
          />
        ))}
      </div>

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
            <DGEyebrow tracking="wide" style={{
              position: 'absolute', bottom: '1rem', left: 'clamp(1.25rem, 4vw, 2rem)', right: 'clamp(1.25rem, 4vw, 2rem)',
            }}>
              {dest.continent && `${dest.continent} · `}{dest.name}
            </DGEyebrow>
          </DGHeroImage>

          <div style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
            {dest.atmosphere && (
              <p className="type-quote" style={{ color: 'var(--text-primary)', margin: '0 0 1.5rem', borderLeft: '3px solid color-mix(in srgb, var(--accent) 25%, transparent)', paddingLeft: '1rem' }}>
                {dest.atmosphere}
              </p>
            )}

            {dest.child_life?.story && (
              <div className="type-body" style={{ color: 'var(--text-primary)' }}>
                {dest.child_life.story.split('\n\n').map((para, i) => (
                  <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
                ))}
              </div>
            )}
          </div>
        </DGModal>
      )}
    </Wall>
  );
}
