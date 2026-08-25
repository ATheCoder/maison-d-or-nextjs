import type { ComponentPropsWithRef } from 'react';

/**
 * Button — base primitive. Three variants,
 * radius --radius-md (10px — the roundness the date-picker fields and
 * guardian card already speak in), no pill shapes.
 *
 * Coats and choreography live in globals.css (btn-motion / btn-primary /
 * btn-ghost + the --btn-* tokens): every surface scope repaints the rest AND
 * hover coats, so the same primary is espresso-filled on parchment but
 * gold-bright on espresso/navy — never same-on-same — and hover swaps both
 * fill and ink (parchment: espresso→gold; dark grounds: gold-bright→ivory).
 * That is a deliberate departure from §4's original "espresso fill, gold
 * hover-border" wording, made because a static espresso fill vanished on the
 * espresso section and a border tint was no hover at all. The button must NOT
 * carry data-surface: its coats are scoped tokens now, and a data-surface of
 * its own would re-scope them away from the ground it sits on.
 *
 * loading disables the button (real `disabled` — no hover, no press, no
 * form submit) and spins a ✦ before the label, but keeps the full coat:
 * the 40% disabled dim is withheld because "working" must not read as
 * "unavailable". aria-busy carries the distinction to screen readers.
 *
 * `bare` is the fourth variant and it wears NO coat at all — only the focus
 * ring, the pointer, and the disabled/loading behaviour. It exists because
 * the house has real buttons whose look is owned by a stylesheet rather than
 * by this component: the gallery's `.gl-door` (a transparent hit target laid
 * over a painting) and `.go` (a 9.5px tracked micro-link under a label). Both
 * were raw <button>s precisely because none of the three coats above fit, and
 * a raw <button> is a button with no focus ring and no loading semantics.
 * `bare` is how those call sites join the primitive without being redressed.
 *
 * It is NOT an escape hatch for "I want a different-looking button". A new
 * button that wants a new look wants a new coat in globals.css and another
 * entry in VARIANT — `bare` is for controls whose geometry genuinely belongs
 * to a stylesheet that already exists. `danger` is what that path looks like
 * when it is walked properly: the admin desk's four private stylesheets each
 * had a `.btn-red`/`.btn-danger` of their own, each reaching for a raw
 * rgba(181,83,58,…), so the look became a coat in globals.css against the
 * --danger tokens and an entry here, rather than four copies and a prop.
 *
 * ── href: the same coat on an anchor ──────────────────────────────────────
 * Pass `href` and the coat is painted on an <a> instead. This is not a
 * convenience: an action that navigates IS a link, and it must keep the
 * middle-click, the copy-link, the status bar and the anchor's own role. The
 * house kept losing that argument in the other direction — the signed-out CTA
 * bar and the invite toast both hand-rolled a gold fill onto a raw <a>,
 * duplicating btn-primary in inline styles and reaching for a raw
 * --palette-* ink to sit on it, which is exactly what a primitive exists to
 * stop. Give the anchor the real coat instead.
 *
 * `disabled`, `loading` and `type` are not offered on this side, and the
 * union enforces it rather than ignoring it. A disabled link is a lie —
 * `disabled` does nothing to an <a>, and aria-disabled leaves it clickable.
 * A link that must not be followed has no href, which makes it a button.
 *
 * Deliberately a plain <a>, not next/link: the primitive would then depend on
 * the router, and its two callers are crossing route groups on purpose. A
 * caller that wants client navigation composes — <Link> outside, or a Link
 * wearing these classes — rather than the primitive growing a framework.
 *
 * `buttonClasses` below is that second option made real, because "a Link
 * wearing these classes" was only true if the classes were reachable. The
 * admin desk is full of in-app navigation that is shaped like an action
 * ("Open today", "Open the library", the per-row "Open"): a plain <a> would
 * lose client navigation and prefetching, and a hand-copied gold fill is
 * exactly what this primitive exists to stop. So `<Link className={buttonClasses(…)}>`
 * gets the real coat, from here, and moves in the same diff when the coat does.
 *
 * ── size: the same coat at the tool scale ─────────────────────────────────
 * `md` is the reading scale — the front door's CTAs, the Daily Gold buttons —
 * and stays the default, so nothing that already exists moves. `sm` is the
 * admin's: a desk that puts a verb on every table row cannot spend 44px of
 * height on each one, and the honest answer to that is a size, not a fourth
 * coat. It is the SAME coat — same fill, same hover, same sheen, same
 * choreography, same --radius-md corner — set at the caption size the house
 * already names (--type-caption) in a tighter box. Nothing about which button
 * this is changes with the size; only how much room it takes.
 * `bare` ignores it, because a bare button has no box to resize.
 */
