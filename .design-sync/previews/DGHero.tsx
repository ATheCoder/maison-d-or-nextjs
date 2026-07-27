import DGHero from '@/components/dailygold/DGHero';

// The edition masthead. `heroImageUrl` is the day's artwork; when the day has
// no art the hero deliberately renders without it rather than borrowing
// another day's — both states are real product behaviour, so both are stories.
//
// Note the hero overlays its art heavily (0.75 opacity + a radial mask + an
// ~80%-opaque cream wash) to keep the title legible. Pale artwork disappears
// under that, so hero art has to carry real contrast — as the painted
// originals do. This stand-in is saturated for the same reason.
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

export function WithArtwork() {
  return <DGHero dateStr="Monday, 27 July 2026" heroImageUrl={ART} />;
}

export function WithoutArtwork() {
  return <DGHero dateStr="Tuesday, 28 July 2026" />;
}
