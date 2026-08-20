'use client';
/**
 * DGEyebrow / DGSectionHeader — the Daily Gold kicker label, and the
 * eyebrow-over-heading block a section opens with.
 *
 * Both are SKINS of `components/ds` primitives now, not parallel ones.
 * DGEyebrow is `Eyebrow` with the rule off; DGSectionHeader is that over a
 * `Heading`. What is left in this file is the one thing the house primitives
 * do not know about — Daily Gold's tracking scale — and that is deliberately
 * all that is left. Anything else a kicker seems to want (a colour, a size, a
 * ground) is a token or a prop on the primitive, not a new option here.
 *
 * **Letter-spacing is a three-tier scale on purpose.** It used to be a free
 * number: twenty-odd kickers across this directory carried seven different
 * values (0.12, 0.14, 0.15, 0.16, 0.18, 0.2, 0.22, 0.25em), none of them a
 * decision — each was whatever the file next to it happened to say. `tracking`
 * is the whole vocabulary now:
 *
 * - `tight` (0.12em) — small inline meta: a location, a "Seen on", a date line.
 * - `wide`  (0.2em)  — a modal's kicker, a menu heading, a caption over art.
 * - `hero`  (0.25em) — the eyebrow standing above a section's heading.
 *
 * If a new label seems to want a fourth value, it wants one of these three.
 * Please do not reintroduce an ad-hoc `letterSpacing` at the call site — the
 * point of this module is that there is nowhere left for one to hide.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Eyebrow, Heading } from '@/components/ds';

/** The only three letter-spacings the Daily Gold kicker has. */
export type DGEyebrowTracking = 'tight' | 'wide' | 'hero';

/* Spelled out, not interpolated: Tailwind v4 scans source text, and a
   `tracking-[${n}em]` template literal is invisible to it. These are this
   file's one deliberate override of type-label-editorial's own 0.14em. */
const TRACKING: Record<DGEyebrowTracking, string> = {
  tight: 'tracking-[0.12em]',
  wide: 'tracking-[0.2em]',
  hero: 'tracking-[0.25em]',
};

/**
 * The uppercase kicker label. Face, size and weight come from the §2.2
 * `type-label-editorial` token by way of `Eyebrow`; the tracking tiers above
 * are the override. Margins are the call site's business — `style` is passed
 * straight through, so a site can set its own spacing without reaching for
 * the tracking.
 *
 * `tone` replaced a `color: string` prop that call sites filled with raw
 * `var(--…)` strings. It only ever held three values, and they are exactly
 * Eyebrow's three tones — so nothing was lost and there is no longer anywhere
 * for a fourth colour to appear.
 */
export function DGEyebrow({
  children,
  tracking = 'wide',
  tone = 'accent',
  as = 'p',
  className,
  style,
}: {
  children?: ReactNode;
  tracking?: DGEyebrowTracking;
  /** Defaults to accent-readable; secondary and faint are the other two in use. */
  tone?: 'accent' | 'secondary' | 'faint';
  /** `span` for the kickers that sit inside a flex row rather than on their own. */
  as?: 'p' | 'span';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Eyebrow
      rule={false}
      tone={tone}
      as={as}
      className={className ? `${TRACKING[tracking]} ${className}` : TRACKING[tracking]}
      style={style}
    >
      {children}
    </Eyebrow>
  );
}

/**
 * The block every column section opens with: a `hero`-tracked eyebrow over the
 * section's heading. Deliberately propless beyond its two strings — the three
 * sections that use it are pixel-identical, and a header that wants different
 * sizes or a centred axis is not this block and should compose `DGEyebrow`
 * with its own `Heading` instead.
 *
 * The heading is `Heading level={2} variant="story"`, which is the pairing the
 * hand-rolled `<h2 className="type-display-story">` here was already making —
 * except that as a real <h2> it was silently losing the token to the legacy
 * unlayered h1–h6 rule in globals.css. See Heading's docstring.
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
      <Heading level={2} variant="story" tone="none" className="text-accent-readable">
        {title}
      </Heading>
    </div>
  );
}
