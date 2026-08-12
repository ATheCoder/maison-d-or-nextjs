import type { CSSProperties, ReactNode } from 'react';

/**
 * Eyebrow — §4 base primitive (docs/DesignSystemP1.md). label-editorial text
 * over the short gold rule. The label is small functional text, so it wears
 * accent-readable (bare gold fails AA on light grounds); the rule stays bare
 * accent — it is ornament. Both resolve per surface scope with no props:
 * gold-bright inside dark/navy sections, the family tones inside the
 * atmosphere scopes. Margins around the whole block are the call site's
 * business; only the label→rule gap is owned here.
 */
export default function Eyebrow({
  children,
  rule = true,
  className = '',
  style,
}: {
  children: ReactNode;
  rule?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <p className="type-label-editorial text-accent-readable">{children}</p>
      {rule && <hr className="rule-accent mt-2" />}
    </div>
  );
}
