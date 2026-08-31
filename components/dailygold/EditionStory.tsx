'use client';
/**
 * EditionStory — the Book Edition of a Golden Story: one remarkable life read
 * as a scrolling editorial longread, ported from the Maison d'Oré design canvas
 * ("Story - Elizabeth II (Book Edition).dc.html").
 *
 * It is the second of two readers, not a replacement for the first. <GoldenStory>
 * is a leather flip-book of fixed spreads; this is a magazine feature on good
 * paper — a full-bleed portrait, a sticky nav across four rooms, chapters that
 * run as prose with pictures floated into the margin, a room of fun facts, a
 * gallery of things still in the world, a scroll-filled timeline, and a dark
 * board to close on. A person is read as one or the other according to their
 * `story_format` (see StoryFormat in src/db/schema.ts); nothing here is reached
 * by a flip-book and nothing in GoldenStory is reached by this.
 *
 * Styles live in EditionStory.module.css, which explains why this design keeps
 * its own paper stocks rather than taking the house's semantic colours.
 *
 * THREE DELIBERATE DEPARTURES FROM THE MOCK — do not "fix" them back:
 *
 * 1. The mock's hero carries a Save (♡) and a Share (↥) button. Neither is
 *    wired to anything in this app: saving a story to the Treasury is not a
 *    feature the story page has, and there is no share surface. Shipping two
 *    dead controls in the most prominent chrome on the page is worse than
 *    shipping neither, so the hero carries only Back, which is real.
 * 2. The mock's treasure cards are <a href="#gallery"> — placeholder links back
 *    to their own section. They are rendered as plain <article>s here: a card
 *    that looks clickable and goes nowhere teaches a child that this book lies.
 * 3. The mock smooth-scrolls with Lenis from a CDN. This app does not load
 *    third-party scripts at runtime, and the effect it buys is one the platform
 *    now gives for free, so the tab jumps use native smooth scrolling and the
 *    parallax rides the ordinary scroll.
 *
 * MOTION. Everything that moves is off under `prefers-reduced-motion` — the
 * fade-ups resolve to "already shown" in CSS, the parallax is pinned, and the
 * timeline arrives full. The tab progress bars stay in both cases, because they
 * report where the reader is rather than animate.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './EditionStory.module.css';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { MAX_DURATION_MS } from '@/lib/analytics-events';
import { formatDate, formatYear } from '@/lib/dates';
import { flagEmoji, resolvePerson } from '@/lib/countries';
import { figureShape } from '@/lib/golden-story/slots';
import type { ArtStyle, Chapter, FunFact, Lesson, StorySection, TimelineEntry, Treasure } from '@/src/db/schema';

/** The person shape this reads — PersonRecord, and the editor's draft alike. */
export type EditionPerson = {
  slug?: string | null;
  name?: string | null;
  role?: string | null;
  field?: string | null;
  country?: string | null;
  country_code?: string | null;
  nationality?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  story_title?: string | null;
  famous_quote?: string | null;
  famous_quote_attribution?: string | null;
  /**
   * Which hand drew this book — 'painted' (the default, and everything before
   * 2026-08-31) or 'pencil'. It changes nothing about the layout and everything
   * about how the pictures meet the paper: a painted book prints opaque plates
   * that the CSS shapes, a pencil book multiplies drawings onto the page and
   * frames none of them. See the `.pencil` block in the module CSS, and
   * EDITION_PENCIL_STYLE in lib/golden-story/prompts.ts for the other half of
   * the contract.
   */
  art_style?: ArtStyle | null;
  image_url?: string | null;
  story_takeaway?: string | null;
  chapters?: Chapter[] | null;
  fun_facts?: FunFact[] | null;
  modern?: StorySection | null;
  timeline?: TimelineEntry[] | null;
  after_treasures?: StorySection | null;
  treasures?: Treasure[] | null;
  lessons?: Lesson[] | null;
  legacy?: StorySection | null;
};

/**
 * The four rooms the sticky nav crosses, in page order. This array is the
 * single source for the nav, the scroll spy, the progress bars and the editor's
 * scroll-to-section map — add a room here and all four follow.
 */
