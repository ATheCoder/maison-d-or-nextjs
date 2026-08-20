'use client';
/**
 * DGGoodNews — the salon hang: the day's good news, hung as one wall.
 *
 * It used to be a column of cards: a lead card with a picture and then nine
 * 52-pixel thumbnails in rows, squeezed into a third of the page beside two
 * other sections. Before that it was a filmstrip — ten fixed-width frames on a
 * scroll-snapping row, which hid nine works behind the tenth and put a second
 * scrollbar inside a page that already had one.
 *
 * Hung properly, the way a salon hangs: the lead takes the wall's corner at
 * double size with its excerpt, the rest hang beside and beneath it in even
 * rows. The grid is what makes it count-proof — an eleventh story opens a new
 * row, never an edge, and the wall gets taller rather than wider. Nothing in
 * this design scrolls sideways at any width.
 *
 * `items` is `getGoodNewsForDate`'s return value, unmapped. The record type is
 * imported from the query module rather than restated, so a column renamed
 * there is a compile error here instead of an undefined at render. The import
 * is type-only and erased: nothing of that `server-only` module reaches this
 * client component or the design-sync bundle.
 */
import { useCallback, useRef, useState } from 'react';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import DGModal from '@/components/dailygold/DGModal';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import Wall from '@/components/dailygold/gallery/Wall';
import Work from '@/components/dailygold/gallery/Work';
import Label, { LabelAction } from '@/components/dailygold/gallery/Label';
import { hangColumns, hasLead } from '@/components/dailygold/gallery/columns';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { resolveLocation } from '@/lib/countries';
import type { GoodNewsRecord } from '@/app/(dg)/daily-gold-edition/queries';
import type { OnFlagEarned } from '@/components/dailygold/useFlagEarn';

function NewsModal({ item, onClose }: { item: GoodNewsRecord; onClose: () => void }) {
  return (
    <DGModal
      label="Good news story"
      onClose={onClose}
      maxWidth={720}
      tracking={{
        contentType: 'news',
        contentId: String(item.id),
        label: item.headline,
        section: 'good_news',
      }}
    >
      {/* Hero image */}
      <DGHeroImage imageUrl={item.image_url} aspectRatio="16/9" fallbackMark="✨" />

      {/* Story content */}
      <div style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <h2 className="type-display-section" style={{ color: 'var(--accent-readable)', margin: '0 0 1rem' }}>
          {item.headline}
        </h2>

        {item.location && (
          <DGEyebrow tracking="tight" style={{ margin: '0 0 1.5rem' }}>
            <span aria-hidden="true">📍</span> {item.location}
          </DGEyebrow>
        )}

        <div className="type-body" style={{ color: 'var(--text-primary)' }}>
          {(() => {
            if (!item.description) return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Story content coming soon...</p>;
            return item.description.split('\n\n').map((para, i) => (
              <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
            ));
          })()}
        </div>
      </div>
    </DGModal>
  );
}

/** The first N sentences of a description, for a label's body line. */
function excerpt(text: string | null | undefined, sentences: number): string | undefined {
  if (!text) return undefined;
  const cut = text.split('.').slice(0, sentences).join('.').trim();
  return cut ? `${cut}.` : undefined;
}

export default function DGGoodNews({
  items = [],
  onFlagEarned,
  savedSet = null,
  editionDate,
}: {
  items?: GoodNewsRecord[];
  onFlagEarned?: OnFlagEarned;
  /** The reader's saved treasury keys, or null when there is no reader. */
  savedSet?: Set<string> | null;
  editionDate?: string;
}) {
  const [selectedNews, setSelectedNews] = useState<GoodNewsRecord | null>(null);
  const earnedHere = useRef(new Set<string>());

  // Earning is a side effect of opening the story, never of the work hanging
  // on the wall (spec R6.5/R6.7). `location` is mostly null in current data,
  // so the earn silently does nothing until the backfill lands — expected.
  // The open itself is reported by the modal, which is also the only thing that
  // knows when the story was closed again.
  const openNews = useCallback((item: GoodNewsRecord) => {
    setSelectedNews(item);
    const iso2 = resolveLocation(item.location);
    if (iso2 && !earnedHere.current.has(iso2)) {
      earnedHere.current.add(iso2);
      onFlagEarned?.(item.location, iso2, 'good_news');
    }
  }, [onFlagEarned]);

  if (!items.length) return null;

  const works = items.slice(0, 10);
  const cols = hangColumns(works.length, 4);
  const lead = hasLead(works.length);

  return (
    <Wall
      eyebrow="Stories of hope, kindness and progress"
      title="Good News of the Day"
      lede={lead
        ? 'Hung as one wall. The lead takes the corner at double size; the rest hang beside and beneath it, in rows.'
        : undefined}
    >
      <div className="gl-salon" style={{ ['--cols' as string]: cols }}>
        {works.map((item, i) => {
          const isLead = lead && i === 0;
          const iso2 = resolveLocation(item.location);
          return (
            <div key={item.id ?? i} className={`gl-frame${isLead ? ' gl-frame-1' : ''}`}>
              <Work
                aspect="4 / 3"
                imageUrl={item.image_url}
                onClick={() => openNews(item)}
                ariaLabel={`Read: ${item.headline}`}
                seal={iso2 ? (
                  <FlagSealMedallion
                    countryCode={iso2}
                    countryName={item.location || ''}
                    size={isLead ? 'sm' : 'xs'}
                    earned
                  />
                ) : undefined}
                heart={savedSet ? (
                  <TreasuryHeart
                    itemType="news"
                    itemId={String(item.id)}
                    itemTitle={item.headline}
                    itemSubtitle={item.location || 'Good news'}
                    itemImageUrl={item.image_url}
                    countryCode={iso2}
                    countryName={item.location}
                    editionDate={editionDate}
                    initialSaved={savedSet.has(`news:${item.id}`)}
                    onImage
                  />
                ) : undefined}
              />
              <Label
                size={isLead ? 'lead' : 'work'}
                title={item.headline}
                meta={item.location || undefined}
                body={excerpt(item.description, isLead ? 2 : 1)}
                action={isLead
                  ? <LabelAction onClick={() => openNews(item)}>Read the story ›</LabelAction>
                  : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* News Modal */}
      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </Wall>
  );
}
