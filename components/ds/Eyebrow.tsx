import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Eyebrow — §4 base primitive (docs/DesignSystemP1.md). label-editorial text
 * over the short gold rule. The label is small functional text, so it wears
 * accent-readable (bare gold fails AA on light grounds); the rule stays bare
 * accent — it is ornament. Both resolve per surface scope with no props:
 * gold-bright inside dark/navy sections, the family tones inside the
 * atmosphere scopes. Margins around the whole block are the call site's
 * business; only the label→rule gap is owned here.
 *
 * `tone` exists for the same reason Prose and Heading have one: a kicker is
 * not always the page's wayfinding. Accent-readable is the eyebrow that says
 * where you are; `secondary` and `faint` are the ones that label a field of
 * metadata ("Seen on", "First collected") and must not compete with it. The
 * three are tokens, never colours — an eyebrow that wants a fourth wants one
 * of these three.
 *
 * WITHOUT THE RULE, THERE IS NO WRAPPER. `rule={false}` renders the label
 * alone — `<p>`, or `<span>` via `as` for the kickers that sit inside a flex
 * row — because a <div> around a single <p> with nothing else in it is markup
 * that only exists to be a container for something that is not there. That
 * matters more than it sounds: it is what lets Daily Gold's DGEyebrow be a
 * skin of this primitive rather than a parallel one, without every call site
 * growing a layout-neutral div it has to work around.
 */
const TONE = {
  accent: 'text-accent-readable',
  secondary: 'text-secondary',
  faint: 'text-faint',
} as const;

export default function Eyebrow({
  children,
  rule = true,
  tone = 'accent',
  as: Tag = 'p' as ElementType,
  className = '',
  style,
}: {
  children: ReactNode;
  rule?: boolean;
  tone?: keyof typeof TONE;
  /** `span` for a kicker inside a flex row. Ignored when `rule` is on. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const label = `type-label-editorial ${TONE[tone]}`;

  if (!rule) {
    return (
      <Tag className={className ? `${label} ${className}` : label} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <div className={className} style={style}>
      <p className={label}>{children}</p>
      <hr className="rule-accent mt-2" />
    </div>
  );
}
