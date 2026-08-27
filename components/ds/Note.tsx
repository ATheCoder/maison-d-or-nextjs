import type { ComponentProps, ReactNode } from 'react';
import Card from './Card';

/**
 * Note — a panel set off from the form: a reassurance, or the result of
 * something that just happened. The one-time invite link, the
 * confirm-your-email nag, the "your child never has an account" line under
 * the reader step.
 *
 * The dashed gold edge is the whole signal. A solid-edged card on the same
 * ground reads as another section of the form — another thing to fill in —
 * and a dashed one reads as an aside about the form. That distinction was
 * invented twice, identically and independently, as a private `NotePanel` in
 * WelcomeWizard and again in FamilyManager; this is the second copy being
 * deleted rather than a third being written.
 *
 * Why not a `Card` prop. `bordered` is a boolean today and widening it to
 * `'dashed'` looks tempting, but Card's border is --border-fine and this edge
 * is --border-accent: a prop that changed the border's STYLE and silently
 * also changed its COLOUR would be the kind of surprise a design system
 * exists to remove. A recipe with a name is honest about being a recipe.
 *
 * Everything else is Card's, and passes straight through — `padding` because
 * a note beside a field wants `sm` and a note holding a paragraph wants `md`,
 * and the rest so this never becomes a wall between a call site and the card
 * underneath it.
 */
export default function Note({
  padding = 'sm',
  className = '',
  children,
  ...rest
}: { children: ReactNode } & Omit<ComponentProps<typeof Card>, 'tone' | 'bordered'>) {
  return (
    <Card
      tone="tint"
      bordered={false}
      padding={padding}
      className={`border border-dashed border-accent ${className}`}
      {...rest}
    >
      {children}
    </Card>
  );
}
