'use client';
/**
 * museumRooms — the five halls of the paged Treasury museum, plus the pieces
 * they share.
 *
 * Each room is one full-screen wall: its own mood (plum gallery, parchment
 * map room, ivory press, night sky, wood panelling), its own signage, and its
 * treasures in the physical form that wall gives them. TreasuryView owns the
 * stage these hang in — movement, measuring, piles, modals — and hands each
 * room only what it needs to draw itself.
 *
 * Colour comes from `--tv-*` custom properties that TreasuryView fills from
 * the active theme, so every palette (Night Mode included) keeps working. The
 * exceptions are the *physical materials* — wax red, coin gold, brass, wood
 * browns, push-pin red, the plum wall and the night sky — which stay literal
 * in every theme, the same house rule the old Treasury applied to wax and
 * coins. Everything visual lives in museumCss.js; the mock
 * (docs/treasury-museum-redesign-mock.html) is its source of truth.
 */
import Link from 'next/link';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { TOKEN_META } from '@/components/treasury/tokenMeta';

/**
 * Fixed display order — the museum reads the same every visit regardless of
 * what was saved last. Types the enum allows but no room claims would be
 * invisible, so the list below must cover all of them.
 *
 * `cap` is the *server's* conservative guess at how many treasures fit on the
 * wall (the old shelf caps). The client measures the real stage after mount
 * and expands each room to fill it — see TreasuryView's `measureCaps`.
 * `noun` is what the pile calls the folded cards; `unit` is what the signage
 * counts.
 */
export const SECTIONS = [
  { key: 'people', title: 'The Hall of Heroes', subtitle: 'People I admire', types: ['person'], cap: 5, noun: 'stamps', unit: 'portraits' },
  { key: 'places', title: 'The Map Room', subtitle: 'Places I dream about', types: ['destination'], cap: 3, noun: 'postcards', unit: 'postcards' },
  { key: 'news', title: 'The Good News Press', subtitle: 'Stories that made me smile', types: ['news'], cap: 3, noun: 'clippings', unit: 'front pages' },
  { key: 'moments', title: 'The Hall of Time', subtitle: 'History I keep', types: ['on_this_day', 'greatest_moment'], cap: 5, noun: 'moments', unit: 'moments, oldest to newest' },
  { key: 'little', title: 'The Cabinet of Wonders', subtitle: 'Tastes, sounds, wonders and words', types: ['taste', 'sound', 'nature', 'phrase'], cap: 7, noun: 'treasures', unit: 'kept safe' },
];

/** Room numbering is Roman, and there are never more than five rooms. */
export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/**
 * Deterministic per-index tilt, cycling −2.3°…+2.3°. The legacy page used
 * Math.random(), which a server-rendered tree can't (the client re-roll would
 * mismatch hydration); an index cycle reads just as hand-placed.
 */
export const tilt = (i) => (((i * 3) % 5) - 2) * 1.15;

/**
 * A person's Golden Story is its own route; every other treasure opens in the
 * modal, so this is the only href left.
 */
export function itemHref(item) {
  if (item.item_type === 'person') return `/stories/${item.item_id}`;
  return null;
}

export function formatEditionDate(value) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ── The Hall of Time reads in year order ──────────────────────────────── */

/** "300 BC" → −300, "1968" → 1968, "Long ago" → null. */
function parseYear(subtitle) {
  if (!subtitle) return null;
  const digits = String(subtitle).match(/\d{1,5}/);
  if (!digits) return null;
  const year = Number(digits[0]);
  return /\bB\.?C\.?(E\.?)?\b/i.test(subtitle) ? -year : year;
}

/**
 * A timeline must be chronological, but a moment whose subtitle isn't a year
 * has nowhere to stand on it. Those keep the slot their saved order gave
 * them; only the datable moments are sorted, and only among the slots they
 * already occupy — so no treasure is pushed to the end for being unlabelled.
 */
export function chronological(items) {
  const marked = items.map((item, i) => ({ item, i, year: parseYear(item.item_subtitle) }));
  const datedSlots = marked.filter((m) => m.year !== null);
  const inOrder = [...datedSlots].sort((a, b) => a.year - b.year || a.i - b.i);
  const out = items.slice();
  datedSlots.forEach((slot, k) => { out[slot.i] = inOrder[k].item; });
  return out;
}

/* ── Ornaments ─────────────────────────────────────────────────────────── */

