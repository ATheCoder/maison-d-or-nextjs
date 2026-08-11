import type { CSSProperties, ReactNode } from 'react';

/**
 * Eyebrow — §4 base primitive (docs/DesignSystemP1.md). label-editorial text
 * over the short gold rule. text-accent resolves per surface scope, so the
 * label turns gold-bright inside dark/navy sections with no props. Margins
 * around the whole block are the call site's business; only the label→rule
 * gap is owned here.
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
      <p className="type-label-editorial text-accent">{children}</p>
      {rule && <hr className="rule-accent mt-2" />}
    </div>
  );
}
