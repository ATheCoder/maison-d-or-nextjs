'use client';
/**
 * DGGreatestMoments — the ledger: the ten greatest things that ever happened
 * on this calendar date, across all of history.
 *
 * Shown twice, on purpose. Rank one hangs as a work with its story, and all
 * ten stand beside it as a slim index of rank / year / headline / heart. A
 * reader gets both the invitation and the contents page without opening
 * anything — which is what the old design's ten identical thumbnail rows never
 * managed, because a list of ten equals is a list with no way in.
 *
 * `moments` is `getGreatestMomentsForDate`'s return value, unmapped — the
 * record type is imported from the query module rather than restated, so a
 * column renamed in the query is a compile error here instead of an undefined
 * at render. The import is type-only and erased: nothing of that `server-only`
 * module reaches this client component or the design-sync bundle.
 */
import { useState } from 'react';
import DGModal from '@/components/dailygold/DGModal';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import Wall from '@/components/dailygold/gallery/Wall';
import Work from '@/components/dailygold/gallery/Work';
import Label, { LabelAction } from '@/components/dailygold/gallery/Label';
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
        <h2 className="type-display-section" style={{ color: 'var(--accent-readable)', margin: '0 0 1.25rem' }}>
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
      <Wall eyebrow="Across all of history" title="Greatest Moments">
        <div className="gl-year-empty" style={{ padding: '0 var(--gut)' }}>
          <p>The ledger for this date is still being written.</p>
        </div>
      </Wall>
    );
  }

  const rows = moments.slice(0, 10);
  const lead = rows[0];

  return (
    <Wall eyebrow="Across all of history" title={`Greatest Moments on ${dateLabel}`}>
      <div className="gl-ledger">
        {/* Rank one, hung */}
        <div>
          <Work
            /* 4:3, not the mockup's 4:5. Every moment painting in the corpus
               is landscape 3:2, and an upright frame throws away a third of
               each one's width. */
            aspect="4 / 3"
            imageUrl={lead.image_url}
            onClick={() => setSelected(lead)}
            ariaLabel={`Open: ${lead.headline}`}
            heart={savedSet ? (
              <TreasuryHeart
                itemType="greatest_moment"
                itemId={String(lead.id)}
                itemTitle={lead.headline}
                itemSubtitle={String(lead.year)}
                itemImageUrl={lead.image_url}
                editionDate={editionDate}
                initialSaved={savedSet.has(`greatest_moment:${lead.id}`)}
                onImage
              />
            ) : undefined}
          />
          <Label
            className="gl-year-lab"
            size="lead"
            title={lead.headline}
            meta={`${lead.year} · rank one of ${rows.length}`}
            body={lead.story}
            action={<LabelAction onClick={() => setSelected(lead)}>Open the moment ›</LabelAction>}
          />
        </div>

        {/* All ten, as the index. The row is a button, so its heart is a
            sibling in the row's own last column rather than a control nested
            inside another control. */}
        <div className="gl-list">
          {rows.map((m, i) => (
            <div key={m.id ?? i} className="gl-row-wrap">
              <button
                type="button"
                className={`gl-row${i === 0 ? ' gl-row-1' : ''}`}
                onClick={() => setSelected(m)}
              >
                <span className="n">{String(m.rank || i + 1).padStart(2, '0')}</span>
                <span className="y">{m.year}</span>
                <span className="t">{m.headline}</span>
                <span className="h" />
              </button>
              {savedSet && (
                <span className="gl-row-heart">
                  <TreasuryHeart
                    itemType="greatest_moment"
                    itemId={String(m.id)}
                    itemTitle={m.headline}
                    itemSubtitle={String(m.year)}
                    itemImageUrl={m.image_url}
                    editionDate={editionDate}
                    initialSaved={savedSet.has(`greatest_moment:${m.id}`)}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {selected && <MomentModal item={selected} onClose={() => setSelected(null)} />}
    </Wall>
  );
}
