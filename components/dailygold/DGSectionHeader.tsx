'use client';
/**
 * DGEyebrow / DGSectionHeader — the Daily Gold kicker label, and the
 * eyebrow-over-heading block a section opens with.
 *
 * **Letter-spacing is a three-tier scale on purpose.** It used to be a free
 * number: twenty-odd kickers across this directory carried seven different
 * values (0.12, 0.14, 0.15, 0.16, 0.18, 0.2, 0.22, 0.25em), none of them a
 * decision — each was whatever the file next to it happened to say. `tracking`
 * is the whole vocabulary now:
 *
 * - `tight` (0.12em) — small inline meta: a location, a "Seen on", a date line.
 * - `wide`  (0.2em)  — a modal's kicker, a menu heading, a caption over art.
 * - `hero`  (0.25em) — the eyebrow standing above a section's `<h2>`.
 *
 * If a new label seems to want a fourth value, it wants one of these three.
 * Please do not reintroduce an ad-hoc `letterSpacing` at the call site — the
 * point of this module is that there is nowhere left for one to hide.
 */
import type { CSSProperties, ReactNode } from 'react';

/** The only three letter-spacings the Daily Gold kicker has. */
export type DGEyebrowTracking = 'tight' | 'wide' | 'hero';

const TRACKING: Record<DGEyebrowTracking, string> = {
  tight: '0.12em',
  wide: '0.2em',
  hero: '0.25em',
};

/**
 * The uppercase kicker label. Margins are the call site's business — the base
 * style zeroes them, and `style` is merged last so a site can set its own
 * spacing (and, where the design asks for it, a different size or weight)
 * without reaching for the tracking.
 */
export function DGEyebrow({
  children,
  tracking = 'wide',
  color,
  as: Tag = 'p',
  className,
  style,
}: {
  children?: ReactNode;
  tracking?: DGEyebrowTracking;
  /** Defaults to `var(--accent-readable)`; gold and muted are the other two in use. */
  color?: string;
  /** `span` for the kickers that sit inside a flex row rather than on their own. */
  as?: 'p' | 'span';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: 'var(--face-sans)',
        fontSize: '0.7rem',
        letterSpacing: TRACKING[tracking],
        textTransform: 'uppercase',
        color: color ?? 'var(--accent-readable)',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * The block every column section opens with: a `hero`-tracked eyebrow over the
 * section's `<h2>`. Deliberately propless beyond its two strings — the three
 * sections that use it are pixel-identical, and a header that wants different
 * sizes or a centred axis is not this block and should compose `DGEyebrow`
 * with its own heading instead.
 */
export default function DGSectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
}) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <DGEyebrow tracking="hero" style={{ margin: '0 0 0.35rem' }}>
        {eyebrow}
      </DGEyebrow>
      <h2 style={{
        fontFamily: 'var(--face-display)',
        fontSize: '1.4rem',
        fontWeight: 600,
        color: 'var(--accent-readable)',
        margin: 0,
        lineHeight: 1.15,
      }}>
        {title}
      </h2>
    </div>
  );
}
