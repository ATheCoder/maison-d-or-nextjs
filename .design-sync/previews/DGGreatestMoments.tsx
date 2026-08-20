import type { ReactNode } from 'react';
import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The ledger. `moments` are ranked historical entries: rank, year, headline,
// story, image_url. Shown twice on purpose — rank one hangs as a work with its
// story, and all ten stand beside it as a slim index of rank / year / headline
// / heart, so a reader gets both the invitation and the contents page without
// opening anything. `editionDate` sets the "…on <day> <month>" label. The empty
// state is a real, deliberately styled path, so it gets its own story.

const ART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F3E9D8"/><stop offset="100%" stop-color="#8B7355"/>
  </linearGradient></defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <circle cx="240" cy="150" r="70" fill="#FFF6E0" opacity="0.6"/>
  <path d="M0 330 Q 220 260 440 320 T 800 330 L800 500 L0 500 Z" fill="#4A3B2A" opacity="0.4"/>
</svg>`);

const MOMENTS = [
  {
    rank: 1,
    year: 1969,
    headline: 'The first footprint on the Moon',
    story:
      'Two men set a ladder against the sky and stepped off it. There is no weather up there to sweep the dust about, so the print is still exactly where it was put.',
    image_url: ART,
  },
  {
    rank: 2,
    year: 1928,
    headline: 'Penicillin found in a forgotten dish',
    story: 'A messy laboratory, a stray mould, and a scientist who looked closer instead of washing up.',
  },
  {
    rank: 3,
    year: 1896,
    headline: 'An audience ducks as a painted train arrives',
    story: 'Nobody had learned yet how to watch a moving picture, so for one evening they simply believed it.',
  },
];

/**
 * The room a wall needs around it when it is shown on its own.
 *
 * GALLERY_CSS is emitted once by the edition page for the whole reading
 * column, so a single wall lifted out of it has no frames, no hairlines and no
 * label scale until it brings the stylesheet with it. `.gl` is the room those
 * rules hang in.
 */
function Room({ children }: { children: ReactNode }) {
  return (
    <div className="gl" style={{ background: 'var(--surface-page)', paddingBottom: 24 }}>
      <style>{GALLERY_CSS}</style>
      {children}
    </div>
  );
}

export function RankedMoments() {
  return (
    <Room>
      <DGGreatestMoments moments={MOMENTS} editionDate="2026-07-27" />
    </Room>
  );
}

export function TopMomentOnly() {
  return (
    <Room>
      <DGGreatestMoments moments={[MOMENTS[0]]} editionDate="2026-07-27" />
    </Room>
  );
}

export function NothingYet() {
  return (
    <Room>
      <DGGreatestMoments moments={[]} editionDate="2026-07-27" />
    </Room>
  );
}
