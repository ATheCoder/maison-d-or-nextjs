// @ts-nocheck — untyped .jsx from before checkJs was on; 12 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * DGNavigationRail (desktop, ≥768px)
 *
 * One of the two renderers of dgNavConfig (the other is DGMobileTabBar).
 * Top to bottom: the house wordmark, global destinations, the child's own
 * "My World" shelf, and then — pinned to the foot — the identity block over
 * the seven inks. The identity block wears whichever identity the session
 * holds: the active reader (their name over the grown-up whose session this
 * is), or the signed-in grown-up alone (name over role).
 *
 * The shape is `06-gallery-themes.html`'s `.gl-rail`, which is where the two
 * things that are new here come from: the wordmark that replaced a monogram
 * disc, and the ink row. The inks used to be a fixed puck declared inside
 * DGHero, which meant the palette could only be changed from the edition —
 * hanging them in the rail hands them to all five destinations at once. Below
 * 768px, where there is no rail, DGPageShell mounts the puck instead.
 *
 * Layout contract: the rail's width is the shared `--dg-rail-w` CSS variable
 * set by DailyGoldEditionPage's shell stylesheet, which also pads the page
 * content by the same variable — the two can never drift apart. At 768–1023px
 * the shell folds the rail to a 76px post: the wordmark becomes its initial
 * (`.dg-rail-mark-short`), each row stacks its icon over a micro-label
 * (`.dg-rail-label-short`, which is why the shelf's Atlas carries a
 * `shortLabel`), and the identity block keeps its avatar alone
 * (`.dg-rail-id-label` hides). Below 768px the rail is hidden entirely.
 */
import { useState } from 'react';
import { Button } from '@/components/ds';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DGEyebrow } from '@/components/dailygold/DGSectionHeader';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import { dgDestinationsFor, DG_SHELF, DGIcon, isNavItemActive } from '@/components/dailygold/dgNavConfig';
import ChildSwitcherOverlay from '@/components/dailygold/ChildSwitcherOverlay';
import DGThemeSwitcher from '@/components/dailygold/DGThemeSwitcher';
import SwitchCurtain, { useProfileSwitch } from '@/components/dailygold/ProfileSwitchCurtain';
import { Avatar } from '@/components/ds';

