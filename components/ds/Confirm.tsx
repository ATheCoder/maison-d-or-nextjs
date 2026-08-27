'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Button from './Button';
import Field from './Field';
import Heading from './Heading';
import Overlay from './Overlay';
import Prose from './Prose';

/**
 * Confirm — "are you sure?", in the house's own voice.
 *
 * It replaces two things. The first is `window.confirm()`, which /family used
 * to delete a reader: unthemeable, unstyleable, impossible to focus-manage,
 * and — the part that actually matters — it reads as the BROWSER asking,
 * which is exactly the wrong authority for "this will delete your child's
 * reading history". The second is the hand-composed dialog: the admin's
 * people library had already built this out of Overlay, Heading, Prose and a
 * Button pair, and /family was about to build a second one three characters
 * different.
 *
 * Mount is open and unmount is close — the same contract Overlay documents,
 * and the reason there is no `open` prop. A dialog that is rendered but
 * hidden is a focus trap waiting to be entered by accident.
 *
 * ── tone ──────────────────────────────────────────────────────────────────
 * `danger` is the default because that is what a confirmation is nearly
 * always for, and because the failure mode of the wrong default runs the
 * right way: a gold button on a destructive dialog under-warns, a terracotta
 * one on a harmless dialog merely over-warns. Cancel is always the ghost and
 * always first in the DOM — the safe verb should be the one a hurried tab
 * lands on.
 *
 * ── requireTyped ──────────────────────────────────────────────────────────
 * For the deletions that are worse than the others: the confirm stays
 * disabled until the person types the string back. Set in --face-mono via
 * Code's token, because a slug is a string you must match character for
 * character, which is the whole reason that face exists (globals.css §2.1).
 *
 * It is deliberately NOT the default. Type-to-confirm on an ordinary delete
 * is theatre — it trains people to copy-paste past the dialog, which is worse
 * than no dialog at all. Reach for it when the thing being deleted cannot be
 * rebuilt from anything else the house holds.
 *
 * The typed state lives here rather than in the caller: it is scratch input
 * that must not survive a cancelled dialog, and every caller would otherwise
 * reset it in the same `onCancel`.
 *
 * The field is deliberately NOT autoFocused, and this is worth writing down
 * because the obvious `autoFocus` is a lie here: Overlay focuses its own panel
 * on mount so that Escape works and the dialog is announced from its label,
 * which lands after React applies autoFocus and silently wins. The admin's
 * hand-rolled version has carried a dead `autoFocus` for exactly that reason.
 * Focus starting on the panel is also the better behaviour — a dialog that
 * drops the cursor straight into a box invites typing past the sentence
 * explaining what is about to be destroyed.
 */
export default function Confirm({
  title,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  pending = false,
  error,
  requireTyped,
  maxWidth = 440,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  /** Spins the confirm and disables both verbs while the action is in flight. */
  pending?: boolean;
  /** What went wrong with the attempt — shown in the typed field's seat, or under the body. */
  error?: string;
  /** Gate the confirm on retyping `value`. For deletions nothing can undo. */
  requireTyped?: { value: string; label?: string };
  maxWidth?: number;
  /**
   * Called with what the person actually typed — '' when there is no
   * `requireTyped`. It is handed back rather than kept private because the
   * gate on this side is only an affordance: the admin's delete re-checks the
   * typed string on the SERVER, and a caller that had to invent that argument
   * would be handing the server its own answer.
   */
  onConfirm: (typed: string) => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  const blocked = requireTyped ? typed !== requireTyped.value : false;

  return (
    <Overlay label={title} onClose={onCancel} maxWidth={maxWidth}>
      <div className="p-7">
        <Heading level={2} variant="story">
          {title}
        </Heading>
        {children && (
          <Prose variant="body-ui" measure={false} className="mt-3">
            {children}
          </Prose>
        )}

        {requireTyped ? (
          <Field
            className="mt-4"
            label={requireTyped.label ?? `Type ${requireTyped.value} to confirm`}
            labelHidden
            placeholder={requireTyped.value}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={error}
            // The token, not the `monospace` keyword this used to be at the
            // one call site that had it. Set here rather than as a Field prop
            // because it is a fact about THIS question, not about fields.
            style={{ fontFamily: 'var(--face-mono)' }}
          />
        ) : (
          error && (
            <Prose
              variant="caption"
              tone="none"
              measure={false}
              role="alert"
              className="mt-3 text-danger-readable"
            >
              {error}
            </Prose>
          )
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={() => onConfirm(typed)} disabled={blocked} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
