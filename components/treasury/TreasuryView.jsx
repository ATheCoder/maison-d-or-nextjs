'use client';
/**
 * TreasuryView — the /treasury page body: everything the child has hearted,
 * arranged as a small personal museum they walk through.
 *
 * The page does not scroll. The screen is a fixed, viewport-sized stage
 * holding seven full-screen halls side by side — Entrance, Room I–V, Rotunda —
 * on a horizontal track. The child moves through *door buttons* ("This way to
 * The Map Room ⟶"), which glide the whole stage sideways; arrow keys do the
 * same. Every arrival replays that room's entrance choreography, which is the
 * point: children go back and forth to watch the show again.
 *
 * Each room shows as many treasures as its stage actually fits, and only the
 * true remainder folds into that room's pile. The server can't know the
 * viewport, so it renders the old conservative caps (5/3/3/5/7) — a sensible
 * page for no-JS and no hydration mismatch — and a post-mount measuring pass
 * expands every shelf to fill the wall. A room whose stage overflows anyway
 * (a small phone, an opened pile) scrolls vertically *within its own slide*.
 *
 * Rooms with nothing saved in them are skipped entirely: the slide list, the
 * "Room N of V" numbering and the door labels are all built from the non-empty
 * groups, so a child with only postcards gets a one-room museum that still
 * reads as complete.
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
 *
 * The walls themselves live in museumRooms.jsx and museumCss.js; the approved
 * mock (docs/treasury-museum-redesign-mock.html) is the source of truth for
 * every colour, timing and keyframe in them.
 */
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import TreasuryItemModal from '@/components/treasury/TreasuryItemModal';
import { getSavedItemDetail } from '@/app/(dg)/treasury/actions';
import { useTheme } from '@/components/theme/ThemeContext';
import { MUSEUM_CSS } from '@/components/treasury/museumCss';
import { ROMAN, ROOM_COMPONENTS, SECTIONS, Sun } from '@/components/treasury/museumRooms';

/** How long the track takes to glide, in step with the CSS transition. */
const GLIDE_MS = 850;

/**
 * Checked at animation time, not render time — the server has no media
 * queries, and the CSS block carries the same guard for everything static.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether the museum is allowed to move, as a subscription rather than a
 * one-off read: a child who turns "reduce motion" on mid-visit gets a still
 * museum from the next frame. The server's answer is always "no" — it has no
 * media queries — so the HTML it sends shows every room in full, which is
 * also exactly what a browser with no JavaScript at all should get.
 */
const subscribeMotion = (onChange) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const motionAllowed = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionOnServer = () => false;

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

/* ── Fit-to-stage measuring ──────────────────────────────────────────────
   Each room shows `cols × rows` treasures, one slot given back to the pile
   whenever there is a remainder. Both numbers come from the real geometry:
   the room reports how much height its signage, footsteps and doors have
   already spent, and one rendered card reports its own footprint. The design
   footprints below are only the fallback for a room with nothing to measure.
   Bias is conservative — spare wall reads as "gallery", overflow breaks the
   stage. */

const FIT = {
  people: { colW: 138, cardH: 226, gapX: 20.8, gapY: 24, stagger: 28 },
  places: { colW: 248, cardH: 254, gapX: 30.4, gapY: 30.4, stagger: 26 },
  news: { colW: 238, cardH: 240, gapX: 17.6, gapY: 0 },
  moments: { colW: 0, cardH: 88, gapX: 0, gapY: 0 },
  little: { colW: 218, cardH: 80, gapX: 14.4, gapY: 41 },
};

const num = (value, fallback = 0) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * How much vertical room the exhibit actually has: the stage, less every
 * in-flow thing between it and the room's edges — signage, the picture rail,
 * the footsteps and doors, the hutch's own frame, the room's padding. Walking
 * the tree instead of hard-coding a per-room "chrome" number is what keeps
 * this honest when a long room name wraps or a tuck-away button appears.
 */
