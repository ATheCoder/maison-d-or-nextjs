import DGOnThisDay from '@/components/dailygold/DGOnThisDay';

// `events` are rows from the on_this_day_event table: the component groups them
// by year and opens on the most recent year that holds something. Field shape
// mirrors what the component reads — headline, story, year, location, position.

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

export function Almanac() {
  return <DGOnThisDay events={EVENTS} />;
}

export function SingleEntryYear() {
  return <DGOnThisDay events={EVENTS.filter((e) => e.year === 1928)} />;
}

export function Empty() {
  return <DGOnThisDay events={[]} />;
}
