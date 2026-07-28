'use client';
/**
 * TreasuryView — the /treasury page body: everything the child has hearted,
 * arranged as a small personal museum.
 *
 * Each section displays its treasures in the physical form a museum would give
 * them — People as perforated portrait stamps, Places as fanned postcards,
 * Good News as press clippings, Moments as year-medallion plaques, and the
 * small daily wonders as pocket tokens — separated by wax-seal dividers. The
 * forms come from the legacy Treasury page; the colours all come from the
 * active theme so every palette (Night Mode included) keeps working.
 *
 * A big collection would otherwise make the page endless, so each section is a
 * capped shelf: the newest treasures sit out on display and the rest live in a
 * tappable pile at the end of the shelf. Opening the pile deals the folded
 * cards out to their grid spots (a FLIP animation from the pile's coordinates);
 * tucking them back reverses it. The pile is a real button — tap operates it
 * everywhere, hover only adds a fan-out tease where a pointer exists — and
 * every animation collapses to instant show/hide under prefers-reduced-motion.
 *
 * Server-fed: the route resolves the child and passes the saved rows down, so
 * this component fetches nothing on load (the hearts don't either — each one
 * is told it is saved). Every card renders from the snapshot stored at save
 * time, so a later admin edit or unpublish can't blank a treasure.
 *
 * Opening a treasure opens its reader modal in place — the child is never
 * bounced to the day it came from. The card shows the snapshot immediately and
 * getSavedItemDetail fills in the story body; person stamps are the exception
 * and still travel to their Golden Story page, which has no modal form.
 *
 * Unsaving leaves the card on screen with a hollow heart rather than yanking
 * it out from under the tap — a mis-tap is one tap away from undone, and the
 * card is gone at the next visit.
 */
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import TreasuryItemModal from '@/components/treasury/TreasuryItemModal';
import { TOKEN_META } from '@/components/treasury/tokenMeta';
import { getSavedItemDetail } from '@/app/treasury/actions';
import { useTheme } from '@/components/theme/ThemeContext';

/**
 * Fixed display order — the museum reads the same every visit regardless of
 * what was saved last. Types the enum allows but no section claims would be
 * invisible, so the list below must cover all of them.
 *
 * `cap` is how many treasures sit out on the shelf before the rest fold into
 * the pile — sized so shelf + pile is roughly one row at the page's max width.
 * `noun` is what the pile and its tuck-away button call the folded cards.
 */
const SECTIONS = [
  { key: 'people', title: 'Hero Stamps', subtitle: 'People I admire', types: ['person'], cap: 5, noun: 'stamps' },
  { key: 'places', title: 'Travel Postcards', subtitle: 'Places I dream about', types: ['destination'], cap: 3, noun: 'postcards' },
  { key: 'news', title: 'Good News Clippings', subtitle: 'Stories that made me smile', types: ['news'], cap: 3, noun: 'clippings' },
  { key: 'moments', title: 'Moments in Time', subtitle: 'History I keep', types: ['on_this_day', 'greatest_moment'], cap: 5, noun: 'moments' },
  { key: 'little', title: 'Little Treasures', subtitle: 'Tastes, sounds, wonders and words', types: ['taste', 'sound', 'nature', 'phrase'], cap: 7, noun: 'treasures' },
];

/**
 * A person's Golden Story is its own route; every other treasure opens in the
 * modal, so this is the only href left.
 */
function itemHref(item) {
  if (item.item_type === 'person') return `/stories/${item.item_id}`;
  return null;
}

function formatEditionDate(value) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Deterministic per-index tilt, cycling −2.3°…+2.3°. The legacy page used
 * Math.random(), which a server-rendered tree can't (the client re-roll would
 * mismatch hydration); an index cycle reads just as hand-placed.
 */
const tilt = (i) => (((i * 3) % 5) - 2) * 1.15;

/**
 * Checked at animation time, not render time — the server has no media
 * queries, and the CSS block carries the same guard for everything static.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Gold sparkle burst at the moment a pile opens. Appended to <body> at fixed
 * coordinates rather than inside the pile, because the pile itself leaves the
 * layout in the same frame and would take the sparks with it.
 */
function spawnSparkles(x, y) {
  const offsets = [[-46, -34], [42, -40], [-20, -52], [26, -18], [-52, 6], [52, -8], [0, -58], [14, -44]];
  offsets.forEach(([sx, sy], i) => {
    const sp = document.createElement('span');
    sp.className = 'tv-spark';
    sp.setAttribute('aria-hidden', 'true');
    sp.textContent = i % 2 ? '✦' : '✧';
    sp.style.left = `${x}px`;
    sp.style.top = `${y}px`;
    sp.style.setProperty('--sx', `${sx}px`);
    sp.style.setProperty('--sy', `${sy}px`);
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 750);
  });
}

/* ── Ornaments ─────────────────────────────────────────────────────────── */

/** Eight-rayed sun, the Maison's little astronomical flourish. */
function Sun({ theme, size = 20 }) {
  const rad = (deg) => (deg * Math.PI) / 180;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="5.5" stroke={theme.accentGold} strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2.5" fill={theme.accentGold} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1={12 + 8 * Math.cos(rad(a))} y1={12 + 8 * Math.sin(rad(a))}
          x2={12 + 10.5 * Math.cos(rad(a))} y2={12 + 10.5 * Math.sin(rad(a))}
          stroke={theme.accentGold} strokeWidth="1.1"
        />
      ))}
    </svg>
  );
}

