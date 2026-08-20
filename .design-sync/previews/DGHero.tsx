import type { ReactNode } from 'react';
import DGHero from '@/components/dailygold/DGHero';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The gallery's entrance: one painting, the day's name, and (in the real page)
// the turner on the label's own line. `heroImageUrl` is the day's artwork —
// falling back to the destination painting in the page, since no edition in the
// corpus has a masthead painting of its own. When there is none at all the
// entrance renders without it rather than borrowing another day's; both states
// are real product behaviour, so both are stories.
//
// The masthead this replaced overlaid its art heavily — 0.75 opacity, a radial
// mask and an ~80%-opaque cream wash — to keep a title legible on top of it.
// None of that survives: the painting is now shown whole and the words hang
// beneath it, except on espresso and navy, where they stand in a two-axis ramp
// at the painting's foot. Which means WHERE the label sits is a function of the
// reader's theme, and neither placement is visible in a preview that renders
// the entrance on the default ground.
//
// The stand-in is still saturated, because the two dark grounds do ramp the
// lower-left quadrant and pale art loses its bottom edge there.
const ART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="700">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E9D3A6"/><stop offset="45%" stop-color="#C8A96B"/>
      <stop offset="100%" stop-color="#6E5B3E"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="700" fill="url(#g)"/>
  <circle cx="1040" cy="180" r="150" fill="#FFF1CE" opacity="0.85"/>
  <circle cx="1040" cy="180" r="58" fill="#FFFBEE"/>
  <path d="M0 430 Q 260 330 540 400 T 1080 372 T 1400 420 L1400 700 L0 700 Z" fill="#5C6B52"/>
  <path d="M0 512 Q 320 430 660 494 T 1400 512 L1400 700 L0 700 Z" fill="#7C8770"/>
  <path d="M0 592 Q 380 534 760 578 T 1400 596 L1400 700 L0 700 Z" fill="#4A3B2A"/>
  <g fill="#33291C">
    <path d="M210 520 l26 -92 l26 92 z"/><path d="M262 528 l19 -66 l19 66 z"/>
    <path d="M1120 524 l30 -100 l30 100 z"/><path d="M1176 532 l21 -70 l21 70 z"/>
  </g>
</svg>`);

/** The room the entrance hangs in — see the note above GALLERY_CSS. */
function Room({ children }: { children: ReactNode }) {
  return (
    <div className="gl" style={{ background: 'var(--surface-page)', paddingBottom: 24 }}>
      <style>{GALLERY_CSS}</style>
      {children}
    </div>
  );
}

export function WithArtwork() {
  return (
    <Room>
      <DGHero
        dateStr="Monday, 27 July 2026"
        heroImageUrl={ART}
        destinationName="Reykjavík, Iceland"
        atmosphere="Steam drifts off the ground in the middle of a green field, and the light refuses to leave all summer."
      />
    </Room>
  );
}

/** No painting, and no edition row behind it: the walls are bare, and say so. */
export function WithoutArtwork() {
  return (
    <Room>
      <DGHero dateStr="Tuesday, 28 July 2026" hasEdition={false} />
    </Room>
  );
}