export default function DGNavigationRail({ child = null, viewer = null }) {
  const pathname = usePathname();
  // The rail also hangs on /passport and /treasury, which mount no provider —
  // there this is the no-op API and nothing is recorded. No conditional needed.
  const { track } = useInstrumentation();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const destinations = dgDestinationsFor(child);

  const isActive = (item) => isNavItemActive(item, pathname);

  // The landing rule and the curtain that covers it live in useProfileSwitch;
  // this only closes the menu before handing the switch over.
  const { switching, handleSwitched: landSwitch } = useProfileSwitch(!!child);
  const handleSwitched = (kind, profile) => {
    setShowSwitcher(false);
    landSwitch(kind, profile);
  };

  const roleWord = viewer?.role === 'admin' ? 'Admin' : 'Parent';

  /* One row, both lists. The mockup gives destinations and shelf items the
     same ink and the same metrics — the only thing that separates them is the
     hairline between, so there is no reason for two renderings of it. Active
     is the tint plus --accent-readable, inherited by the icon through
     `currentColor`; there is no dot and no bold weight any more, because a
     row that is already a different colour on a different ground does not
     need a third signal to say the same thing. */
  const navRow = (item, onSelect) => {
    const active = isActive(item);
    return (
      <Link
        key={item.key}
        href={item.path}
        prefetch={item.prefetchFull ? true : undefined}
        className={`dg-rail-item${active ? ' dg-rail-active' : ''}`}
        /* onNavigate, not onClick: it fires only for the client-side
           navigation this event describes — a cmd-click into a new tab
           is not this session going anywhere. */
        onNavigate={() => onSelect(item)}
        aria-current={active ? 'page' : undefined}
        /* The label is named here rather than read off the text, because the
           two label spans below swap with the breakpoint and one of them is
           an abbreviation. The accessible name never abbreviates. */
        aria-label={item.label}
        title={item.label}
      >
        <span className="dg-rail-glyph" aria-hidden="true">
          <DGIcon name={item.icon} size={20} />
        </span>
        <span className="dg-rail-label type-body-ui" aria-hidden="true">{item.label}</span>
        <span className="dg-rail-label-short" aria-hidden="true">{item.shortLabel || item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="dg-rail" aria-label="Daily Gold navigation">
      <SwitchCurtain switching={switching} />

      {/* The house mark. Two spellings of the same name: the rail writes it
          out, the 76px post writes its initial. Both are decorative — the
          <nav> above is what carries the accessible name.

          "Oré" is split off so it can wear `.gold-shimmer` (globals.css) —
          the same sweep the landing wordmark and the gallery entrance
          heading wear; the rest of the mark keeps the rail's ink. */}
      <div className="dg-rail-mark" aria-hidden="true">
        <span className="dg-rail-mark-full font-display">
          Maison d&rsquo;<span className="gold-shimmer">Or&eacute;</span>
        </span>
        <span className="dg-rail-mark-short font-display">M</span>
        <DGEyebrow as="span" tracking="wide" tone="faint" className="dg-rail-mark-sub">
          Daily Gold
        </DGEyebrow>
      </div>

      {/* Global destinations.

          <Link>, not buttons: the rail sits in the viewport, so every
          destination's partial route — down to its own loading.tsx boundary —
          is prefetched on arrival. That boundary being warm is what lets a
          press show the page-shaped skeleton (family's, treasury's) instead of
          the generic group fallback. Default prefetch stops at the boundary
          for dynamic routes, so this costs no full server renders — except for
          the one destination that asks for the whole route (`prefetchFull` in
          dgNavConfig, and the reason it may). */}
      {destinations.map(item => navRow(item, (it) => {
        track('nav_select', { contentId: it.path, label: it.label, source: 'rail' });
      }))}

      {/* My World — the child's own shelf, a peer of global nav. The heading
          IS the divider: it carries the hairline on its own top border, which
          is what lets the folded rail keep the rule and drop the words. */}
      {child && (
        <>
          <DGEyebrow className="dg-rail-sub" tracking="wide" tone="faint">
            My world
          </DGEyebrow>
          {/* The shelf is the child's own space, not a destination of the
              app — its own event, from the same source. */}
          {DG_SHELF.map(item => navRow(item, (it) => {
            track('shelf_open', { contentId: it.path, label: it.label, source: 'rail' });
          }))}
        </>
      )}

      {/* The foot. `margin-top: auto` on the identity block pushes both it and
          the inks down; a signed-out stranger has no identity block, so the
          inks take the auto margin instead and the foot still reads as a foot. */}

      {/* Identity — persistent chrome, not scroll-away content. The reader's
          name leads and the grown-up holding the session is named beneath it,
          so a child always knows whose house they are reading in. */}
      {child && (
        <div className="dg-rail-id">
          <Button variant="bare"
            className="dg-rail-item dg-rail-id-btn"
            onClick={() => setShowSwitcher(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showSwitcher}
            aria-label={`Reading as ${child.name}. Switch reader`}
          >
            <Avatar avatar={child.avatar} size="sm" ring className="dg-rail-av" />
            <span className="dg-rail-id-label" aria-hidden="true">
              <b className="dg-rail-id-name">{child.name}</b>
              <small className="dg-rail-id-meta">
                {viewer ? `${viewer.name} · ${roleWord.toLowerCase()} ` : 'Reading '}
                <span className="dg-rail-chev">&#8964;</span>
              </small>
            </span>
          </Button>
          {showSwitcher && (
            <ChildSwitcherOverlay
              currentChildId={child.id}
              viewer={viewer}
              placement="top"
              onSwitched={handleSwitched}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>
      )}

      {/* Grown-up identity — a parent or admin with no active reader. Same
          slot, same menu affordance; the second line names the role so the
          account holder always knows which hat they are wearing. */}
      {!child && viewer && (
        <div className="dg-rail-id">
          <Button variant="bare"
            className="dg-rail-item dg-rail-id-btn"
            onClick={() => setShowSwitcher(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showSwitcher}
            aria-label={`Signed in as ${viewer.name} (${roleWord.toLowerCase()}). Account menu`}
          >
            <span className="dg-rail-av dg-rail-av-key" aria-hidden="true">
              🗝️
            </span>
            <span className="dg-rail-id-label" aria-hidden="true">
              <b className="dg-rail-id-name">{viewer.name}</b>
              <small className="dg-rail-id-meta">
                {roleWord} <span className="dg-rail-chev">&#8964;</span>
              </small>
            </span>
          </Button>
          {showSwitcher && (
            <ChildSwitcherOverlay
              viewer={viewer}
              placement="top"
              onSwitched={handleSwitched}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>
      )}

      {/* The seven inks. Every destination the rail reaches can now re-ground
          the room; the phone gets the same control as a puck from DGPageShell. */}
      <div className="dg-rail-ink">
        <DGThemeSwitcher variant="rail" />
      </div>
    </nav>
  );
}
