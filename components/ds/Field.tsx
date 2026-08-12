import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

/**
 * Field — §4 form field primitive. A labelled single-line input with one
 * message seat below it: `hint` sits there in caption ink until `error`
 * takes the seat — the box turns its border to danger (via aria-invalid,
 * which the coat in globals.css §4 watches) and the message wears
 * danger-readable, AA on every light ground and brightened to rose on the
 * dark interludes exactly as the heart wax is. The coat itself (`field`)
 * is surface-scoped like every primitive: the same markup is correct in
 * every room — in the atmospheres the focus halo turns to the family's
 * deep tone while the error stays terracotta, because an error does not
 * dress for the room.
 *
 * The label wears the editorial label in secondary ink — deliberately
 * quieter than an Eyebrow: accent-readable is the page's wayfinding, not
 * the form's. aria-describedby points at whichever message is showing.
 */
export default function Field({
  label,
  hint,
  error,
  id,
  className = '',
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const message = error ?? hint;
  const messageId = message ? `${inputId}-message` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="type-label-editorial block text-secondary">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className="field type-body-ui mt-2 rounded-md px-4 py-2.5"
        {...rest}
      />
      {message && (
        <p id={messageId} className="type-caption mt-1.5">
          {error ? <span className="text-danger-readable">{error}</span> : hint}
        </p>
      )}
    </div>
  );
}