/**
 * Wax-seal section divider. The wax stays literally red in every theme — it is
 * a physical object, like the gold of a coin — only the hairlines follow the
 * palette. The seal wobbles when its section's pile is opened.
 */
function WaxSealDivider({ theme, title, subtitle, count, wobble }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 0 1.4rem' }}>
      <div aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.accentGold}55)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div aria-hidden="true" className={wobble ? 'tv-wobble' : undefined} style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 35% 30%, #8B2020 0%, #6B1515 60%, #4A0F0F 100%)',
          border: '2px solid #A83030', boxShadow: '0 2px 8px rgba(100,20,20,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'rgba(255,220,180,0.75)', fontSize: '0.7rem', fontFamily: theme.fontHeadline }}>M</span>
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{
            fontFamily: theme.fontHeadline, fontSize: '1.1rem', fontWeight: 600,
            color: theme.textHeadline, margin: 0, lineHeight: 1.2,
          }}>
            {title}
          </h2>
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.22em',
            textTransform: 'uppercase', color: theme.textMuted, margin: '2px 0 0',
          }}>
            {subtitle} · {count}
          </p>
        </div>
      </div>
      <div aria-hidden="true" style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${theme.accentGold}55)` }} />
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────── */

/** The unsave control every treasure carries, always a sibling of its link. */
function HeartCorner({ item, style }) {
  return (
    <div style={{ position: 'absolute', zIndex: 10, ...style }}>
      {/* The pulse-on-hover span is separate from the positioned div so the
          animation's transform can't fight a translateY(-50%) placement. */}
      <span className="tv-heartc" style={{ display: 'inline-flex' }}>
        <TreasuryHeart
          itemType={item.item_type}
          itemId={item.item_id}
          itemTitle={item.item_title}
          itemSubtitle={item.item_subtitle}
          itemImageUrl={item.item_image_url}
          countryCode={item.country_code}
          countryName={item.country_name}
          editionDate={item.edition_date}
          initialSaved
          size="sm"
        />
      </span>
    </div>
  );
}

/** Gold-tinted stand-in plate for a snapshot saved without an image. */
function EmptyPlate({ theme, mark = '✦' }) {
  return (
    <div aria-hidden="true" style={{
      width: '100%', height: '100%',
      background: `${theme.accentGold}1F`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: theme.fontHeadline, fontSize: '1.6rem', color: `${theme.accentGold}66` }}>{mark}</span>
    </div>
  );
}

/**
 * Wraps a card body in its opener: a button when the treasure opens a modal
 * (`onOpen`), a link when it travels to its own page (person stamps), a plain
 * div when it does neither. The heart is rendered by the caller as a sibling:
 * nesting a button in an anchor — or in another button — swallows the tap and
 * is invalid markup.
 */
function CardSurface({ href, onOpen, style, children }) {
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="tv-card"
        /* Buttons shrink-to-fit even at display:block, so the full-width
           cards (clippings, plaques) need the 100% that anchors get for
           free; fixed-width cards override it from their own style. */
        style={{ font: 'inherit', textAlign: 'left', margin: 0, width: '100%', cursor: 'pointer', ...style }}
      >
        {children}
      </button>
    );
  }
  if (!href) return <div className="tv-card" style={style}>{children}</div>;
  return <Link href={href} className="tv-card" style={style}>{children}</Link>;
}

/* ── Card treatments (one treasure each; the Shelf owns wrapper + heart) ── */

/** People: a perforated portrait stamp. */
function StampCard({ theme, item, onOpen }) {
  return (
    <CardSurface
      href={itemHref(item)}
      onOpen={onOpen}
      style={{
        display: 'block', width: 138, textDecoration: 'none',
        background: theme.bgCard,
        border: `2px dashed ${theme.accentGold}66`,
        borderRadius: 4, padding: 6,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ aspectRatio: '5/6', overflow: 'hidden', background: `${theme.accentGold}14` }}>
        {item.item_image_url
          ? <img src={item.item_image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          : <EmptyPlate theme={theme} mark="✶" />}
      </div>
      <div style={{ padding: '0.5rem 0.15rem 0.25rem', textAlign: 'center' }}>
        <p style={{
          fontFamily: theme.fontHeadline, fontSize: '0.82rem', fontWeight: 600,
          color: theme.textHeadline, margin: 0, lineHeight: 1.25,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {item.item_title}
        </p>
        {item.item_subtitle && (
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.58rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: theme.textMuted, margin: '3px 0 0',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {item.item_subtitle}
          </p>
        )}
      </div>
    </CardSurface>
  );
}

/** Places: a postcard with a paper mat. */
function PostcardCard({ theme, item, onOpen }) {
  const dateLabel = formatEditionDate(item.edition_date);
  return (
    <CardSurface
      href={itemHref(item)}
      onOpen={onOpen}
      style={{
        display: 'block', width: 248, textDecoration: 'none',
        background: theme.bgCard,
        border: `1px solid ${theme.accentGold}40`,
        borderRadius: 6, padding: 8,
        boxShadow: theme.shadowDeep,
      }}
    >
      <div style={{ aspectRatio: '3/2', overflow: 'hidden', borderRadius: 2, background: `${theme.accentGold}14` }}>
        {item.item_image_url
          ? <img src={item.item_image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <EmptyPlate theme={theme} mark="✉" />}
      </div>
      <div style={{ padding: '0.6rem 0.3rem 0.3rem' }}>
        <p style={{
          fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '1rem',
          fontWeight: 600, color: theme.textHeadline, margin: 0, lineHeight: 1.25,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {item.item_title}
        </p>
        {(item.country_name || dateLabel) && (
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.6rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: theme.textMuted, margin: '4px 0 0',
          }}>
            {[item.country_name, dateLabel].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </CardSurface>
  );
}

/** Good news: a press clipping — eyebrow rule, serif headline, dateline. */
function ClippingCard({ theme, item, onOpen }) {
  const dateLabel = formatEditionDate(item.edition_date);
  return (
    <CardSurface
      href={itemHref(item)}
      onOpen={onOpen}
      style={{
        display: 'block', textDecoration: 'none',
        background: theme.bgCard,
        border: `1px solid ${theme.accentGold}30`,
        boxShadow: `inset 0 0 0 3px ${theme.bgCard}, inset 0 0 0 4px ${theme.accentGold}30, ${theme.shadowSoft}`,
        padding: '0.9rem 1rem 1rem',
      }}
    >
      <p style={{
        fontFamily: theme.fontBody, fontSize: '0.58rem', letterSpacing: '0.2em',
        textTransform: 'uppercase', color: theme.accentGold,
        margin: '0 0 0.55rem', paddingBottom: '0.45rem', paddingRight: '2.2rem',
        borderBottom: `1px solid ${theme.accentGold}30`,
      }}>
        Good News{dateLabel ? ` · ${dateLabel}` : ''}
      </p>
      {item.item_image_url && (
        <div style={{ aspectRatio: '16/9', overflow: 'hidden', marginBottom: '0.6rem', border: `1px solid ${theme.accentGold}25` }}>
          <img src={item.item_image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <h3 style={{
        fontFamily: theme.fontHeadline, fontSize: '0.95rem', fontWeight: 600,
        color: theme.textHeadline, margin: 0, lineHeight: 1.35,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
      }}>
        {item.item_title}
      </h3>
      {item.item_subtitle && (
        <p style={{
          fontFamily: theme.fontBody, fontStyle: 'italic', fontSize: '0.72rem',
          color: theme.textMuted, margin: '0.4rem 0 0',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {item.item_subtitle}
        </p>
      )}
    </CardSurface>
  );
}

/** Moments: a museum plaque led by a minted year medallion. */
function PlaqueCard({ theme, item, index, onOpen }) {
  const dateLabel = formatEditionDate(item.edition_date);
  return (
    <CardSurface
      href={itemHref(item)}
      onOpen={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.9rem', height: '100%',
        textDecoration: 'none',
        background: theme.bgCard,
        border: `1px solid ${theme.accentGold}25`,
        borderRadius: theme.radiusSmall,
        boxShadow: theme.shadowSoft,
        padding: '0.85rem 3rem 0.85rem 0.9rem',
      }}
    >
      {/* The gold of a coin, like the red of wax, stays literal in
          every theme. item_subtitle holds the moment's year. The glint
          delay is staggered so a wall of plaques doesn't flash in unison. */}
      <div aria-hidden="true" className="tv-coin" style={{
        width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
        background: 'radial-gradient(circle at 35% 30%, #FFE08A 0%, #C8A96B 55%, #A8893A 100%)',
        border: '1.5px solid #A8893A',
        boxShadow: '0 2px 8px rgba(200,169,107,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        '--gd': `${(index % 7) * 0.8}s`,
      }}>
        <span style={{ fontFamily: theme.fontHeadline, fontSize: '0.82rem', fontWeight: 700, color: '#3D2E14' }}>
          {item.item_subtitle || '✦'}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{
          fontFamily: theme.fontHeadline, fontSize: '0.92rem', fontWeight: 600,
          color: theme.textHeadline, margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.item_title}
        </h3>
        {dateLabel && (
          <p style={{
            fontFamily: theme.fontBody, fontSize: '0.62rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: theme.textMuted, margin: '3px 0 0',
          }}>
            Kept from {dateLabel}
          </p>
        )}
      </div>
    </CardSurface>
  );
}

/** Little treasures: a pocket token for the day's tastes, sounds and words. */
function TokenCard({ theme, item, onOpen }) {
  const meta = TOKEN_META[item.item_type] ?? { emoji: '✦', label: 'Treasure' };
  return (
    <CardSurface
      href={itemHref(item)}
      onOpen={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.7rem',
        width: 218, textDecoration: 'none',
        background: theme.bgCard,
        border: `1px solid ${theme.accentGold}25`,
        borderRadius: 14,
        boxShadow: theme.shadowSoft,
        padding: '0.7rem 2.9rem 0.7rem 0.75rem',
      }}
    >
      <div aria-hidden="true" className="tv-disc" style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `${theme.accentGold}1F`, border: `1px solid ${theme.accentGold}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem',
      }}>
        {meta.emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: theme.fontHeadline, fontStyle: 'italic', fontSize: '0.88rem',
          color: theme.textHeadline, margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.item_title}
        </p>
        <p style={{
          fontFamily: theme.fontBody, fontSize: '0.55rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: theme.textMuted, margin: '3px 0 0',
        }}>
          {meta.label}
        </p>
      </div>
    </CardSurface>
  );
}

