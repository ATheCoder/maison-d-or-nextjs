import type { ReactNode } from 'react';
import DGGoodNews from '@/components/dailygold/DGGoodNews';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The salon hang. `items` are good-news rows: headline, description, location,
// image_url. The lead takes the wall's corner at double size with its excerpt;
// the rest hang beside and beneath it in rows, so an eleventh story opens a new
// row rather than an edge and nothing ever scrolls sideways. Below three
// stories there is no lead — the works hang at equal size. The story set sweeps
// one-item, several-item, and the null-render case.

const ART = (a: string, b: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
       </linearGradient></defs>
       <rect width="800" height="500" fill="url(#g)"/>
       <circle cx="600" cy="140" r="90" fill="#FFF6E0" opacity="0.55"/>
       <path d="M0 340 Q 200 280 400 330 T 800 336 L800 500 L0 500 Z" fill="#4A3B2A" opacity="0.35"/>
     </svg>`,
  );

const ITEMS = [
  {
    headline: 'A river declared clean enough to swim in again',
    location: 'Bristol, England',
    description:
      'Forty years after the last swimmer was warned off, the water has come back. Volunteers who tested it every month through two decades were the ones who noticed first.',
    image_url: ART('#EADCC2', '#7C8770'),
  },
  {
    headline: 'A town plants a tree for every child born this year',
    location: 'Kerala, India',
    description: 'Eleven hundred saplings, each with a name card tied to it.',
    image_url: ART('#F3E9D8', '#C8A96B'),
  },
  {
    headline: 'Two neighbours build a library in a phone box',
    location: 'Lisbon, Portugal',
    description: 'It holds ninety books and has never once been empty.',
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

export function LeadAndMore() {
  return (
    <Room>
      <DGGoodNews items={ITEMS} />
    </Room>
  );
}

export function SingleStory() {
  return (
    <Room>
      <DGGoodNews items={[ITEMS[0]]} />
    </Room>
  );
}
