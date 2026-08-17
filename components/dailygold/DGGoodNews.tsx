'use client';
/**
 * DGGoodNews — the day's good news, lead story plus a list.
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
import DGCard from '@/components/dailygold/DGCard';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import DGSectionHeader, { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
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
        <h2 className="type-display-section" style={{ color: 'var(--accent)', margin: '0 0 1rem' }}>
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

  // Earning is a side effect of opening the story, never of the card sitting
  // in the list (spec R6.5/R6.7). `location` is mostly null in current data,
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

  const primary = items[0];
  const rest = items.slice(1);
  const primaryImg = primary?.image_url;

  return (
    <section style={{ background: 'transparent', borderRadius: 0, overflow: 'visible' }}>
      {/* Header */}
      <div style={{ padding: '0' }}>
        <DGSectionHeader
          eyebrow="Stories of hope, kindness and progress"
          title="Good News of the Day"
        />

        {/* Primary story - compact card. The heart is its own button, so it
            sits beside the card button rather than inside it. */}
        {primary && (
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <DGCard
              as="button"
              size="small"
              type="button"
              onClick={() => openNews(primary)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                font: 'inherit', padding: 0, cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <DGHeroImage imageUrl={primaryImg} aspectRatio="16/10" />
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                <h3 className="type-display-story" style={{ color: 'var(--accent-readable)', margin: '0 0 0.5rem', paddingRight: '2.5rem' }}>
                  {primary.headline}
                </h3>
                <p className="type-caption" style={{ color: 'var(--text-primary)', margin: 0 }}>
                  {(primary.description || '').split('.').slice(0, 2).join('.').trim() + '.'}
                </p>
              </div>
            </DGCard>
            {savedSet && (
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                <TreasuryHeart
                  itemType="news"
                  itemId={String(primary.id)}
                  itemTitle={primary.headline}
                  itemSubtitle={primary.location || 'Good news'}
                  itemImageUrl={primaryImg}
                  countryCode={resolveLocation(primary.location)}
                  countryName={primary.location}
                  editionDate={editionDate}
                  initialSaved={savedSet.has(`news:${primary.id}`)}
                  size="sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Secondary stories — compact rows with thumbnail (stories 2-10).
            The row is a button, so its heart can only be a sibling: the
            wrapper carries the row's spacing and the heart floats over the
            right edge, with the text padded clear of the 44px tap target. */}
        {rest.slice(0, 9).map((item, i) => (
          <div key={item.id ?? i} style={{ position: 'relative', marginBottom: '0.4rem' }}>
            <DGCard
              as="button"
              size="small"
              type="button"
              onClick={() => openNews(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                width: '100%', textAlign: 'left', font: 'inherit',
                padding: '0.65rem 0.85rem', minHeight: 44,
                paddingRight: savedSet ? '3.1rem' : '0.85rem',
                cursor: 'pointer',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 52, height: 52, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: item.image_url ? undefined : 'color-mix(in srgb, var(--accent) 18%, transparent)',
              }}>
                {item.image_url
                  ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>✨</div>
                }
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="type-body-ui" style={{ color: 'var(--accent-readable)', margin: '0 0 0.2rem', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.headline}
                </p>
                {item.description && (
                  <p className="type-caption" style={{ color: 'var(--text-primary)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {item.description.split('.')[0].trim() + '.'}
                  </p>
                )}
              </div>
            </DGCard>
            {savedSet && (
              <div style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', zIndex: 10 }}>
                <TreasuryHeart
                  itemType="news"
                  itemId={String(item.id)}
                  itemTitle={item.headline}
                  itemSubtitle={item.location || 'Good news'}
                  itemImageUrl={item.image_url}
                  countryCode={resolveLocation(item.location)}
                  countryName={item.location}
                  editionDate={editionDate}
                  initialSaved={savedSet.has(`news:${item.id}`)}
                  size="sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* News Modal */}
      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </section>
  );
}
