'use client';
import { useState } from 'react';
import { Button, Code, Confirm, Prose } from '@/components/ds';

/**
 * §5.5 — the Confirm stamp. A client island for the same reason OverlayDemo
 * is one: PrimitivesShowcase is a server component and a dialog needs open
 * state.
 *
 * Both forms are here because the difference between them is a JUDGEMENT, not
 * a style, and a stamp that showed only the plain one would leave the harder
 * call undocumented. The plain dialog is what an ordinary destructive action
 * gets. The typed one is for deletions nothing in the house can rebuild — and
 * reaching for it by default is worse than not having it, because a person
 * who types the slug on every delete has been trained to stop reading.
 *
 * The `pending` state is faked on a timer rather than mocked away: the confirm
 * has to keep its full coat while it spins (the button withholds the disabled
 * dim for exactly that reason) and both verbs have to go inert together, and
 * neither is visible in a static stamp.
 */
export default function ConfirmDemo() {
  const [open, setOpen] = useState<'plain' | 'typed' | null>(null);
  const [pending, setPending] = useState(false);

  function finish() {
    setPending(true);
    // A real caller awaits a server action here. The delay is the point of the
    // stamp: it is the only way to see the spinner and the inert cancel.
    setTimeout(() => {
      setPending(false);
      setOpen(null);
    }, 1200);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="danger" onClick={() => setOpen('plain')}>
          Delete the tortoise&rsquo;s file
        </Button>
        <Button variant="danger" onClick={() => setOpen('typed')}>
          Delete, with the slug typed back
        </Button>
      </div>

      {open === 'plain' && (
        <Confirm
          title="Delete the tortoise&rsquo;s file?"
          confirmLabel="Delete it"
          cancelLabel="Keep it"
          pending={pending}
          onCancel={() => setOpen(null)}
          onConfirm={finish}
        >
          Her arrival date, the fig-tree schedule and every photograph filed
          under her name go with it. This cannot be undone.
        </Confirm>
      )}

      {open === 'typed' && (
        <Confirm
          title="Delete Amélie Beaumont?"
          confirmLabel="Delete permanently"
          pending={pending}
          requireTyped={{ value: 'amelie-beaumont' }}
          onCancel={() => setOpen(null)}
          onConfirm={finish}
        >
          <>
            This removes the person and their story brief. Type{' '}
            <Code>amelie-beaumont</Code> to confirm — the field is set in{' '}
            <Code>--face-mono</Code>, because a string you have to match
            character for character is the reason that face exists.
          </>
        </Confirm>
      )}

      <Prose variant="caption" className="mt-4">
        Cancel is the ghost and comes first in the DOM, so a hurried Tab lands
        on the safe verb. Escape, the focus trap and focus restore are
        Overlay&rsquo;s, unchanged.
      </Prose>
    </>
  );
}
