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
import { useTheme } from '@/components/theme/ThemeContext';
import DGModal from '@/components/dailygold/DGModal';
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
function BodyPending({ theme }) {
  return (
    <p style={{ fontFamily: theme.fontBody, fontStyle: 'italic', fontSize: '0.85rem', color: theme.textMuted, margin: 0 }}>
      Opening the treasure&hellip;
    </p>
  );
}

/** The gentle truth when the source is gone: the snapshot is the treasure. */
function BodyMissing({ item, theme }) {
  return (
    <>
      {item.item_subtitle && (
        <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '1rem', color: theme.textBody, margin: '0 0 1rem', lineHeight: 1.7 }}>
          {item.item_subtitle}
        </p>
      )}
      <p style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.85rem', color: theme.textMuted, margin: 0, lineHeight: 1.8 }}>
        This keepsake is yours from the day you saved it.
      </p>
    </>
  );
}

function Hero({ imageUrl, aspectRatio, fallbackMark, theme, children }) {
  return (
    <div style={{ position: 'relative', background: theme.bgSoft }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{ display: 'block', width: '100%', aspectRatio, objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio,
          background: `linear-gradient(135deg, ${theme.bgSoft} 0%, ${theme.bgPrimary} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span aria-hidden="true" style={{ fontSize: '4rem', opacity: 0.2 }}>{fallbackMark}</span>
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${theme.bgCard} 100%)` }} />
      {children}
    </div>
  );
}

