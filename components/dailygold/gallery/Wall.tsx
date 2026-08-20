'use client';
/**
 * Wall — one room of the gallery: the eyebrow that names it, the display line,
 * an optional lede, and the works hung beneath.
 *
 * This is the gallery's counterpart to DGSectionHeader, which stays where it
 * is for the four other rooms in the (dg) group. The difference is the ground:
 * a section header sits on a card, a wall header sits on the wall, and the
 * hairline between two walls is the only edge in the whole reading column.
 *
 * The header sits inside the gutter; the hang beneath it states its own
 * padding, because two walls want to bleed differently (the year room carries
 * a 260px numeral that has to start at the gutter, not inside it).
 */
import type { ReactNode } from 'react';

export default function Wall({
  eyebrow,
  title,
  lede,
  first = false,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  /** One italic line under the title, at most. Not every wall wants one. */
  lede?: ReactNode;
  /** The wall that opens the gallery, which takes no top rule and less air. */
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={first ? 'wall wall-first' : 'wall'}>
      <div className="wall-h">
        <small>{eyebrow}</small>
        <b>{title}</b>
        {lede && <p>{lede}</p>}
      </div>
      {children}
    </section>
  );
}
