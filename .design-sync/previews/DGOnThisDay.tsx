import type { ReactNode } from 'react';
import DGOnThisDay from '@/components/dailygold/DGOnThisDay';
import { GALLERY_CSS } from '@/components/dailygold/galleryCss';

// The year room. `events` are rows from the on_this_day_event table: the
// component groups them by year and opens on the most recent year that holds
// something, with that year set as an enormous hollow numeral BEHIND the work.
// Field shape mirrors what the component reads — headline, story, year,
// location, position.
//
// Two distinct empty states, and they are not the same absence: a year this
// date has nothing in YET, where the seals lead somewhere and a "travel to"
// line is offered; and a date with no travels recorded at all, where they lead
// nowhere and the room says so instead. `Empty` is the second.

const EVENTS = [
  {
    year: 1969,
    position: 0,
    headline: 'A footprint that will outlast the wind',
    location: 'Sea of Tranquility, the Moon',
    story:
      'Two men set a ladder against the sky and stepped off it. There is no weather on the Moon to sweep the dust about, so the print left that afternoon is still exactly where it was put — a small, patient mark that will wait there longer than any of us.',
  },
  {
    year: 1969,
    position: 1,
    headline: 'Six hundred million people held their breath together',
    location: 'Broadcast worldwide',
    story:
      'It was the largest audience that had ever gathered for anything. Families crowded into neighbours’ living rooms because one house on the street had a television, and for a few minutes the whole world was quiet in the same direction.',
  },
  {
    year: 1928,
    position: 0,
    headline: 'A forgotten dish grows something extraordinary',
    location: 'London, England',
    story:
      'A scientist came back from holiday to a messy laboratory and noticed that a stray mould had cleared a ring in a dish of bacteria. Most people would have washed it up. He looked closer, and the ring became penicillin.',
  },
  {
    year: 1896,
    position: 0,
    headline: 'The first film audience ducks',
    location: 'Paris, France',
    story:
      'A train arrived on a painted screen and the room leaned backwards. Nobody had learned yet how to watch a moving picture, so for one evening the audience simply believed it.',
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

export function Almanac() {
  return (
    <Room>
      <DGOnThisDay events={EVENTS} />
    </Room>
  );
}

export function SingleEntryYear() {
  return (
    <Room>
      <DGOnThisDay events={EVENTS.filter((e) => e.year === 1928)} />
    </Room>
  );
}

export function Empty() {
  return (
    <Room>
      <DGOnThisDay events={[]} />
    </Room>
  );
}
