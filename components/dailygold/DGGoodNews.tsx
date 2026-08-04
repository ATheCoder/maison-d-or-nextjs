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
import { useTheme } from '@/components/theme/ThemeContext';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import DGModal from '@/components/dailygold/DGModal';
import { resolveLocation } from '@/lib/countries';
import type { GoodNewsRecord } from '@/app/(dg)/daily-gold-edition/queries';
import type { OnFlagEarned } from '@/components/dailygold/useFlagEarn';

function NewsModal({ item, onClose }: { item: GoodNewsRecord; onClose: () => void }) {
  const { theme } = useTheme();

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
      <div style={{ position: 'relative', background: theme.bgSoft }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            style={{ display: 'block', width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '16/9',
            background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span aria-hidden="true" style={{ fontSize: '4rem', opacity: 0.2 }}>✨</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
      </div>

      {/* Story content */}
      <div style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: theme.textHeadline, margin: '0 0 1rem', lineHeight: 1.2 }}>
          {item.headline}
        </h2>

        {item.location && (
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 1.5rem' }}>
            <span aria-hidden="true">📍</span> {item.location}
          </p>
        )}

        <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9 }}>
          {(() => {
            if (!item.description) return <p style={{ color: theme.textMuted, margin: 0 }}>Story content coming soon...</p>;
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
  const { theme } = useTheme();
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
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.5rem' }}>
          Stories of hope, kindness and progress
        </p>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.6rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 1.25rem', lineHeight: 1.15 }}>
          Good News of the Day
        </h2>

        {/* Primary story - compact card. The heart is its own button, so it
            sits beside the card button rather than inside it. */}
        {primary && (
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => openNews(primary)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                font: 'inherit', padding: 0, cursor: 'pointer',
                borderRadius: theme.radiusSmall,
                overflow: 'hidden',
                border: `1px solid ${theme.accentGold}25`,
                background: theme.bgCard,
                boxShadow: theme.shadowSoft,
              }}
            >
              <div style={{ position: 'relative' }}>
                {primaryImg ? (
                  <img src={primaryImg} alt="" style={{ display: 'block', width: '100%', aspectRatio: '16/10', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/10', background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)` }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
              </div>
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.05rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.5rem', lineHeight: 1.3, paddingRight: '2.5rem' }}>
                  {primary.headline}
                </h3>
                <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textBody, margin: 0, lineHeight: 1.7 }}>
                  {(primary.description || '').split('.').slice(0, 2).join('.').trim() + '.'}
                </p>
              </div>
            </button>
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
            <button
              type="button"
              onClick={() => openNews(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                width: '100%', textAlign: 'left', font: 'inherit',
                padding: '0.65rem 0.85rem', minHeight: 44,
                paddingRight: savedSet ? '3.1rem' : '0.85rem',
                borderRadius: theme.radiusSmall,
                cursor: 'pointer',
                border: `1px solid ${theme.accentGold}25`,
                background: theme.bgCard,
                boxShadow: theme.shadowSoft,
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 52, height: 52, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: item.image_url ? undefined : `${theme.accentGold}2E`,
              }}>
                {item.image_url
                  ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>✨</div>
                }
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: theme.fontBody, fontSize: '0.8rem', fontWeight: 500, color: theme.textHeadline, margin: '0 0 0.2rem', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.headline}
                </p>
                {item.description && (
                  <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.72rem', color: theme.textBody, margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {item.description.split('.')[0].trim() + '.'}
                  </p>
                )}
              </div>
            </button>
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
