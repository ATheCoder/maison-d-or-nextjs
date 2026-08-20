import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Prose — running text at the house measure. The pattern it replaces
 * (`type-body max-w-[38rem] text-secondary`) was hand-typed in every
 * documentation block and lede on the /design page; the measure is a design
 * decision — roughly 65–75 characters of Instrument Sans, the width the
 * §2.2 scale was set against — not a per-call-site guess.
 *
 * `tone` is optional because the tokens disagree on purpose: type-caption
 * already carries text-secondary (see globals.css §2.2), so leaving tone
 * unset gives caption its own ink and gives body/body-ui the secondary ink
 * the page reads in. Pass a tone to override either.
 *
 * A block that genuinely wants a different measure (the grain panels are
 * narrower, to sit inside their own padding) passes `measure={false}` and
 * states the width itself — deliberately not a second max-w-* class, which
 * would collide with this one in Tailwind's output order.
 */
type ProseVariant = 'body' | 'body-ui' | 'caption';

const VARIANT: Record<ProseVariant, string> = {
  body: 'type-body',
  'body-ui': 'type-body-ui',
  caption: 'type-caption',
};

const TONE = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  faint: 'text-faint',
} as const;

/** caption ships with its ink; the body tokens do not. */
const DEFAULT_TONE: Record<ProseVariant, keyof typeof TONE | null> = {
  body: 'secondary',
  'body-ui': 'secondary',
  caption: null,
};

export default function Prose({
  variant = 'body',
  tone,
  measure = true,
  as: Tag = 'p' as ElementType,
  className = '',
  style,
  children,
}: {
  variant?: ProseVariant;
  tone?: keyof typeof TONE | 'none';
  measure?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const resolved = tone ?? DEFAULT_TONE[variant];
  const ink = resolved && resolved !== 'none' ? `${TONE[resolved]} ` : '';
  return (
    <Tag
      className={`${VARIANT[variant]} ${ink}${measure ? 'max-w-[38rem] ' : ''}${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