function exhibitBudget(roomEl, shelfEl, stageH) {
  let used = 0;
  let node = shelfEl;
  while (node && node !== roomEl) {
    const own = getComputedStyle(node);
    used += num(own.marginTop) + num(own.marginBottom);
    const parent = node.parentElement;
    if (!parent) break;
    for (const sib of parent.children) {
      if (sib === node) continue;
      const s = getComputedStyle(sib);
      if (sib.hidden || s.display === 'none' || s.position === 'absolute' || s.position === 'fixed') continue;
      used += sib.offsetHeight + num(s.marginTop) + num(s.marginBottom);
    }
    const ps = getComputedStyle(parent);
    used += num(ps.paddingTop) + num(ps.paddingBottom) + num(ps.borderTopWidth) + num(ps.borderBottomWidth);
    node = parent;
  }
  return Math.max(120, stageH - used);
}

/** Content width of an element, padding taken off. */
function contentWidth(el) {
  const s = getComputedStyle(el);
  return Math.max(0, el.clientWidth - num(s.paddingLeft) - num(s.paddingRight));
}

const fitCols = (width, colW, gapX) => Math.max(1, Math.floor((width + gapX) / (colW + gapX)));
const fitRows = (budget, rowH, gapY, lead = 0) => Math.max(1, Math.floor((budget - lead + gapY) / (rowH + gapY)));

/** `slots` places on the wall; the pile takes one of them if it is needed. */
const keepBack = (total, slots) => (total <= slots ? total : Math.max(1, slots - 1));

/**
 * Measure one room and return how many treasures belong on its wall — plus,
 * for the Cabinet, how many fit on a single ledge.
 */
function measureRoom(key, roomEl, total, stageH) {
  const shelf = roomEl.querySelector('[data-tv-shelf]');
  if (!shelf) return null;
  const f = FIT[key];
  const probe = shelf.querySelector('[data-tv-fit]');
  const budget = exhibitBudget(roomEl, shelf, stageH);
  const width = contentWidth(shelf);

  if (key === 'little') {
    // Tokens stand on wooden ledges inside the hutch: a row is one ledge
    // deep, and the ledge's own height and margins are part of every row.
    const row = shelf.querySelector('.tv-shelfrow');
    const ledge = shelf.querySelector('.tv-ledge');
    const gapX = row ? num(getComputedStyle(row).columnGap, f.gapX) : f.gapX;
    const ledgeH = ledge
      ? ledge.offsetHeight + num(getComputedStyle(ledge).marginTop) + num(getComputedStyle(ledge).marginBottom)
      : 41;
    const colW = probe?.offsetWidth || f.colW;
    const rowH = (probe?.offsetHeight || f.cardH) + ledgeH;
    const cols = fitCols(width, colW, gapX);
    const rows = fitRows(budget, rowH, 0);
    return { cap: keepBack(total, cols * rows), cols };
  }

  const cs = getComputedStyle(shelf);

  if (key === 'news') {
    // CSS columns: the column width is the one the stylesheet declares, not
    // the stretched width a rendered clipping reports. Each clipping carries
    // its own bottom margin, so that *is* the row gap.
    const gapX = num(cs.columnGap, f.gapX);
    const rowH = probe
      ? probe.offsetHeight + num(getComputedStyle(probe).marginBottom, f.gapX)
      : f.cardH;
    return { cap: keepBack(total, fitCols(width, f.colW, gapX) * fitRows(budget, rowH, 0)) };
  }

  if (key === 'moments') {
    // One plaque per line of the timeline; the row already includes the gap
    // it leaves under itself.
    const rowH = probe?.offsetHeight || f.cardH;
    return { cap: keepBack(total, fitRows(budget, rowH, 0)) };
  }

  const gapX = num(cs.columnGap, f.gapX);
  const gapY = num(cs.rowGap, f.gapY);
  const colW = probe?.offsetWidth || f.colW;
  const rowH = probe?.offsetHeight || f.cardH;
  // Staggered walls hang every other card lower, which costs one stagger of
  // height across the whole shelf.
  const cols = fitCols(width, colW, gapX);
  const rows = fitRows(budget, rowH, gapY, f.stagger ?? 0);
  return { cap: keepBack(total, cols * rows) };
}

/* ── Header flourishes ─────────────────────────────────────────────────── */

