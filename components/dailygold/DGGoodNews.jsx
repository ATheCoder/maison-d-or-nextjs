'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { base44 } from '@/api/base44Client';
import SaveHeartSeal from '@/components/dailygold/SaveHeartSeal';

const C = {
  midnight: '#0F1B2E',
  navy: '#162544',
  gold: '#D4AF37',
  sand: '#EADCC2',
  paper: '#F6F1E6',
  ivory: '#FAF7F2',
  sage: '#7F8F7C',
  terra: '#C46D46',
};

function NewsCard({ item, index, onTrack, onClick, child, editionDate }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const hasImage = item.image_url;

  useEffect(() => {
    if (!child || !child.id) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await base44.entities.SavedItem.filter({ child_id: child.id, item_type: 'news' }, '-saved_at', 50);
        if (!cancelled) setSavedItems(items);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [child?.id]);

  const savedItem = savedItems.find(s => s.item_id === item.headline);
  const isSaved = !!savedItem;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onTrack?.('news', item.headline); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.bgCard,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${theme.accentGold}${hovered ? '40' : '12'}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? theme.shadowDeep : theme.shadow,
        cursor: 'pointer',
      }}
    >
      {/* Image or fallback gradient */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        {hasImage ? (
          <img
            src={item.image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 30% 20%, ${theme.accentGold}15 0%, transparent 60%)`,
            }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard}DD 100%)` }} />
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
        <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.1rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.75rem', lineHeight: 1.3 }}>
          {item.headline}
        </h3>
        <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.85rem', color: theme.textBody, margin: 0, lineHeight: 1.75 }}>
          {item.description}
        </p>
      </div>
    </div>
  );
}

function NewsModal({ item, onClose }) {
  const { theme } = useTheme();

  // Lock body scroll when modal is open - MUST be before any early returns
  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [item]);

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: theme.bgOverlay,
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 720, width: '100%',
          background: theme.bgCard,
          borderRadius: theme.radius,
          border: `1px solid ${theme.accentGold}25`,
          boxShadow: theme.shadowDeep,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hero image - fixed height, no scroll */}
        <div style={{ position: 'relative', height: 300, background: theme.bgSoft, flexShrink: 0 }}>
          {item.image_url ? (
            <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '4rem', opacity: 0.2 }}>✨</span>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: '50%',
              background: theme.bgCard, border: `1px solid ${theme.accentGold}40`,
              color: theme.accentGold, fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >×</button>
        </div>

        {/* Scrollable story content */}
        <div style={{ padding: '2rem 2rem 2.5rem', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: theme.textHeadline, margin: '0 0 1rem', lineHeight: 1.2 }}>
            {item.headline}
          </h2>
          
          {item.location && (
            <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 1.5rem' }}>
              📍 {item.location}
            </p>
          )}

          <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9, marginBottom: '1.5rem' }}>
            {(() => {
              if (!item.description) return <p style={{ color: theme.textMuted }}>Story content coming soon...</p>;
              return item.description.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
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
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.5rem' }}>
          Stories of hope, kindness and progress
        </p>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.6rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 1.25rem', lineHeight: 1.15 }}>
          Good News of the Day
        </h2>

        {/* Primary story - compact card */}
        {primary && (
          <div
            onClick={() => { setSelectedNews(primary); onTrack?.('news', primary.headline); }}
            style={{
              position: 'relative',
              borderRadius: 14,
              overflow: 'hidden',
              border: 'none',
              marginBottom: '1rem',
              cursor: 'pointer',
              background: 'rgba(255,248,238,0.7)',
              boxShadow: '0 2px 16px rgba(180,140,80,0.10)',
            }}
          >
            <div style={{ position: 'relative', height: 160 }}>
              {primaryImg ? (
                <img src={primaryImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)` }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgSoft} 100%)` }} />
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem', position: 'relative' }}>
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
              <h3 style={{ fontFamily: theme.fontHeadline, fontSize: '1.05rem', fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                {primary.headline}
              </h3>
              <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.82rem', color: theme.textBody, margin: 0, lineHeight: 1.7 }}>
                {(primary.description || '').split('.').slice(0, 2).join('.').trim() + '.'}
              </p>
            </div>
          </div>
        )}

        {/* Secondary stories — compact rows with thumbnail (stories 2-10) */}
        {rest.slice(0, 9).map((item, i) => (
          <div
            key={i}
            onClick={() => { setSelectedNews(item); onTrack?.('news', item.headline); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 10,
              cursor: 'pointer',
              marginBottom: '0.4rem',
              background: 'rgba(255,248,238,0.5)',
              boxShadow: '0 1px 8px rgba(180,140,80,0.07)',
            }}
          >
            {/* Thumbnail */}
            <div style={{
              width: 52, height: 52, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
              background: item.image_url ? undefined : 'rgba(201,169,110,0.18)',
            }}>
              {item.image_url
                ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>✨</div>
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