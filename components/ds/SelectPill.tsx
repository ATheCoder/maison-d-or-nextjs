import type { ComponentPropsWithRef } from 'react';

/**
 * SelectPill — one choice in a row of choices: a child in a switcher, a day in
 * a recap, a filter over a table.
 *
 * ── Why it is not Chip, and not Button ────────────────────────────────────
 * `Chip` is inert by design — "a chip that does something is a Button with a
 * className" — and this does something. `Button` is --radius-md and keeps that
 * corner outside its size scale on purpose, because "a button with a different
 * corner is a different button". Both of those rules are right, and between
 * them they left a real control with nowhere to live: the observatory hand-
 * rolled it twice, once as a 30px pill and once as a 20px chip, each with its
 * own hover, its own focus ring and its own idea of what "selected" looks
 * like. This is that control, named.
 *
 * ── selected is an ARIA state, not a prop ─────────────────────────────────
 * There is no `selected` boolean. You pass `aria-current` (for a pill that
 * navigates — "page", "date", "step") or `aria-pressed` (for one that toggles),
 * and the coat in globals.css §4 paints itself from that. The point is that a
 * pill cannot look chosen without saying so, which is the bug this shape
 * usually ships with. If you find yourself wanting a `selected` prop, what you
 * want is `aria-current="page"`.
 *
 * ── variant ───────────────────────────────────────────────────────────────
 * `peer` (default) — the members of the set are equals, and the unchosen ones
 * are simply not chosen: a solid hairline, full ink. The child switcher.
 * `offer` — the unchosen members are things on offer rather than peers, drawn
 * with a dashed edge and faint ink: the recap's other days, which exist and can
 * be opened but are not where you are.
 *
 * ── href: the same coat on an anchor ──────────────────────────────────────
 * Same union as Button's, for the same reason: a choice that navigates IS a
 * link and must keep middle-click, copy-link and the anchor's role. And as
 * there, the anchor is a plain <a> — a call site that needs client navigation
 * composes instead, with `selectPillClasses()` on a next/link. Both of today's
 * call sites do exactly that, which is why the classes function is not an
 * afterthought here.
 */
type SelectPillVariant = 'peer' | 'offer';

const VARIANT: Record<SelectPillVariant, string> = {
  peer: 'select-pill',
  offer: 'select-pill-offer',
};

/* btn-motion carries the house clock, the hover lift and the press settle, so
   a pill answers a pointer exactly as a button does. The focus ring is the
   same one every control in the house wears. */
const BASE =
  'type-body-ui btn-motion cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/**
 * The coat as a class string, for the call site that has to be a next/link —
 * the same escape hatch `buttonClasses` is, and for the same reason.
 */
export function selectPillClasses({
  variant = 'peer',
  className = '',
}: { variant?: SelectPillVariant; className?: string } = {}): string {
  return [BASE, VARIANT[variant], className].filter(Boolean).join(' ');
}

type Common = { variant?: SelectPillVariant; className?: string };
type PillButtonProps = Common & { href?: undefined } & ComponentPropsWithRef<'button'>;
type PillLinkProps = Common & { href: string } & Omit<ComponentPropsWithRef<'a'>, 'href'>;

export default function SelectPill({
  variant = 'peer',
  className = '',
  children,
  ...rest
}: PillButtonProps | PillLinkProps) {
  const dress = selectPillClasses({ variant, className });

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a className={dress} {...(rest as ComponentPropsWithRef<'a'>)}>
        {children}
      </a>
    );
  }

  const { type = 'button', ...attrs } = rest as Omit<PillButtonProps, keyof Common | 'children'>;
  return (
    <button type={type} className={dress} {...attrs}>
      {children}
    </button>
  );
}