/** "Kept from" line + the deliberate way back to the full day. */
function KeepsakeFoot({ item, theme }) {
  const dateLabel = formatEditionDate(item.edition_date);
  if (!dateLabel) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1rem', flexWrap: 'wrap',
      marginTop: '1.75rem', paddingTop: '1rem',
      borderTop: `1px solid ${theme.accentGold}25`,
    }}>
      <p style={{
        fontFamily: theme.fontBody, fontSize: '0.62rem', letterSpacing: '0.14em',
        textTransform: 'uppercase', color: theme.textMuted, margin: 0,
      }}>
        Kept from {dateLabel}
      </p>
      <Link
        href={`/daily-gold-edition?date=${item.edition_date}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          minHeight: 44, padding: '0 1rem', borderRadius: 22,
          background: `${theme.accentGold}26`, border: `1px solid ${theme.accentGold}40`,
          fontFamily: theme.fontBody, fontSize: '0.75rem', color: theme.textBody,
          textDecoration: 'none',
        }}
      >
        Open this day&rsquo;s edition <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}

/** Good news: the reader's NewsModal — hero, headline, location, story. */
function NewsBody({ item, detail, loading, theme }) {
  return (
    <>
      <Hero imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/9" fallbackMark="✨" theme={theme} />
      <div style={{ padding: '1.5rem 2rem 2.5rem' }}>
        <h2 style={{ fontFamily: theme.fontHeadline, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: theme.textHeadline, margin: '0 0 1rem', lineHeight: 1.2 }}>
          {detail?.headline ?? item.item_title}
        </h2>
        {(detail?.location ?? item.country_name) && (
          <p style={{ fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.accentSage, margin: '0 0 1.5rem' }}>
            <span aria-hidden="true">📍</span> {detail?.location ?? item.country_name}
          </p>
        )}
        <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9 }}>
          {detail?.description
            ? <Paragraphs text={detail.description} />
            : loading ? <BodyPending theme={theme} /> : <BodyMissing item={item} theme={theme} />}
        </div>
        <KeepsakeFoot item={item} theme={theme} />
      </div>
    </>
  );
}

/** Moments (On This Day + Greatest): the reader's MomentModal. */
function MomentBody({ item, detail, loading, theme }) {
  const year = detail?.year ?? item.item_subtitle;
  return (
    <>
      <Hero imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/10" fallbackMark="✦" theme={theme}>
        {detail?.rank != null && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            width: 34, height: 34, borderRadius: '50%',
            background: theme.accentGold,
            boxShadow: theme.shadowSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: theme.fontBody, fontSize: '0.8rem', fontWeight: 700, color: theme.bgCard }}>
              {detail.rank}
            </span>
          </div>
        )}
      </Hero>
      <div style={{ padding: '1.5rem 2rem 2rem' }}>
        {year && (
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.5rem',
          }}>
            {year}{detail?.location ? ` · ${detail.location}` : ''}
          </p>
        )}
        <h2 style={{
          fontFamily: theme.fontHeadline,
          fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
          fontWeight: 700, color: theme.textHeadline,
          margin: '0 0 1.25rem', lineHeight: 1.25,
        }}>
          {detail?.headline ?? item.item_title}
        </h2>
        <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.92rem', color: theme.textBody, lineHeight: 1.9 }}>
          {detail?.story
            ? <Paragraphs text={detail.story} />
            : loading ? <BodyPending theme={theme} /> : <BodyMissing item={item} theme={theme} />}
        </div>
        <KeepsakeFoot item={item} theme={theme} />
      </div>
    </>
  );
}

/** Places: the reader's destination modal — atmosphere, then child life. */
function DestinationBody({ item, detail, loading, theme }) {
  return (
    <>
      <Hero imageUrl={detail?.image_url ?? item.item_image_url} aspectRatio="16/9" fallbackMark="🌍" theme={theme}>
        <p style={{
          position: 'absolute', bottom: '1rem', left: 'clamp(1.25rem, 4vw, 2rem)', right: 'clamp(1.25rem, 4vw, 2rem)',
          fontFamily: theme.fontBody, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: theme.accentGold, margin: 0,
        }}>
          {detail?.continent ? `${detail.continent} · ` : ''}{detail?.name ?? item.item_title}
        </p>
      </Hero>
      <div style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
        {detail?.atmosphere && (
          <p style={{ fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '1.15rem', color: theme.textBody, lineHeight: 1.85, margin: '0 0 1.5rem', borderLeft: `3px solid ${theme.accentGold}40`, paddingLeft: '1rem' }}>
            {detail.atmosphere}
          </p>
        )}
        <div style={{ fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem', color: theme.textBody, lineHeight: 1.9 }}>
          {detail?.story
            ? <Paragraphs text={detail.story} />
            : detail?.atmosphere
              ? null
              : loading ? <BodyPending theme={theme} /> : <BodyMissing item={item} theme={theme} />}
        </div>
        <KeepsakeFoot item={item} theme={theme} />
      </div>
    </>
  );
}

/** Little treasures: the token, writ large — plus a phrase's translation. */
function TokenBody({ item, detail, loading, theme }) {
  const meta = TOKEN_META[item.item_type] ?? { emoji: '✦', label: 'Treasure' };
  return (
    <div style={{ padding: '2.5rem 2rem 2rem', textAlign: 'center' }}>
      <div aria-hidden="true" style={{
        width: 84, height: 84, borderRadius: '50%', margin: '0 auto 1.25rem',
        background: `${theme.accentGold}1F`, border: `1px solid ${theme.accentGold}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem',
      }}>
        {meta.emoji}
      </div>
      <p style={{
        fontFamily: theme.fontBody, fontSize: '0.62rem', letterSpacing: '0.22em',
        textTransform: 'uppercase', color: theme.accentGold, margin: '0 0 0.75rem',
      }}>
        {meta.label}{detail?.language ? ` · ${detail.language}` : ''}{item.country_name ? ` · ${item.country_name}` : ''}
      </p>
      <h2 style={{
        fontFamily: theme.fontHeadline, fontStyle: 'italic',
        fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 600,
        color: theme.textHeadline, margin: 0, lineHeight: 1.4,
      }}>
        {item.item_title}
      </h2>
      {detail?.translation && (
        <p style={{
          fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.95rem',
          color: theme.textBody, margin: '0.9rem 0 0', lineHeight: 1.8,
        }}>
          &ldquo;{detail.translation}&rdquo;
        </p>
      )}
      {!detail && loading && item.item_type === 'phrase' && (
        <div style={{ marginTop: '0.9rem' }}><BodyPending theme={theme} /></div>
      )}
      <div style={{ textAlign: 'left' }}>
        <KeepsakeFoot item={item} theme={theme} />
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
  const { theme } = useTheme();
  const Body = BODIES[item.item_type] ?? TokenBody;
  const wide = item.item_type === 'destination';
  return (
    <DGModal label={LABELS[item.item_type] ?? 'Treasure'} onClose={onClose} maxWidth={wide ? 800 : 720}>
      <Body item={item} detail={detail} loading={loading} theme={theme} />
    </DGModal>
  );
}