/** Eight-rayed sun, the Maison's little astronomical flourish. */
export function Sun({ theme, size = 20 }) {
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
 * The Maison's wax seal. Literally red in every theme — it is a physical
 * object, like the gold of a coin.
 */
export function Seal({ className = '' }) {
  return <span aria-hidden="true" className={`tv-seal ${className}`.trim()}>M</span>;
}

/* ── Ambient residents ─────────────────────────────────────────────────────
   One per room, drawn as small gold-line glyphs like the Sun ornament, kept
   under opacity .55 on long loop periods so most of the time the room is
   still. Purely decorative and never in the way of a tap. */

function Feather() {
  return (
    <svg className="tv-glyph" width="20" height="26" viewBox="0 0 20 26" aria-hidden="true">
      <path d="M13.5 2c3 4 4 9.5 2 14.5-1.6 4-4.6 6.6-8 7.5" />
      <path d="M7.5 24c-.6-4 .3-9 3-13.5C12.4 7.3 14.6 4.6 17 3" />
      <path d="M11.6 6.4 8.4 5M12.7 9.7l-3.9-.9M12.9 13.2l-4.2-.2M12.2 16.7l-4.1.6M10.7 20l-3.6 1.3" />
    </svg>
  );
}

function Newspaper() {
  return (
    <svg className="tv-glyph" width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
      <path d="M2 3h13v12H3.5A1.5 1.5 0 0 1 2 13.5z" />
      <path d="M15 6h4v7.5a1.5 1.5 0 0 1-3 0V6" />
      <path d="M4.5 6h8M4.5 8.5h8M4.5 11h5" />
    </svg>
  );
}

function Plane() {
  return (
    <svg className="tv-glyph" width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
      <path d="M1 10.5 20 2l-6 14-3.4-5.1z" />
      <path d="M10.6 10.9 20 2" />
    </svg>
  );
}

function CompassRose() {
  return (
    <svg className="tv-compass" width="200" height="200" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="40" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="30" strokeWidth="0.8" strokeDasharray="2 3" />
      <path d="M50 14 L54 50 L50 86 L46 50 Z" />
      <path d="M14 50 L50 46 L86 50 L50 54 Z" opacity="0.6" />
      <text x="50" y="10" textAnchor="middle" fontSize="9">N</text>
    </svg>
  );
}

function RouteLines() {
  return (
    <svg className="tv-routes" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" fill="none">
      <path d="M-20,120 C240,40 420,220 640,120 S920,60 1020,140" strokeWidth="2" strokeDasharray="2 7" />
      <path d="M-20,430 C300,520 560,360 820,470 S980,430 1020,440" strokeWidth="2" strokeDasharray="2 7" opacity="0.8" />
    </svg>
  );
}

/* ── Shared card pieces ────────────────────────────────────────────────── */

/** Gold-tinted stand-in plate for a snapshot saved without an image. */
export function EmptyPlate({ mark = '✦' }) {
  return <span aria-hidden="true" className="tv-emptyplate">{mark}</span>;
}

/** A treasure's picture, or its stand-in plate when the snapshot had none. */
function Picture({ src, mark, top = false }) {
  if (!src) return <EmptyPlate mark={mark} />;
  return <img src={src} alt="" loading="lazy" className={top ? 'tv-img tv-img-top' : 'tv-img'} />;
}

/**
 * Wraps a card body in its opener: a button when the treasure opens a modal
 * (`onOpen`), a link when it travels to its own page (person stamps), a plain
 * div when it does neither. The heart is rendered by the caller as a sibling:
 * nesting a button in an anchor — or in another button — swallows the tap and
 * is invalid markup.
 */
export function CardSurface({ href, onOpen, className, children }) {
  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} aria-haspopup="dialog" className={`tv-card ${className}`}>
        {children}
      </button>
    );
  }
  if (!href) return <div className={`tv-card ${className}`}>{children}</div>;
  return <Link href={href} className={`tv-card ${className}`}>{children}</Link>;
}

