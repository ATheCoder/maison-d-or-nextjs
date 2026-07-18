'use client';
/**
 * GoldenStory — a children's illustrated biography rendered as an open
 * storybook. Ported from the Maison d'Oré "Golden Story" design template
 * (templates/golden-story/GoldenStory.dc.html): a leather-bound book of
 * parchment spreads you flip through — cover, one spread per chapter, a life
 * timeline, treasures & lessons, and a closing page.
 *
 * The person is fetched on the server (SSR, via Drizzle) and passed in as
 * `story` (a remarkable_person record in the story.json shape). Real
 * `image_url`s render in place of the template's parchment placeholders
 * when present.
 *
 * Styles live in GoldenStory.module.css (scoped CSS Module).
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import styles from './GoldenStory.module.css';
import { formatDate, formatYear } from '@/lib/dates';

// Join truthy class names.
const cx = (...names) => names.filter(Boolean).join(' ');

const SHAPES = [styles['sh-circle'], styles['sh-diamond'], styles['sh-tri'], styles['sh-square']];
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

// Map a chapter-shaped config object onto the book's content model. Used both
// for `story.chapters` and for any other page that should "work like a chapter"
// (e.g. the configurable page after the Treasures spread, see `after_treasures`).
function toChapter(c, i) {
  return {
    number: c.number ?? i + 1,
    title: c.title || '',
    paras: splitParas(c.narrative),
    art: `Scene — ${c.title || `Chapter ${i + 1}`}`,
    src: c.image_url || null,
    // Page layout for the chapter (`page_span` in the data):
    //   'both'   — one full-bleed spread: art as background across BOTH leaves,
    //              text overlaid (see .page-chapter-full).
    //   'single' — art + text confined to ONE leaf.
    //   'image'  — art only (no text) filling ONE leaf.
    //   default  — the classic two-page split: narrative left, illustration right.
    // 'single' and 'image' are both single-leaf: two consecutive of them pair
    // up to fill a spread.
    span: ['both', 'single', 'image'].includes(c.page_span) ? c.page_span : 'default',
    // How the art meets the page (`blend` in the data):
    //   'multiply' (default) — multiplies into the parchment so white margins
    //              blend away and the paint warms into the page.
    //   'normal'  — shown as-is (opaque), for full-bleed art with its own
    //              background that shouldn't be washed out.
    plain: c.blend === 'normal' || c.blend === 'none',
    // The legibility wash behind the overlaid text (`fade` in the data). On by
    // default; set `"fade": false` to drop it and let the art show through
    // unwashed (only affects single/both spans, which overlay text on the art).
    fade: c.fade !== false,
  };
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
    <div className={cx(styles.plate, alpha ? styles['plate-alpha'] : vignette && styles['plate-vignette'], className)}>
      {src
        ? <img className={styles['plate-img']} src={src} alt={art || ''} />
        : <span className={styles['ph-tag']}>{art}</span>}
    </div>
  );
}

// The gold ✦ between its two fading rules, under every title.
function Ornament({ center = false }) {
  return (
    <div className={cx(styles.ornament, center && styles.center)}><i /><b>{STAR}</b><i /></div>
  );
}

// The spread each editable section lands on — mirrors the pagination the
// component performs below (cover+childhood share spread 0; single-leaf
// chapters pair two-per-spread; treasures/after-treasures share one spread and
// modern/lessons share the next). Kept in lockstep with the build loop so the
// editor rail can flip the book to a section. Section ids: 'cover',
// 'childhood', 'chapter-<i>' (0-based), 'timeline', 'treasures',
// 'after-treasures', 'modern', 'lessons', 'takeaway'.
function buildSectionSpreadMap(story) {
  const chapters = (story?.chapters || []).map(toChapter);
  const timeline = (story?.timeline || []).filter((t) => t.year || t.caption);
  const treasures = (story?.treasures || []).filter((t) => t.name);
  const lessons = story?.lessons || [];
  const hasModern = !!(story?.modern || story?.modern_interpretation);
  const hasTimeline = timeline.length > 0;
  const hasTreasures = treasures.length > 0;
  const hasLessons = lessons.length > 0 || hasModern;

  const map = {};
  let idx = 0;
  map.cover = idx; map.childhood = idx; idx += 1;

  const isLeaf = (c) => c?.span === 'single' || c?.span === 'image';
  let ci = 0;
  while (ci < chapters.length) {
    if (isLeaf(chapters[ci])) {
      map[`chapter-${ci}`] = idx;
      if (isLeaf(chapters[ci + 1])) { map[`chapter-${ci + 1}`] = idx; ci += 2; } else { ci += 1; }
    } else {
      map[`chapter-${ci}`] = idx; ci += 1;
    }
    idx += 1;
  }
  if (hasTimeline) { map.timeline = idx; idx += 1; }
  if (hasTreasures) { map.treasures = idx; map['after-treasures'] = idx; idx += 1; }
  if (hasLessons) { map.modern = idx; map.lessons = idx; idx += 1; }
  map.takeaway = idx; // closing page
  return map;
}

/** The spread index a section id lives on (0 if unknown). See buildSectionSpreadMap. */
export function spreadIndexFor(story, sectionId) {
  const map = buildSectionSpreadMap(story);
  return map[sectionId] ?? 0;
}

