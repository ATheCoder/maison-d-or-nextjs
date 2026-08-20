'use client';
import { useState } from 'react';
import { Button, Heading, Overlay, Prose } from '@/components/ds';

/**
 * §5.5 — the Overlay stamp. A client island because PrimitivesShowcase is a
 * server component and a dialog needs open state; nothing else on this page
 * does, which is why the island is this small rather than the section being
 * client-rendered wholesale.
 *
 * The demo content is deliberately long enough to scroll: the panel caps at
 * min(90vh, 56rem) and scrolls internally while the body behind it is locked,
 * and a stamp that fits on one screen never shows that.
 */
export default function OverlayDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open the dialog</Button>
      {/* Mount is the open, unmount is the close — the contract Overlay's
          docstring describes, written the way every call site writes it. */}
      {open && (
        <Overlay label="A room off the hall" onClose={() => setOpen(false)}>
          <div className="space-y-5 p-8">
            <Heading level={2} variant="story">
              A room off the hall
            </Heading>
            <Prose>
              Escape closes it, Tab is trapped inside it, the page behind it
              cannot scroll, and closing it puts focus back on the button that
              opened it. None of those four is optional, and all four are why
              this is a primitive rather than a div with a fixed position.
            </Prose>
            <Prose>
              The close button in the corner is a <code>Button variant=&quot;bare&quot;</code>:
              the coats are all wrong for a round scrim button, but the focus
              ring is exactly right, and before it was a primitive this was the
              one control here you could tab to and not see.
            </Prose>
            <Prose>
              The panel scrolls inside itself rather than growing past the
              viewport — drag this content past the fold and the scrim stays
              put. The scrim fades up on arrival; the panel does not move,
              because a dialog that slides is a dialog the reader has to track.
            </Prose>
            <Prose>
              Daily Gold wraps this as <code>DGModal</code> to add a dwell
              clock. Everywhere else — the grown-up rooms, the front door —
              calls this directly, because there is nothing to measure.
            </Prose>
          </div>
        </Overlay>
      )}
    </>
  );
}
