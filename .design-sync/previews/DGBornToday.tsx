import DGBornToday from '@/components/dailygold/DGBornToday';

// The shelf of people born on this day. Each `person` is a remarkable-person
// row. Rank is staged, not labelled: the first volume stands front-and-centre
// on a podium under a cone of light, the second and third flank it angled
// inward and set back in depth, and everyone else stands in a smaller, dimmer
// row behind. Hovering any volume hands it the spotlight. It returns null on
// an empty list, so every story supplies people. `Shelf` shows the full
// diorama; `ShortShelf` exercises the two-volume podium with no back row.

const PORTRAIT = (a: string, b: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
       </linearGradient></defs>
       <rect width="400" height="560" fill="url(#g)"/>
       <circle cx="200" cy="210" r="86" fill="#FAF7F2" opacity="0.75"/>
       <path d="M60 560 Q 200 372 340 560 Z" fill="#FAF7F2" opacity="0.6"/>
     </svg>`,
  );

const PEOPLE = [
  {
    name: 'Marie Curie',
    role: 'Physicist and chemist',
    field: 'Science',
    birth_date: '1867-11-07',
    death_date: '1934-07-04',
    country: 'Poland',
    country_code: 'PL',
    nationality: 'Polish',
    slug: 'marie-curie',
    story_title: 'The woman who carried light in her pocket',
    image_url: PORTRAIT('#EADCC2', '#8B7355'),
  },
  {
    name: 'Rabindranath Tagore',
    role: 'Poet and composer',
    field: 'Letters',
    birth_date: '1861-05-07',
    death_date: '1941-08-07',
    country: 'India',
    country_code: 'IN',
    nationality: 'Indian',
    slug: 'rabindranath-tagore',
    story_title: 'The poet who wrote two countries their anthems',
    image_url: PORTRAIT('#F3E9D8', '#7C8770'),
  },
  {
    name: 'Ada Lovelace',
    role: 'Mathematician',
    field: 'Science',
    birth_date: '1815-12-10',
    death_date: '1852-11-27',
    country: 'United Kingdom',
    country_code: 'GB',
    nationality: 'British',
    slug: 'ada-lovelace',
    story_title: 'She wrote the first program for a machine that did not exist',
    image_url: PORTRAIT('#F0E6D3', '#364A63'),
  },
  {
    name: 'Wangarĩ Maathai',
    role: 'Environmentalist',
    field: 'Service',
    birth_date: '1940-04-01',
    death_date: '2011-09-25',
    country: 'Kenya',
    country_code: 'KE',
    nationality: 'Kenyan',
    slug: 'wangari-maathai',
    story_title: 'Fifty million trees, planted one at a time',
    image_url: PORTRAIT('#EADCC2', '#5C6B52'),
  },
  {
    name: 'Hokusai',
    role: 'Painter and printmaker',
    field: 'Art',
    birth_date: '1760-10-31',
    death_date: '1849-05-10',
    country: 'Japan',
    country_code: 'JP',
    nationality: 'Japanese',
    slug: 'hokusai',
    story_title: 'He drew the same wave until it was perfect',
    image_url: PORTRAIT('#F3E9D8', '#364A63'),
  },
];

export function Shelf() {
  return <DGBornToday people={PEOPLE} editionDate="2026-07-27" />;
}

export function ShortShelf() {
  return <DGBornToday people={PEOPLE.slice(0, 2)} editionDate="2026-07-27" />;
}
