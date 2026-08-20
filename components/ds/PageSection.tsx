import type { ReactNode } from 'react';
import Container from './Container';
import Eyebrow from './Eyebrow';
import Prose from './Prose';

/**
 * PageSection — the editorial section header: an Eyebrow, a lede at the
 * reading measure, then the section's body. The counterpart to
 * SectionSurface, and the distinction is worth keeping straight —
 * SectionSurface owns the GROUND (the data-surface scope, the grain, the
 * vertical rhythm), PageSection owns the CONTENT (the heading furniture and
 * the horizontal measure). A section with both wraps one in the other; a
 * section on the page's own ground needs only this.
 *
 * `bleed` lets the body escape the container while the header stays inside
 * it — the shape every full-width figure wants (a gallery, a table that
 * scrolls, a stack of surface stamps that must run edge to edge under a
 * header that does not).
 */
export default function PageSection({
  eyebrow,
  lede,
  width = 'default',
  bleed = false,
  padding = 'default',
  className = '',
  id,
  children,
}: {
  eyebrow?: ReactNode;
  lede?: ReactNode;
  width?: 'prose' | 'default' | 'wide';
  bleed?: boolean;
  padding?: 'default' | 'none';
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const header = eyebrow != null || lede != null;
  return (
    <section id={id} className={`${padding === 'default' ? 'pt-16 ' : ''}${className}`}>
      {header && (
        <Container width={width}>
          {eyebrow != null && <Eyebrow>{eyebrow}</Eyebrow>}
          {lede != null && <Prose className="mt-4 mb-8">{lede}</Prose>}
        </Container>
      )}
      {bleed ? children : <Container width={width}>{children}</Container>}
    </section>
  );
}