/** The collected count, ticking up from zero — a small pride moment. */
function CountUp({ value }) {
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
  return shown;
}

/* ── Doors ─────────────────────────────────────────────────────────────── */

/** Four footsteps that fall one by one after a room's show has played. */
function Footsteps() {
  return (
    <div className="tv-steps" aria-hidden="true">
      <span className="tv-step" />
      <span className="tv-step" />
      <span className="tv-step" />
      <span className="tv-step" />
    </div>
  );
}

/**
 * The way out of a room: a round "⟵" back to where the child came from, and
 * a named door onward. Naming the next room is what turns navigation into an
 * invitation rather than a control.
 */
function RoomDoors({ index, backLabel, forwardLabel, onGo }) {
  return (
    <div className="tv-roomnav">
      <Footsteps />
      <div className="tv-navrow">
        <button
          type="button"
          className="tv-door tv-door-back"
          onClick={() => onGo(index - 1)}
          aria-label={backLabel}
        >
          ⟵
        </button>
        <button type="button" className="tv-door" onClick={() => onGo(index + 1)}>
          This way to&nbsp;<b>{forwardLabel}</b>&nbsp;⟶
        </button>
      </div>
    </div>
  );
}

/* ── Slide 0: the entrance hall ────────────────────────────────────────── */

