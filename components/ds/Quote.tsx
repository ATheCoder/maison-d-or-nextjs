import type { CSSProperties, ReactNode } from 'react';

/**
 * Quote — base primitive. type-quote (Fraunces
 * Italic) with a hanging gold opening mark: the glyph is absolutely
 * positioned into the left margin so the text block stays flush, and it is
 * aria-hidden — it is ornament, not punctuation. Attribution renders in
 * type-caption, which already carries text-secondary.
 */
export default function Quote({
  children,
  attribution,
  className = '',
  style,
}: {
  children: ReactNode;
  attribution?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <figure className={`relative ${className}`} style={style}>
      <span aria-hidden className="type-quote text-accent select-none absolute top-0 -left-[0.6em]">
        &ldquo;
      </span>
      <blockquote className="type-quote text-primary">{children}</blockquote>
      {attribution != null && <figcaption className="type-caption mt-3">&mdash; {attribution}</figcaption>}
    </figure>
  );
}
