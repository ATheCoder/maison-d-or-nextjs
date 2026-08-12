import type { ButtonHTMLAttributes } from 'react';

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
 */
type ButtonVariant = 'primary' | 'ghost' | 'link';

const BASE =
  'type-body-ui inline-flex items-center justify-center gap-2.5 rounded-md ' +
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring ' +
  'disabled:pointer-events-none';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-motion btn-primary px-5 py-2.5',
  ghost: 'btn-motion btn-ghost px-5 py-2.5',
  // Links are functional small text: accent-readable, never bare gold, and
  // the underline is load-bearing — colour is never a link's only marker.
  link:
    'text-accent-readable underline underline-offset-3 transition-[color,text-decoration-thickness] duration-300 ' +
    'hover:text-primary hover:decoration-2',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: { variant?: ButtonVariant; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${loading ? '' : 'disabled:opacity-40'} ${VARIANT[variant]} ${className}`}
      {...rest}
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