/** The unsave control every treasure carries, always a sibling of its link. */
export function HeartCorner({ item, style }) {
  return (
    <div className="tv-heart" style={style}>
      {/* The pulse-on-hover span is separate from the positioned div so the
          animation's transform can't fight a translateY(-50%) placement. */}
      <span className="tv-heartc">
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

/* ── The pile ──────────────────────────────────────────────────────────── */

/**
 * The folded remainder of a room's wall, drawn as a physical stack of its own
 * paper: three offset layers under a face carrying the count. It's the
 * expander — tap works everywhere; the hover fan and idle breathe only
 * advertise that it opens. Stays mounted (hidden) while open so the tuck-away
 * animation has a home to fly the cards back into.
 */
export function TreasurePile({ variant, noun, count, hidden, closing, horizontal, onClick, pileRef, delay = 0 }) {
  return (
    <button
      type="button"
      ref={pileRef}
      hidden={hidden}
      onClick={onClick}
      aria-label={`Open the pile of ${count} more ${noun}`}
      data-tv-item=""
      className={`tv-pile ${variant}${horizontal ? ' tv-pile-h' : ''}${closing ? ' tv-pilein' : ''}`}
      style={{ '--d': `${delay}ms` }}
    >
      <span aria-hidden="true" className="tv-pl tv-p1" />
      <span aria-hidden="true" className="tv-pl tv-p2" />
      <span aria-hidden="true" className="tv-pl tv-p3" />
      <span className="tv-pface">
        <b>+{count}</b>
        <span className="tv-pmeta">
          <em>more {noun}</em>
          <i>tap to open ✦</i>
        </span>
      </span>
    </button>
  );
}

/** The tuck-away button that appears under an opened pile. */
function TuckRow({ noun, onClose }) {
  return (
    <div className="tv-tuckrow">
      <button type="button" className="tv-tuck" onClick={onClose}>
        ▲&nbsp; Tuck the {noun} back into their pile
      </button>
    </div>
  );
}

/* ── Room frame ────────────────────────────────────────────────────────── */

/**
 * What every room shares: the wall, its "Room N of V" eyebrow, its signage,
 * the exhibit, and the footsteps + doors that lead out of it. The exhibit is
 * the only flexible child, which is what lets TreasuryView measure how much
 * of the stage is left for cards.
 */
function RoomFrame({ wall, numberLabel, signage, ambient, children, nav, roomRef }) {
  return (
    <div className={`tv-stage tv-room ${wall}`} ref={roomRef}>
      {ambient}
      <p className="tv-roomno">{numberLabel}</p>
      {signage}
      {children}
      {nav}
    </div>
  );
}

/**
 * Which slice of a room's treasures is on the wall, and which are folded into
 * the pile. Extras stay mounted but hidden so the pile has something to deal
 * out — and so a no-JS render can't lose them.
 */
function shelfPlan(items, cap, status) {
  const hasPile = items.length > cap;
  const isOpen = status === 'open' || status === 'closing';
  return {
    hasPile,
    isOpen,
    extraCount: items.length - cap,
    // `hidden` on an extra, plus the marker the FLIP animation looks for.
    slotProps: (i) => {
      const extra = hasPile && i >= cap;
      return {
        hidden: extra && !isOpen,
        'data-tv-extra': extra ? '' : undefined,
        'data-tv-item': '',
      };
    },
  };
}

const cardKey = (item) => `${item.item_type}:${item.item_id}`;

/* ══ ROOM I — The Hall of Heroes ═══════════════════════════════════════════
   Portrait stamps hung from brass rings off a gold picture rail, at staggered
   heights. They drop from above and swing until they settle. */

export function HallOfHeroes({ items, cap, numberLabel, room, status, onOpenPile, onClosePile, onOpenItem, nav, roomRef, shelfRef, pileRef }) {
  const shelf = shelfPlan(items, cap, status);
  return (
    <RoomFrame
      wall="tv-room-gallery"
      numberLabel={numberLabel}
      roomRef={roomRef}
      ambient={<span className="tv-amb tv-feather" aria-hidden="true"><Feather /></span>}
      signage={
        <div className="tv-dv">
          <div className="tv-plate">
            <Seal />
            <div style={{ textAlign: 'left' }}>
              <h2>{room.title}</h2>
              <p className="tv-tag">{room.subtitle} · {items.length} {room.unit}</p>
            </div>
          </div>
        </div>
      }
      nav={nav}
    >
      <div className="tv-rail" aria-hidden="true" />
      <div className="tv-stamps" ref={shelfRef} data-tv-shelf="">
        {items.map((item, i) => (
          <div
            key={cardKey(item)}
            className="tv-stamp-w"
            data-tv-fit={i === 0 ? '' : undefined}
            style={{ '--tilt': `${tilt(i)}deg`, '--d': `${(i % 8) * 75}ms` }}
            {...shelf.slotProps(i)}
          >
            <span className="tv-hook" aria-hidden="true" />
            {/* Person stamps travel to their story page; everything else
                opens its modal here, so only non-person cards get onOpen. */}
            <CardSurface
              className="tv-stamp"
              href={itemHref(item)}
              onOpen={item.item_type === 'person' ? undefined : () => onOpenItem(item)}
            >
              <span className="tv-pic"><Picture src={item.item_image_url} mark="✶" top /></span>
              <span className="tv-cap">
                <span className="tv-t">{item.item_title}</span>
                {item.item_subtitle && <span className="tv-s">{item.item_subtitle}</span>}
              </span>
            </CardSurface>
            <HeartCorner item={item} style={{ top: 8, right: 8 }} />
          </div>
        ))}
        {shelf.hasPile && (
          <TreasurePile
            variant="tv-pile-stamp"
            noun={room.noun}
            count={shelf.extraCount}
            hidden={status === 'open'}
            closing={status === 'closing'}
            onClick={onOpenPile}
            pileRef={pileRef}
          />
        )}
      </div>
      {status === 'open' && <TuckRow noun={room.noun} onClose={onClosePile} />}
    </RoomFrame>
  );
}

/* ══ ROOM II — The Map Room ════════════════════════════════════════════════
   Postcards taped to the wall over dashed routes and a fading compass rose;
   each one flies in from its own side before the tape presses down. */

export function MapRoom({ items, cap, numberLabel, room, status, onOpenPile, onClosePile, onOpenItem, nav, roomRef, shelfRef, pileRef }) {
  const shelf = shelfPlan(items, cap, status);
  return (
    <RoomFrame
      wall="tv-room-map"
      numberLabel={numberLabel}
      roomRef={roomRef}
      ambient={
        <>
          <CompassRose />
          <RouteLines />
          <span className="tv-amb tv-plane" aria-hidden="true"><Plane /></span>
        </>
      }
      signage={
        <div className="tv-dv tv-dv-map">
          <div className="tv-row">
            <span className="tv-dots" aria-hidden="true" />
            <Seal />
            <h2>{room.title}</h2>
            <span className="tv-dots" aria-hidden="true" />
          </div>
          <p className="tv-tag">{room.subtitle} · {items.length} {room.unit}</p>
        </div>
      }
      nav={nav}
    >
      <div className="tv-postcards" ref={shelfRef} data-tv-shelf="">
        {items.map((item, i) => {
          const dateLabel = formatEditionDate(item.edition_date);
          return (
            <div
              key={cardKey(item)}
              className="tv-postcard-w"
              data-tv-fit={i === 0 ? '' : undefined}
              style={{
                '--tilt': `${(tilt(i + 1) * 1.3).toFixed(2)}deg`,
                '--fx': i % 2 ? '150px' : '-150px',
                '--d': `${(i % 4) * 90}ms`,
              }}
              {...shelf.slotProps(i)}
            >
              <span className="tv-tape tv-tape-l" aria-hidden="true" />
              <span className="tv-tape tv-tape-r" aria-hidden="true" />
              <CardSurface className="tv-postcard" href={itemHref(item)} onOpen={() => onOpenItem(item)}>
                <span className="tv-pic"><Picture src={item.item_image_url} mark="✉" /></span>
                <span className="tv-cap">
                  <span className="tv-t">{item.item_title}</span>
                  {(item.country_name || dateLabel) && (
                    <span className="tv-s">{[item.country_name, dateLabel].filter(Boolean).join(' · ')}</span>
                  )}
                </span>
              </CardSurface>
              <HeartCorner item={item} style={{ top: 14, right: 14 }} />
            </div>
          );
        })}
        {shelf.hasPile && (
          <TreasurePile
            variant="tv-pile-post"
            noun={room.noun}
            count={shelf.extraCount}
            hidden={status === 'open'}
            closing={status === 'closing'}
            onClick={onOpenPile}
            pileRef={pileRef}
          />
        )}
      </div>
      {status === 'open' && <TuckRow noun={room.noun} onClose={onClosePile} />}
    </RoomFrame>
  );
}

/* ══ ROOM III — The Good News Press ════════════════════════════════════════
   Clippings pinned in newspaper columns under a masthead. Every visible one
   carries its picture and reserves the same three headline lines, so the
   column packer places exactly as many as the stage was measured for. */

export function GoodNewsPress({ items, cap, numberLabel, room, status, onOpenPile, onClosePile, onOpenItem, nav, roomRef, shelfRef, pileRef }) {
  const shelf = shelfPlan(items, cap, status);
  return (
    <RoomFrame
      wall="tv-room-press"
      numberLabel={numberLabel}
      roomRef={roomRef}
      ambient={<span className="tv-amb tv-newsfly" aria-hidden="true"><Newspaper /></span>}
      signage={
        <div className="tv-dv tv-dv-press">
          <h2>{room.title}</h2>
          <p className="tv-tag">{room.subtitle} · {items.length} {room.unit}</p>
        </div>
      }
      nav={nav}
    >
      <div className="tv-clippings" ref={shelfRef} data-tv-shelf="">
        {items.map((item, i) => {
          const dateLabel = formatEditionDate(item.edition_date);
          return (
            <div
              key={cardKey(item)}
              className="tv-clip-w"
              data-tv-fit={i === 0 ? '' : undefined}
              style={{ '--d': `${(i % 3) * 120}ms` }}
              {...shelf.slotProps(i)}
            >
              <span className="tv-pin" aria-hidden="true" />
              <CardSurface className="tv-clip" href={itemHref(item)} onOpen={() => onOpenItem(item)}>
                <span className="tv-eyebrow">Good News{dateLabel ? ` · ${dateLabel}` : ''}</span>
                <span className="tv-pic"><Picture src={item.item_image_url} mark="✦" /></span>
                <h3>{item.item_title}</h3>
                <span className="tv-s">{item.item_subtitle}</span>
              </CardSurface>
              <HeartCorner item={item} style={{ top: 6, right: 6 }} />
            </div>
          );
        })}
        {shelf.hasPile && (
          <TreasurePile
            variant="tv-pile-clip"
            noun={room.noun}
            count={shelf.extraCount}
            hidden={status === 'open'}
            closing={status === 'closing'}
            onClick={onOpenPile}
            pileRef={pileRef}
          />
        )}
      </div>
      {status === 'open' && <TuckRow noun={room.noun} onClose={onClosePile} />}
    </RoomFrame>
  );
}

/* ══ ROOM IV — The Hall of Time ════════════════════════════════════════════
   A night sky with one golden thread down the middle. The thread draws
   itself, then the moments step onto it from alternating sides, oldest
   first. On phones the thread moves to the left edge and every plaque
   stands to its right. */

export function HallOfTime({ items, cap, numberLabel, room, status, onOpenPile, onClosePile, onOpenItem, nav, roomRef, shelfRef, pileRef }) {
  const ordered = chronological(items);
  const shelf = shelfPlan(ordered, cap, status);
  return (
    <RoomFrame
      wall="tv-room-time"
      numberLabel={numberLabel}
      roomRef={roomRef}
      ambient={Array.from({ length: 16 }, (_, k) => (
        <span
          key={k}
          className="tv-star"
          aria-hidden="true"
          style={{ left: `${(k * 7.3 + 3) % 96}%`, top: `${(k * 13.7 + 4) % 88}%`, '--sd': `${(k % 7) * 0.8}s` }}
        />
      ))}
      signage={
        <div className="tv-dv">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.45rem' }}><Seal /></div>
          <h2>{room.title}</h2>
          <p className="tv-tag">{room.subtitle} · {items.length} {room.unit}</p>
        </div>
      }
      nav={nav}
    >
      <div className="tv-timeline" ref={shelfRef} data-tv-shelf="">
        {/* A gold spark travelling down the thread — the room's one resident. */}
        <span className="tv-flow" aria-hidden="true" />
        {ordered.map((item, i) => {
          const dateLabel = formatEditionDate(item.edition_date);
          return (
            <div
              key={cardKey(item)}
              className={i % 2 ? 'tv-trow tv-trow-r' : 'tv-trow'}
              data-tv-fit={i === 0 ? '' : undefined}
              style={{ '--d': `${(i % 3) * 70}ms` }}
              {...shelf.slotProps(i)}
            >
              <div className="tv-plaque-w">
                <CardSurface className="tv-plaque" href={itemHref(item)} onOpen={() => onOpenItem(item)}>
                  {/* The gold of a coin, like the red of wax, stays literal in
                      every theme. item_subtitle holds the moment's year. The
                      glint delay is staggered so a wall of plaques doesn't
                      flash in unison. */}
                  <span aria-hidden="true" className="tv-coin" style={{ '--gd': `${(i % 7) * 0.8}s` }}>
                    {item.item_subtitle || '✦'}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <h3>{item.item_title}</h3>
                    {dateLabel && <span className="tv-s">Kept from {dateLabel}</span>}
                  </span>
                </CardSurface>
                <HeartCorner item={item} style={{ top: '50%', right: 6, transform: 'translateY(-50%)' }} />
              </div>
            </div>
          );
        })}
      </div>
      {shelf.hasPile && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.6rem' }}>
          <TreasurePile
            variant="tv-pile-plq"
            noun={room.noun}
            count={shelf.extraCount}
            hidden={status === 'open'}
            closing={status === 'closing'}
            horizontal
            onClick={onOpenPile}
            pileRef={pileRef}
          />
        </div>
      )}
      {status === 'open' && <TuckRow noun={room.noun} onClose={onClosePile} />}
    </RoomFrame>
  );
}

/* ══ ROOM V — The Cabinet of Wonders ═══════════════════════════════════════
   A wood-panelled room holding a glass hutch: tokens sit on real wooden
   ledges, as many per shelf as the hutch is wide. The ledges grow out from
   their centre and the tokens plop down onto them, left to right. */

const chunk = (arr, n) => arr.reduce((rows, x, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(x);
  return rows;
}, []);

export function CabinetOfWonders({ items, cap, cols, numberLabel, room, status, onOpenPile, onClosePile, onOpenItem, nav, roomRef, shelfRef, pileRef }) {
  const shelf = shelfPlan(items, cap, status);
  const perShelf = Math.max(1, cols);
  // Extras ride along on the last shelf so the pile can deal them out into
  // the room; on display, only the first `cap` are laid out on ledges.
  const shown = items.slice(0, cap);
  const extras = items.slice(cap);
  const rows = chunk(shown, perShelf);
  if (rows.length === 0) rows.push([]);

  const token = (item, i, j) => (
    <div
      key={cardKey(item)}
      className="tv-token-w"
      data-tv-fit={i === 0 ? '' : undefined}
      style={{ '--d': `${j * 110}ms` }}
      {...shelf.slotProps(i)}
    >
      <CardSurface className="tv-token" href={itemHref(item)} onOpen={() => onOpenItem(item)}>
        <span aria-hidden="true" className="tv-disc">{(TOKEN_META[item.item_type] ?? { emoji: '✦' }).emoji}</span>
        <span className="tv-txt">
          <span className="tv-t">{item.item_title}</span>
          <span className="tv-s">{(TOKEN_META[item.item_type] ?? { label: 'Treasure' }).label}</span>
        </span>
      </CardSurface>
      <HeartCorner item={item} style={{ top: '50%', right: 4, transform: 'translateY(-50%)' }} />
    </div>
  );

  return (
    <RoomFrame
      wall="tv-room-cab"
      numberLabel={numberLabel}
      roomRef={roomRef}
      signage={
        <div className="tv-dv">
          <div className="tv-sign">
            <i className="tv-l" aria-hidden="true" />
            <i className="tv-r" aria-hidden="true" />
            <h2>{room.title}</h2>
            <p className="tv-tag">{room.subtitle} · {items.length} {room.unit}</p>
          </div>
        </div>
      }
      nav={nav}
    >
      <div className="tv-hutch" ref={shelfRef} data-tv-shelf="">
        <span className="tv-amb tv-bee" aria-hidden="true">🐝</span>
        {rows.map((row, r) => (
          <div key={r}>
            <div className="tv-shelfrow">
              {row.map((item, j) => token(item, r * perShelf + j, j))}
              {/* The pile occupies the last shelf's final slot, and the cards
                  it holds wait on that shelf until it deals them out. */}
              {r === rows.length - 1 && shelf.hasPile && (
                <>
                  <TreasurePile
                    variant="tv-pile-tok"
                    noun={room.noun}
                    count={shelf.extraCount}
                    hidden={status === 'open'}
                    closing={status === 'closing'}
                    horizontal
                    delay={row.length * 110}
                    onClick={onOpenPile}
                    pileRef={pileRef}
                  />
                  {extras.map((item, k) => token(item, cap + k, row.length + k))}
                </>
              )}
            </div>
            <div className="tv-ledge" data-tv-item="" aria-hidden="true" />
          </div>
        ))}
      </div>
      {status === 'open' && <TuckRow noun={room.noun} onClose={onClosePile} />}
    </RoomFrame>
  );
}

/** Which component draws which room — the section key is the museum's map. */
export const ROOM_COMPONENTS = {
  people: HallOfHeroes,
  places: MapRoom,
  news: GoodNewsPress,
  moments: HallOfTime,
  little: CabinetOfWonders,
};
