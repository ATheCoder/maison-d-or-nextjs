import type { ElementType, HTMLAttributes, ReactNode } from 'react';

/**
 * ListRow — one entry in a roster: something named on the left, its metadata
 * and its verbs on the right, a hairline underneath.
 *
 * The children in a family, the guardians, the pending invites; the people in
 * the admin's library. It is deliberately the thinnest primitive in the
 * barrel — four utilities — and it is here for the reason the thin ones
 * usually are: those four utilities were being retyped, and the retyping is
 * where `py-2.5` becomes `py-2` on one screen and `0.55rem` on another, and
 * where a hairline reaches for rgba() because nobody remembered
 * `border-fine`. A row is not hard. Rows agreeing is.
 *
 * `divider` is on by default and turned off for the last row of a list that
 * sits inside a card — the card's own edge is already the line there, and two
 * lines 20px apart read as a mistake. Callers with a mapped list usually want
 * `last:border-b-0` in `className` instead, which is why this is a boolean
 * and not a `last` prop: the primitive should not be guessing where a list
 * ends.
 *
 * `align` exists for the one real variation: a row whose right-hand side has
 * wrapped onto two lines wants its name at the top, not floating in the
 * middle of them.
 */
export default function ListRow({
  divider = true,
  align = 'center',
  as: Tag = 'div' as ElementType,
  className = '',
  children,
  ...rest
}: {
  divider?: boolean;
  align?: 'center' | 'start';
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'>) {
  return (
    <Tag
      className={
        `flex gap-3 py-2.5 ${align === 'center' ? 'items-center' : 'items-start'} ` +
        `${divider ? 'border-b border-fine ' : ''}${className}`
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
