'use client';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ds';

/**
 * A ghost button at the tool scale, and nothing else. It used to hand-roll
 * that in inline hex — a gold hairline, a `#8B7355` ink and no focus ring —
 * which meant it was the one control on three different screens (/admin,
 * /profiles, /family) that did not re-scope with the room it stood in.
 *
 * The old inline style also set uppercase and 0.08em tracking, and carrying
 * that across as a `type-label-editorial` class was a mistake worth naming:
 * it made this the only tracked, uppercased button in the house, matching
 * nothing on /design. The editorial label is the dress of a FIELD's label and
 * an eyebrow — quiet type that names something. A button is not named, it is
 * pressed. It wears the button's own type now.
 */
export default function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      // A full-page navigation, not router.push + router.refresh(): the pair
      // races (refresh re-fetches the current route while the push is in
      // flight and can hang it), but a plain push would leave the previous
      // account's rendered pages in the client cache, reachable with Back.
      // Leaving an identity is the one moment worth discarding all of it.
      onClick={async () => {
        await authClient.signOut();
        window.location.assign('/login');
      }}
    >
      Sign out
    </Button>
  );
}
