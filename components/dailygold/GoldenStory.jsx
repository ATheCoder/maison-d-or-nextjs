'use client';
/**
 * GoldenStory — a children's illustrated biography rendered as an open
 * storybook. Ported from the Maison d'Oré "Golden Story" design template
 * (templates/golden-story/GoldenStory.dc.html): a leather-bound book of
 * parchment spreads you flip through — cover, one spread per chapter, a life
 * timeline, treasures & lessons, and a closing page.
 *
 * The person is fetched on the server (SSR, via Drizzle) and passed in as
 * `story` (a BornTodayPerson). Real `image_url`s render in place of the
 * template's parchment placeholders when present.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

const SHAPES = ['sh-circle', 'sh-diamond', 'sh-tri', 'sh-square'];
const STAR = '✦'; // ✦
const BOOK_W = 1300;
const BOOK_H = 866;

// Strip leading/trailing decoration (~, dashes, quotes) the source sometimes carries.
function cleanQuote(str) {
  if (!str) return '';
  return String(str).replace(/^[\s~"'“”‚‘’\-–—]+/, '').replace(/[\s"'“”]+$/, '').trim();
}

function titleCase(str) {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function splitParas(narrative) {
  if (!narrative) return [];
  return String(narrative).split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

// Render one paragraph. A blank line (\n\n) already split the text into
// separate <p>s upstream; here a *single* \n becomes a hard line break
// (<br>) within the paragraph. Spaces hugging the newline are dropped so
// "1452,\n in a small" breaks cleanly with no leading space on the next line.
function Para({ text }) {
  const lines = String(text).split(/[ \t]*\n[ \t]*/);
  return (
    <p>
      {lines.map((line, i) => (
        <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>
      ))}
    </p>
  );
}

// An illustration plate: the real image if we have one, else the parchment
// placeholder that names what belongs there.
function Plate({ className = '', art, src, vignette = true }) {
  // Pipeline art (webp/png, see docs/golden-story-art-pipeline.md) carries
  // its own alpha edge fade: no parchment card behind it, no crop, and
  // multiply-blend so pale washes take on the page's own tone.
  const alpha = !!src && /\.(webp|png)(\?|$)/i.test(src);
  return (
    <div className={`plate ${alpha ? 'plate-alpha' : vignette ? 'plate-vignette' : ''} ${className}`}>
      {src
        ? <img className="plate-img" src={src} alt={art || ''} />
        : <span className="ph-tag">{art}</span>}
    </div>
  );
}

