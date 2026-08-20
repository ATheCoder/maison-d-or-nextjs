import type { ElementType, HTMLAttributes } from 'react';

/**
 * Card — the boxed surface: the raised card, the tinted aside, the bordered
 * panel. All three were hand-assembled from the same four decisions (ground,
 * hairline, radius, padding) at every call site, which is exactly how a
 * dozen DGCards ended up with three different border alphas.
 *
 * `tone` names the ground, and the grounds are surface-scoped tokens, so one
 * Card is correct in every room with no props: surface-raised lifts toward
 * ivory on parchment and toward a lighter espresso on the interludes;
 * surface-tint is sand on parchment, the family wash inside an atmosphere.
 *
 * `bordered` defaults by tone rather than to a flat true/false: a tint is a
 * wash, and drawing an edge around it turns a soft aside into a box, while a
 * raised or page-ground card wants the §1.2 hairline to separate it from the
 * ground it sits on. An elevated card usually wants `bordered={false}` — the
 * shadow is already doing that job.
 *
 * `elevation` is an inline style, not a class, because the --shadow-* tokens
 * are deliberately plain vars: globals.css keeps them out of @theme so they
 * do not collide with Tailwind's shadow-sm/md/lg namespace. `style` merges
 * last, so a call site can still say `overflow: hidden` or swap the shadow
 * on hover — a card that lifts is doing something this component has no
 * business knowing about.
 */
type CardTone = 'raised' | 'tint' | 'page' | 'glass' | 'none';
type CardElevation = 'none' | 'card' | 'raised' | 'modal';
type CardRadius = 'sm' | 'md' | 'lg';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const TONE: Record<CardTone, string> = {
  raised: 'bg-surface-raised',
  tint: 'bg-surface-tint',
  page: 'bg-surface-page',
  /* The card that stands on a photograph. --surface-glass composites brighter
     than the wall behind it (see globals.css §1), and the blur is what turns
     the room behind into a ground rather than a distraction. A glass card
     almost always wants `elevation="modal"` too: on paint a hairline is
     enough to separate a card from its ground, but on a photograph only a
     shadow is. Saturation is nudged up because blur desaturates. */
  glass: 'bg-surface-glass backdrop-blur-[10px] backdrop-saturate-[1.08]',
  none: '',
};

const RADIUS: Record<CardRadius, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
};

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-8',
};

const SHADOW: Record<CardElevation, string | undefined> = {
  none: undefined,
  card: 'var(--shadow-card)',
  raised: 'var(--shadow-raised)',
  modal: 'var(--shadow-modal)',
};

export default function Card({
  tone = 'raised',
  bordered,
  elevation = 'none',
  radius = 'md',
  padding = 'md',
  as: Tag = 'div' as ElementType,
  className = '',
  style,
  children,
  ...rest
}: {
  tone?: CardTone;
  bordered?: boolean;
  elevation?: CardElevation;
  radius?: CardRadius;
  padding?: CardPadding;
  as?: ElementType;
} & HTMLAttributes<HTMLElement>) {
  const shadow = SHADOW[elevation];
  const classes = [
    RADIUS[radius],
    (bordered ?? tone !== 'tint') ? 'border border-fine' : '',
    TONE[tone],
    PADDING[padding],
    className,
  ].filter(Boolean).join(' ');
  return (
    <Tag
      className={classes}
      style={shadow ? { boxShadow: shadow, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
