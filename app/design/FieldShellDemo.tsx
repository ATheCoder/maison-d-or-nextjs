'use client';
import { useState } from 'react';
import { FieldShell } from '@/components/ds';
import DatePicker from '@/components/ui/DatePicker';

/**
 * §5.5 — the FieldShell stamp, wrapped around the control it exists for.
 *
 * A client island because DatePicker is controlled, and because this is the
 * one stamp on the page that would be dishonest as a mock-up: the whole claim
 * is that a composite the house cannot put inside `Field` still gets Field's
 * label, Field's gap, Field's message seat and — the part nobody hand-copied
 * correctly — Field's three wiring attributes. Demonstrating that with a div
 * would prove nothing, since `htmlFor` does not reach a div at all.
 *
 * The right-hand one is deliberately invalid. The seat turns danger around a
 * control it does not own and has never heard of: the message goes
 * danger-readable and gets its role="alert", and `aria-invalid` arrives at the
 * picker, which reads it as its own `invalid` and paints its border to match.
 *
 * ── A known gap this stamp makes visible ──────────────────────────────────
 * Scroll to the espresso and navy bands and the two pickers stay LIGHT while
 * everything around them turns. That is DatePicker's own coat (globals.css,
 * "MAISON DATE PICKER"), written before the interludes existed and never
 * re-scoped. It is not FieldShell's — the label, the gap and both messages
 * above and below it follow the room correctly — and it is not new. Stamping
 * it here is the point: /design is where a gap like that is supposed to be
 * embarrassing rather than undiscovered.
 */
export default function FieldShellDemo() {
  const [good, setGood] = useState('2018-06-12');
  const [bad, setBad] = useState('1804-01-01');

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <FieldShell
        label="Their birthday"
        hint="The shell owns this line; the picker owns everything above it."
      >
        {({ id, 'aria-describedby': describedBy }) => (
          <DatePicker
            id={id}
            aria-describedby={describedBy}
            value={good}
            onChange={setGood}
            style={{ width: '100%', maxWidth: 240 }}
          />
        )}
      </FieldShell>

      <FieldShell
        label="When the gate was last painted"
        error="That is before the house was built — check the year."
      >
        {({ id, 'aria-describedby': describedBy, 'aria-invalid': invalid }) => (
          <DatePicker
            id={id}
            aria-describedby={describedBy}
            invalid={!!invalid}
            value={bad}
            onChange={setBad}
            style={{ width: '100%', maxWidth: 240 }}
          />
        )}
      </FieldShell>
    </div>
  );
}
