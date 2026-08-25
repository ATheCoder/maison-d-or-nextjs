import type { CSSProperties, ReactNode } from 'react';

/**
 * Rule — base primitive. Fine or accent divider,
 * optionally interrupted by a centered ornament (default: small gold diamond
 * at 60% opacity, per spec).
 *
 * Lines are composed from border-t + the color utilities rather than the
 * rule-fine/rule-accent @utilities: rule-accent bakes in the 2.5rem eyebrow
 * width (§3.4 — that width belongs to <Eyebrow>), while a Rule accent is the
 * full-bleed §3.2 section-butting gold hairline.
 */
type RuleVariant = 'fine' | 'accent';

const LINE: Record<RuleVariant, string> = {
  fine: 'border-0 border-t border-fine',
  accent: 'border-0 border-t border-accent',
};

export default function Rule({
  variant = 'fine',
  ornament = false,
  className = '',
  style,
}: {
  variant?: RuleVariant;
  ornament?: boolean | ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  if (!ornament) {
    return <hr className={`${LINE[variant]} ${className}`} style={style} />;
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`flex items-center gap-3 ${className}`}
      style={style}
    >
      <span aria-hidden className={`flex-1 ${LINE[variant]}`} />
      <span aria-hidden className="select-none">
        {ornament === true ? (
          <span className="text-accent opacity-60 text-xs leading-none">◆</span>
        ) : (
          ornament
        )}
      </span>
      <span aria-hidden className={`flex-1 ${LINE[variant]}`} />
    </div>
  );
}
