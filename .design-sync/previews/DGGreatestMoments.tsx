import DGGreatestMoments from '@/components/dailygold/DGGreatestMoments';

// `moments` are ranked historical entries: rank, year, headline, story,
// image_url. `editionDate` sets the "…on <day> <month>" label. The empty
// state is a real, deliberately-styled path, so it gets its own story.

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

export function RankedMoments() {
  return <DGGreatestMoments moments={MOMENTS} editionDate="2026-07-27" />;
}

export function TopMomentOnly() {
  return <DGGreatestMoments moments={[MOMENTS[0]]} editionDate="2026-07-27" />;
}

export function NothingYet() {
  return <DGGreatestMoments moments={[]} editionDate="2026-07-27" />;
}