/**
 * How each section lays out its shelf and dresses its pile. The pile borrows
 * its section's paper — border, radius, shadow, footprint — so the closed
 * stack reads as "more of these", not as generic chrome. `tiltAt` is only set
 * where the cards hang hand-placed; horizontal rows stay straight.
 */
const SECTION_UI = {
  people: {
    Card: StampCard,
    grid: { display: 'flex', flexWrap: 'wrap', gap: '1.3rem', justifyContent: 'center' },
    tiltAt: (i) => tilt(i),
    heartStyle: { top: 8, right: 8 },
    pileSize: { width: 138, height: 200 },
    pilePaper: (theme) => ({ border: `2px dashed ${theme.accentGold}66`, borderRadius: 4, boxShadow: theme.shadow }),
  },
  places: {
    Card: PostcardCard,
    grid: { display: 'flex', flexWrap: 'wrap', gap: '1.6rem 1.8rem', justifyContent: 'center' },
    tiltAt: (i) => tilt(i + 1),
    heartStyle: { top: 14, right: 14 },
    pileSize: { width: 248, height: 212 },
    pilePaper: (theme) => ({ border: `1px solid ${theme.accentGold}40`, borderRadius: 6, boxShadow: theme.shadowDeep }),
  },
  news: {
    Card: ClippingCard,
    grid: { display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'flex-start' },
    wrapStyle: { width: 'min(100%, 262px)' },
    heartStyle: { top: 6, right: 6 },
    pileSize: { width: 'min(100%, 262px)', height: 170 },
    pilePaper: (theme) => ({
      border: `1px solid ${theme.accentGold}30`,
      boxShadow: `inset 0 0 0 3px ${theme.bgCard}, inset 0 0 0 4px ${theme.accentGold}30, ${theme.shadowSoft}`,
    }),
  },
  moments: {
    Card: PlaqueCard,
    grid: { display: 'flex', flexWrap: 'wrap', gap: '0.9rem', justifyContent: 'center' },
    wrapStyle: { width: 'min(100%, 360px)' },
    heartStyle: { top: '50%', right: 6, transform: 'translateY(-50%)' },
    horizontal: true,
    pileSize: { width: 'min(100%, 360px)', height: 88 },
    pilePaper: (theme) => ({ border: `1px solid ${theme.accentGold}25`, borderRadius: theme.radiusSmall, boxShadow: theme.shadowSoft }),
  },
  little: {
    Card: TokenCard,
    grid: { display: 'flex', flexWrap: 'wrap', gap: '0.9rem', justifyContent: 'center' },
    heartStyle: { top: '50%', right: 4, transform: 'translateY(-50%)' },
    horizontal: true,
    pileSize: { width: 218, height: 76 },
    pilePaper: (theme) => ({ border: `1px solid ${theme.accentGold}25`, borderRadius: 14, boxShadow: theme.shadowSoft }),
  },
};

