import DGGoodNews from '@/components/dailygold/DGGoodNews';

// `items` are good-news rows: headline, description, location, image_url.
// The first item is the lead story and the rest become the secondary list,
// so the story set sweeps one-item, several-item, and the null-render case.

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

export function LeadAndMore() {
  return <DGGoodNews items={ITEMS} />;
}

export function SingleStory() {
  return <DGGoodNews items={[ITEMS[0]]} />;
}
