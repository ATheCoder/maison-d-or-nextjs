import type { CSSProperties, ReactNode } from 'react';

/**
 * Heading — a display heading that renders the type token exactly.
 *
 * It is a <p role="heading" aria-level={n}>, not an <h1>–<h6>, and that is
 * load-bearing: the legacy unlayered h1–h6 rules still in globals.css
 * (Playfair, 0.08em tracking, --brown ink) beat the layered type-* utilities
 * on real heading tags, so an <h2 className="type-display-section"> silently
 * renders in the old face. The document outline is identical — assistive
 * technology reads role+aria-level exactly as it reads a tag — and the
 * rendering is the token.
 *
 * This workaround lives here, once, so the day those legacy rules are deleted
 * the whole house goes back to real tags by editing one file. Do not spread
 * the pattern by hand.
 *
 * `variant` defaults from `level` (1 → hero, 2 → section, 3+ → story), which
 * is the house's usual pairing; pass it explicitly for the cases where the
 * outline and the size legitimately disagree.
 */
type HeadingVariant = 'hero' | 'section' | 'story';

const VARIANT: Record<HeadingVariant, string> = {
  hero: 'type-display-hero',
  section: 'type-display-section',
  story: 'type-display-story',
};

/* Spelled out, not interpolated: Tailwind v4 scans source text, and a
   `text-${tone}` template literal is invisible to it. */
const TONE = { primary: 'text-primary ', secondary: 'text-secondary ', none: '' } as const;

const DEFAULT_VARIANT = (level: number): HeadingVariant =>
  level <= 1 ? 'hero' : level === 2 ? 'section' : 'story';

export default function Heading({
  level = 2,
  variant,
  tone = 'primary',
  className = '',
  style,
  children,
}: {
  level?: number;
  variant?: HeadingVariant;
  /** `none` when the ink is set by the call site (letterpress demos, colour tests). */
  tone?: 'primary' | 'secondary' | 'none';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <p
      role="heading"
      aria-level={level}
      className={`${VARIANT[variant ?? DEFAULT_VARIANT(level)]} ${TONE[tone]}${className}`}
      style={style}
    >
      {children}
    </p>
  );
}
