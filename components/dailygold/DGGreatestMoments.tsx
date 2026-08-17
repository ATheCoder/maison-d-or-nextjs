'use client';
/**
 * DGGreatestMoments — Column 3
 * Top 10 greatest events that ever happened on this calendar date, across all history.
 *
 * `moments` is `getGreatestMomentsForDate`'s return value, unmapped — the record
 * type is imported from the query module rather than restated, so a column
 * renamed in the query is a compile error here instead of an undefined at
 * render. The import is type-only and erased: nothing of that `server-only`
 * module reaches this client component or the design-sync bundle.
 */
import { useState } from 'react';
import DGModal from '@/components/dailygold/DGModal';
import DGCard from '@/components/dailygold/DGCard';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import DGSectionHeader, { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import type { GreatestMomentRecord } from '@/app/(dg)/daily-gold-edition/queries';

function MomentModal({ item, onClose }: { item: GreatestMomentRecord; onClose: () => void }) {
  return (
    <DGModal
      label="Greatest moment"
      onClose={onClose}
      maxWidth={680}
      /* This section reported nothing at all until now — the whole reason
         tracking moved off threaded callback props and into context. */
      tracking={{
        contentType: 'moment',
        contentId: String(item.id),
        label: item.headline,
        section: 'greatest_moments',
      }}
    >
      {/* Hero image — a picture-less moment shows its rank instead of a mark. */}
      <DGHeroImage
        imageUrl={item.image_url}
        aspectRatio="16/10"
        scrimFrom={40}
        fallback={
          <span aria-hidden="true" style={{ fontFamily: 'var(--face-display)', fontSize: '3rem', color: 'color-mix(in srgb, var(--accent) 30%, transparent)', fontWeight: 700 }}>
            {item.rank}
          </span>
        }
      >
        {/* Rank badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14,
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="type-body-ui" style={{ color: 'var(--surface-raised)' }}>
            {item.rank}
          </span>
        </div>
      </DGHeroImage>

      {/* Content */}
      <div style={{ padding: '1.5rem 2rem 2rem' }}>
        <DGEyebrow tracking="wide" color="var(--accent-readable)" style={{ margin: '0 0 0.5rem' }}>
          {item.year}
        </DGEyebrow>
        <h2 className="type-display-section" style={{ color: 'var(--accent)', margin: '0 0 1.25rem' }}>
          {item.headline}
        </h2>
        <p className="type-body" style={{ color: 'var(--text-primary)', margin: 0 }}>
          {item.story}
        </p>
      </div>
    </DGModal>
  );
}

export default function DGGreatestMoments({
  moments = [],
  savedSet = null,
  editionDate,
}: {
  moments?: GreatestMomentRecord[];
  /** The reader's saved treasury keys, or null when there is no reader. */
  savedSet?: Set<string> | null;
  editionDate?: string;
}) {
  const [selected, setSelected] = useState<GreatestMomentRecord | null>(null);

  const dateLabel = editionDate
    ? new Date(editionDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    : 'This Day';

  if (!moments.length) {
    return (
      <section style={{ background: 'transparent' }}>
        <DGSectionHeader eyebrow="Across all of history" title="Greatest Moments" />
        <DGCard size="small" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
          <p className="type-caption" style={{ margin: 0 }}>
            Preparing the greatest moments…
          </p>
        </DGCard>
      </section>
    );
  }

  return (
    <section style={{ background: 'transparent' }}>
      {/* Header */}
      <DGSectionHeader eyebrow="Across all of history" title={`Greatest Moments on ${dateLabel}`} />

      {/* Ranked list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {moments.slice(0, 10).map((m, i) => (
          /* The row is a button, so its heart has to be a sibling floating over
             the right edge — with the row padded so the chevron steps aside
             rather than sitting under the tap target. */
          <div key={m.id ?? i} style={{ position: 'relative' }}>
            <DGCard
              as="button"
              size="small"
              type="button"
              onClick={() => setSelected(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                width: '100%', textAlign: 'left', font: 'inherit',
                padding: '0.7rem 0.9rem', minHeight: 44,
                paddingRight: savedSet ? '3.1rem' : '0.9rem',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              /* The lift is this row's own, not the shell's — DGCard only
                 states the resting shadow it returns to. */
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-raised)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
            >
              {/* Rank circle */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 18%, transparent)',
                border: `1.5px solid ${i === 0 ? 'color-mix(in srgb, var(--accent) 90%, transparent)' : 'color-mix(in srgb, var(--accent) 40%, transparent)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="type-body-ui" style={{
                  color: i === 0 ? 'var(--surface-raised)' : 'var(--accent-readable)',
                }}>
                  {m.rank || i + 1}
                </span>
              </div>

              {/* Thumbnail */}
              <div style={{
                width: 46, height: 46, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: m.image_url ? undefined : 'color-mix(in srgb, var(--accent) 12%, transparent)',
              }}>
                {m.image_url
                  ? <img src={m.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.1rem', opacity: 0.35 }}>✦</span>
                    </div>
                }
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="type-caption" style={{ color: 'var(--accent-readable)', margin: '0 0 2px' }}>
                  {m.year}
                </p>
                <p className="type-body-ui font-display" style={{
                  color: 'var(--accent-readable)',
                  margin: 0,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {m.headline}
                </p>
              </div>

              {/* Chevron */}
              <span aria-hidden="true" style={{ color: 'color-mix(in srgb, var(--accent) 50%, transparent)', fontSize: '0.8rem', flexShrink: 0 }}>›</span>
            </DGCard>
            {savedSet && (
              <div style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', zIndex: 10 }}>
                <TreasuryHeart
                  itemType="greatest_moment"
                  itemId={String(m.id)}
                  itemTitle={m.headline}
                  itemSubtitle={String(m.year)}
                  itemImageUrl={m.image_url}
                  editionDate={editionDate}
                  initialSaved={savedSet.has(`greatest_moment:${m.id}`)}
                  size="sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && <MomentModal item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
