// @ts-nocheck — untyped .jsx from before checkJs was on; 87 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
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
import { Fragment, useEffect, useRef, useState } from 'react';
import styles from './GoldenStory.module.css';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { MAX_DURATION_MS } from '@/lib/analytics-events';
import { formatDate, formatYear } from '@/lib/dates';

// Join truthy class names.
const cx = (...names) => names.filter(Boolean).join(' ');

const SHAPES = [styles['sh-circle'], styles['sh-diamond'], styles['sh-tri'], styles['sh-square']];
const STAR = '✦'; // ✦
const BOOK_W = 1300;
const BOOK_H = 866;
// Shortest spread we still lay out for. A phone held sideways is much wider
// than 3:2 (≈2.2:1), so a fixed 866-tall book fits by height and leaves the
// whole thing tiny between two wide gutters. Below SHORT_H of available
// height the canvas is allowed to grow wider (down to BOOK_H_MIN tall) until
// it matches the viewport — same book, ~50% bigger type. See `compact` in
// GoldenStory.module.css for the layout that goes with the shorter canvas.
const BOOK_H_MIN = 600;
const SHORT_H = 560;

// A space taller than this ratio of its width (a phone stood upright is about
// 1:2) can't show an open spread at any readable size, so the canvas becomes a
// SINGLE leaf and the flip controls turn one page at a time — see `portrait` in
// GoldenStory.module.css. The leaf is as wide as the space allows within these
// bounds, which is what sets the type size: narrow enough on a phone that 16.5px
// body copy lands around 14px on screen, wide enough on a tablet that it doesn't
// balloon.
const PORTRAIT_RATIO = 0.8;
const LEAF_W_MIN = 440;
const LEAF_W_MAX = 720;
const LEAF_H_MIN = 640;
const LEAF_H_MAX = 1500;

