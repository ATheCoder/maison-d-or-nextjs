// @ts-nocheck — untyped .jsx from before checkJs was on; 1 error to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * StoryOpeningCurtain — raises <BookOpeningCurtain> for the pending window of a
 * click on a Golden Story link.
 *
 * Must live inside the <Link>, because useLinkStatus only reports for the link
 * it is nested in. Rendered through a portal so the full-screen curtain escapes
 * the tile's overflow and stacking context.
 *
 * Two things this depends on, both easy to break from a distance:
 *
 *   1. /stories/[name] must NEVER gain a loading.tsx. `pending` drops the
 *      instant a Suspense fallback commits, which would cut the curtain short
 *      mid-swing and — worse — break the `resume` handoff into StorybookView,
 *      whose curtain expects to pick up a cover that is already open.
 *   2. The link wrapping this must set prefetch={false}. A prefetched route
 *      navigates from cache with no server round-trip, so there is no pending
 *      state at all and the curtain is skipped entirely.
 */
import { createPortal } from 'react-dom';
import { useLinkStatus } from 'next/link';
import BookOpeningCurtain from '@/components/dailygold/BookOpeningCurtain';

/**
 * `imgUrl` needs saying out loud: TS infers a parameter's type from its default,
 * so `= null` alone would type it as `null` and reject the one thing every
 * caller passes — a portrait URL.
 *
 * @param {{ name: string | null, imgUrl?: string | null }} props
 */
export default function StoryOpeningCurtain({ name, imgUrl = null }) {
  const { pending } = useLinkStatus();

  // `pending` can only turn true after a click, so the portal is never reached
  // on the server and the SSR/hydration passes both render nothing.
  if (!pending || typeof document === 'undefined') return null;

  return createPortal(
    <BookOpeningCurtain name={name} imgUrl={imgUrl} />,
    document.body,
  );
}