/**
 * GoldenStory renders its own book by default (families' full-screen view).
 * The editor passes `embedded` to drop the fixed full-viewport stage, scale to
 * the host container instead of the window, and hide the built-in flip chrome
 * and global key handler (the editor supplies its own controls). `page` +
 * `onPageChange` make the current spread controllable; omit them and the book
 * keeps its own internal page state, exactly as before.
 */
export default function GoldenStory({ story, page, onPageChange, embedded = false }) {
  const controlled = typeof page === 'number';
  const [internalCur, setInternalCur] = useState(0);
  const cur = controlled ? page : internalCur;
  const scaleRef = useRef(null);
  const stageRef = useRef(null);

  // ── Map the person onto the book's content model ──────────────────────────
  const name = story?.name || 'A Golden Life';
  const first = name.split(' ')[0];
  const role = story?.role || story?.field || '';
  const storyTitle = story?.story_title || name;
  const quote = cleanQuote(story?.famous_quote);
  const childhood = story?.story_childhood || '';
  const childhoodTitle = story?.story_childhood_title || 'Where the Story Begins';
  const takeaway = cleanQuote(story?.story_takeaway);

  const birthLabel = story?.birth_date
    ? `b. ${formatDate(story.birth_date)}${story.death_date ? ` – ${formatYear(story.death_date)}` : ''}`
    : '';
  const coverSub = [role, story?.country, birthLabel].filter(Boolean).join('  ·  ');

  const chapters = (story?.chapters || []).map(toChapter);
  // The page after the Treasures spread is configured just like a chapter
  // (`after_treasures` in the data) and rendered through the same single-leaf
  // path, so it behaves exactly like a `span: 'single'` chapter.
  const afterTreasures = story?.after_treasures ? toChapter(story.after_treasures, 0) : null;
  // The top of the modern-interpretation page is configured like a chapter
  // (`modern` in the data — same shape as chapters), so its title, art, span,
  // blend and fade all work exactly like a chapter. The "What Can We Learn"
  // band below it is not configurable and always renders from `lessons`.
  // A legacy `modern_interpretation` string is still accepted as the narrative.
  const modernChapter = story?.modern
    ? toChapter(story.modern, 0)
    : (story?.modern_interpretation ? toChapter({ narrative: story.modern_interpretation }, 0) : null);
  const timeline = (story?.timeline || []).filter((t) => t.year || t.caption);
  const treasures = (story?.treasures || []).filter((t) => t.name);
  const lessons = (story?.lessons || []).map((l, i) => ({
    icon: titleCase(l.icon_name),
    lesson: l.lesson || '',
    shape: SHAPES[i % SHAPES.length],
  }));

  const hasTimeline = timeline.length > 0;
  const hasTreasures = treasures.length > 0;
  const hasLessons = lessons.length > 0 || !!modernChapter;

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
  const add = (label, inner) => {
    const idx = spreads.length;
    spreads.push(
      <div key={idx} className={cx(styles.spread, idx === cur && styles.on)} data-screen-label={label}>
        {inner}
      </div>
    );
  };

  // Cover + opening (childhood) spread.
  {
    const rNum = P();
    add('Cover', (
      <>
        <div className={cx(styles.page, styles['page-cover'])}>
          {story?.image_url
            ? <img className={styles['cover-img']} src={story.image_url} alt={name} />
            : <div className={cx(styles.plate, styles['plate-cover'])}><span className={styles['ph-tag']}>{`COVER — young ${first} in their world`}</span></div>}
          <div className={styles['cover-grad']} />
          <div className={styles['cover-head']}>
            <p className={styles['cover-eyebrow']}>Born on this day</p>
            <h1 className={styles['cover-title']}>{storyTitle}</h1>
            {coverSub && <p className={styles['cover-sub']}>{coverSub}</p>}
          </div>
          <p className={styles['cover-cta']}>{`Begin the story →`}</p>
        </div>
        <div className={styles.page}>
          <span className={styles['pg-num']}>{rNum}</span>
          <h2 className={styles['pg-title']}>{childhoodTitle}</h2>
          <Ornament />
          <div className={styles['pg-body']}>
            {splitParas(childhood).map((para, j) => <Para key={j} text={para} />)}
          </div>
          <Plate className={styles['plate-strip']} art={`Soft landscape of ${story?.country || 'home'}`} src={story?.childhood_image_url || null} />
        </div>
      </>
    ));
  }

  // One full-bleed leaf (half a spread): the illustration is the leaf's
  // background. 'single' leaves overlay the title + narrative on top; 'image'
  // leaves are art only (no wash, no text). Both pair up two-per-spread.
  const singleLeaf = (ch, num, side) => {
    const imageOnly = ch.span === 'image';
    return (
      <div key={side} className={styles['page-chapter-single']}>
        {ch.src
          ? <img className={cx(styles['chapter-bg'], ch.plain && styles['chapter-bg-plain'])} src={ch.src} alt={ch.art} />
          : <div className={cx(styles.plate, styles['plate-cover'])}><span className={styles['ph-tag']}>{ch.art}</span></div>}
        {!imageOnly && (
          <>
            {ch.fade && <div className={styles['chapter-wash']} />}
            <span className={cx(styles['pg-num'], side === 'right' && styles['pg-num-r'])}>{num}</span>
            <div className={styles['chapter-overlay']}>
              <h2 className={styles['pg-title']}>{ch.title}</h2>
              <Ornament />
              <div className={styles['pg-body']}>
                {ch.paras.map((para, j) => <Para key={j} text={para} />)}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Walk the chapters. Default and both-span chapters are each their own
  // spread; single-leaf chapters ('single' + 'image') are grouped
  // two-per-spread (left + right).
  const isLeaf = (c) => c?.span === 'single' || c?.span === 'image';
  let ci = 0;
  while (ci < chapters.length) {
    const ch = chapters[ci];

    // single-leaf — one leaf; pair with the next chapter if it's also a leaf.
    if (isLeaf(ch)) {
      const partner = isLeaf(chapters[ci + 1]) ? chapters[ci + 1] : null;
      const lNum = P();
      const rNum = partner ? P() : null;
      add(`Chapter ${ch.number}`, (
        <>
          {singleLeaf(ch, lNum, 'left')}
          {partner ? singleLeaf(partner, rNum, 'right') : <div className={styles.page} />}
        </>
      ));
      ci += partner ? 2 : 1;
      continue;
    }

    // 'both' — one full-bleed spread, art as background across both leaves.
    if (ch.span === 'both') {
      const nNum = P();
      add(`Chapter ${ch.number}`, (
        <div className={cx(styles['page-span'], styles['page-chapter-full'])}>
          {ch.src
            ? <img className={cx(styles['chapter-bg'], ch.plain && styles['chapter-bg-plain'])} src={ch.src} alt={ch.art} />
            : <div className={cx(styles.plate, styles['plate-cover'])}><span className={styles['ph-tag']}>{ch.art}</span></div>}
          {ch.fade && <div className={styles['chapter-wash']} />}
          <span className={styles['pg-num']}>{nNum}</span>
          <div className={styles['chapter-overlay']}>
            <h2 className={styles['pg-title']}>{ch.title}</h2>
            <Ornament />
            <div className={styles['pg-body']}>
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
    add(`Chapter ${ch.number}`, (
      <>
        <div className={styles.page}>
          <span className={styles['pg-num']}>{lNum}</span>
          <p className={styles['ch-label']}>{`Chapter ${ch.number}`}</p>
          <h2 className={styles['pg-title']}>{ch.title}</h2>
          <Ornament />
          <div className={cx(styles['pg-body'], styles.dropcap)}>
            {ch.paras.map((para, j) => <Para key={j} text={para} />)}
          </div>
        </div>
        <div className={cx(styles.page, styles['page-image'])}>
          <span className={cx(styles['pg-num'], styles['pg-num-r'])}>{rNum}</span>
          <Plate className={styles['plate-fill']} art={ch.art} src={ch.src} />
        </div>
      </>
    ));
    ci += 1;
  }

  // Life timeline (spans the whole spread).
  if (hasTimeline) {
    const lNum = P();
    const rNum = P();
    add('Timeline', (
      <div className={styles['page-span']}>
        <span className={styles['pg-num']}>{lNum}</span>
        <span className={cx(styles['pg-num'], styles['pg-num-r'])}>{rNum}</span>
        <h2 className={styles['span-title']}>{`${first}’s Life Journey`}</h2>
        <Ornament center />
        <div className={styles['tl-track']}>
          {timeline.map((t, i) => (
            <div key={i} className={styles['tl-item']}>
              <Plate className={styles['tl-plate']} art={t.year} src={t.image_url || null} />
              <div className={styles['tl-dot']} />
              <p className={styles['tl-year']}>{t.year}</p>
              <p className={styles['tl-cap']}>{t.caption}</p>
            </div>
          ))}
        </div>
        {quote && (
          <p className={styles['tl-quote']}>{`“${quote}”`} <span>{`— ${name}`}</span></p>
        )}
      </div>
    ));
  }

  // Treasures left behind: gallery left, reflection right.
  if (hasTreasures) {
    const lNum = P();
    const rNum = P();
    add('Treasures', (
      <>
        <div className={styles.page}>
          <span className={styles['pg-num']}>{lNum}</span>
          <h2 className={styles['pg-title']}>Treasures Left Behind</h2>
          <Ornament />
          <p className={styles['tr-intro']}>{`${first} left the world more than memories — gifts, ideas, and wonders that still inspire people today.`}</p>
          <div className={styles['tr-grid']}>
            {treasures.map((t, i) => (
              <div key={i} className={styles['tr-cell']}>
                <Plate className={styles['tr-plate']} art={t.name} src={t.image_url || null} />
                <p className={styles['tr-name']}>{t.name}</p>
              </div>
            ))}
          </div>
          {takeaway && <p className={styles['tr-stamp']}>{`${STAR} ${takeaway}`}</p>}
        </div>
        {afterTreasures
          ? singleLeaf(afterTreasures, rNum, 'right')
          : (
            <div className={styles.page}>
              <span className={cx(styles['pg-num'], styles['pg-num-r'])}>{rNum}</span>
              <h2 className={styles['pg-title']}>Gifts That Live On</h2>
              <Ornament />
              <div className={styles['pg-body']}>
                <p>{`Long after ${first} was gone, these gifts kept inspiring the world.`}</p>
                <p>Because the world will always need dreamers who dare to see what others cannot.</p>
              </div>
              <Plate className={styles['plate-strip']} art="Treasures fading into a sunlit landscape" src={story?.treasures_image_url || null} />
            </div>
          )}
      </>
    ));
  }

  // "If they were ten today" + the little golden lessons band.
  if (hasLessons) {
    const lNum = P();
    const rNum = P();
    add('If they were ten today', (
      <div className={cx(styles['page-span'], styles['page-lessons'])}>
        <span className={styles['pg-num']}>{lNum}</span>
        <span className={cx(styles['pg-num'], styles['pg-num-r'])}>{rNum}</span>
        {modernChapter.span === 'default' ? (
          // Classic two-column top: narrative left, illustration right.
          <div className={styles['ls-top']}>
            <div className={styles['ls-left']}>
              <h2 className={styles['pg-title']}>{modernChapter.title || `If ${first} Were 10 Today`}</h2>
              <Ornament />
              <div className={styles['pg-body']}>
                {modernChapter.paras.map((para, j) => <Para key={j} text={para} />)}
              </div>
            </div>
            <div className={styles['ls-right']}>
              <Plate art={`${first} as a modern ten-year-old explorer`} src={modernChapter.src} />
            </div>
          </div>
        ) : (
          // Full-bleed top (single/both/image spans): art as the background,
          // text overlaid — the same treatment as a full-bleed chapter.
          <div className={cx(styles['ls-top'], styles['ls-top-full'])}>
            {modernChapter.src
              ? <img className={cx(styles['chapter-bg'], modernChapter.plain && styles['chapter-bg-plain'])} src={modernChapter.src} alt={modernChapter.title} />
              : <div className={cx(styles.plate, styles['plate-cover'])}><span className={styles['ph-tag']}>{`${first} as a modern ten-year-old explorer`}</span></div>}
            {modernChapter.span !== 'image' && (
              <>
                {modernChapter.fade && <div className={styles['chapter-wash']} />}
                <div className={styles['chapter-overlay']}>
                  <h2 className={styles['pg-title']}>{modernChapter.title || `If ${first} Were 10 Today`}</h2>
                  <Ornament />
                  <div className={styles['pg-body']}>
                    {modernChapter.paras.map((para, j) => <Para key={j} text={para} />)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {lessons.length > 0 && (
          <div className={styles['ls-band']}>
            <p className={styles['ls-band-title']}>{`What Can We Learn From ${first}?`}</p>
            <div className={styles['ls-row']}>
              {lessons.map((l, i) => (
                <div key={i} className={styles['ls-item']}>
                  <div className={styles['ls-ic']}><span className={l.shape} /></div>
                  {l.icon && <p className={styles['ls-label']}>{l.icon}</p>}
                  <p className={styles['ls-text']}>{l.lesson}</p>
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
    add('The End', (
      <div className={cx(styles['page-span'], styles['page-closing'])}>
        <span className={styles['pg-num']}>{lNum}</span>
        <div className={styles['close-star']}>{STAR}</div>
        {takeaway && <p className={styles['close-take']}>{takeaway}</p>}
        <Ornament center />
        <p className={styles['close-end']}>The End</p>
        <p className={styles['close-name']}>{`A Golden Story · ${name}`}</p>
      </div>
    ));
  }

  const count = spreads.length;
  const go = useCallback(
    (dir) => {
      const clamp = (s) => Math.max(0, Math.min(count - 1, s + dir));
      if (controlled) onPageChange?.(clamp(cur));
      else setInternalCur(clamp);
    },
    [count, controlled, onPageChange, cur]
  );

  // Fit the fixed-size book: to the host container when embedded, otherwise to
  // the viewport (plus keyboard nav for the full-screen view only — a global
  // key handler would hijack arrow keys away from the editor's text fields).
  useEffect(() => {
    const fit = () => {
      const el = scaleRef.current;
      if (!el) return;
      const box = embedded ? stageRef.current : null;
      const availW = box ? box.clientWidth : window.innerWidth;
      const availH = box ? box.clientHeight : window.innerHeight;
      const s = Math.min((availW - 40) / BOOK_W, (availH - 40) / BOOK_H);
      el.style.transform = `scale(${s})`;
    };
    fit();
    let ro;
    if (embedded && stageRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(stageRef.current);
    } else {
      window.addEventListener('resize', fit);
    }
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { go(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(-1); }
    };
    if (!embedded) window.addEventListener('keydown', onKey);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
      if (!embedded) window.removeEventListener('keydown', onKey);
    };
  }, [go, embedded]);

  if (!story) return null;

  return (
    <div
      className={styles['book-stage']}
      ref={stageRef}
      style={embedded ? { position: 'relative', inset: 'auto', width: '100%', height: '100%' } : undefined}
    >
      {/* The bundler (Turbopack) silently drops external url() @imports from
          CSS — including the Google Fonts import in app/globals.css — so the
          storybook loads its own fonts here. Same families/weights the
          original inline <style> imported; React hoists this into <head>. */}
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Lato:wght@300;400;700&family=Great+Vibes&display=swap"
      />

      {!embedded && (
        <button className={cx(styles.nav, styles['nav-prev'])} onClick={() => go(-1)} aria-label="Previous page">{'‹'}</button>
      )}

      <div className={styles['book-scale']} ref={scaleRef}>
        <div className={styles.book}>
          <div className={styles['book-leather']} />
          <div className={styles['book-body']}>
            {spreads}

            <div className={styles['book-frame']}>
              {['tl', 'tr', 'bl', 'br'].map((pos) => (
                <span key={pos} className={cx(styles.corner, styles[pos])}>
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
              <div className={styles.spine} />
            </div>
          </div>
        </div>
      </div>

      {!embedded && (
        <>
          <button className={cx(styles.nav, styles['nav-next'])} onClick={() => go(1)} aria-label="Next page">{'›'}</button>
          <div className={styles['book-progress']}>{`${cur + 1} / ${count}`}</div>
        </>
      )}
    </div>
  );
}

// The number of spreads the book paginates the story into — lets the editor
// size its flip controls (dots) and clamp the current page.
export function spreadCount(story) {
  const map = buildSectionSpreadMap(story);
  return (map.takeaway ?? 0) + 1;
}
