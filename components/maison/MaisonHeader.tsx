'use client';

/**
 * MaisonHeader — the homepage's top bar, redrawn onto components/ds alongside
 * the landing page it sits on (this is the only route that mounts it).
 *
 * Everything it says is what it said before. What changed is that it no longer
 * says it in hexes: the wordmark, the six nav labels, the search affordance,
 * the "Classic Maison" link and the sign-up call are the same controls, now
 * wearing the §2.2 type tokens, the §1 semantic colours and the Button coat
 * instead of a private ladder of `fontSize: '0.6rem'` / `color: var(--taupe)`
 * declarations against the legacy palette.
 *
 * ⚠ Two things in here still point at nothing, both inherited and both left
 * alone on purpose so this stayed a redesign rather than an edit:
 *
 *   · The six nav routes — /family-tracker, /academy, /rituals, /journal,
 *     /almanac, /village — are all 404s in this project. The footer and the
 *     landing page below already dropped their links to the cut features
 *     ("no control that goes nowhere"); this bar never did. When that is
 *     decided, the real destinations are the five in MaisonFooter's NAV_LINKS.
 *   · The ⌘K search opens nothing. It is an affordance for a command palette
 *     that does not exist yet.
 *
 * Deleting either is an editorial call, not a styling one — make it
 * deliberately, in its own change.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ds';
import MaisonBrandName from './MaisonBrandName';

// Nav labels from the design, mapped to the app's real routes.
const NAV_LINKS = [
  { label: 'Family', path: '/family-tracker' },
  { label: 'Academy', path: '/academy' },
  { label: 'Rituals', path: '/rituals' },
  { label: 'Discover', path: '/journal' },
  { label: 'Almanac', path: '/almanac' },
  { label: 'Village', path: '/village' },
];

/* A next/link is not a raw anchor, so the nav keeps client navigation and
   still gets the house's link ink. Written out rather than composed from
   TextLink because these are wayfinding labels, not prose: no underline at
   rest, and the editorial label size. */
const NAV_LINK =
  'type-label-editorial text-secondary whitespace-nowrap transition-colors duration-300 ' +
  'hover:text-accent-readable ' +
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export default function MaisonHeader() {
  const [scrolled, setScrolled] = useState(false);

  // Firm up the bar's background once the page scrolls beneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ⌘K / Ctrl+K search affordance (placeholder — wire to a real
  // command palette when one exists).
  const openSearch = () => {
    // TODO: open command palette / search overlay.
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className="text-primary sticky top-0 z-50 backdrop-blur-[10px] backdrop-saturate-[1.05] transition-[background-color,border-color] duration-300"
      style={{
        /* The frosted ground, derived from --surface-page the same way
           --surface-overlay is, so the bar follows its theme for free. It
           firms up rather than appears: 66% → 94% of the page ground. */
        backgroundColor: `color-mix(in srgb, var(--surface-page) ${scrolled ? 94 : 66}%, transparent)`,
        borderBottom: `1px solid ${scrolled ? 'var(--border-fine)' : 'transparent'}`,
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3.5 lg:flex-nowrap">
        {/* ── Wordmark ── */}
        <Link
          href="/"
          aria-label="Maison d'Ore — home"
          className="type-display-story shrink-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          <MaisonBrandName />
        </Link>

        {/* ── Search + actions ──
            Ahead of the nav in source order on purpose: on a narrow screen the
            bar is two rows, and the row that must never wrap away is the one
            with the wordmark and the sign-up. `order-*` puts the nav back in
            the middle from `lg` up, where everything fits on one line. */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:order-3">
          {/* The hiding is on a WRAPPER, not on the Button. `hidden` and the
              coat's own `inline-flex` are both display utilities, and which
              one wins is decided by Tailwind's output order rather than by
              the order they are written in — so `className="hidden"` on a
              Button is a coin toss that came up heads-on-phones here. A span
              has no display of its own to argue with. */}
          <span className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={openSearch}
              aria-label="Search (Command K)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Cmd K</span>
            </Button>
          </span>

          <Link href="/" className={`${NAV_LINK} hidden px-2 md:inline-block`}>
            Classic Maison
          </Link>

          <Button href="/signup" size="sm">
            Sign Up
          </Button>
        </div>

        {/* ── Primary nav ── */}
        <nav
          aria-label="Maison"
          className="order-last flex w-full items-center gap-6 overflow-x-auto lg:order-2 lg:w-auto lg:justify-center lg:gap-7 xl:gap-9"
          /* The bar is one line from `lg` up and this never scrolls there;
             below it, the scrollbar would be a grey slab across the header on
             every phone. The labels are duplicated in the footer's own nav. */
          style={{ scrollbarWidth: 'none' }}
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.path} className={NAV_LINK}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
