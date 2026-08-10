'use client';
/**
 * DGCard — the themed card shell: cream card ground, a hairline gold rule and
 * the soft shadow. It was hand-assembled a dozen times across this directory,
 * which is how one of the twelve ended up with a different border alpha and
 * nobody could say whether that was a decision.
 *
 * It is only the *resting* shell. Hover, transform and the swap to
 * `theme.shadow` stay at the call site, in the same `style`/handler props the
 * cards already carried — a card that lifts is doing something this component
 * has no business knowing about.
 *
 * `style` is merged last, so padding, layout, `overflow: hidden` and any
 * deliberate departure (the destination section carries no shadow) are the
 * call site's to state.
 *
 * `useTheme()` is called here rather than taking a `theme` prop: the hook falls
 * back to the default palette with no provider mounted, which is what lets the
 * design-sync previews render this standalone.
 */
import { createElement, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';

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
  const { theme } = useTheme();
  return createElement(
    as,
    {
      ...rest,
      style: {
        background: theme.bgCard,
        borderRadius: size === 'small' ? theme.radiusSmall : theme.radius,
        border: `1px solid ${theme.accentGold}${borderAlpha}`,
        boxShadow: theme.shadowSoft,
        ...style,
      },
    },
    children,
  );
}