export default function GoldenStory({ story }) {
  const [cur, setCur] = useState(0);
  const scaleRef = useRef(null);

  // ── Map the person onto the book's content model ──────────────────────────
  const name = story?.name || 'A Golden Life';
  const first = name.split(' ')[0];
  const role = story?.role || story?.field || '';
  const storyTitle = story?.story_title || name;
  const quote = cleanQuote(story?.famous_quote);
  const childhood = story?.story_childhood || '';
  const childhoodTitle = story?.story_childhood_title || 'Where the Story Begins';
  const takeaway = cleanQuote(story?.story_takeaway);
  const modern = story?.modern_interpretation || '';

  const birthLabel = story?.birth_date
    ? `b. ${story.birth_date}${story.death_year ? ` – ${story.death_year}` : ''}`
    : '';
  const coverSub = [role, story?.country, birthLabel].filter(Boolean).join('  ·  ');

  const chapters = (story?.chapters || []).map((c, i) => ({
    number: c.number ?? i + 1,
    title: c.title || '',
    paras: splitParas(c.narrative),
    art: `Scene — ${c.title || `Chapter ${i + 1}`}`,
    src: c.image_url || null,
    // Page layout for the chapter (`page_span` in the data):
    //   'both'   — one full-bleed spread: art as background across BOTH leaves,
    //              text overlaid (see .page-chapter-full).
    //   'single' — art + text confined to ONE leaf; two consecutive
    //              single-span chapters pair up to fill a spread.
    //   default  — the classic two-page split: narrative left, illustration right.
    span: c.page_span === 'both' ? 'both' : c.page_span === 'single' ? 'single' : 'default',
  }));
  const timeline = (story?.timeline || []).filter((t) => t.year || t.caption);
  const treasures = (story?.treasures || []).filter((t) => t.name);
  const lessons = (story?.lessons || []).map((l, i) => ({
    icon: titleCase(l.icon_name),
    lesson: l.lesson || '',
    shape: SHAPES[i % SHAPES.length],
  }));

  const hasTimeline = timeline.length > 0;
  const hasTreasures = treasures.length > 0;
  const hasLessons = lessons.length > 0 || !!modern;

  // Total leaves (numbered pages), so "n / TOTAL" is honest for any story.
  const middleCount = (hasTimeline ? 1 : 0) + (hasTreasures ? 1 : 0) + (hasLessons ? 1 : 0);
  // A default chapter consumes two numbered pages; a both/single-span chapter
  // consumes one (a both-span is one full spread, a single-span is one leaf).
  const chapterPageCount = chapters.reduce((n, c) => n + (c.span === 'default' ? 2 : 1), 0);
  const TOTAL = 2 + chapterPageCount + 2 * middleCount;
  let pageNo = 0;
  const P = () => `${++pageNo} / ${TOTAL}`;

  // ── Build the spreads (JSX), assigning page numbers left→right in order ────
  const spreads = [];
  const add = (label, cls, inner) => {
    const idx = spreads.length;
    spreads.push(
      <div key={idx} className={`spread ${cls} ${idx === cur ? 'on' : ''}`} data-screen-label={label}>
        {inner}
      </div>
    );
  };

  // Cover + opening (childhood) spread.
  {
    const rNum = P();
    add('Cover', '', (
      <>
        <div className="page page-cover">
          {story?.image_url
            ? <img className="cover-img" src={story.image_url} alt={name} />
            : <div className="plate plate-cover"><span className="ph-tag">{`COVER — young ${first} in their world`}</span></div>}
          <div className="cover-grad" />
          <div className="cover-head">
            <p className="cover-eyebrow">Born on this day</p>
            <h1 className="cover-title">{storyTitle}</h1>
            {coverSub && <p className="cover-sub">{coverSub}</p>}
          </div>
          <p className="cover-cta">{`Begin the story →`}</p>
        </div>
        <div className="page page-text">
          <span className="pg-num">{rNum}</span>
          <h2 className="pg-title">{childhoodTitle}</h2>
          <div className="ornament"><i /><b>{STAR}</b><i /></div>
          <div className="pg-body">
            {splitParas(childhood).map((para, j) => <Para key={j} text={para} />)}
          </div>
          <Plate className="plate-strip" art={`Soft landscape of ${story?.country || 'home'}`} src={story?.childhood_image_url || null} />
        </div>
      </>
    ));
  }

  // One full-bleed leaf (half a spread): the illustration is the leaf's
  // background and the text overlays it. Used for single-span chapters, which
  // pair up two-per-spread.
  const singleLeaf = (ch, num, side) => (
    <div key={side} className={`page-chapter-single ${side}`}>
      {ch.src
        ? <img className="chapter-bg" src={ch.src} alt={ch.art} />
        : <div className="plate plate-cover"><span className="ph-tag">{ch.art}</span></div>}
      <div className="chapter-wash" />
      <span className={`pg-num ${side === 'right' ? 'pg-num-r' : ''}`}>{num}</span>
      <div className="chapter-overlay">
        <h2 className="pg-title">{ch.title}</h2>
        <div className="ornament"><i /><b>{STAR}</b><i /></div>
        <div className="pg-body">
          {ch.paras.map((para, j) => <Para key={j} text={para} />)}
        </div>
      </div>
    </div>
  );

  // Walk the chapters. Default chapters and both-span chapters are each their
  // own spread; single-span chapters are grouped two-per-spread (left + right).
  let ci = 0;
  while (ci < chapters.length) {
    const ch = chapters[ci];

    // 'single' — one leaf; pair with the next chapter if it's also single-span.
    if (ch.span === 'single') {
      const partner = chapters[ci + 1]?.span === 'single' ? chapters[ci + 1] : null;
      const lNum = P();
      const rNum = partner ? P() : null;
      add(`Chapter ${ch.number}`, 'spread-single', (
        <>
          {singleLeaf(ch, lNum, 'left')}
          {partner ? singleLeaf(partner, rNum, 'right') : <div className="page" />}
        </>
      ));
      ci += partner ? 2 : 1;
      continue;
    }

    // 'both' — one full-bleed spread, art as background across both leaves.
    if (ch.span === 'both') {
      const nNum = P();
      add(`Chapter ${ch.number}`, 'spread-full', (
        <div className="page-span page-chapter-full">
          {ch.src
            ? <img className="chapter-bg" src={ch.src} alt={ch.art} />
            : <div className="plate plate-cover"><span className="ph-tag">{ch.art}</span></div>}
          <div className="chapter-wash" />
          <span className="pg-num">{nNum}</span>
          <div className="chapter-overlay">
            <h2 className="pg-title">{ch.title}</h2>
            <div className="ornament"><i /><b>{STAR}</b><i /></div>
            <div className="pg-body">
              {ch.paras.map((para, j) => <Para key={j} text={para} />)}
            </div>
          </div>
        </div>
      ));
      ci += 1;
      continue;
    }

    // default — classic two-page split: narrative left, illustration right.
    const lNum = P();
    const rNum = P();
    add(`Chapter ${ch.number}`, '', (
      <>
        <div className="page page-text">
          <span className="pg-num">{lNum}</span>
          <p className="ch-label">{`Chapter ${ch.number}`}</p>
          <h2 className="pg-title">{ch.title}</h2>
          <div className="ornament"><i /><b>{STAR}</b><i /></div>
          <div className="pg-body dropcap">
            {ch.paras.map((para, j) => <Para key={j} text={para} />)}
          </div>
        </div>
        <div className="page page-image">
          <span className="pg-num pg-num-r">{rNum}</span>
          <Plate className="plate-fill" art={ch.art} src={ch.src} />
        </div>
      </>
    ));
    ci += 1;
  }

  // Life timeline (spans the whole spread).
  if (hasTimeline) {
    const lNum = P();
    const rNum = P();
    add('Timeline', '', (
      <div className="page-span page-timeline">
        <span className="pg-num">{lNum}</span>
        <span className="pg-num pg-num-r">{rNum}</span>
        <h2 className="span-title">{`${first}’s Life Journey`}</h2>
        <div className="ornament center"><i /><b>{STAR}</b><i /></div>
        <div className="tl-track">
          {timeline.map((t, i) => (
            <div key={i} className="tl-item">
              <Plate className="tl-plate" art={t.year} src={t.image_url || null} />
              <div className="tl-dot" />
              <p className="tl-year">{t.year}</p>
              <p className="tl-cap">{t.caption}</p>
            </div>
          ))}
        </div>
        {quote && (
          <p className="tl-quote">{`“${quote}”`} <span>{`— ${name}`}</span></p>
        )}
      </div>
    ));
  }

  // Treasures left behind: gallery left, reflection right.
  if (hasTreasures) {
    const lNum = P();
    const rNum = P();
    add('Treasures', '', (
      <>
        <div className="page page-text">
          <span className="pg-num">{lNum}</span>
          <h2 className="pg-title">Treasures Left Behind</h2>
          <div className="ornament"><i /><b>{STAR}</b><i /></div>
          <p className="tr-intro">{`${first} left the world more than memories — gifts, ideas, and wonders that still inspire people today.`}</p>
          <div className="tr-grid">
            {treasures.map((t, i) => (
              <div key={i} className="tr-cell">
                <Plate className="tr-plate" art={t.name} src={t.image_url || null} />
                <p className="tr-name">{t.name}</p>
              </div>
            ))}
          </div>
          {takeaway && <p className="tr-stamp">{`${STAR} ${takeaway}`}</p>}
        </div>
        <div className="page page-text">
          <span className="pg-num pg-num-r">{rNum}</span>
          <h2 className="pg-title">Gifts That Live On</h2>
          <div className="ornament"><i /><b>{STAR}</b><i /></div>
          <div className="pg-body">
            <p>{`Long after ${first} was gone, these gifts kept inspiring the world.`}</p>
            <p>Because the world will always need dreamers who dare to see what others cannot.</p>
          </div>
          <Plate className="plate-strip" art="Treasures fading into a sunlit landscape" src={story?.treasures_image_url || null} />
        </div>
      </>
    ));
  }

  // "If they were ten today" + the little golden lessons band.
  if (hasLessons) {
    const lNum = P();
    const rNum = P();
    add('If they were ten today', '', (
      <div className="page-span page-lessons">
        <span className="pg-num">{lNum}</span>
        <span className="pg-num pg-num-r">{rNum}</span>
        <div className="ls-top">
          <div className="ls-left">
            <h2 className="pg-title">{`If ${first} Were 10 Today`}</h2>
            <div className="ornament"><i /><b>{STAR}</b><i /></div>
            <div className="pg-body">
              {splitParas(modern).map((para, j) => <Para key={j} text={para} />)}
            </div>
          </div>
          <div className="ls-right">
            <Plate art={`${first} as a modern ten-year-old explorer`} />
          </div>
        </div>
        {lessons.length > 0 && (
          <div className="ls-band">
            <p className="ls-band-title">{`What Can We Learn From ${first}?`}</p>
            <div className="ls-row">
              {lessons.map((l, i) => (
                <div key={i} className="ls-item">
                  <div className="ls-ic"><span className={l.shape} /></div>
                  {l.icon && <p className="ls-label">{l.icon}</p>}
                  <p className="ls-text">{l.lesson}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ));
  }

  // Closing page.
  {
    const lNum = P();
    add('The End', '', (
      <div className="page-span page-closing">
        <span className="pg-num">{lNum}</span>
        <div className="close-star">{STAR}</div>
        {takeaway && <p className="close-take">{takeaway}</p>}
        <div className="ornament center"><i /><b>{STAR}</b><i /></div>
        <p className="close-end">The End</p>
        <p className="close-name">{`A Golden Story · ${name}`}</p>
      </div>
    ));
  }

  const count = spreads.length;
  const go = useCallback(
    (dir) => setCur((s) => Math.max(0, Math.min(count - 1, s + dir))),
    [count]
  );

  // Fit the fixed-size book into the viewport, and wire keyboard navigation.
  useEffect(() => {
    const fit = () => {
      const el = scaleRef.current;
      if (!el) return;
      const s = Math.min((window.innerWidth - 40) / BOOK_W, (window.innerHeight - 40) / BOOK_H);
      el.style.transform = `scale(${s})`;
    };
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { go(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(-1); }
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
    };
  }, [go]);

  if (!story) return null;

  return (
    <div className="book-stage">
      <style>{CSS}</style>

      <button className="nav nav-prev" onClick={() => go(-1)} aria-label="Previous page">{'‹'}</button>

      <div className="book-scale" ref={scaleRef}>
        <div className="book">
          <div className="book-leather" />
          <div className="book-body">
            {spreads}

            <div className="book-frame">
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <span key={pos} className={`corner ${pos}`}>
                  <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
                    <path d="M6 6 C 48 28 84 58 124 140" stroke="#9aa06a" strokeWidth="1.4" fill="none" opacity=".8" />
                    <g fill="#a6ac72" opacity=".8">
                      <path d="M30 26 C 44 12 62 13 70 22 C 59 35 40 37 30 26 Z" />
                      <path d="M52 54 C 67 41 85 44 91 54 C 79 66 60 66 52 54 Z" />
                      <path d="M74 86 C 91 76 107 80 111 90 C 99 100 82 98 74 86 Z" />
                      <path d="M18 46 C 8 36 8 21 16 15 C 27 25 28 41 18 46 Z" />
                      <path d="M42 78 C 30 70 28 53 36 47 C 47 57 51 72 42 78 Z" />
                    </g>
                  </svg>
                </span>
              ))}
              <div className="spine" />
            </div>
          </div>
        </div>
      </div>

      <button className="nav nav-next" onClick={() => go(1)} aria-label="Next page">{'›'}</button>
      <div className="book-progress">{`${cur + 1} / ${count}`}</div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Lato:wght@300;400;700&family=Great+Vibes&display=swap');

.book-stage {
  --parch: #efe4c8; --parch2: #e4d6b3; --ink: #5c4a30; --ink-soft: #7c6746;
  --head: #a07a38; --head-deep: #7c5a28; --gold: #b9975a; --leaf: #9aa06a;
  --serif: "Playfair Display", Georgia, serif;
  --sans: Lato, "Source Sans 3", sans-serif;
  --script: "Great Vibes", cursive;
  position: fixed; inset: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 35%, #3c2c1d 0%, #1c130c 68%, #110a05 100%);
  font-family: var(--sans);
}
.book-stage * { box-sizing: border-box; }

.book-scale { transform-origin: center center; }
.book { position: relative; width: 1300px; height: 866px; --leather: #241812; }

.book-leather {
  position: absolute; inset: -28px; border-radius: 16px;
  background: linear-gradient(135deg, #3a281c 0%, var(--leather) 55%, #170f0a 100%);
  box-shadow: 0 46px 100px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.05);
}
.book-leather::after {
  content: ""; position: absolute; inset: 13px; border-radius: 9px;
  border: 1px solid rgba(201,169,110,.20);
}
.book-body {
  position: absolute; inset: 0; border-radius: 5px 9px 9px 5px; overflow: hidden;
  box-shadow: 0 12px 34px rgba(0,0,0,.4);
}

.spread {
  position: absolute; inset: 0; display: flex;
  opacity: 0; pointer-events: none; transition: opacity .55s ease;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.06'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E") repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='560'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' stitchTiles='stitch' seed='7'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.05'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E") repeat,
    radial-gradient(ellipse 62% 52% at 24% 26%, rgba(255,251,238,.55), transparent 60%),
    radial-gradient(ellipse 60% 55% at 80% 78%, rgba(120,90,50,.10), transparent 55%),
    linear-gradient(180deg, var(--parch), var(--parch2));
}
.spread.on { opacity: 1; pointer-events: auto; }
.spread::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 130px rgba(90,60,25,.26), inset 0 0 44px rgba(70,45,20,.16);
}

/* Each leaf is exactly half the spread. flex-basis:50% (not flex:1 / basis 0%)
   keeps the fold on the true centre — with basis 0%, a padded page grows ~half
   its own padding past centre, shoving the facing image page off the binder. */
.page { position: relative; flex: 1 1 50%; min-width: 0; padding: 52px 60px; overflow: hidden; display: flex; flex-direction: column; }
.spread > .page:first-child:not(.page-cover) { padding-right: 88px; }
.spread > .page:first-child:not(.page-cover) .pg-num { left: 58px; }
.spread > .page + .page { padding-left: 88px; }
.spread > .page + .page .plate-strip { margin-left: -88px; }
.spread > .page:first-child:not(.page-cover) .plate-strip { margin-right: -88px; }
.pg-num { position: absolute; top: 34px; left: 58px; font-family: var(--serif); font-size: 13px; letter-spacing: .16em; color: var(--head-deep); opacity: .55; z-index: 4; }
.pg-num-r { left: auto; right: 58px; }

.pg-title { font-family: var(--serif); font-weight: 700; font-size: 37px; line-height: 1.08; color: var(--head-deep); margin: 44px 0 0; letter-spacing: -.01em; }
.ch-label { font-family: var(--serif); font-size: 12px; letter-spacing: .26em; text-transform: uppercase; color: var(--gold); margin: 40px 0 4px; }
.ch-label + .pg-title { margin-top: 0; }
.ornament { display: flex; align-items: center; gap: 10px; margin: 15px 0 22px; }
.ornament i { height: 1px; width: 44px; background: linear-gradient(90deg, transparent, var(--gold)); display: block; }
.ornament i:last-child { background: linear-gradient(90deg, var(--gold), transparent); }
.ornament b { color: var(--gold); font-size: 13px; line-height: 1; }
.ornament.center { justify-content: center; }

.pg-body { font-family: var(--sans); flex: 1; overflow-y: auto; padding-right: 6px; min-height: 0; }
.pg-body p { font-size: 16.5px; line-height: 1.78; color: var(--ink); margin: 0 0 15px; font-weight: 400; }
.pg-body::-webkit-scrollbar { width: 5px; }
.pg-body::-webkit-scrollbar-thumb { background: rgba(185,151,90,.4); border-radius: 4px; }
.dropcap p:first-child::first-letter { font-family: var(--serif); font-weight: 700; font-size: 58px; float: left; line-height: .78; padding: 6px 10px 0 0; color: var(--head); }

.plate { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;
  background:
    repeating-linear-gradient(48deg, rgba(120,90,45,.06) 0 9px, transparent 9px 18px),
    linear-gradient(158deg, #d9c49b 0%, #c6ac7d 60%, #b89e70 100%);
}
.plate-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.plate-vignette {
  -webkit-mask-image: radial-gradient(ellipse 82% 86% at 50% 46%, #000 50%, rgba(0,0,0,.35) 76%, transparent 100%);
  mask-image: radial-gradient(ellipse 82% 86% at 50% 46%, #000 50%, rgba(0,0,0,.35) 76%, transparent 100%);
}
.plate-alpha { background: none; }
.plate-alpha .plate-img { object-fit: contain; mix-blend-mode: multiply; }
.ph-tag { font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: .07em; text-transform: uppercase; color: #7c5a28; background: rgba(255,250,238,.72); padding: 5px 10px; border-radius: 20px; border: 1px solid rgba(185,151,90,.4); max-width: 78%; text-align: center; line-height: 1.5; position: relative; z-index: 2; }

.page-cover { padding: 0; }
.plate-cover { position: absolute; inset: 0; }
.cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 42%; }
.cover-grad { position: absolute; inset: 0; z-index: 2; background: linear-gradient(180deg, rgba(28,18,9,.42) 0%, rgba(28,18,9,.05) 28%, transparent 50%, rgba(24,15,7,.55) 100%); }
.cover-head { position: absolute; top: 54px; left: 52px; right: 52px; z-index: 3; }
.cover-eyebrow { font-family: var(--serif); font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: #f1e4c2; margin: 0 0 12px; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
.cover-title { font-family: var(--serif); font-weight: 700; font-size: 50px; line-height: 1.02; color: #fbf3df; margin: 0; text-shadow: 0 2px 16px rgba(0,0,0,.5); }
.cover-sub { font-family: var(--serif); font-style: italic; font-size: 15px; color: #efe0bc; margin: 14px 0 0; letter-spacing: .02em; text-shadow: 0 1px 8px rgba(0,0,0,.5); }
.cover-cta { position: absolute; bottom: 46px; left: 52px; z-index: 3; font-family: var(--script); font-size: 31px; color: #f4e7c6; text-shadow: 0 2px 10px rgba(0,0,0,.5); margin: 0; }

.page-image { padding: 0; }
.spread > .page + .page.page-image { padding: 0; }
.plate-fill { position: absolute; inset: 0; border-radius: 0; }
.page-image .pg-num-r { top: 24px; right: 24px; color: #f4e7c6; opacity: .85; text-shadow: 0 1px 5px rgba(0,0,0,.55); }
/* Full-page chapter art fills the whole page — right to the binder — rather than
   being letterboxed or edge-faded. Drop the vignette mask so the image reaches
   every edge, and cover the box (alpha art too) so nothing is left letterboxed. */
.page-image .plate-vignette { -webkit-mask-image: none; mask-image: none; }
.page-image .plate-img { object-fit: cover; }
/* Break out of the page padding so the strip sits flush against the page's
   bottom and side edges — a full-bleed band. margin-top:auto keeps it pinned to
   the bottom of the flex column (body text stays above it); the negative side/
   bottom margins reach the page edges (side margins are refined per page below).
   No vignette/alpha treatment here: the band must reach both edges, not fade. */
.plate-strip { margin: auto -60px -52px; height: auto; border-radius: 0; flex-shrink: 0; -webkit-mask-image: none; mask-image: none; background: none; display: block; }
/* Let the image drive its own height (full page width, natural aspect ratio,
   never clamped) and multiply onto the parchment so the paper tone shows
   through. margin-top:auto still pins it to the page bottom as a flex item. */
.plate-strip .plate-img { position: static; width: 100%; height: auto; object-fit: fill; mix-blend-mode: multiply; }

/* Full-bleed chapters: the illustration is the background and the narrative
   overlays it on the left. The wash keeps the text legible over the art —
   brightest at the top-left where the words sit, clearing toward the art.
   'both'-span fills the whole spread; 'single'-span fills one leaf, so two
   pair up per spread. */
.page-chapter-full { position: relative; flex: 1; padding: 0; overflow: hidden; }
.page-chapter-single { position: relative; flex: 1 1 50%; min-width: 0; overflow: hidden; }
/* Multiply the art onto the parchment (like the childhood plate-strip): the
   image's white margins blend away to the page tone and the paint warms into
   the golden background instead of sitting opaque on top. */
.chapter-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.page-chapter-full .plate-cover,
.page-chapter-single .plate-cover { position: absolute; inset: 0; }
.chapter-wash { position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background:
    linear-gradient(102deg, rgba(244,236,214,.94) 0%, rgba(244,236,214,.82) 26%, rgba(244,236,214,.30) 48%, rgba(244,236,214,0) 64%),
    linear-gradient(180deg, rgba(244,236,214,.55) 0%, rgba(244,236,214,0) 26%); }
.page-chapter-full .pg-num,
.page-chapter-single .pg-num { z-index: 4; }
.chapter-overlay { position: absolute; top: 0; left: 0; z-index: 3;
  height: 100%; display: flex; flex-direction: column; }
.chapter-overlay .pg-title { margin-top: 30px; }
.chapter-overlay .pg-body { flex: 0 1 auto; overflow: visible; }
.page-chapter-full .chapter-overlay { width: 55%; padding: 66px 32px 60px 68px; }
.page-chapter-single .chapter-overlay { width: 84%; padding: 54px 20px 40px 52px; }

.page-span { position: relative; flex: 1; padding: 54px 68px; display: flex; flex-direction: column; }
.span-title { font-family: var(--serif); font-weight: 700; font-size: 39px; color: var(--head-deep); text-align: center; margin: 30px 0 0; line-height: 1.08; }

.tl-track { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; margin: 38px 0 0; flex: 1; align-content: center; }
.tl-track::before { content: ""; position: absolute; left: 7%; right: 7%; top: 172px; height: 2px; background: repeating-linear-gradient(90deg, var(--gold) 0 7px, transparent 7px 15px); opacity: .55; }
.tl-item { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 2; }
.tl-plate { width: 150px; height: 150px; border-radius: 8px; }
.tl-dot { width: 15px; height: 15px; border-radius: 50%; background: var(--parch); border: 3px solid var(--gold); margin: 16px 0 12px; box-shadow: 0 2px 7px rgba(90,60,20,.2); }
.tl-year { font-family: var(--serif); font-weight: 700; font-size: 22px; color: var(--head-deep); margin: 0 0 6px; }
.tl-cap { font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); max-width: 17ch; margin: 0; }
.tl-quote { text-align: center; font-family: var(--script); font-size: 27px; color: var(--gold); margin: 28px 0 0; }
.tl-quote span { font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--ink-soft); }

.tr-intro { font-size: 14.5px; line-height: 1.7; color: var(--ink); margin: 0 0 20px; }
.tr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 16px; }
.tr-cell { display: flex; flex-direction: column; align-items: center; text-align: center; }
.tr-plate { width: 100%; aspect-ratio: 1 / 1; border-radius: 6px; }
.tr-name { font-family: var(--serif); font-size: 12px; line-height: 1.4; color: var(--ink-soft); margin: 8px 0 0; }
.tr-stamp { margin: 20px 0 0; font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--head-deep); text-align: center; border: 1px solid rgba(185,151,90,.4); border-radius: 9px; padding: 12px 16px; background: rgba(255,250,238,.5); }

.page-lessons { padding: 52px 60px 0; }
.ls-top { display: flex; gap: 40px; flex: 1; min-height: 0; }
.ls-left { flex: 1.05; display: flex; flex-direction: column; }
.ls-left .pg-body p { font-size: 17px; line-height: 1.85; }
.ls-right { flex: 1; position: relative; }
.ls-right .plate { position: absolute; inset: 8px 0 24px; border-radius: 6px; }
.ls-band { margin: 0 -60px; background: rgba(230,217,188,.6); border-top: 1px solid rgba(185,151,90,.35); padding: 24px 60px 28px; }
.ls-band-title { text-align: center; font-family: var(--serif); font-size: 21px; color: var(--head-deep); margin: 0 0 18px; }
.ls-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
.ls-item { text-align: center; display: flex; flex-direction: column; align-items: center; }
.ls-ic { width: 44px; height: 44px; border-radius: 12px; background: rgba(185,151,90,.14); border: 1px solid rgba(185,151,90,.4); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.ls-ic span { width: 17px; height: 17px; display: block; }
.ls-ic .sh-diamond { transform: rotate(45deg); border: 2px solid var(--head-deep); }
.ls-ic .sh-circle { border-radius: 50%; border: 2px solid var(--head-deep); }
.ls-ic .sh-square { border-radius: 3px; border: 2px solid var(--head-deep); }
.ls-ic .sh-tri { width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 16px solid var(--head-deep); }
.ls-label { font-family: var(--serif); font-size: 14px; color: var(--head-deep); margin: 0 0 4px; }
.ls-text { font-size: 12px; line-height: 1.5; color: var(--ink-soft); max-width: 21ch; margin: 0; }

.page-closing { align-items: center; justify-content: center; text-align: center; padding: 60px; }
.close-star { color: var(--gold); font-size: 24px; margin-bottom: 18px; }
.close-take { font-family: var(--script); font-size: 44px; line-height: 1.35; color: var(--head); max-width: 20ch; margin: 0; }
.close-end { font-family: var(--serif); font-weight: 700; font-size: 27px; color: var(--head-deep); letter-spacing: .05em; margin: 26px 0 0; }
.close-name { font-family: var(--serif); font-size: 12px; letter-spacing: .16em; color: var(--ink-soft); margin: 13px 0 0; text-transform: uppercase; }

.book-frame { position: absolute; inset: 0; pointer-events: none; z-index: 20; }
/* Central binding gutter. A dark fold at the exact centre with a soft shadow
   ramp to either side reads as the pages dipping down into the spine; the two
   pale highlight bands flanking it are the paper curving back up to the flat of
   the page, which sells the book-like curl even over a full-bleed illustration. */
.spine { position: absolute; top: 0; bottom: 0; left: 50%; width: 150px; transform: translateX(-50%);
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(60,40,18,.05) 28%,
    rgba(48,32,15,.20) 43%,
    rgba(26,16,7,.46) 50%,
    rgba(48,32,15,.20) 57%,
    rgba(60,40,18,.05) 72%,
    transparent 100%); }
.spine::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg,
    transparent 32%,
    rgba(255,249,231,.14) 40%,
    transparent 47%,
    transparent 53%,
    rgba(255,249,231,.14) 60%,
    transparent 68%); }
.spine::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; transform: translateX(-50%); background: rgba(24,14,6,.5); }
.corner { position: absolute; width: 152px; height: 152px; opacity: .5; }
.corner svg { width: 100%; height: 100%; display: block; }
.corner.tl { top: 14px; left: 14px; }
.corner.tr { top: 14px; right: 14px; transform: scaleX(-1); }
.corner.bl { bottom: 14px; left: 14px; transform: scaleY(-1); }
.corner.br { bottom: 14px; right: 14px; transform: scale(-1,-1); }

.nav { position: fixed; top: 50%; transform: translateY(-50%); width: 54px; height: 54px; border-radius: 50%;
  border: 1px solid rgba(201,169,110,.4); background: rgba(30,20,12,.5); color: #e8d3a2; font-size: 26px; cursor: pointer;
  z-index: 50; display: flex; align-items: center; justify-content: center; transition: background .2s, transform .2s; font-family: var(--serif); line-height: 1; }
.nav:hover { background: rgba(60,42,24,.85); }
.nav-prev { left: 22px; } .nav-next { right: 22px; }
.book-progress { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: rgba(232,211,162,.7); font-family: var(--serif); font-size: 13px; letter-spacing: .22em; z-index: 50; }
`;
