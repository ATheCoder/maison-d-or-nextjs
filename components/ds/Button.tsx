import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

/**
 * Button — §4 base primitive (docs/DesignSystemP1.md). Three variants,
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
 * button that wants a new look wants a new coat in globals.css and a fourth
 * entry in VARIANT — `bare` is for controls whose geometry genuinely belongs
 * to a stylesheet that already exists.
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
 */
type ButtonVariant = 'primary' | 'ghost' | 'link' | 'bare';

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
   a bare button's box is the call site's stylesheet's business. */
const SHAPE = 'type-body-ui inline-flex items-center justify-center gap-2.5 rounded-md';

const VARIANT: Record<ButtonVariant, string> = {
  primary: `${SHAPE} btn-motion btn-primary px-5 py-2.5`,
  ghost: `${SHAPE} btn-motion btn-ghost px-5 py-2.5`,
  // Links are functional small text: accent-readable, never bare gold, and
  // the underline is load-bearing — colour is never a link's only marker.
  link:
    `${SHAPE} text-accent-readable underline underline-offset-3 transition-[color,text-decoration-thickness] duration-300 ` +
    'hover:text-primary hover:decoration-2',
  bare: '',
};

type Common = { variant?: ButtonVariant; className?: string };

type ButtonProps = Common & { href?: undefined; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkProps = Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonProps | LinkProps) {
  /* The coat, plus whatever the rendered element can additionally be in. */
  const dress = (state: string) =>
    [BASE, state, VARIANT[variant], className].filter(Boolean).join(' ');

  /* `href` is the discriminant, and `in` is what narrows a union rest. The
     cast that follows is the one TypeScript cannot do for us: it has proved
     the branch, but a rest spread off a union stays a union of rests. */
  if ('href' in rest && rest.href !== undefined) {
    return (
      <a className={dress('')} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
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