type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'link' | 'bare';
type ButtonSize = 'md' | 'sm';

/* Focus and pointer: true of every button and every link-shaped one, coat or
   no coat. `cursor-pointer` is here because v4 preflight leaves buttons at
   `cursor: default` (see the note on `heart-toggle` in globals.css) and none
   of the --btn-* coats set it — without this line the primary and ghost
   buttons point the wrong cursor on every surface. */
const BASE =
  'cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/* The disabled dress, which only the <button> side can ever be in. */
const DISABLED = 'disabled:pointer-events-none';

/* The shape the three coated variants share and `bare` deliberately does not:
   a bare button's box is the call site's stylesheet's business. Size-free —
   type, padding and radius arrive from SIZE below, so the two scales cannot
   drift apart on anything except the three properties that define them. */
const SHAPE = 'inline-flex items-center justify-center gap-2.5 rounded-md';

/* The two type scales. `sm` reuses --type-caption rather than inventing a
   number: it is the size the house already gives small functional text,
   which is what the label on a table-row button is. Its gap comes in with
   it — 2.5 (10px) between a glyph and a 15px label reads as a pair; at 13px
   it reads as two things.

   The RADIUS does not move, and that is the whole point of it being a size.
   --radius-md is defined in globals.css §3.4 as the roundness of "buttons,
   fields, cards" — one value for the house, taken from the shapes it already
   spoke in (.mdo-dp-field, .mdo-dp-day, the guardian fields). A smaller
   button is the same button in less room; a button with a different corner is
   a different button, and two of those on one screen read as a bug rather
   than a scale. So `rounded-md` sits outside SIZE, in SHAPE, where neither
   size can reach it. */
const SIZE: Record<ButtonSize, string> = {
  md: 'type-body-ui',
  sm: 'font-sans text-[length:var(--type-caption)] font-medium leading-[1.4] gap-1.5',
};

/* Padding, for the two variants that have a box to pad. `link` is text and
   is deliberately left unpadded at both sizes — it sits inline in a sentence
   and a padded one would not. */
const PAD: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5',
  sm: 'px-3.5 py-2',
};

/* The coats. Each is the variant's own ink and fill only — the box is SIZE's. */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-motion btn-primary',
  ghost: 'btn-motion btn-ghost',
  danger: 'btn-motion btn-danger',
  // Links are functional small text: accent-readable, never bare gold, and
  // the underline is load-bearing — colour is never a link's only marker.
  link:
    'text-accent-readable underline underline-offset-3 transition-[color,text-decoration-thickness] duration-300 ' +
    'hover:text-primary hover:decoration-2',
  bare: '',
};

/**
 * The coat as a class string, for the one call site that cannot be this
 * component: a next/link that is shaped like an action. Same arguments, same
 * result — `<Button variant="ghost" size="sm">` and
 * `<Link className={buttonClasses({ variant: 'ghost', size: 'sm' })}>` are
 * the same button, one of which also does client navigation.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  const box =
    variant === 'bare'
      ? ''
      : `${SHAPE} ${SIZE[size]}${variant === 'link' ? '' : ` ${PAD[size]}`}`;
  return [BASE, box, VARIANT[variant], className].filter(Boolean).join(' ');
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string };

/* ComponentPropsWithRef, not the bare HTMLAttributes: React 19 passes `ref`
   as an ordinary prop to a function component, and the admin's drag handles
   need it — dnd-kit hands a row's grip its activator ref, and a primitive
   that cannot take one is a primitive that call site has to go around. */
type ButtonProps = Common & { href?: undefined; loading?: boolean } & ComponentPropsWithRef<'button'>;
type LinkProps = Common & { href: string } & Omit<ComponentPropsWithRef<'a'>, 'href'>;

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps | LinkProps) {
  /* The coat, plus whatever the rendered element can additionally be in. */
  const dress = (state: string) =>
    [buttonClasses({ variant, size }), state, className].filter(Boolean).join(' ');

  /* `href` is the discriminant, and `in` is what narrows a union rest. The
     cast that follows is the one TypeScript cannot do for us: it has proved
     the branch, but a rest spread off a union stays a union of rests. */
  if ('href' in rest && rest.href !== undefined) {
    return (
      <a className={dress('')} {...(rest as ComponentPropsWithRef<'a'>)}>
        {children}
      </a>
    );
  }

  const { loading = false, disabled, type = 'button', ...attrs } = rest as Omit<
    ButtonProps,
    keyof Common | 'children'
  >;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={dress(loading ? DISABLED : `${DISABLED} disabled:opacity-40`)}
      {...attrs}
    >
      {loading && (
        <span aria-hidden className="btn-spinner">
          &#x2726;
        </span>
      )}
      {children}
    </button>
  );
}