function EntranceHall({ theme, owner, ticketName, total, firstRoom, onGo }) {
  return (
    <div className="tv-stage tv-entr">
      <div className="tv-entab">Maison d&rsquo;Or</div>
      <div className="tv-facade">
        <div className="tv-col" aria-hidden="true" />
        <div style={{ alignSelf: 'center' }}>
          <div className="tv-hdr">
            <span className="tv-sunspin"><Sun theme={theme} /></span>
            <h1>My Treasury</h1>
            <span className="tv-sunspin tv-sunspin-rev"><Sun theme={theme} /></span>
          </div>
          <p className="tv-sub">{owner} personal museum</p>
        </div>
        <div className="tv-col" aria-hidden="true" />
      </div>
      {/* The ticket tears in on arrival — the small ceremony that makes the
          visit feel like one. */}
      <div className="tv-ticket">
        <p className="tv-t-a">✦ Admit One ✦</p>
        <p className="tv-t-b">{ticketName} · {total} {total === 1 ? 'treasure' : 'treasures'} inside</p>
      </div>
      <div className="tv-roomnav">
        <Footsteps />
        <div className="tv-navrow">
          <button type="button" className="tv-door tv-door-lg" onClick={() => onGo(1)}>
            Begin your visit —&nbsp;<b>{firstRoom}</b>&nbsp;⟶
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Last slide: the rotunda ───────────────────────────────────────────── */

function Rotunda({ theme, ticketName, total, index, backLabel, onGo }) {
  return (
    <div className="tv-stage tv-rot">
      <div className="tv-ring">
        <span className="tv-n"><CountUp value={total} /></span>
        <span className="tv-lbl">{total === 1 ? 'Treasure' : 'Treasures'}</span>
        <span className="tv-lbl2">and counting…</span>
      </div>
      <div className="tv-afterring">
        <p className="tv-curated">Curated by {ticketName}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', margin: '0.9rem 0 0' }}>
          <Sun theme={theme} size={16} />
          <p className="tv-close">Every treasure tells a story</p>
          <Sun theme={theme} size={16} />
        </div>
        <div className="tv-roomnav">
          <div className="tv-navrow">
            <button
              type="button"
              className="tv-door tv-door-back"
              onClick={() => onGo(index - 1)}
              aria-label={backLabel}
            >
              ⟵
            </button>
            <button type="button" className="tv-door" onClick={() => onGo(0)}>
              Visit again —&nbsp;<b>back to the entrance</b>&nbsp;⟲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── The empty museum ──────────────────────────────────────────────────── */

function EmptyTreasury({ owner }) {
  return (
    <div style={{ margin: 'auto', textAlign: 'center', padding: '3rem 1rem 4rem' }}>
      <span aria-hidden="true" style={{ display: 'block', fontSize: '3rem', marginBottom: '1.2rem', opacity: 0.65 }}>🏛️</span>
      <h2 style={{
        fontFamily: 'var(--tv-fontH)', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
        fontWeight: 600, color: 'var(--tv-headline)', margin: '0 0 0.6rem',
      }}>
        {owner} Treasury awaits
      </h2>
      <p style={{
        fontFamily: 'var(--tv-fontB)', fontWeight: 300, fontSize: '0.92rem',
        color: 'var(--tv-body)', lineHeight: 1.8, margin: '0 auto 1.75rem', maxWidth: 420,
      }}>
        Tap the gold hearts on people, places, and stories you love. They&rsquo;ll appear here in your personal museum.
      </p>
      <Link
        href="/daily-gold-edition"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 44, padding: '0 1.5rem', borderRadius: 22,
          background: 'var(--tv-gold-25)', border: '1px solid var(--tv-gold-40)',
          fontFamily: 'var(--tv-fontB)', fontSize: '0.88rem', color: 'var(--tv-body)',
          textDecoration: 'none',
        }}
      >
        Explore today&rsquo;s Daily Gold
      </Link>
    </div>
  );
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
  const ticketName = childName || 'You';

  const groups = SECTIONS
    .map(section => ({
      ...section,
      items: items.filter(item => section.types.includes(item.item_type)),
    }))
    .filter(section => section.items.length > 0);

  const slideCount = groups.length + 2;
  const rotundaIndex = slideCount - 1;

  // Every visit starts at the entrance: the ritual is the point, so the
  // current room is deliberately not remembered between visits.
  const [current, setCurrent] = useState(0);
  // Present only when motion is welcome. Its absence is the reduced-motion
  // *and* the no-JS path: without it nothing is ever animated into hiding.
  const motion = useSyncExternalStore(subscribeMotion, motionAllowed, motionOnServer);
  const [gliding, setGliding] = useState(false);

  // How many treasures each room puts on its wall. The server's conservative
  // caps ship first; the measuring pass below expands them to the real stage.
  const [caps, setCaps] = useState(() => {
    const seed = { littleCols: 4 };
    SECTIONS.forEach((s) => { seed[s.key] = s.cap; });
    return seed;
  });

  // Per-room pile state: absent = closed, 'open', or 'closing' while the
  // cards fly home. The pile's screen position is captured in the click
  // handler — before React re-renders the extras into the layout it flies from.
  const [status, setStatus] = useState({});

  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const roomRefs = useRef({});
  const shelfRefs = useRef({});
  const pileRefs = useRef({});
  const flipFrom = useRef(null);
  // `current` is also needed synchronously inside go(), before React has
  // re-rendered with it.
  const currentRef = useRef(0);
  // Set when the child walked out of a room using a keyboard: the door they
  // pressed is about to go inert, so focus has to be handed to the new room.
  const focusOnArrival = useRef(false);

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

  /* ── Movement ──────────────────────────────────────────────────────── */

  const go = useCallback((index) => {
    if (index < 0 || index >= slideCount || index === currentRef.current) return;
    const leaving = slideRefs.current[currentRef.current];
    focusOnArrival.current = !!(leaving && document.activeElement && leaving.contains(document.activeElement));
    currentRef.current = index;
    // An opened pile is tucked back as the child walks out: the next room
    // should not be arrived at from behind a wall of dealt-out cards.
    setStatus({});
    setGliding(true);
    setCurrent(index);
  }, [slideCount]);

  useEffect(() => {
    if (!gliding) return undefined;
    const t = setTimeout(() => setGliding(false), reducedMotion() ? 0 : GLIDE_MS);
    return () => clearTimeout(t);
  }, [gliding, current]);

  /**
   * Arriving in a room replays its whole entrance show; leaving strips the
   * classes that drive it, which is exactly what lets it play again next time.
   * Done to the DOM rather than through state so that walking the museum
   * never re-renders seven halls' worth of cards.
   */
  useLayoutEffect(() => {
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const stage = slide.querySelector('.tv-stage');
      const items_ = slide.querySelectorAll('[data-tv-item]');
      if (i === current) {
        slide.scrollTop = 0;
        stage?.classList.add('tv-enter');
        items_.forEach((el) => el.classList.add('tv-in'));
      } else {
        stage?.classList.remove('tv-enter');
        items_.forEach((el) => el.classList.remove('tv-in'));
      }
    });
    // The door that was just pressed is now behind an inert wall, so the
    // arriving hall takes the focus rather than dropping it on <body>.
    if (focusOnArrival.current) {
      focusOnArrival.current = false;
      slideRefs.current[current]?.focus({ preventScroll: true });
    }
  }, [current, caps, motion, groups.length]);

  // Arrow keys walk the museum too — but not while a modal owns the screen,
  // and not while the child is typing somewhere.
  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const onKey = (e) => {
      if (modal) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // The ref, not the rendered `current`: two presses in the same tick
      // would otherwise both aim at the room the child has already left.
      if (e.key === 'ArrowRight') { e.preventDefault(); go(currentRef.current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(currentRef.current - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, modal, slideCount]);

  /* ── Fit-to-stage ──────────────────────────────────────────────────── */

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const stageH = viewport.clientHeight;
    if (stageH < 80) return;
    setCaps((prev) => {
      const next = { ...prev };
      let changed = false;
      groups.forEach((section) => {
        const roomEl = roomRefs.current[section.key];
        if (!roomEl) return;
        const fit = measureRoom(section.key, roomEl, section.items.length, stageH);
        if (!fit) return;
        // Measuring only ever *expands* a shelf. A tall card on a short phone
        // can measure out at a single slot, and one lonely portrait beside a
        // pile of sixteen is a worse room than the server's conservative
        // guess — that guess is the floor, and the slide scrolls if it must.
        const cap = Math.min(section.items.length, Math.max(section.cap, fit.cap));
        if (cap !== prev[section.key]) { next[section.key] = cap; changed = true; }
        if (section.key === 'little' && fit.cols !== prev.littleCols) { next.littleCols = fit.cols; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [groups]);

  // ResizeObserver fires once on observe, which is the post-mount measuring
  // pass; after that only a real resize re-measures, debounced so a dragged
  // window doesn't re-lay the museum out on every frame.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 180);
    });
    ro.observe(viewport);
    measure();
    return () => { clearTimeout(timer); ro.disconnect(); };
    // measure() closes over `groups`, which is rebuilt every render; the
    // observer only needs re-arming when the museum's shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  // A re-layout keeps the child in the room they are standing in, and the
  // track jumps there without a glide — a shelf refilling itself is not a
  // journey.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    track.style.transition = 'none';
    const raf = requestAnimationFrame(() => { track.style.transition = ''; });
    return () => cancelAnimationFrame(raf);
  }, [caps]);

  /* ── The piles ─────────────────────────────────────────────────────── */

  const openPile = (key) => {
    const pile = pileRefs.current[key];
    if (pile && !reducedMotion()) {
      const r = pile.getBoundingClientRect();
      flipFrom.current = { key, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      spawnSparkles(flipFrom.current.x, flipFrom.current.y);
    }
    // The room's seal takes the knock — a wobble, not a re-render.
    const seal = roomRefs.current[key]?.querySelector('.tv-seal');
    if (seal) {
      seal.classList.add('tv-wobble');
      setTimeout(() => seal.classList.remove('tv-wobble'), 720);
    }
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
    const shelf = shelfRefs.current[from.key];
    if (!shelf) return;
    shelf.querySelectorAll('[data-tv-extra]').forEach((el, i) => {
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

    const shelf = shelfRefs.current[key];
    const pile = pileRefs.current[key];
    const extras = shelf ? [...shelf.querySelectorAll('[data-tv-extra]')] : [];
    const finish = () => {
      closingHandled.current.delete(key);
      extras.forEach((el) => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; });
      setStatus((s) => ({ ...s, [key]: undefined }));
      // The room just shrank back to one screen — put the child at the top of
      // it rather than leaving them stranded over whatever scrolled into view.
      slideRefs.current[current]?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
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
  }, [status, current]);

  /* ── Render ────────────────────────────────────────────────────────── */

  const gold = theme.accentGold;
  const vars = {
    '--tv-gold': gold,
    '--tv-gold-08': `${gold}08`,
    '--tv-gold-0e': `${gold}0E`,
    '--tv-gold-14': `${gold}14`,
    '--tv-gold-1f': `${gold}1F`,
    '--tv-gold-22': `${gold}22`,
    '--tv-gold-25': `${gold}25`,
    '--tv-gold-30': `${gold}30`,
    '--tv-gold-33': `${gold}33`,
    '--tv-gold-3d': `${gold}3D`,
    '--tv-gold-40': `${gold}40`,
    '--tv-gold-44': `${gold}44`,
    '--tv-gold-4a': `${gold}4A`,
    '--tv-gold-55': `${gold}55`,
    '--tv-gold-66': `${gold}66`,
    '--tv-gold-77': `${gold}77`,
    '--tv-gold-88': `${gold}88`,
    '--tv-gold-99': `${gold}99`,
    '--tv-bg': theme.bgPrimary,
    '--tv-soft': theme.bgSoft,
    '--tv-card': theme.bgCard,
    '--tv-card-b0': `${theme.bgCard}B0`,
    '--tv-headline': theme.textHeadline,
    '--tv-body': theme.textBody,
    '--tv-muted': theme.textMuted,
    '--tv-fontH': theme.fontHeadline,
    '--tv-fontB': theme.fontBody,
    '--tv-radius-sm': theme.radiusSmall,
    '--tv-shadow': theme.shadow,
    '--tv-shadowSoft': theme.shadowSoft,
    '--tv-shadowDeep': theme.shadowDeep,
  };

  const slide = (key, index, children) => (
    <section
      key={key}
      className="tv-slide"
      ref={(el) => { slideRefs.current[index] = el; }}
      tabIndex={-1}
      /* Offstage halls are out of reach: no stray tab stops behind the wall. */
      inert={index === current ? undefined : true}
    >
      <div className="tv-sinner">{children}</div>
    </section>
  );

  return (
    /* A <div>, not a <main> — DGPageShell owns the page's <main> landmark. */
    <div ref={rootRef} className={motion ? 'tv-museum tv-js' : 'tv-museum'} style={vars}>
      <style>{MUSEUM_CSS}</style>

      {groups.length === 0 ? (
        <EmptyTreasury owner={owner} />
      ) : (
        <div className="tv-viewport" ref={viewportRef}>
          <div
            className={gliding ? 'tv-track tv-gliding' : 'tv-track'}
            ref={trackRef}
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slide('entrance', 0, (
              <EntranceHall
                theme={theme}
                owner={owner}
                ticketName={ticketName}
                total={items.length}
                firstRoom={groups[0].title}
                onGo={go}
              />
            ))}

            {groups.map((section, i) => {
              const Room = ROOM_COMPONENTS[section.key];
              const index = i + 1;
              const forward = groups[i + 1]?.title ?? 'The Rotunda';
              const back = i === 0 ? 'Back to the entrance' : `Back to ${groups[i - 1].title}`;
              return slide(section.key, index, (
                <Room
                  room={section}
                  items={section.items}
                  cap={caps[section.key]}
                  cols={caps.littleCols}
                  numberLabel={`Room ${ROMAN[i]} of ${ROMAN[groups.length - 1]}`}
                  status={status[section.key]}
                  onOpenPile={() => openPile(section.key)}
                  onClosePile={() => closePile(section.key)}
                  onOpenItem={openItemModal}
                  roomRef={(el) => { roomRefs.current[section.key] = el; }}
                  shelfRef={(el) => { shelfRefs.current[section.key] = el; }}
                  pileRef={(el) => { pileRefs.current[section.key] = el; }}
                  nav={<RoomDoors index={index} backLabel={back} forwardLabel={forward} onGo={go} />}
                />
              ));
            })}

            {slide('rotunda', rotundaIndex, (
              <Rotunda
                theme={theme}
                ticketName={ticketName}
                total={items.length}
                index={rotundaIndex}
                backLabel={`Back to ${groups[groups.length - 1].title}`}
                onGo={go}
              />
            ))}
          </div>
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
    </div>
  );
}
