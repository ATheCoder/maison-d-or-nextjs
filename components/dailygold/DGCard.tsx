'use client';
/**
 * DGCard — the themed card shell: cream card ground, a hairline gold rule and
 * the soft shadow. It was hand-assembled a dozen times across this directory,
 * which is how one of the twelve ended up with a different border alpha and
 * nobody could say whether that was a decision.
 *
 * It is only the *resting* shell. Hover, transform and the swap to
 * `--shadow-raised` stay at the call site, in the same `style`/handler props the
 * cards already carried — a card that lifts is doing something this component
 * has no business knowing about.
 *
 * `style` is merged last, so padding, layout, `overflow: hidden` and any
 * deliberate departure (the destination section carries no shadow) are the
 * call site's to state.
 */
import { createElement, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

type DGCardProps = {
  children?: ReactNode;
  /**
   * `section` where the card *is* the section (the destination block), `button`
   * where the whole card is the tap target — which most of the list rows are.
   */
  as?: 'div' | 'section' | 'button';
  /** `small` takes `radiusSmall`: the column cards and list rows, not the panels. */
  size?: 'default' | 'small';
  /** Hex alpha suffix on the gold border. `25` everywhere but one section, which asks for `15`. */
  borderAlpha?: string;
  style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'children'>;

export default function DGCard({
  children,
  as = 'div',
  size = 'default',
  borderAlpha = '25',
  style,
  ...rest
}: DGCardProps) {
  const borderColor = borderAlpha === '25'
    ? 'var(--border-fine)'
    : `color-mix(in srgb, var(--accent) ${Math.round((parseInt(borderAlpha, 16) / 255) * 100)}%, transparent)`;
  return createElement(
    as,
    {
      ...rest,
      style: {
        background: 'var(--surface-raised)',
        borderRadius: size === 'small' ? 'var(--radius-md)' : 'var(--radius-lg)',
        border: `1px solid ${borderColor}`,
        boxShadow: 'var(--shadow-card)',
        ...style,
      },
    },
    children,
  );
}
