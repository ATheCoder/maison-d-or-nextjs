'use client';
/**
 * DGGreatestMoments — Column 3
 * Top 10 greatest events that ever happened on this calendar date, across all history.
 */
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

function MomentModal({ item, onClose }) {
  const { theme } = useTheme();

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
        background: 'rgba(15,20,30,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 680, width: '100%',
          background: '#F7F2E8',
          borderRadius: 20,
          border: '1px solid rgba(201,169,110,0.3)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Hero image */}
        <div style={{ position: 'relative', height: 280, flexShrink: 0, background: '#E2D5BE' }}>
          {item.image_url ? (
            <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C8A8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', color: 'rgba(201,169,110,0.3)', fontWeight: 700 }}>
                {item.rank}
              </span>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #F7F2E8 100%)' }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(247,242,232,0.95)', border: '1px solid rgba(201,169,110,0.5)',
              color: '#8B7355', fontSize: '1.1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          {/* Rank badge */}
          <div style={{
            position: 'absolute', top: 14, left: 14,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(201,169,110,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              {item.rank}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
          <p style={{
            fontFamily: 'Lato, sans-serif', fontSize: '0.65rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#C8A96B', margin: '0 0 0.5rem',
          }}>
            {item.year}
          </p>
          <h2 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
            fontWeight: 700, color: '#241A0C',
            margin: '0 0 1.25rem', lineHeight: 1.25,
          }}>
            {item.headline}
          </h2>
          <p style={{
            fontFamily: 'Lato, sans-serif', fontWeight: 300,
            fontSize: '0.92rem', color: '#5C4A36',
            lineHeight: 1.9, margin: 0,
          }}>
            {item.story}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DGGreatestMoments({ moments = [], editionDate }) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(null);

  const dateLabel = editionDate
    ? new Date(editionDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    : 'This Day';

  if (!moments.length) {
    return (
      <section style={{ background: 'transparent' }}>
        <div style={{ marginBottom: '0.85rem' }}>
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.35rem' }}>
            Across all of history
          </p>
          <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.15 }}>
            Greatest Moments
          </h2>
        </div>
        <div style={{
          background: 'rgba(255,248,238,0.7)', borderRadius: 14,
          padding: '2rem 1.25rem', textAlign: 'center',
          boxShadow: '0 2px 16px rgba(180,140,80,0.10)',
        }}>
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.82rem', color: theme.textMuted, margin: 0 }}>
            Preparing the greatest moments…
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: 'transparent' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.85rem' }}>
        <p style={{ fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 0.35rem' }}>
          Across all of history
        </p>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: '1.4rem', fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.15 }}>
          Greatest Moments on {dateLabel}
        </h2>
      </div>

      {/* Ranked list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {moments.slice(0, 10).map((m, i) => (
          <div
            key={i}
            onClick={() => setSelected(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0.9rem',
              borderRadius: 12,
              cursor: 'pointer',
              background: 'rgba(255,248,238,0.72)',
              boxShadow: '0 1px 8px rgba(180,140,80,0.07)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(180,140,80,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(180,140,80,0.07)'; }}
          >
            {/* Rank circle */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: i === 0 ? 'rgba(201,169,110,0.9)' : 'rgba(201,169,110,0.18)',
              border: `1.5px solid rgba(201,169,110,${i === 0 ? '0.9' : '0.4'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Lato, sans-serif', fontSize: '0.68rem', fontWeight: 700,
                color: i === 0 ? '#fff' : 'rgba(201,169,110,0.9)',
              }}>
                {m.rank || i + 1}
              </span>
            </div>

            {/* Thumbnail */}
            <div style={{
              width: 46, height: 46, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
              background: m.image_url ? undefined : 'rgba(201,169,110,0.12)',
            }}>
              {m.image_url
                ? <img src={m.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.1rem', opacity: 0.35 }}>✦</span>
                  </div>
              }
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', color: 'rgba(201,169,110,0.9)',
                margin: '0 0 2px', letterSpacing: '0.08em', fontWeight: 500,
              }}>
                {m.year}
              </p>
              <p style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: '0.8rem', fontWeight: 600,
                color: theme.textHeadline,
                margin: 0, lineHeight: 1.3,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {m.headline}
              </p>
            </div>

            {/* Chevron */}
            <span style={{ color: 'rgba(201,169,110,0.5)', fontSize: '0.8rem', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>

      {selected && <MomentModal item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}