import { createElement, useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

/**
 * Field — §4 form field primitive. A labelled control with one message seat
 * below it: `hint` sits there in caption ink until `error` takes the seat —
 * the box turns its border to danger (via aria-invalid, which the coat in
 * globals.css §4 watches) and the message wears danger-readable, AA on every
 * light ground and brightened to rose on the dark interludes exactly as the
 * heart wax is. The coat itself (`field`) is surface-scoped like every
 * primitive: the same markup is correct in every room — in the atmospheres
 * the focus halo turns to the family's deep tone while the error stays
 * terracotta, because an error does not dress for the room.
 *
 * The label wears the editorial label in secondary ink — deliberately
 * quieter than an Eyebrow: accent-readable is the page's wayfinding, not
 * the form's. aria-describedby points at whichever message is showing.
 *
 * `as` picks the control. All three wear the same coat, the same label and
 * the same message seat, because to a person filling in a form they are the
 * same thing — a question with a box under it — and only the answer's shape
 * differs. The `field` utility is written against no particular tag (width,
 * border, fill, focus halo, aria-invalid, disabled), so a select and a
 * textarea need nothing of their own.
 *
 * The select keeps its NATIVE arrow: `appearance: none` would mean drawing
 * and positioning a chevron here, and a native picker is the one control on
 * a phone that is genuinely better left alone. The textarea gets vertical
 * resize only — horizontal resize breaks the measure it sits in.
 *
 * Options for a select are `children`; every other control ignores them.
 *
 * `labelHidden` keeps the label in the accessibility tree and takes it off the
 * screen, for the controls whose question is already answered by what is
 * around them — a PIN box inside a menu that is titled "Enter Amélie's PIN"
 * does not need to say so twice. It is NOT a licence to skip the label: the
 * alternative people reach for is `aria-label` on a bare input, which is worse
 * in every way that matters (it does not survive translation tooling, it is
 * invisible to a sighted person who needs the reminder, and it cannot be
 * clicked to focus the control). A real label, hidden, keeps all three.
 * The control loses its top margin with the label, since there is no longer
 * anything above it to sit under.
 *
 * ── size ─────────────────────────────────────────────────────────────────
 * The same field at the two house scales, matching Button's: `md` is the
 * reading scale every form on the front door is set in, and `sm` is the
 * admin desk's, where a screen asks thirty questions at once and a 44px box
 * for each is a screen nobody can see the shape of. Only the box and the
 * type move — the coat, the label, the message seat, the focus halo and the
 * aria-invalid behaviour are identical — corner included — because a small
 * field is not a lesser one.
 */
type FieldSize = 'md' | 'sm';

type FieldShell = {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string;
  size?: FieldSize;
  className?: string;
};

/* `size` is omitted from the native attribute sets on purpose. <input> and
   <select> both HAVE a native `size` — a character/row count nobody has ever
   wanted here — and leaving it in would intersect `number` with our two-string
   union down to `never`, quietly making every `size="sm"` a type error whose
   message names `as`, not `size`. The house scale wins the name; a call site
   that genuinely wants the native attribute has `htmlSize`-style options and
   has never asked for one.

   ComponentPropsWithRef rather than the bare HTMLAttributes for the same
   reason Button uses it: React 19 passes `ref` as an ordinary prop, and the
   image modal's file input is driven from a ref by the "Upload a file" button
   in its footer. */
type FieldProps =
  | ({ as?: 'input' } & FieldShell & Omit<ComponentPropsWithRef<'input'>, 'size'>)
  | ({ as: 'select'; children?: ReactNode } & FieldShell &
      Omit<ComponentPropsWithRef<'select'>, 'size'>)
  | ({ as: 'textarea' } & FieldShell & ComponentPropsWithRef<'textarea'>);

/* Per-tag additions to the shared `field` coat. Spelled out rather than
   interpolated: Tailwind v4 scans source text. */
const CONTROL: Record<'input' | 'select' | 'textarea', string> = {
  input: '',
  select: '',
  textarea: 'resize-y',
};

/* The box, per size — type, padding, and how far the control sits under its
   label. Written out in full rather than composed, so both scales are readable
   in one glance and Tailwind's source scan sees every class.

   `rounded-md` is deliberately NOT in here: globals.css §3.4 gives one radius
   to buttons, fields and cards, so a small field is the same corner in less
   room, exactly as a small button is. It rides on every control below instead,
   where neither size can move it. */
const BOX: Record<FieldSize, { control: string; gap: string }> = {
  md: { control: 'type-body-ui px-4 py-2.5', gap: 'mt-2' },
  sm: {
    control: 'font-sans text-[length:var(--type-caption)] leading-[1.5] px-3 py-2',
    gap: 'mt-1.5',
  },
};

export default function Field({
  label,
  labelHidden = false,
  hint,
  error,
  id,
  as = 'input',
  size = 'md',
  className = '',
  ...rest
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const message = error ?? hint;
  const messageId = message ? `${inputId}-message` : undefined;
  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={labelHidden ? 'sr-only' : 'type-label-editorial block text-secondary'}
      >
        {label}
      </label>
      {/* createElement rather than three near-identical JSX branches: the
          props above have already been narrowed by the union, and the only
          thing that varies below is the tag name. The cast is the one place
          that union collapses — TypeScript cannot see that `rest` and `as`
          came from the same member of it. */}
      {createElement(as, {
        ...(rest as Record<string, unknown>),
        id: inputId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': messageId,
        className: `field rounded-md ${BOX[size].control} ${labelHidden ? '' : `${BOX[size].gap} `}${CONTROL[as]}`.trim(),
      })}
      {/* role="alert" only on the error branch: a hint is there from the
          start and announcing it would talk over the label, but an error
          arrives in response to something the person just did and has to be
          heard, not merely rendered. */}
      {message && (
        <p id={messageId} role={error ? 'alert' : undefined} className="type-caption mt-1.5">
          {error ? <span className="text-danger-readable">{error}</span> : hint}
        </p>
      )}
    </div>
  );
}
