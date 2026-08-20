// @ts-nocheck — untyped .jsx from before checkJs was on; 34 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * TreasuryItemModal — a saved treasure opened in place, instead of navigating
 * the child away to the day it came from.
 *
 * Each type reuses its reader modal's layout (NewsModal, MomentModal, the
 * destination modal in DGDestination) inside the shared DGModal shell, fed by
 * `detail` from getSavedItemDetail. The snapshot renders immediately — the
 * modal never waits on the lookup — and the body text fills in when the
 * detail arrives. If the source was unpublished or deleted the detail stays
 * null and the snapshot is simply all there is, which is the treasury's
 * promise: a treasure can't be blanked from under the child.
 *
 * Every treasure with an edition date keeps a quiet "open the whole day" link
 * at the foot, so the old navigation is still one deliberate tap away.
 */
import Link from 'next/link';
import DGModal from '@/components/dailygold/DGModal';
import DGHeroImage from '@/components/dailygold/DGHeroImage';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { TOKEN_META } from '@/components/treasury/tokenMeta';

function formatEditionDate(value) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function Paragraphs({ text }) {
  return text.split('\n\n').map((para, i) => (
    <p key={i} style={{ margin: '0 0 1rem' }}>{para}</p>
  ));
}

/** Shown under the headline while the story body is being looked up. */
function BodyPending() {
  return (
    <p style={{ fontFamily: 'var(--face-sans)', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
      Opening the treasure&hellip;
    </p>
  );
}

/** The gentle truth when the source is gone: the snapshot is the treasure. */
function BodyMissing({ item }) {
  return (
    <>
      {item.item_subtitle && (
        <p style={{ fontFamily: 'var(--face-display)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 1rem', lineHeight: 1.7 }}>
          {item.item_subtitle}
        </p>
      )}
      <p style={{ fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.8 }}>
        This keepsake is yours from the day you saved it.
      </p>
    </>
  );
}

/** "Kept from" line + the deliberate way back to the full day. */
function KeepsakeFoot({ item }) {
  const dateLabel = formatEditionDate(item.edition_date);
  if (!dateLabel) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1rem', flexWrap: 'wrap',
      marginTop: '1.75rem', paddingTop: '1rem',
      borderTop: '1px solid var(--border-fine)',
    }}>
      <DGEyebrow tracking="tight" tone="faint" style={{ fontSize: '0.62rem' }}>
        Kept from {dateLabel}
      </DGEyebrow>
      <Link
        href={`/daily-gold-edition?date=${item.edition_date}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          minHeight: 44, padding: '0 1rem', borderRadius: 22,
          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          fontFamily: 'var(--face-sans)', fontSize: '0.75rem', color: 'var(--text-primary)',
          textDecoration: 'none',
        }}
      >
        Open this day&rsquo;s edition <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}

/** Good news: the reader's NewsModal — hero, headline, location, story. */
function NewsBody({ item, detail, loading }) {
  return (
    <>
      <DGHeroImage imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/9" fallbackMark="✨" />
      <div style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--face-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--accent)', margin: '0 0 1rem', lineHeight: 1.2 }}>
          {detail?.headline ?? item.item_title}
        </h2>
        {(detail?.location ?? item.country_name) && (
          <DGEyebrow tracking="tight" style={{ margin: '0 0 1.5rem' }}>
            <span aria-hidden="true">📍</span> {detail?.location ?? item.country_name}
          </DGEyebrow>
        )}
        <div style={{ fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.9 }}>
          {detail?.description
            ? <Paragraphs text={detail.description} />
            : loading ? <BodyPending /> : <BodyMissing item={item} />}
        </div>
        <KeepsakeFoot item={item} />
      </div>
    </>
  );
}

/** Moments (On This Day + Greatest): the reader's MomentModal. */
function MomentBody({ item, detail, loading }) {
  const year = detail?.year ?? item.item_subtitle;
  return (
    <>
      <DGHeroImage imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/10" fallbackMark="✦">
        {detail?.rank != null && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--face-sans)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--surface-raised)' }}>
              {detail.rank}
            </span>
          </div>
        )}
      </DGHeroImage>
      <div style={{ padding: '1.5rem 2rem 2rem' }}>
        {year && (
          <DGEyebrow tracking="wide" style={{ margin: '0 0 0.5rem' }}>
            {year}{detail?.location ? ` · ${detail.location}` : ''}
          </DGEyebrow>
        )}
        <h2 style={{
          fontFamily: 'var(--face-display)',
          fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
          fontWeight: 700, color: 'var(--accent)',
          margin: '0 0 1.25rem', lineHeight: 1.25,
        }}>
          {detail?.headline ?? item.item_title}
        </h2>
        <div style={{ fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.9 }}>
          {detail?.story
            ? <Paragraphs text={detail.story} />
            : loading ? <BodyPending /> : <BodyMissing item={item} />}
        </div>
        <KeepsakeFoot item={item} />
      </div>
    </>
  );
}

/** Places: the reader's destination modal — atmosphere, then child life. */
function DestinationBody({ item, detail, loading }) {
  return (
    <>
      <DGHeroImage imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/9" fallbackMark="🌍">
        <DGEyebrow tracking="wide" style={{
          position: 'absolute', bottom: '1rem', left: 'clamp(1.25rem, 4vw, 2rem)', right: 'clamp(1.25rem, 4vw, 2rem)',
        }}>
          {detail?.continent ? `${detail.continent} · ` : ''}{detail?.name ?? item.item_title}
        </DGEyebrow>
      </DGHeroImage>
      <div style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
        {detail?.atmosphere && (
          <p style={{ fontFamily: 'var(--face-display)', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.85, margin: '0 0 1.5rem', borderLeft: '3px solid color-mix(in srgb, var(--accent) 25%, transparent)', paddingLeft: '1rem' }}>
            {detail.atmosphere}
          </p>
        )}
        <div style={{ fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.9 }}>
          {detail?.story
            ? <Paragraphs text={detail.story} />
            : detail?.atmosphere
              ? null
              : loading ? <BodyPending /> : <BodyMissing item={item} />}
        </div>
        <KeepsakeFoot item={item} />
      </div>
    </>
  );
}

/** Little treasures: the token, writ large — plus a phrase's translation. */
function TokenBody({ item, detail, loading }) {
  const meta = TOKEN_META[item.item_type] ?? { emoji: '✦', label: 'Treasure' };
  return (
    <div style={{ padding: '2.5rem 2rem 2rem', textAlign: 'center' }}>
      <div aria-hidden="true" style={{
        width: 84, height: 84, borderRadius: '50%', margin: '0 auto 1.25rem',
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem',
      }}>
        {meta.emoji}
      </div>
      <DGEyebrow tracking="wide" style={{ fontSize: '0.62rem', margin: '0 0 0.75rem' }}>
        {meta.label}{detail?.language ? ` · ${detail.language}` : ''}{item.country_name ? ` · ${item.country_name}` : ''}
      </DGEyebrow>
      <h2 style={{
        fontFamily: 'var(--face-display)', fontStyle: 'italic',
        fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 600,
        color: 'var(--accent)', margin: 0, lineHeight: 1.4,
      }}>
        {item.item_title}
      </h2>
      {detail?.translation && (
        <p style={{
          fontFamily: 'var(--face-sans)', fontWeight: 300, fontSize: '0.95rem',
          color: 'var(--text-primary)', margin: '0.9rem 0 0', lineHeight: 1.8,
        }}>
          &ldquo;{detail.translation}&rdquo;
        </p>
      )}
      {!detail && loading && item.item_type === 'phrase' && (
        <div style={{ marginTop: '0.9rem' }}><BodyPending /></div>
      )}
      <div style={{ textAlign: 'left' }}>
        <KeepsakeFoot item={item} />
      </div>
    </div>
  );
}

const BODIES = {
  news: NewsBody,
  on_this_day: MomentBody,
  greatest_moment: MomentBody,
  destination: DestinationBody,
  taste: TokenBody,
  sound: TokenBody,
  nature: TokenBody,
  phrase: TokenBody,
};

const LABELS = {
  news: 'Good news story',
  on_this_day: 'Moment in time',
  greatest_moment: 'Greatest moment',
  destination: 'Destination',
  taste: 'Taste treasure',
  sound: 'Sound treasure',
  nature: 'Nature treasure',
  phrase: 'Phrase treasure',
};

/**
 * @param {{
 *   item: { item_type: string, item_id: string, item_title: string, item_subtitle: string|null, item_image_url: string|null, country_name: string|null, edition_date: string|null },
 *   detail: import('@/app/(dg)/treasury/actions').SavedItemDetail,
 *   loading: boolean,
 *   onClose: () => void,
 * }} props
 */
export default function TreasuryItemModal({ item, detail, loading, onClose }) {
  const Body = BODIES[item.item_type] ?? TokenBody;
  const wide = item.item_type === 'destination';
  return (
    <DGModal label={LABELS[item.item_type] ?? 'Treasure'} onClose={onClose} maxWidth={wide ? 800 : 720}>
      <Body item={item} detail={detail} loading={loading} />
    </DGModal>
  );
}
