import { createElement, useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

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
 */
type FieldShell = {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string;
  className?: string;
};

type FieldProps =
  | ({ as?: 'input' } & FieldShell & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: 'select'; children?: ReactNode } & FieldShell & SelectHTMLAttributes<HTMLSelectElement>)
  | ({ as: 'textarea' } & FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>);

/* Per-tag additions to the shared `field` coat. Spelled out rather than
   interpolated: Tailwind v4 scans source text. */
const CONTROL: Record<'input' | 'select' | 'textarea', string> = {
  input: '',
  select: '',
  textarea: 'resize-y',
};

export default function Field({
  label,
  labelHidden = false,
  hint,
  error,
  id,
  as = 'input',
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
        className: `field type-body-ui ${labelHidden ? '' : 'mt-2 '}rounded-md px-4 py-2.5 ${CONTROL[as]}`.trim(),
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