/* ── The pile ──────────────────────────────────────────────────────────── */

/**
 * The folded remainder of a section, drawn as a physical stack of its own
 * paper: three offset layers under a face carrying the count. It's the
 * expander — tap works everywhere; the hover fan and idle breathe only
 * advertise that it opens. Stays mounted (hidden) while open so the tuck-away
 * animation has a home to fly the cards back into.
 */
function TreasurePile({ theme, section, count, hidden, closing, onClick, pileRef }) {
  const ui = SECTION_UI[section.key];
  const paper = {
    position: 'absolute', inset: 0, background: theme.bgCard,
    ...ui.pilePaper(theme),
  };
  return (
    <button
      type="button"
      ref={pileRef}
      hidden={hidden}
      onClick={onClick}
      aria-expanded={!hidden && !closing ? false : undefined}
      aria-label={`Open the pile of ${count} more ${section.noun}`}
      className={`tv-pile${closing ? ' tv-pilein' : ''}${ui.horizontal ? ' tv-pile-h' : ''}`}
      style={{
        ...ui.pileSize,
        position: 'relative', flexShrink: 0,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      }}
    >
      <span aria-hidden="true" className="tv-layer tv-l1" style={paper} />
      <span aria-hidden="true" className="tv-layer tv-l2" style={paper} />
      <span aria-hidden="true" className="tv-layer tv-l3" style={paper} />
      <span className="tv-face" style={{
        ...paper, position: 'relative', width: '100%', height: '100%',
        display: 'flex', flexDirection: ui.horizontal ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center', gap: ui.horizontal ? 12 : 4,
      }}>
        <span style={{ fontFamily: theme.fontHeadline, fontSize: '1.7rem', fontWeight: 700, color: theme.textHeadline, lineHeight: 1 }}>
          +{count}
        </span>
        <span style={{ textAlign: ui.horizontal ? 'left' : 'center' }}>
          <span style={{
            display: 'block', fontFamily: theme.fontBody, fontSize: '0.56rem',
            letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.textMuted,
          }}>
            more {section.noun}
          </span>
          <span style={{ display: 'block', fontFamily: theme.fontBody, fontSize: '0.62rem', color: theme.accentGold, marginTop: 2 }}>
            tap to open ✦
          </span>
        </span>
        {!ui.horizontal && (
          <span aria-hidden="true" style={{
            width: 20, height: 20, borderRadius: '50%', marginTop: 4,
            background: 'radial-gradient(circle at 35% 30%, #8B2020 0%, #6B1515 60%, #4A0F0F 100%)',
            border: '1.5px solid #A83030',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,220,180,0.75)', fontSize: '0.5rem', fontFamily: theme.fontHeadline,
          }}>
            M
          </span>
        )}
      </span>
    </button>
  );
}

