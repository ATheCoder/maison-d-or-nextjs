import type { ReactNode } from 'react';
import DGBornToday from '@/components/dailygold/DGBornToday';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The portrait wall: the people born on this date, hung flat at 3:4 with the
// label — name, role, dates, country, the door — BENEATH the work rather than
// stamped across it. This was a shelf of leather-bound volumes with the name
// foil-stamped over the face; the four gradient washes that existed to keep
// that foil legible are gone with it, and the portraits are visible for the
// first time.
//
// Rank is the SIZE of the work: the first is hung double and given the wall's
// corner. Below three works there is no lead at all — a doubled portrait on a
// two-column wall reads as "only", not as "first" — which is what `ShortShelf`
// exercises. A person with no `slug` has no story to open: that work hangs
// quieter, wears no heart, and says so. Returns null on an empty list.

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

export function Shelf() {
  return (
    <Room>
      <DGBornToday people={PEOPLE} editionDate="2026-07-27" />
    </Room>
  );
}

export function ShortShelf() {
  return (
    <Room>
      <DGBornToday people={PEOPLE.slice(0, 2)} editionDate="2026-07-27" />
    </Room>
  );
}
