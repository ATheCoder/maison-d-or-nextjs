import type { ReactNode } from 'react';
import DGDestination from '@/components/dailygold/DGDestination';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The destination wall. `dest` carries name, continent, atmosphere, child_life
// and the four senses; `imageUrl` is the painted view, hung largest at the
// wall's corner and still the door into the modal. Country resolution drives
// the flag seal, so the name is a real place.
//
// A sense with an `image_url` hangs as a small SQUARE work; a sense without one
// hangs as a label plate. The plate is the common case rather than the
// fallback — the senses only got image columns when this wall was built, so
// every day authored before then has four of them. `Destination` shows the
// plates; `AnotherPlace` shows two of the four painted.

const ART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F7EFDD"/><stop offset="55%" stop-color="#D9C49B"/>
    <stop offset="100%" stop-color="#6E5B3E"/>
  </linearGradient></defs>
  <rect width="1200" height="700" fill="url(#g)"/>
  <circle cx="880" cy="160" r="88" fill="#FFF6E0" opacity="0.8"/>
  <path d="M0 400 L180 250 L330 400 Z" fill="#8B7355"/>
  <path d="M250 420 L430 220 L610 420 Z" fill="#7C8770"/>
  <path d="M0 470 Q 300 410 620 460 T 1200 470 L1200 700 L0 700 Z" fill="#5C6B52"/>
  <path d="M0 560 Q 340 500 700 550 T 1200 566 L1200 700 L0 700 Z" fill="#4A3B2A"/>
</svg>`);

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

/** A square stand-in for a sense's own painting. */
const SENSE = (a: string, b: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="267">
       <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
       </linearGradient></defs>
       <rect width="400" height="267" fill="url(#s)"/>
       <circle cx="200" cy="133" r="62" fill="#FFF6E4" opacity="0.5"/>
     </svg>`,
  );

export function Destination() {
  return (
    <Room>
      <DGDestination
        imageUrl={ART}
        dest={{
          name: 'Iceland',
          continent: 'Europe',
          atmosphere:
            'A country still being built by its own volcanoes — steam drifting off the ground in the middle of a green field, and light that refuses to leave in summer.',
          child_life:
            'Children here swim outdoors all year in pools warmed by the earth itself, and learn to read the weather before they learn to read a clock.',
              // The four sensory tiles read straight off `dest`.
          taste_of_day: { name: 'Skyr with wild bilberries' },
          sound_of_day: { name: 'Meltwater under a lava field' },
          nature_detail: { name: 'Moss that takes a century to grow back' },
          tiny_phrase: { word: 'Þetta reddast', translation: 'It will all work out', language: 'Icelandic' },
        }}
      />
    </Room>
  );
}

export function AnotherPlace() {
  return (
    <Room>
      <DGDestination
        imageUrl={ART}
        dest={{
          name: 'Peru',
          continent: 'South America',
          atmosphere:
            'Cities stacked on mountainsides where the air is thin enough to make a newcomer stop halfway up a staircase and simply look.',
          child_life:
            'Many children grow up speaking two languages — one for school and one for their grandmother — and count in a system older than the country itself.',
          // Two painted, two not — the wall hangs the first pair as square
          // works and the second pair as label plates.
          taste_of_day: { name: 'Purple corn boiled with cinnamon', image_url: SENSE('#7A5A86', '#3A2A46') },
          sound_of_day: { name: 'A bamboo flute on a cold morning', image_url: SENSE('#C8A96B', '#6E5B3E') },
          nature_detail: { name: 'A flower that opens only above 4,000 metres' },
          tiny_phrase: { word: 'Allinllachu', translation: 'Are you well?', language: 'Quechua' },
        }}
      />
    </Room>
  );
}