const clamp = (min, v, max) => Math.min(max, Math.max(min, v));

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
export default function GoldenStory({ story, page, onPageChange, embedded = false, onFinished = null }) {
  // Reading time per page (docs/daily-gold-analytics-plan.md §4), reported
  // through the provider StorybookView mounts. There is none in the admin
  // editor, where useInstrumentation() hands back its no-op API — `embedded`
  // then makes doubly sure no clock is even started.
  const { track, enabled, attention, subscribeAttention, registerFlushCollector } = useInstrumentation();
  const tracking = enabled && !embedded;
  // The story's own id in the events — a string, so a re-rendered parent
  // handing down a fresh `story` object cannot restart the page clock.
  const slug = story?.slug || null;
  const controlled = typeof page === 'number';
  const [internalCur, setInternalCur] = useState(0);
  const cur = controlled ? page : internalCur;
  const scaleRef = useRef(null);
  const stageRef = useRef(null);
  // The canvas the book is currently laid out on, and which of the three
  // layouts it belongs to: 'spread' (the classic open book), 'compact' (a
  // shorter, wider spread) or 'portrait' (a single leaf) — see fit() below.
  const [canvas, setCanvas] = useState({ w: BOOK_W, h: BOOK_H, mode: 'spread' });
  const portrait = canvas.mode === 'portrait';
  // Which leaf of the current spread is showing. Only portrait reads it: the
  // other layouts show both leaves at once.
  const [leaf, setLeaf] = useState(0);
  // Set when go() moves to another spread and picks the leaf to land on, so
  // the reset-on-spread-change effect below leaves that choice alone.
  const leafPinned = useRef(false);

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
  // How many leaves of each spread are worth turning to in portrait, where
  // only one shows at a time: 2 for a true two-page spread, 1 for anything
  // that fills the spread as a single piece (a full-bleed chapter, the
  // timeline, the lessons page) or leaves its facing leaf blank.
  const leaves = [];
  const add = (label, inner, leafCount = 2) => {
    const idx = spreads.length;
    leaves.push(leafCount);
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
      ), partner ? 2 : 1);
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
      ), 1);
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
    ), 1);
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
    ), 1);
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
    ), 1);
  }

  const count = spreads.length;
  const leavesAt = (i) => leaves[i] ?? 1;
  // The leaf actually on show: a mode change (a phone turned upright and back)
  // can leave `leaf` pointing past the spread it now lands on.
  const activeLeaf = portrait ? Math.min(leaf, leavesAt(cur) - 1) : 0;

  const goTo = (spread) => {
    if (controlled) onPageChange?.(spread);
    else setInternalCur(spread);
  };

  // One step of the flip controls. In portrait a step is a leaf, so a two-page
  // spread takes two steps and stepping back off a spread lands on its
  // predecessor's *last* leaf.
  const go = (dir) => {
    if (!portrait) return goTo(clamp(0, cur + dir, count - 1));
    if (dir > 0) {
      if (activeLeaf + 1 < leavesAt(cur)) return setLeaf(activeLeaf + 1);
      if (cur + 1 < count) { leafPinned.current = true; setLeaf(0); goTo(cur + 1); }
      return;
    }
    if (activeLeaf > 0) return setLeaf(activeLeaf - 1);
    if (cur > 0) { leafPinned.current = true; setLeaf(leavesAt(cur - 1) - 1); goTo(cur - 1); }
  };

  // Keep the latest go() reachable from the key handler without re-binding the
  // listener (and re-fitting the book) on every page turn.
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; });

  // Fires once when the reader reaches the book's final page — the last
  // spread, and in portrait its last leaf. A one-spread book never fires:
  // "finished" must mean the reader turned pages, not merely opened the
  // cover. StorybookView hangs the flag earn off this.
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => { onFinishedRef.current = onFinished; });
  useEffect(() => {
    if (finishedRef.current || count <= 1) return;
    const onLastPage = cur === count - 1 && (!portrait || activeLeaf >= leavesAt(count - 1) - 1);
    if (onLastPage) {
      finishedRef.current = true;
      onFinishedRef.current?.();
    }
  });

  // A spread change from anywhere else — the editor's rail, a controlled
  // `page` prop — opens on the first leaf.
  useEffect(() => {
    if (leafPinned.current) { leafPinned.current = false; return; }
    setLeaf(0);
  }, [cur]);

  // "n / total" counts leaves in portrait, since that is what a step turns.
  const stepTotal = portrait ? leaves.reduce((n, l) => n + l, 0) : count;
  const stepNow = portrait
    ? leaves.slice(0, cur).reduce((n, l) => n + l, 0) + activeLeaf + 1
    : cur + 1;

  // One effect per page turned to, so its cleanup *is* the page being left.
  // The signal is `stepNow` and never go()/goTo(): in portrait a turn is a
  // leaf change that goTo never sees. `stepNow` is already the 1-based page
  // the reader is on — the number printed in "n / total" — so it is what the
  // parent's roll-up reads back as the page.
  useEffect(() => {
    if (!tracking) return undefined;

    // The clock lives in the closure (TrackedSection's pattern): the book
    // re-renders for its own reasons and none of them may restart it. Only
    // attentive time counts — tab hidden or window blurred and it stops.
    let accrued = 0;
    let since = attention.current ? Date.now() : null;
    let banked = false;

    const bank = () => {
      const now = Date.now();
      if (since !== null) {
        accrued += now - since;
        // The reader is still on this page at a flush; the clock runs on.
        since = now;
      }
      const durationMs = Math.min(Math.round(accrued), MAX_DURATION_MS);
      // A flush harvested this page moments ago and nothing has been read
      // since: a second row of zero milliseconds is noise, not a page view.
      if (durationMs === 0 && banked) return;
      accrued = 0;
      banked = true;
      track('story_page_view', {
        contentType: 'story',
        contentId: slug,
        label: String(stepNow),
        durationMs,
      });
    };

    const unsubscribeAttention = subscribeAttention((attentive) => {
      if (attentive) {
        since = Date.now();
        return;
      }
      if (since !== null) {
        accrued += Date.now() - since;
        since = null;
      }
    });

    // The page in hand when a batch is assembled would otherwise wait for a
    // turn that may never come — and the provider harvests collectors from
    // its own unmount cleanup, which is what saves the page the book was
    // closed on when the reader navigates back to the paper.
    const unregisterCollector = registerFlushCollector(bank);

    return () => {
      unsubscribeAttention();
      unregisterCollector();
      // The page being turned away from, or the one the book closed on.
      bank();
    };
  }, [
    tracking,
    stepNow,
    slug,
    track,
    attention,
    subscribeAttention,
    registerFlushCollector,
  ]);

  // Fit the book: to the host container when embedded, otherwise to the
  // viewport (plus keyboard nav for the full-screen view only — a global key
  // handler would hijack arrow keys away from the editor's text fields).
  //
  // The canvas is reshaped to the space before it is scaled into it, so the
  // book fills what it is given instead of being letterboxed at a fixed 3:2:
  // a short space (a phone held sideways, a squat editor pane) gets a shorter,
  // wider spread; a tall narrow one gets a single leaf. Gutters shrink to match.
  useEffect(() => {
    const fit = () => {
      const el = scaleRef.current;
      if (!el) return;
      const box = embedded ? stageRef.current : null;
      const availW = box ? box.clientWidth : window.innerWidth;
      const availH = box ? box.clientHeight : window.innerHeight;
      const tall = availW < availH * PORTRAIT_RATIO;
      const short = !tall && availH < SHORT_H;
      const gut = tall ? 24 : short ? 16 : 40;
      const w = Math.max(1, availW - gut);
      const h = Math.max(1, availH - gut);
      let bw = BOOK_W;
      let bh = BOOK_H;
      let mode = 'spread';
      if (tall) {
        mode = 'portrait';
        bw = clamp(LEAF_W_MIN, w, LEAF_W_MAX);
        bh = clamp(LEAF_H_MIN, Math.round((bw * h) / w), LEAF_H_MAX);
      } else if (short) {
        mode = 'compact';
        bh = clamp(BOOK_H_MIN, Math.round((BOOK_W * h) / w), BOOK_H);
      }
      setCanvas((c) => (c.w === bw && c.h === bh && c.mode === mode ? c : { w: bw, h: bh, mode }));
      el.style.transform = `scale(${Math.min(w / bw, h / bh)})`;
    };
    fit();
    let ro;
    let turnTimer;
    // Mobile browsers report the new viewport size a beat after the turn, so
    // re-fit once it has settled as well as immediately.
    const onTurn = () => { fit(); turnTimer = setTimeout(fit, 300); };
    if (embedded && stageRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(stageRef.current);
    } else {
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', onTurn);
    }
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { goRef.current(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { goRef.current(-1); }
    };
    if (!embedded) window.addEventListener('keydown', onKey);
    return () => {
      ro?.disconnect();
      clearTimeout(turnTimer);
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', onTurn);
      if (!embedded) window.removeEventListener('keydown', onKey);
    };
  }, [embedded]);

  if (!story) return null;

  return (
    <div
      className={cx(styles['book-stage'], canvas.mode === 'compact' && styles.compact, portrait && styles.portrait)}
      ref={stageRef}
      style={embedded ? { position: 'relative', inset: 'auto', width: '100%', height: '100%' } : undefined}
    >
      {!embedded && (
        <button className={cx(styles.nav, styles['nav-prev'])} onClick={() => go(-1)} aria-label="Previous page">{'‹'}</button>
      )}

      <div className={styles['book-scale']} ref={scaleRef}>
        {/* --leaf is which half of the spread portrait slides into view. */}
        <div className={styles.book} style={{ width: canvas.w, height: canvas.h, '--leaf': activeLeaf }}>
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
          <div className={styles['book-progress']}>{`${stepNow} / ${stepTotal}`}</div>
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

/**
 * Every illustration this story will actually put on a page, deduped — the
 * cover, the childhood strip, chapter art, timeline and treasure plates, and
 * the configurable pages. Mirrors the render conditions above (a treasures
 * image on a story with no treasures is never shown, so it isn't listed), so
 * that a caller waiting on this list waits for exactly what the reader is
 * about to see and nothing more. StorybookView holds the opening curtain up
 * until all of them have loaded.
 */
export function storyImageUrls(story) {
  if (!story) return [];
  const urls = [story.image_url, story.childhood_image_url];
  urls.push(...(story.chapters || []).map((c) => c.image_url));
  urls.push(...(story.timeline || []).filter((t) => t.year || t.caption).map((t) => t.image_url));
  const treasures = (story.treasures || []).filter((t) => t.name);
  if (treasures.length) {
    urls.push(...treasures.map((t) => t.image_url));
    // The facing leaf is either the configurable page or the default one.
    urls.push(story.after_treasures ? story.after_treasures.image_url : story.treasures_image_url);
  }
  if (story.modern) urls.push(story.modern.image_url);
  return [...new Set(urls.filter(Boolean))];
}
