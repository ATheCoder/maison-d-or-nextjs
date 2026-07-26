'use client';
import { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import SaveHeartSeal from '@/components/dailygold/SaveHeartSeal';
import DGModal from '@/components/dailygold/DGModal';

function NewsModal({ item, onClose }) {
  const { theme } = useTheme();

  if (!item) return null;

  return (
    <DGModal label="Good news story" onClose={onClose} maxWidth={720}>
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

export default function DGGoodNews({ items = [], onTrack, child, editionDate }) {
  const { theme } = useTheme();
  const [selectedNews, setSelectedNews] = useState(null);

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

        {/* Primary story - compact card. The save seal is its own button, so it
            sits beside the card button rather than inside it. */}
        {primary && (
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => { setSelectedNews(primary); onTrack?.('news', primary.headline); }}
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
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <SaveHeartSeal
                childId={child?.id}
                itemType="news"
                itemId={primary.headline}
                itemTitle={primary.headline}
                itemSubtitle={primary.location || 'Good news'}
                itemImageUrl={primaryImg}
                countryCode=""
                countryName={primary.location || ''}
                themeTags={['hope']}
                editionDate={editionDate}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Secondary stories — compact rows with thumbnail (stories 2-10) */}
        {rest.slice(0, 9).map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setSelectedNews(item); onTrack?.('news', item.headline); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', textAlign: 'left', font: 'inherit',
              padding: '0.65rem 0.85rem', minHeight: 44,
              borderRadius: theme.radiusSmall,
              cursor: 'pointer',
              marginBottom: '0.4rem',
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
        ))}
      </div>

      {/* News Modal */}
      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </section>
  );
}
