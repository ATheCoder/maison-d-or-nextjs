'use client';

import { useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';

/**
 * HeartToggle — §4 save/like toggle (docs/DesignSystemP1.md). An outline
 * heart that fills with sealing wax (--heart-saved: terracotta on parchment,
 * rose on dark grounds) and bursts when saved — the X/Twitter like move gone
 * festival: the heart blooms in from nothing behind an ignition flash while
 * twelve sparks scatter like fireworks, each its own accent-palette color,
 * at uneven angles, distances, sizes, and launch delays (SPARKS below is the
 * choreography — jitter is deliberate, a perfect ring reads as a circle,
 * not a burst). Two variants:
 * `bare` (default — just the glyph, 44px touch target) and `chip` (the
 * mock's circular raised chip). All colors are surface-scoped tokens, so one
 * component reads correctly on all three grounds.
 *
 * Toggle-button a11y: state rides aria-pressed; the label stays constant
 * ("Save", not "Saved") so screen readers announce "Save, pressed" rather
 * than a button that renames itself. data-burst gates the save animation to
 * user toggles — without it every already-saved heart would burst on mount.
 *
 * Controlled via `pressed` + `onPressedChange`, or uncontrolled via
 * `defaultPressed`.
 */
type HeartVariant = 'bare' | 'chip';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'aria-pressed'> & {
  variant?: HeartVariant;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

/* One entry per spark: raw-palette color (decorative, momentary — exempt
   from contrast floors), flight angle, reach in px, dot size, launch delay.
   Forest is the one accent left out: it disappears on espresso. */
const SPARKS = [
  { angle: 8, color: 'gold-bright', reach: 30, size: 5, delay: 0 },
  { angle: 38, color: 'sea', reach: 22, size: 3, delay: 80 },
  { angle: 65, color: 'terracotta', reach: 27, size: 4, delay: 30 },
  { angle: 98, color: 'sage', reach: 20, size: 3, delay: 110 },
  { angle: 122, color: 'gold', reach: 28, size: 4.5, delay: 0 },
  { angle: 155, color: 'rose', reach: 22, size: 3.5, delay: 60 },
  { angle: 187, color: 'lavender', reach: 26, size: 4, delay: 20 },
  { angle: 215, color: 'gold-bright', reach: 21, size: 3, delay: 90 },
  { angle: 245, color: 'terracotta', reach: 29, size: 4, delay: 40 },
  { angle: 275, color: 'sea', reach: 23, size: 3.5, delay: 100 },
  { angle: 305, color: 'rose', reach: 27, size: 4.5, delay: 10 },
  { angle: 335, color: 'gold', reach: 20, size: 3, delay: 70 },
];

export default function HeartToggle({
  variant = 'bare',
  pressed,
  defaultPressed = false,
  onPressedChange,
  'aria-label': ariaLabel = 'Save',
  className = '',
  onClick,
  ...rest
}: Props) {
  const [internal, setInternal] = useState(defaultPressed);
  const [burstArmed, setBurstArmed] = useState(false);
  const isPressed = pressed ?? internal;

  return (
    <button
      type="button"
      aria-pressed={isPressed}
      aria-label={ariaLabel}
      data-burst={burstArmed || undefined}
      className={
        `heart-toggle ${variant === 'chip' ? 'heart-toggle-chip ' : ''}` +
        'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring ' +
        `disabled:pointer-events-none disabled:opacity-40 ${className}`
      }
      onClick={(event) => {
        setBurstArmed(true);
        setInternal(!isPressed);
        onPressedChange?.(!isPressed);
        onClick?.(event);
      }}
      {...rest}
    >
      <span aria-hidden className="heart-burst">
        {SPARKS.map((spark) => (
          <i
            key={spark.angle}
            style={
              {
                '--spark-angle': `${spark.angle}deg`,
                '--spark-color': `var(--palette-${spark.color})`,
                '--spark-reach': `${-spark.reach}px`,
                '--spark-size': `${spark.size}px`,
                '--spark-delay': `${spark.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <svg
        aria-hidden
        width="20"
        height="20"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