/* ── A shelf: capped grid + pile + tuck-away ───────────────────────────── */

function Shelf({ theme, section, items, status, wobbling, onOpen, onClose, onOpenItem, gridRef, pileRef }) {
  const ui = SECTION_UI[section.key];
  const { Card } = ui;
  const hasPile = items.length > section.cap;
  const isOpen = status === 'open' || status === 'closing';

  return (
    <section id={`tv-sec-${section.key}`} style={{ scrollMarginTop: 16 }}>
      <WaxSealDivider
        theme={theme}
        title={section.title}
        subtitle={section.subtitle}
        count={items.length}
        wobble={wobbling}
      />
      <div ref={gridRef} style={ui.grid}>
        {items.map((item, i) => {
          const extra = hasPile && i >= section.cap;
          return (
            <div
              key={`${item.item_type}:${item.item_id}`}
              hidden={extra && !isOpen}
              data-tv-extra={extra ? '' : undefined}
              data-tv-reveal={extra ? undefined : ''}
              data-i={i}
              className="tv-cw"
              style={{
                ...(ui.wrapStyle ?? {}),
                ...(ui.tiltAt ? { '--tilt': `${ui.tiltAt(i)}deg` } : {}),
              }}
            >
              {/* Person stamps travel to their story page; everything else
                  opens its modal here, so only non-person cards get onOpen. */}
              <Card
                theme={theme}
                item={item}
                index={i}
                onOpen={item.item_type === 'person' ? undefined : () => onOpenItem(item)}
              />
              <HeartCorner item={item} style={ui.heartStyle} />
            </div>
          );
        })}
        {hasPile && (
          <TreasurePile
            theme={theme}
            section={section}
            count={items.length - section.cap}
            hidden={status === 'open'}
            closing={status === 'closing'}
            onClick={onOpen}
            pileRef={pileRef}
          />
        )}
      </div>
      {hasPile && status === 'open' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.2rem' }}>
          <button
            type="button"
            className="tv-tuck"
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              minHeight: 42, padding: '0 1.2rem', borderRadius: 21, cursor: 'pointer',
              background: `${theme.bgCard}B0`, border: `1.5px dashed ${theme.accentGold}66`,
              fontFamily: theme.fontBody, fontSize: '0.74rem', letterSpacing: '0.06em',
              color: theme.textMuted,
            }}
          >
            ▲&nbsp; Tuck the {section.noun} back into their pile
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Header flourishes ─────────────────────────────────────────────────── */

/** The collected count, ticking up from zero — a small pride moment. */
function CountUp({ theme, value }) {
  // SSR renders the true value; the count-up is a client-only celebration.
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (value <= 0 || reducedMotion()) return undefined;
    let raf;
    const t0 = performance.now();
    const duration = 1400;
    const tick = (now) => {
      // The first frame lands near p=0, so the count visibly starts from
      // nothing without a synchronous reset render.
      const p = Math.min(1, (now - t0) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <b style={{ color: theme.textBody, fontWeight: 700 }}>{shown}</b>;
}

/* ── Page ──────────────────────────────────────────────────────────────── */

/**
 * @param {{
 *   items?: Array<{ item_type: string, item_id: string, item_title: string, item_subtitle: string|null, item_image_url: string|null, country_code: string|null, country_name: string|null, edition_date: string|null }>,
 *   childName?: string,
 * }} props
 */
export default function TreasuryView({ items = [], childName }) {
  const { theme } = useTheme();
  const owner = childName ? `${childName}'s` : 'Your';

  const groups = SECTIONS
    .map(section => ({
      ...section,
      items: items.filter(item => section.types.includes(item.item_type)),
    }))
    .filter(section => section.items.length > 0);

  // Per-section pile state: absent = closed, 'open', or 'closing' while the
  // cards fly home. The pile's screen position is captured in the click
  // handler — before React re-renders the extras into the layout it flies from.
  const [status, setStatus] = useState({});
  const [wobbling, setWobbling] = useState(null);
  const rootRef = useRef(null);
  const gridRefs = useRef({});
  const pileRefs = useRef({});
  const flipFrom = useRef(null);

  // The opened treasure: its snapshot shows at once, the story body arrives
  // from getSavedItemDetail. taste/sound/nature skip the round-trip — their
  // snapshot already is the whole content, and the action would return null.
  const [modal, setModal] = useState(null);
  const openItemModal = (item) => {
    const snapshotOnly = item.item_type === 'taste' || item.item_type === 'sound' || item.item_type === 'nature';
    setModal({ item, detail: null, loading: !snapshotOnly });
    if (snapshotOnly) return;
    getSavedItemDetail({ itemType: item.item_type, itemId: item.item_id, editionDate: item.edition_date })
      .then((detail) => setModal((m) => (m && m.item === item ? { ...m, detail, loading: false } : m)))
      .catch(() => setModal((m) => (m && m.item === item ? { ...m, loading: false } : m)));
  };

  const openPile = (key) => {
    const pile = pileRefs.current[key];
    if (pile && !reducedMotion()) {
      const r = pile.getBoundingClientRect();
      flipFrom.current = { key, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      spawnSparkles(flipFrom.current.x, flipFrom.current.y);
    }
    setWobbling(key);
    setTimeout(() => setWobbling((w) => (w === key ? null : w)), 720);
    setStatus((s) => ({ ...s, [key]: 'open' }));
  };

  const closePile = (key) => {
    setStatus((s) => ({ ...s, [key]: 'closing' }));
  };

  // Deal the newly revealed extras out of the pile (FLIP). Runs before paint,
  // so the cards are already sitting on the pile when the frame appears.
  useLayoutEffect(() => {
    const from = flipFrom.current;
    if (!from || status[from.key] !== 'open') return;
    flipFrom.current = null;
    const grid = gridRefs.current[from.key];
    if (!grid) return;
    grid.querySelectorAll('[data-tv-extra]').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = `translate(${from.x - (r.left + r.width / 2)}px, ${from.y - (r.top + r.height / 2)}px) rotate(${i % 2 ? 8 : -8}deg) scale(0.45)`;
      // Double rAF: the first frame commits the start position, the second
      // starts the transition — one rAF risks skipping straight to the end.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const delay = Math.min(i, 14) * 55;
          el.style.transition = `transform 0.6s cubic-bezier(0.2, 0.75, 0.3, 1.12) ${delay}ms, opacity 0.35s ease ${delay}ms`;
          el.style.transform = '';
          el.style.opacity = '';
          setTimeout(() => { el.style.transition = ''; }, 700 + delay);
        });
      });
    });
  }, [status]);

  // Fly the extras home into the (just re-shown) pile, then actually hide them.
  const closingHandled = useRef(new Set());
  useLayoutEffect(() => {
    const key = Object.keys(status).find((k) => status[k] === 'closing');
    if (!key || closingHandled.current.has(key)) return;
    closingHandled.current.add(key);

    const grid = gridRefs.current[key];
    const pile = pileRefs.current[key];
    const extras = grid ? [...grid.querySelectorAll('[data-tv-extra]')] : [];
    const finish = () => {
      closingHandled.current.delete(key);
      extras.forEach((el) => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; });
      setStatus((s) => ({ ...s, [key]: undefined }));
      // The shelf just shrank by several rows — put the child back at its top
      // rather than leaving them stranded over whatever scrolled up into view.
      document.getElementById(`tv-sec-${key}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    if (reducedMotion() || !pile || extras.length === 0) { finish(); return; }

    const pr = pile.getBoundingClientRect();
    const home = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
    extras.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      // The bottom cards dive in first, like tidying a real pile.
      const delay = Math.min(extras.length - 1 - i, 10) * 40;
      el.style.transition = `transform 0.5s cubic-bezier(0.5, 0, 0.8, 0.4) ${delay}ms, opacity 0.4s ease ${delay + 80}ms`;
      el.style.transform = `translate(${home.x - (r.left + r.width / 2)}px, ${home.y - (r.top + r.height / 2)}px) rotate(${i % 2 ? 7 : -7}deg) scale(0.4)`;
      el.style.opacity = '0';
    });
    setTimeout(finish, 500 + Math.min(extras.length, 11) * 40 + 120);
  }, [status]);

  // Deal the visible shelves in as they scroll into view. The hiding class is
  // added here, not in the markup, so a no-JS render still shows every card.
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.setProperty('--d', `${(Number(el.dataset.i) % 8) * 70}ms`);
        el.classList.add('tv-in');
        // tvDealIn fills 'both', which pins the wrapper's transform after the
        // animation and would override the hover lift forever — shed the
        // reveal classes once it lands. animationend bubbles (a heart's save
        // pulse would arrive here too), hence the name check.
        el.addEventListener('animationend', (e) => {
          if (e.target !== el || e.animationName !== 'tvDealIn') return;
          el.classList.remove('tv-reveal', 'tv-in');
          el.style.removeProperty('--d');
        });
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    root.querySelectorAll('[data-tv-reveal]').forEach((el) => {
      el.classList.add('tv-reveal');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    /* A <div>, not a <main> — DGPageShell owns the page's <main> landmark. */
    <div
      ref={rootRef}
      /* No background of its own: the museum column's radial gradient fades
         to bgPrimary, the same parchment DGPageShell paints, so at any width
         the page blends into the shell instead of floating on the legacy
         page's dark gallery wall. */
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        '--tv-gold': theme.accentGold,
        '--tv-hover-shadow': theme.shadowDeep,
      }}
    >
      <style>{`
        /* The hover lift lives on the wrapper, not the card, because the
           heart is the card's *sibling* (a button can't nest in a button) —
           lifting only the card would leave its heart floating behind. */
        .tv-cw { position: relative; transform: rotate(var(--tilt, 0deg)); transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.3); }
        .tv-reveal { opacity: 0; }
        .tv-in { animation: tvDealIn 0.6s cubic-bezier(0.2, 0.75, 0.3, 1.12) var(--d, 0s) both; }
        @keyframes tvDealIn {
          0% { opacity: 0; transform: translateY(30px) rotate(calc(var(--tilt, 0deg) + 4deg)) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1); }
        }
        .tv-card { transition: box-shadow 0.3s ease; }
        .tv-disc { transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.6); }
        @media (hover: hover) {
          .tv-cw:hover { transform: rotate(var(--tilt, 0deg)) translateY(-6px) scale(1.03); }
          .tv-cw:active { transform: rotate(var(--tilt, 0deg)) translateY(-1px) scale(0.99); transition-duration: 0.12s; }
          .tv-cw:hover .tv-card { box-shadow: var(--tv-hover-shadow); }
          .tv-cw:hover .tv-heartc { animation: tvPulse 0.8s ease-in-out infinite; }
          .tv-cw:hover .tv-disc { transform: rotate(-12deg) scale(1.15); }
          .tv-pile:hover { transform: translateY(-5px); }
          .tv-pile:hover .tv-l1 { transform: rotate(-10deg) translate(-12px, 5px); }
          .tv-pile:hover .tv-l2 { transform: rotate(8deg) translate(12px, 2px); }
          .tv-pile:hover .tv-l3 { transform: rotate(-3deg) translate(-2px, -4px); }
          .tv-pile-h:hover .tv-l1 { transform: rotate(-3deg) translate(-8px, 6px); }
          .tv-pile-h:hover .tv-l2 { transform: rotate(2.5deg) translate(8px, 3px); }
          .tv-tuck:hover { transform: translateY(-2px); border-color: var(--tv-gold); }
          .tv-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.14); }
        }
        @keyframes tvPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }
        .tv-sunspin { display: inline-flex; animation: tvSpin 75s linear infinite; }
        .tv-sunspin-rev { animation-direction: reverse; }
        @keyframes tvSpin { to { transform: rotate(360deg); } }
        .tv-wobble { animation: tvWobble 0.7s ease; }
        @keyframes tvWobble {
          0% { transform: rotate(0); } 25% { transform: rotate(-14deg) scale(1.12); }
          55% { transform: rotate(10deg) scale(1.06); } 80% { transform: rotate(-4deg); } 100% { transform: rotate(0); }
        }
        .tv-coin { position: relative; overflow: hidden; }
        .tv-coin::after {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.65) 47%, transparent 62%);
          transform: translateX(-130%); animation: tvGlint 5.2s ease-in-out var(--gd, 0s) infinite;
        }
        @keyframes tvGlint { 0%, 72% { transform: translateX(-130%); } 88%, 100% { transform: translateX(130%); } }
        .tv-mote { animation: tvMote var(--mt, 14s) ease-in-out var(--md, 0s) infinite; }
        @keyframes tvMote {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
          20% { opacity: 0.7; }
          50% { transform: translate(var(--mx, 14px), -46px) scale(1.4); opacity: 0.5; }
          80% { opacity: 0.15; }
        }
        .tv-pile { transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1.4); -webkit-tap-highlight-color: transparent; }
        .tv-pile:active { transform: scale(0.95); transition-duration: 0.1s; }
        .tv-pile:focus-visible { outline: 3px solid var(--tv-gold); outline-offset: 4px; border-radius: 8px; }
        .tv-layer { transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.3, 1.4); }
        .tv-l1 { transform: rotate(-5deg) translate(-4px, 3px); }
        .tv-l2 { transform: rotate(4deg) translate(4px, 1px); }
        .tv-l3 { transform: rotate(-1.5deg) translate(0, -2px); }
        .tv-pile-h .tv-l1 { transform: rotate(-1.6deg) translate(-3px, 4px); }
        .tv-pile-h .tv-l2 { transform: rotate(1.3deg) translate(3px, 2px); }
        /* The idle breathe is the pile's "tap me" on touch, where hover never fires. */
        .tv-face { animation: tvBreathe 4.5s ease-in-out 1.5s infinite; }
        @keyframes tvBreathe {
          0%, 78%, 100% { transform: rotate(0) translateY(0); }
          85% { transform: rotate(-1.6deg) translateY(-4px); }
          92% { transform: rotate(1deg) translateY(0); }
        }
        .tv-pilein { animation: tvPileIn 0.35s ease; }
        @keyframes tvPileIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .tv-tuck { transition: transform 0.25s ease, border-color 0.25s ease; }
        .tv-chip { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .tv-spark {
          position: fixed; z-index: 1000; font-size: 0.85rem; color: #D4AF37; pointer-events: none;
          animation: tvSparkFly 0.7s ease-out forwards;
        }
        @keyframes tvSparkFly {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(1.25) rotate(160deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tv-in, .tv-sunspin, .tv-wobble, .tv-coin::after, .tv-mote, .tv-face,
          .tv-pilein, .tv-spark, .tv-heartc { animation: none !important; }
          .tv-cw, .tv-card, .tv-disc, .tv-pile, .tv-layer, .tv-tuck, .tv-chip { transition: none !important; }
          .tv-reveal { opacity: 1 !important; }
        }
      `}</style>
      {/* Full width, like the edition page — a capped column here left bare
          shell bands beside the museum on wide screens. The grids stay
          readable because their flex rows centre themselves at any width. */}
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: `radial-gradient(ellipse at 50% 0%, ${theme.bgCard} 0%, ${theme.bgSoft} 45%, ${theme.bgPrimary} 100%)`,
          padding: '2rem 1.5rem 4rem',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Gold dust drifting over the parchment — opacity lives entirely in
            the keyframes, so with reduced motion the motes simply never show. */}
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="tv-mote"
            style={{
              position: 'absolute', width: 5, height: 5, borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.accentGold}CC 0%, ${theme.accentGold}00 70%)`,
              pointerEvents: 'none', opacity: 0,
              left: `${(i * 11.3 + 4) % 92}%`, top: `${(i * 23 + 10) % 85}%`,
              '--mt': `${11 + (i % 5) * 3}s`, '--md': `${i * 1.7}s`,
              '--mx': `${(i % 2 ? 1 : -1) * (10 + i * 3)}px`,
            }}
          />
        ))}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', margin: '0 0 0.4rem' }}>
            <span className="tv-sunspin"><Sun theme={theme} /></span>
            <h1 style={{
              fontFamily: theme.fontHeadline,
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              fontWeight: 700, color: theme.textHeadline, margin: 0,
            }}>
              My Treasury
            </h1>
            <span className="tv-sunspin tv-sunspin-rev"><Sun theme={theme} /></span>
          </div>
          <p style={{
            fontFamily: theme.fontBody,
            fontSize: '1rem', color: theme.textMuted, margin: '0 0 0.6rem',
            fontStyle: 'italic',
          }}>
            {owner} personal museum
          </p>
          {items.length > 0 && (
            <div style={{
              display: 'inline-block',
              background: `${theme.accentGold}26`,
              border: `1px solid ${theme.accentGold}40`,
              borderRadius: 20, padding: '4px 16px',
              fontFamily: theme.fontBody, fontSize: '0.72rem',
              color: theme.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              <CountUp theme={theme} value={items.length} /> {items.length === 1 ? 'Treasure' : 'Treasures'} Collected
            </div>
          )}
          {/* Museum map: one seal chip per open room, gliding to its section. */}
          {groups.length > 1 && (
            <nav aria-label="Treasury sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '1.1rem 0 0' }}>
              {groups.map((section) => (
                <a
                  key={section.key}
                  href={`#tv-sec-${section.key}`}
                  className="tv-chip"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`tv-sec-${section.key}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    minHeight: 40, padding: '0 0.95rem', borderRadius: 20,
                    background: `${theme.bgCard}B0`, border: `1px solid ${theme.accentGold}40`,
                    boxShadow: theme.shadowSoft, textDecoration: 'none',
                    fontFamily: theme.fontBody, fontSize: '0.7rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.textMuted,
                  }}
                >
                  <span aria-hidden="true" style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(circle at 35% 30%, #8B2020 0%, #6B1515 60%, #4A0F0F 100%)',
                    border: '1.5px solid #A83030',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,220,180,0.75)', fontSize: '0.5rem', fontFamily: theme.fontHeadline,
                  }}>
                    M
                  </span>
                  {section.title}
                </a>
              ))}
            </nav>
          )}
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem 4rem' }}>
            <span aria-hidden="true" style={{ display: 'block', fontSize: '3rem', marginBottom: '1.2rem', opacity: 0.65 }}>🏛️</span>
            <h2 style={{
              fontFamily: theme.fontHeadline, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
              fontWeight: 600, color: theme.textHeadline, margin: '0 0 0.6rem',
            }}>
              {owner} Treasury awaits
            </h2>
            <p style={{
              fontFamily: theme.fontBody, fontWeight: 300, fontSize: '0.92rem',
              color: theme.textBody, lineHeight: 1.8,
              margin: '0 auto 1.75rem', maxWidth: 420,
            }}>
              Tap the gold hearts on people, places, and stories you love. They&rsquo;ll appear here in your personal museum.
            </p>
            <Link
              href="/daily-gold-edition"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 44, padding: '0 1.5rem', borderRadius: 22,
                background: `${theme.accentGold}26`, border: `1px solid ${theme.accentGold}40`,
                fontFamily: theme.fontBody, fontSize: '0.88rem', color: theme.textBody,
                textDecoration: 'none',
              }}
            >
              Explore today&rsquo;s Daily Gold
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {groups.map(section => (
              <Shelf
                key={section.key}
                theme={theme}
                section={section}
                items={section.items}
                status={status[section.key]}
                wobbling={wobbling === section.key}
                onOpen={() => openPile(section.key)}
                onClose={() => closePile(section.key)}
                onOpenItem={openItemModal}
                gridRef={(el) => { gridRefs.current[section.key] = el; }}
                pileRef={(el) => { pileRefs.current[section.key] = el; }}
              />
            ))}
          </div>
        )}

        {modal && (
          <TreasuryItemModal
            item={modal.item}
            detail={modal.detail}
            loading={modal.loading}
            onClose={() => setModal(null)}
          />
        )}

        {/* Footer flourish */}
        <div style={{ marginTop: 'auto', paddingTop: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem' }}>
            <Sun theme={theme} size={16} />
            <p style={{
              fontFamily: theme.fontHeadline, fontStyle: 'italic',
              fontSize: '0.85rem', color: theme.textMuted, margin: 0,
            }}>
              Every treasure tells a story
            </p>
            <Sun theme={theme} size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
