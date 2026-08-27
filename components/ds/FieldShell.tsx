import { useId } from 'react';
import type { ReactNode } from 'react';

/**
 * FieldShell — the label above a control and the one message seat below it,
 * without any opinion about what the control is.
 *
 * This is `Field` with the input taken out, and it exists because the house
 * has a control `Field` cannot host: DatePicker, a 697-line ARIA combobox
 * whose popover, calendar grid and coat are its own (see the composite
 * exception argued in primitives.contract.test.ts). Every screen that asks
 * for a birthday therefore hand-wrote Field's label classes around it —
 * `type-label-editorial block text-secondary`, copied by eye, three times in
 * two files — and hand-wired, or forgot to wire, the three attributes that
 * make a label and a message actually reach the control.
 *
 * ── Why a render prop ─────────────────────────────────────────────────────
 * Plain children would have meant handing the caller an `id` and trusting
 * them to put it back on the control, remember `aria-describedby`, and derive
 * `aria-invalid` from a prop the shell owns. That is precisely the wiring the
 * hand-copied versions got wrong — a label that focused nothing, a hint no
 * screen reader ever read. The shell computes all three and hands them over,
 * so the call site's only job is to spread them:
 *
 *   <FieldShell label="Their birthday" hint="…" error={err}>
 *     {(control) => <DatePicker {...control} value={v} onChange={setV} />}
 *   </FieldShell>
 *
 * `aria-invalid` is passed as the boolean-or-undefined the DOM wants, so a
 * control that takes its own `invalid` prop can read it as one.
 *
 * ── Field renders through this ────────────────────────────────────────────
 * Deliberately, and it is the reason this is worth extracting rather than
 * copying: there is now exactly ONE implementation of the label, the sr-only
 * branch, the message seat and the role="alert" that only the error branch
 * gets. A second copy living in Field would be the same duplication one level
 * up from where it started.
 *
 * `size` moves the gap under the label and nothing else — the control's own
 * type and padding belong to the control, which on this side of the door the
 * shell does not own.
 */
export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

export type FieldShellProps = {
  label: string;
  /**
   * Keeps the label in the accessibility tree and takes it off the screen,
   * for controls whose question is already answered by what surrounds them.
   * NOT a licence to skip the label — see Field's docstring for why a hidden
   * real label beats `aria-label` on every axis that matters.
   */
  labelHidden?: boolean;
  hint?: string;
  error?: string;
  size?: 'md' | 'sm';
  id?: string;
  className?: string;
};

/** The drop under the label, per size. Matches Field's BOX exactly. */
const GAP: Record<'md' | 'sm', string> = { md: 'mt-2', sm: 'mt-1.5' };

export default function FieldShell({
  label,
  labelHidden = false,
  hint,
  error,
  size = 'md',
  id,
  className = '',
  children,
}: FieldShellProps & { children: (control: FieldControlProps) => ReactNode }) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const message = error ?? hint;
  const messageId = message ? `${controlId}-message` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={controlId}
        className={labelHidden ? 'sr-only' : 'type-label-editorial block text-secondary'}
      >
        {label}
      </label>
      {/* The wrapper carries the gap rather than the control, so a control
          that brings its own className (DatePicker takes `style`, not a
          margin) does not have to make room for it. With the label hidden
          there is nothing above to sit under, so there is no gap either. */}
      <div className={labelHidden ? '' : GAP[size]}>
        {children({
          id: controlId,
          'aria-describedby': messageId,
          'aria-invalid': error ? true : undefined,
        })}
      </div>
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