export const EDITION_SECTIONS = [
  // "The Story", not the mock's "Her Story". The mock was drawn for one woman;
  // this component reads every remarkable person there is, and the app does not
  // record anyone's gender — nor should it have to, to label a tab. A neutral
  // label is correct for all of them rather than wrong for half.
  { id: 'story', label: 'The Story' },
  { id: 'lessons', label: 'Life Lessons' },
  { id: 'facts', label: 'Fun Facts' },
  { id: 'gallery', label: 'Gallery' },
] as const;

export type EditionSectionId = (typeof EDITION_SECTIONS)[number]['id'];

// Chapter eyebrows are printed as words, the way the design sets them
// ("Chapter one · A curious child"). Past twelve the numeral is used, which no
// real book reaches but a draft with a runaway chapter list can.
const ORDINALS = [
  'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];
const ordinal = (n: number): string => ORDINALS[n - 1] ?? String(n);

// The lesson glyphs, cycled. The bible gives every lesson an `icon_name`, but
// it is a word ("curiosity"), not a symbol, so the mark is positional — four
// distinct shapes so the cards read as four things rather than a repeated one.
const LESSON_GLYPHS = ['✧', '◈', '☾', '✦'];

const STAR = '✦';

const cx = (...names: (string | false | null | undefined)[]): string =>
  names.filter(Boolean).join(' ');

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const has = (v: unknown): boolean => text(v).length > 0;

// Strip the decoration the source sometimes wraps a quote in.
function cleanQuote(str: unknown): string {
  if (!str) return '';
  return String(str).replace(/^[\s~"'“”‚‘’\-–—]+/, '').replace(/[\s"'“”]+$/, '').trim();
}

/**
 * Split a narrative into paragraphs. The Book Edition's writer is told to
 * separate paragraphs with a blank line and never to use a lone newline, but
 * older text and hand edits both produce single newlines — treating one as a
 * paragraph break is right for this design (it has no stanzas) and keeps a
 * pasted-in flip-book narrative readable rather than run together.
 */
function paragraphs(narrative: unknown): string[] {
  if (!narrative) return [];
  return String(narrative).split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Every illustration this book will draw, deduped — what StorybookView holds
 * the opening curtain on. Mirrors editionSlotDescriptors: the hero, the chapter
 * figures that have a shape, the fun-fact spots and the treasure cards. The
 * timeline and the modern card have no art by design.
 */
export function editionImageUrls(story: EditionPerson | null | undefined): string[] {
  if (!story) return [];
  const urls: (string | null | undefined)[] = [story.image_url];
  (story.chapters ?? []).forEach((c, i) => {
    if (figureShape(c.figure, i) !== 'none') urls.push(c.image_url);
  });
  urls.push(...(story.fun_facts ?? []).map((f) => f.image_url));
  urls.push(...(story.treasures ?? []).filter((t) => has(t.name)).map((t) => t.image_url));
  return [...new Set(urls.filter((u): u is string => !!u))];
}

/**
 * Which room a rail id belongs to, for the editor's scroll-to-section. Rail ids
 * are per-chapter and per-list; rooms are four. Anything unrecognised lands on
 * the story, which is where the book starts.
 */
export function editionSectionFor(sectionId: string | null | undefined): EditionSectionId {
  if (!sectionId) return 'story';
  if (sectionId === 'lessons' || sectionId === 'modern') return 'lessons';
  if (sectionId === 'fun-facts' || sectionId.startsWith('fun-fact-')) return 'facts';
  if (sectionId === 'treasures' || sectionId === 'timeline' || sectionId === 'after-treasures') return 'gallery';
  return 'story';
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/** A revealed block: hidden and nudged down until it has been scrolled into. */
function Reveal({
  as: Tag = 'div', className, delay = 0, children, ...rest
}: {
  as?: React.ElementType;
  className?: string;
  delay?: number;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      data-reveal=""
      className={cx(styles.reveal, className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * One illustration plate. The art is opaque and fills the frame; the shape is
 * cut by the class the caller passes, which is the contract the Book Edition's
 * art prompts are written against. With no art yet the design's woven
 * placeholder stands in, naming what belongs there.
 */
function Plate({ shape, src, label }: { shape: string; src?: string | null; label: string }) {
  return (
    <div className={cx(styles.plate, shape)}>
      {src
        ? <img className={styles.plateImg} src={src} alt={label} loading="lazy" />
        : (
          <>
            <div className={styles.plateWeave} aria-hidden />
            <div className={styles.plateLabel}>{label}</div>
          </>
        )}
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

/**
 * The frame and mask each figure shape wears. One table rather than three
 * branches in the JSX: the caption used to be written out inside the band's
 * branch alone, so the tall and round figures silently dropped a line the
 * writer was required to produce for every chapter. A shape that is not in
 * this table draws nothing, which is what `figure: 'none'` means.
 */
const FIGURE_SHAPES: Record<'tall' | 'round' | 'band', { frame: string; plate: string }> = {
  tall: { frame: styles.figTall, plate: styles.plateTall },
  round: { frame: styles.figRound, plate: styles.plateRound },
  band: { frame: styles.figBand, plate: styles.plateBand },
};

/**
 * A chapter's illustration and the one line under it. Every shape prints its
 * caption — the caption says what the picture cannot say on its own, and a
 * floated portrait earns that as much as a wide band does. On a phone the two
 * margin figures are not floated at all (see the module CSS), so the caption
 * always has a full measure to sit on rather than four words a line.
 *
 * `reveal` is for the band only: the margin figures are already inside the
 * prose block's reveal, and a float inside a transformed element is a fight.
 */
function ChapterFigure({
  shape, src, caption, label, reveal = false,
}: {
  shape: string;
  src?: string | null;
  caption?: string;
  label: string;
  reveal?: boolean;
}) {
  const spec = FIGURE_SHAPES[shape as keyof typeof FIGURE_SHAPES];
  if (!spec) return null;
  const Frame = reveal ? Reveal : 'figure';
  return (
    <Frame {...(reveal ? { as: 'figure' as const } : {})} className={spec.frame}>
      <Plate shape={spec.plate} src={src} label={label} />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </Frame>
  );
}

/**
 * The one thing from this chapter a child could tell somebody afterwards — the
 * bible's fact-per-section rule, as it appears in this design. The flip-book
 * has had its own <Fact> since the rule was adopted; this book carried the
 * field from the writer all the way into the component and then never printed
 * it, so six of the best lines in every Book Edition were dead data.
 *
 * It is set apart rather than dressed up, and deliberately not a card. The
 * Fun Facts room is already this book's card-shaped "wait, really?" surface;
 * six more cards in the story room would not make the facts louder, they would
 * stop that room being special and turn a six-minute read into a listicle.
 * What the fact does need is to be unmistakably NOT prose, which is what the
 * rule above it and the mark beside it are for.
 */
function Fact({ text: body }: { text: string }) {
  if (!body) return null;
  return (
    <Reveal className={styles.fact}>
      <span className={styles.factMark} aria-hidden>{STAR}</span>
      <p className={styles.factText}>{body}</p>
    </Reveal>
  );
}

// ── The book ─────────────────────────────────────────────────────────────────

export default function EditionStory({
  story,
  onFinished = null,
  embedded = false,
  scrollToSection = null,
}: {
  story?: EditionPerson | null;
  onFinished?: (() => void) | null;
  /** The editor's preview: scroll inside the pane, no reader chrome. */
  embedded?: boolean;
  /** Editor only — the rail's current selection, scrolled to when it changes. */
  scrollToSection?: string | null;
}) {
  const { track, enabled, attention, subscribeAttention, registerFlushCollector } = useInstrumentation();
  const tracking = enabled && !embedded;
  const slug = story?.slug || null;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLElement | null>(null);
  const heroArtRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const timelineFillRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const [activeSection, setActiveSection] = useState<EditionSectionId>('story');

  // ── Content model ─────────────────────────────────────────────────────────
  const name = text(story?.name) || 'A Golden Life';
  const first = name.split(/\s+/)[0];
  const role = text(story?.role) || text(story?.field);
  const quote = cleanQuote(story?.famous_quote);
  const attribution = text(story?.famous_quote_attribution);
  const birthLabel = story?.birth_date
    ? `Born ${formatDate(story.birth_date)}${story.death_date ? ` · died ${formatYear(story.death_date)}` : ''}`
    : '';
  const country = text(story?.country);
  const iso2 = resolvePerson({
    countryCode: story?.country_code,
    nationality: story?.nationality,
    country: story?.country,
  });

  const chapters = useMemo(
    () => (story?.chapters ?? []).map((c, i) => ({
      key: i,
      number: c.number ?? i + 1,
      eyebrow: text(c.title),
      headline: text(c.headline),
      paras: paragraphs(c.narrative),
      fact: text(c.fact),
      caption: text(c.caption),
      shape: figureShape(c.figure, i),
      src: c.image_url || null,
    })).filter((c) => c.headline || c.paras.length || c.src),
    [story?.chapters],
  );

  const funFacts = useMemo(
    () => (story?.fun_facts ?? []).map((f, i) => ({
      key: i, title: text(f.title), detail: text(f.detail), src: f.image_url || null,
    })).filter((f) => f.title || f.detail),
    [story?.fun_facts],
  );

  const lessons = useMemo(
    () => (story?.lessons ?? []).filter((l) => has(l.lesson)),
    [story?.lessons],
  );

  const treasures = useMemo(
    () => (story?.treasures ?? []).map((t, i) => ({
      key: i, name: text(t.name), action: text(t.action), description: text(t.description), src: t.image_url || null,
    })).filter((t) => t.name),
    [story?.treasures],
  );

  const milestones = useMemo(
    () => (story?.timeline ?? []).filter((t) => has(t.year) || has(t.caption)),
    [story?.timeline],
  );

  const modern = story?.modern ?? null;
  const modernParas = paragraphs(modern?.narrative);
  const traits = (modern?.traits ?? []).filter((t) => has(t));
  const gallery = story?.after_treasures ?? null;
  const legacy = story?.legacy ?? null;
  const takeaway = text(story?.story_takeaway);

  // The quote sits after the chapter that earns it rather than at a fixed
  // index: in a four-chapter draft a quote pinned after chapter three would
  // land on the last page, and in a six-chapter book at the halfway turn. It
  // goes after the middle chapter, which is where the design has it.
  const quoteAfter = chapters.length ? Math.floor((chapters.length - 1) / 2) : -1;

  // Which rooms exist. An unfinished book must not show a tab to an empty
  // room — the nav would be lying about what is in the book.
  const roomFilled = useMemo(() => ({
    story: chapters.length > 0,
    lessons: lessons.length > 0 || !!modern,
    facts: funFacts.length > 0,
    gallery: treasures.length > 0 || milestones.length > 0,
  }), [chapters.length, lessons.length, modern, funFacts.length, treasures.length, milestones.length]);

  const rooms = useMemo(
    () => EDITION_SECTIONS.filter((s) => roomFilled[s.id]),
    [roomFilled],
  );

  // ── Scrolling ─────────────────────────────────────────────────────────────
  // The scroller is the window on the reader and the pane in the editor, and
  // every measurement below has to agree about which. Reading it through one
  // pair of helpers is what keeps the scroll spy, the parallax and the timeline
  // from each picking a different answer.
  const scrollerOf = useCallback((): HTMLElement | Window => (
    embedded && rootRef.current ? rootRef.current : window
  ), [embedded]);

  const metrics = useCallback(() => {
    const sc = scrollerOf();
    if (sc === window) {
      return { top: window.scrollY, height: window.innerHeight, originTop: 0 };
    }
    const el = sc as HTMLElement;
    return { top: el.scrollTop, height: el.clientHeight, originTop: el.getBoundingClientRect().top };
  }, [scrollerOf]);

  const navHeight = () => navRef.current?.getBoundingClientRect().height ?? 64;

  const goTo = useCallback((target: HTMLElement | number) => {
    const sc = scrollerOf();
    const { top, originTop } = metrics();
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    const to = typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + top - originTop - navHeight() + 1;
    if (sc === window) window.scrollTo({ top: to, behavior });
    else (sc as HTMLElement).scrollTo({ top: to, behavior });
  }, [scrollerOf, metrics]);

  // Scroll spy, per-tab progress, hero parallax and timeline fill — one frame,
  // one read of the scroller, rAF-throttled. They are together because they all
  // answer the same question ("where is the reader") and splitting them would
  // mean four layout reads a frame.
  useEffect(() => {
    const sc = scrollerOf();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;

    const frame = () => {
      ticking = false;
      const { top, height, originTop } = metrics();
      const nav = navHeight();

      if (!reduce && heroArtRef.current) {
        const box = heroArtRef.current.parentElement?.getBoundingClientRect();
        if (box && box.bottom > -200 && box.top < height + 200) {
          const offset = (box.top + box.height / 2 - height / 2) * -0.12;
          heroArtRef.current.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
        }
      }

      if (timelineRef.current && timelineFillRef.current) {
        const box = timelineRef.current.getBoundingClientRect();
        const p = reduce
          ? 1
          : Math.max(0, Math.min(1, (height * 0.9 - box.top) / Math.max(1, box.height * 0.82)));
        timelineFillRef.current.style.height = `${(p * 100).toFixed(1)}%`;
      }

      // "Seen" is the line the reader's eye has reached: the bottom of the
      // viewport, less the nav that covers the top of it.
      const seen = top + height - nav;
      // The active room is the last one whose top has passed under the nav.
      const line = originTop + nav + height * 0.28;
      let next: EditionSectionId = rooms[0]?.id ?? 'story';
      rooms.forEach((room) => {
        const el = sectionRefs.current[room.id];
        if (!el) return;
        const box = el.getBoundingClientRect();
        if (box.top <= line) next = room.id;
        const bar = barRefs.current[room.id];
        if (bar) {
          const start = box.top + top - originTop;
          const p = Math.max(0, Math.min(1, (seen - start) / Math.max(1, box.height)));
          bar.style.width = `${(p * 100).toFixed(1)}%`;
        }
      });
      setActiveSection(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    };

    sc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [scrollerOf, metrics, rooms]);

  // Reveal-on-scroll. Elements are only ever revealed, never re-hidden: the
  // mock hides a block again when it leaves upward, which on a phone means a
  // paragraph you have already read fades out as you scroll back to it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add(styles.shown));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.shown);
        io.unobserve(entry.target);
      });
    }, {
      root: embedded ? root : null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    });

    // Anything already on screen is shown NOW, synchronously, before the
    // observer is given a chance to have an opinion about it.
    //
    // This is not an optimisation, it is the failure mode. The observer's first
    // callback is asynchronous and, for a block that is already fully in view
    // when the page loads, it is not guaranteed to arrive at all under a
    // `threshold` — so the reader could land on the story and be shown an empty
    // column of paper that only filled in once they scrolled, which is the
    // single worst thing a reveal effect can do. A rect test costs one layout
    // read on mount and makes the first screen unconditional; the observer is
    // then only ever responsible for what is still below the fold, which is the
    // only thing it was ever needed for.
    const viewportHeight = embedded && root ? root.clientHeight : window.innerHeight;
    const originTop = embedded && root ? root.getBoundingClientRect().top : 0;
    nodes.forEach((n) => {
      const box = n.getBoundingClientRect();
      if (box.top - originTop < viewportHeight && box.bottom - originTop > 0) {
        n.classList.add(styles.shown);
        return;
      }
      io.observe(n);
    });
    return () => io.disconnect();
    // Re-run when the book's shape changes, so blocks added by an edit in the
    // editor are observed too.
  }, [embedded, chapters.length, funFacts.length, treasures.length, milestones.length, lessons.length]);

  // The editor's rail drives the preview: selecting a section scrolls the pane
  // to the room that section lives in.
  useEffect(() => {
    if (!embedded || !scrollToSection) return;
    const el = sectionRefs.current[editionSectionFor(scrollToSection)];
    if (el) goTo(el);
  }, [embedded, scrollToSection, goTo]);

  // ── The finish ────────────────────────────────────────────────────────────
  // The book is finished when the closing board has been reached. It is the
  // last thing in the document, so "reached" is honest: there is nothing after
  // it to read. Fire-once, and never in the editor.
  const finishedRef = useRef(false);
  const closingRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    finishedRef.current = false;
  }, [slug]);
  useEffect(() => {
    const el = closingRef.current;
    if (!el || embedded || !onFinished) return undefined;
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinished();
    }, { root: null, threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [embedded, onFinished, slug]);

  // ── Reading time per room ─────────────────────────────────────────────────
  // The flip-book banks a `story_page_view` per spread; a room is this book's
  // spread, so it reports the same event with the room id as its label and the
  // two formats stay comparable in the observatory.
  useEffect(() => {
    if (!tracking || !slug) return undefined;
    const room = activeSection;
    let accrued = 0;
    let since = attention.current ? Date.now() : null;
    let banked = false;

    const bank = () => {
      const now = Date.now();
      if (since !== null) { accrued += now - since; since = now; }
      const durationMs = Math.min(Math.round(accrued), MAX_DURATION_MS);
      if (durationMs === 0 && banked) return;
      accrued = 0;
      banked = true;
      track('story_page_view', {
        contentType: 'story', contentId: slug, label: room, durationMs,
      });
    };

    const unsubscribeAttention = subscribeAttention((attentive: boolean) => {
      if (attentive) { since = Date.now(); return; }
      if (since !== null) { accrued += Date.now() - since; since = null; }
    });
    const unregisterCollector = registerFlushCollector(bank);

    return () => { unsubscribeAttention(); unregisterCollector(); bank(); };
  }, [tracking, activeSection, slug, track, attention, subscribeAttention, registerFlushCollector]);

  if (!story) return null;

  // One flag, read once: every difference the pencil hand makes to this page is
  // a CSS one, so the component's only job is to say which book it is holding.
  const pencil = story.art_style === 'pencil';

  return (
    <div
      ref={rootRef}
      className={cx(styles.edition, embedded && styles.embedded, pencil && styles.pencil)}
    >
      <div className={styles.page}>

        {/* ── Hero ── */}
        <header className={styles.hero}>
          <div
            ref={heroArtRef}
            className={cx(styles.heroArt, !story.image_url && styles.placeholder)}
            style={story.image_url ? { backgroundImage: `url(${story.image_url})` } : undefined}
            aria-hidden
          />
          <div className={styles.heroScrim} aria-hidden />
          {!story.image_url && (
            <div className={styles.heroPlaceholderLabel}>
              drop art — {pencil ? 'pencil portrait' : 'painted portrait'}, {name}
            </div>
          )}

          {/* Only Back, and only on the reader — see the file docblock. */}
          {!embedded && (
            <div className={styles.heroChrome}>
              <button
                type="button"
                className={styles.roundBtn}
                aria-label="Back"
                onClick={() => window.history.back()}
              >
                ←
              </button>
            </div>
          )}

          <div className={styles.heroTitle}>
            <h1 className={styles.name}>{text(story.story_title) || name}</h1>
            {role && <div className={styles.role}>{role}</div>}
            {birthLabel && <div className={styles.born}>{birthLabel}</div>}
            {country && (
              <div className={styles.origin}>
                {iso2 && <span className={styles.flag} aria-hidden>{flagEmoji(iso2)}</span>}
                <span>{country}</span>
              </div>
            )}
          </div>
        </header>

        {/* ── Sticky room nav ── */}
        {rooms.length > 1 && (
          <nav
            ref={navRef}
            className={styles.tabs}
            style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
            aria-label="Sections of this story"
          >
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={cx(styles.tab, activeSection === room.id && styles.tabOn)}
                aria-current={activeSection === room.id ? 'true' : undefined}
                onClick={() => {
                  const el = sectionRefs.current[room.id];
                  if (el) goTo(el);
                }}
              >
                <span className={styles.tabTrack} aria-hidden />
                <span
                  ref={(el) => { barRefs.current[room.id] = el; }}
                  className={styles.tabBar}
                  aria-hidden
                />
                <RoomIcon id={room.id} />
                <span className={styles.tabLabel}>{room.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ── The story ── */}
        {roomFilled.story && (
          <section id="story" ref={(el) => { sectionRefs.current.story = el; }} className={styles.section}>
            {chapters.map((c, i) => (
              <Fragment key={c.key}>
                <div className={styles.chapterBlock}>
                  <Reveal as="p" className={styles.eyebrow}>
                    Chapter {ordinal(c.number)}{c.eyebrow ? ` · ${c.eyebrow}` : ''}
                  </Reveal>
                  {c.headline && (
                    i === 0
                      ? (
                        <Reveal as="h2" className={cx(styles.roomTitle, styles.chapterLead)} delay={60}>
                          {c.headline}
                        </Reveal>
                      )
                      : <h3 className={styles.chapterTitle}>{c.headline}</h3>
                  )}

                  <Reveal className={styles.prose} delay={i === 0 ? 120 : 0}>
                    {/* The two margin figures sit inside the prose so the text
                        wraps around them; the band is a block after it. */}
                    {c.shape !== 'band' && (
                      <ChapterFigure
                        shape={c.shape}
                        src={c.src}
                        caption={c.caption}
                        label={figureLabel(c.eyebrow, c.number)}
                      />
                    )}
                    {c.paras.map((p, n) => <Para key={n}>{p}</Para>)}
                  </Reveal>

                  {c.shape === 'band' && (
                    <ChapterFigure
                      shape={c.shape}
                      src={c.src}
                      caption={c.caption}
                      label={figureLabel(c.eyebrow, c.number)}
                      reveal
                    />
                  )}

                  {/* The chapter's one tellable thing, after the picture so the
                      chapter closes on it. */}
                  <Fact text={c.fact} />
                </div>

                {/* The pull-quote, after the chapter that earns it. */}
                {quote && i === quoteAfter && (
                  <Reveal as="blockquote" className={styles.quote}>
                    <p className={styles.quoteText}>&ldquo;{quote}&rdquo;</p>
                    {attribution && <footer className={styles.quoteFooter}>{attribution}</footer>}
                  </Reveal>
                )}
              </Fragment>
            ))}
          </section>
        )}

        {/* ── Life lessons ── */}
        {roomFilled.lessons && (
          <section id="lessons" ref={(el) => { sectionRefs.current.lessons = el; }} className={cx(styles.section, styles.roomSage)}>
            <Reveal as="p" className={cx(styles.eyebrow, styles.eyebrowSage)}>Life lessons</Reveal>
            <Reveal as="h2" className={styles.roomTitle} delay={60}>What {first} teaches us</Reveal>

            {lessons.length > 0 && (
              <div className={styles.lessonGrid}>
                {lessons.map((l, i) => (
                  <Reveal key={i} className={styles.lessonCard} delay={80 + i * 60}>
                    <span className={styles.lessonGlyph} aria-hidden>
                      {LESSON_GLYPHS[i % LESSON_GLYPHS.length]}
                    </span>
                    <div>
                      <div className={styles.lessonName}>{text(l.icon_name)}</div>
                      <div className={styles.lessonText}>{text(l.lesson)}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}

            {modern && (modernParas.length > 0 || traits.length > 0) && (
              <Reveal className={styles.modernCard}>
                <div className={cx(styles.eyebrow, styles.eyebrowSage)} style={{ margin: 0 }}>
                  If {first} were ten today
                </div>
                {modernParas.map((p, i) => (
                  <p key={i} className={styles.modernBody}>{p}</p>
                ))}
                {/* The card is a daydream; this line is the true thing it
                    stands on, and it is set apart so the two can never be read
                    as one (docs/golden-stories-bible.md). */}
                {has(modern.fact) && (
                  <p className={styles.modernFact}>
                    <span className={styles.modernFactLabel}>But this is true: </span>
                    {text(modern.fact)}
                  </p>
                )}
                {traits.length > 0 && (
                  <div className={styles.traits}>
                    {traits.map((t, i) => <span key={i} className={styles.trait}>{text(t)}</span>)}
                  </div>
                )}
              </Reveal>
            )}
          </section>
        )}

        {/* ── Fun facts ── */}
        {roomFilled.facts && (
          <section id="facts" ref={(el) => { sectionRefs.current.facts = el; }} className={cx(styles.section, styles.roomPaper)}>
            <Reveal as="p" className={styles.eyebrow}>Fun facts</Reveal>
            <Reveal as="h2" className={styles.roomTitle} delay={60}>Golden details</Reveal>

            {funFacts.map((f, i) => (
              <Reveal key={f.key} className={styles.factCard} delay={80 + i * 60}>
                <div className={styles.factCardText}>
                  <div className={styles.factHead}>
                    <span aria-hidden>{STAR}</span>
                    <span>{f.title}</span>
                  </div>
                  <div className={styles.factBody}>
                    {f.detail && <p>{f.detail}</p>}
                  </div>
                </div>
                {f.src && (
                  <figure className={styles.figFact}>
                    <Plate shape={styles.plateFact} src={f.src} label={f.title || 'Fun fact'} />
                  </figure>
                )}
              </Reveal>
            ))}
          </section>
        )}

        {/* ── Gallery + timeline ── */}
        {roomFilled.gallery && (
          <section id="gallery" ref={(el) => { sectionRefs.current.gallery = el; }} className={cx(styles.section, styles.roomLilac)}>
            {treasures.length > 0 && (
              <>
                <Reveal as="p" className={cx(styles.eyebrow, styles.eyebrowLilac)}>
                  {text(gallery?.title) || 'Treasures left behind'}
                </Reveal>
                <Reveal as="h2" className={cx(styles.roomTitle, styles.galleryTitle)} delay={60}>
                  {text(gallery?.headline) || 'Things you can still go and find'}
                </Reveal>
                {has(gallery?.narrative) && (
                  <Reveal as="p" className={styles.galleryIntro} delay={100}>
                    {text(gallery?.narrative)}
                  </Reveal>
                )}

                <div className={styles.treasureGrid}>
                  {treasures.map((t, i) => (
                    <Reveal key={t.key} as="article" className={styles.treasureCard} delay={80 + i * 40}>
                      <div className={styles.treasureArt}>
                        {t.src
                          ? <img className={styles.plateImg} src={t.src} alt={t.name} loading="lazy" />
                          : (
                            <>
                              <div className={styles.treasureWeave} aria-hidden />
                              <div className={styles.treasureLabel}>drop art — {t.name}</div>
                            </>
                          )}
                      </div>
                      <div className={styles.treasureText}>
                        {t.action && <div className={styles.treasureKicker}>{t.action}</div>}
                        <div className={styles.treasureName}>{t.name}</div>
                        {t.description && <div className={styles.treasureDesc}>{t.description}</div>}
                      </div>
                    </Reveal>
                  ))}
                </div>
              </>
            )}

            {milestones.length > 0 && (
              <Reveal className={styles.timelineWrap}>
                <div className={cx(styles.eyebrow, styles.eyebrowLilac)} style={{ margin: 0 }}>A life, measured</div>
                <div ref={timelineRef} className={styles.timeline}>
                  <div className={styles.timelineRail} aria-hidden />
                  <div ref={timelineFillRef} className={styles.timelineFill} aria-hidden />
                  {milestones.map((m, i) => (
                    <Reveal key={i} className={styles.milestone}>
                      <div
                        className={cx(styles.milestoneNode, i === milestones.length - 1 && styles.milestoneNodeLast)}
                        aria-hidden
                      />
                      {has(m.year) && <div className={styles.milestoneYear}>{text(m.year)}</div>}
                      {has(m.caption) && <div className={styles.milestoneCaption}>{text(m.caption)}</div>}
                    </Reveal>
                  ))}
                </div>
              </Reveal>
            )}
          </section>
        )}

        {/* ── The closing board ── */}
        <section ref={closingRef} className={styles.closing}>
          <Reveal as="p" className={cx(styles.eyebrow, styles.eyebrowGold)}>
            {text(legacy?.title) || `${first}'s legacy lives on`}
          </Reveal>
          <Reveal delay={60}>
            {has(legacy?.headline) && <p className={styles.legacyHeadline}>{text(legacy?.headline)}</p>}
            {paragraphs(legacy?.narrative).map((p, i) => (
              <p key={i} className={styles.legacyBody}>{p}</p>
            ))}
            {takeaway && <p className={styles.takeaway}>{takeaway}</p>}
          </Reveal>
          <Reveal className={styles.colophon} delay={120}>
            <div className={styles.colophonMark}>Maison d&rsquo;Or&eacute; · Born on this day</div>
            <button type="button" className={styles.topBtn} onClick={() => goTo(0)}>
              <span>Back to the beginning</span>
              <span aria-hidden style={{ fontSize: 12 }}>↑</span>
            </button>
          </Reveal>
        </section>

      </div>
    </div>
  );
}

// The label a plate shows while it has no art — what belongs there, not "image".
function figureLabel(eyebrow: string, number: number): string {
  return `drop art — ${eyebrow || `chapter ${ordinal(number)}`}`;
}

/** The nav glyphs, traced from the design. */
function RoomIcon({ id }: { id: EditionSectionId }) {
  const common = {
    width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.4,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (id) {
    case 'story':
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z" />
        </svg>
      );
    case 'lessons':
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="4.4" />
          <path d="M12 13.4V21" />
          <path d="M8.6 18h6.8" />
        </svg>
      );
    case 'facts':
      return (
        <svg {...common}>
          <path d="M12 3.2 13.9 9l6 .3-4.7 3.7 1.6 5.8L12 15.6 7.2 18.8l1.6-5.8L4.1 9.3l6-.3z" />
        </svg>
      );
    case 'gallery':
    default:
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4.6 17.4 4.6-4.2 3.6 3.1 2.7-2.3 4 3.6" />
        </svg>
      );
  }
}
