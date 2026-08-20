import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Container — the horizontal measure. SectionSurface deliberately does NOT
 * own max-width or side padding (it says so in its own docstring: that is
 * "composition's job"); this is composition's job, made once instead of
 * re-typed as `mx-auto max-w-5xl px-6` at every call site.
 *
 * Three widths, and the names are about content, not pixels:
 *   prose — a single column of reading matter (the /design specimens)
 *   default — a documentation or editorial page with figures beside prose
 *   wide — tables and galleries that want the room
 *
 * `gutter` exists for the rare block that is already inside a padded parent;
 * turning it off is not the same as `padding="none"` on a surface, which is
 * vertical.
 */
type Width = 'prose' | 'default' | 'wide';

const WIDTH: Record<Width, string> = {
  prose: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

export default function Container({
  width = 'default',
  gutter = true,
  as: Tag = 'div' as ElementType,
  className = '',
  style,
  children,
}: {
  width?: Width;
  gutter?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Tag className={`mx-auto ${WIDTH[width]} ${gutter ? 'px-6 ' : ''}${className}`} style={style}>
      {children}
    </Tag>
  );
}
