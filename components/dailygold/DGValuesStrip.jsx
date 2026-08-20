'use client';
/**
 * DGValuesStrip — the five words the Maison is for, in gold caps at the tail
 * of the gallery.
 *
 * It used to be a tinted band with a gradient hairline between each word. In a
 * gallery the words are the last label on the way out, so they sit on the same
 * wall as everything else with nothing drawn around them.
 *
 * Purely decorative litany, hidden from assistive tech: nothing here is
 * navigation and nothing here is content a reader would miss.
 */

const VALUES = ['Wonder', 'Wisdom', 'Kindness', 'Courage', 'Connection'];

export default function DGValuesStrip() {
  return (
    <div className="gl-vals" aria-hidden="true">
      {VALUES.map((value) => <span key={value}>{value}</span>)}
    </div>
  );
}
