import type { CSSProperties, ReactNode } from 'react';

/**
 * SectionSurface — base primitive. Owns the
 * data-surface scope and the vertical padding (globals.css §3.2 explicitly
 * leaves padding to this component). Grain arrives via texture-paper on
 * light and via .section-dark/.section-navy (which add the vignette) on the
 * editorial surfaces — the classes and the [data-surface] attribute selectors
 * are grafted together in globals.css, so token re-scoping agrees either way.
 *
 * Deliberately NOT owned here: horizontal padding/max-width (composition's
 * job) and the fine gold rule between butting sections — baking that in
 * would double it between two dark neighbours (see globals.css §3.2 note).
 */
type Surface = 'light' | 'sage' | 'rose' | 'lavender' | 'periwinkle' | 'dark' | 'navy';

/* The atmosphere surfaces are light grounds: token re-scoping rides the
   data-surface attribute alone (no .section-* class exists for them), grain
   arrives via texture-paper at light strength, and there is no vignette —
   that treatment belongs to the cinematic interludes only. */
const SURFACE: Record<Surface, string> = {
  light: 'texture-paper bg-surface-page text-primary',
  sage: 'texture-paper bg-surface-page text-primary',
  rose: 'texture-paper bg-surface-page text-primary',
  lavender: 'texture-paper bg-surface-page text-primary',
  periwinkle: 'texture-paper bg-surface-page text-primary',
  dark: 'section-dark',
  navy: 'section-navy',
};

const PADDING: Record<'default' | 'none', string> = {
  default: 'py-12 md:py-16',
  none: '',
};

export default function SectionSurface({
  surface = 'light',
  padding = 'default',
  children,
  className = '',
  style,
}: {
  surface?: Surface;
  padding?: 'default' | 'none';
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      data-surface={surface}
      className={`${SURFACE[surface]} ${PADDING[padding]} ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}
