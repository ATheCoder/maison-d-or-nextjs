'use client';
/**
 * The year in the footer's copyright line.
 *
 * A component for four characters, because `new Date().getFullYear()` inline in
 * MaisonFooter was the one thing keeping `/` off the prerender. Under Cache
 * Components the clock is request data: reading it during a render with no
 * other request data raises `next-prerender-current-time`, and the homepage —
 * which otherwise reads nothing at all — was failing the build on a copyright
 * line.
 *
 * So the year is stamped into the bundle at build time (next.config.ts sets
 * NEXT_PUBLIC_BUILD_YEAR from the build clock, which runs outside any render
 * and is therefore not request data) and corrected on the client after
 * hydration. A deployment that runs across New Year's Eve serves last year's
 * digits for the few milliseconds before hydration and then fixes itself; it
 * never renders empty, so the line does not reflow.
 */
import { useEffect, useState } from 'react';

const BUILD_YEAR = process.env.NEXT_PUBLIC_BUILD_YEAR ?? '';

export default function CopyrightYear() {
  const [year, setYear] = useState(BUILD_YEAR);

  useEffect(() => {
    const actual = String(new Date().getFullYear());
    if (actual !== year) setYear(actual);
  }, [year]);

  return <>{year}</>;
}
