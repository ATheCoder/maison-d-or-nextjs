import { Suspense } from 'react';
import { getActiveChild, getSession } from '@/lib/dal';
import { getSavedKeys } from '@/app/(dg)/treasury/actions';
import DGAppChrome from '@/components/dailygold/DGAppChrome';
import DGChromeFallback from '@/components/dailygold/DGChromeFallback';

/**
 * The shared chrome for every rail destination: /daily-gold-edition, /family,
 * /parent-observatory, /passport and /treasury.
 *
 * This is a route group, so none of those URLs change — what changes is that
 * the rail, the mobile tab bar, the theme and the instrumentation now live in a
 * layout segment the five pages have in common. Next.js reuses a shared layout
 * across client navigations between its children, so moving from Treasury to
 * the paper swaps only what sits inside <main> (with each route's loading.tsx
 * covering the gap) instead of unmounting and rebuilding the whole tree.
 *
 * The edition reader used to sit outside this group with a near-identical
 * chrome of its own, because its rail has to hang under DGInstrumentationProvider
 * and this layout did not mount one. It does now (see DGAppChrome for why, and
 * for the analytics-plan departure that entails), and the second chrome is
 * gone. Three things came with that:
 * - one frame instead of two that had already drifted apart;
 * - one identity read instead of two. The edition's layout awaited the reader
 *   separately behind its own Suspense boundary, whose fallback drew a second
 *   copy of the paper skeleton *inside* the copy loading.tsx was already
 *   drawing — so the reading column was destroyed and rebuilt, replaying its
 *   0.4s dgFadeIn, at the moment the rail resolved. That was the flashing;
 * - no rebuild of the rail when a reader crosses between the paper and their
 *   own rooms.
 *
 * The reads are runtime data, so under Cache Components they cannot happen at
 * the top of this file: a layout that awaits the session has no prerenderable
 * shell, and Next raises `blocking-route` for the whole group. They live in
 * ChromeWithIdentity instead, inside this layout's own Suspense boundary, with
 * DGChromeFallback — the frame with nobody in it — as the shell every reader
 * gets first. `loading.tsx` cannot cover a layout above it, which is why the
 * boundary has to be here rather than in the five destinations.
 *
 * `children` sits inside that boundary, deliberately. The instrumentation
 * provider is keyed on the reader (see DGAppChrome, and the buffer-flush
 * argument for why), so a chrome that resolved its identity *after* mounting
 * the content column would change that key and remount everything under it —
 * the same destroy-and-rebuild, and the same replayed dgFadeIn, that merging
 * the two layouts existed to end. One boundary above the content column costs
 * one mount; pushing identity down to the rail alone would cost two.
 *
 * What that buys, and what it costs: an entry navigation now commits to a
 * painted frame immediately instead of holding the whole response on the
 * session read. The price is that the frame is theme-neutral — no prerendered
 * shell can know the reader's palette — so a hard load paints neutral before
 * it paints the child's colours. DGChromeFallback documents that choice; the
 * fix, if it ever grates, is the pre-hydration script pattern with the theme
 * mirrored into a plain cookie, not a change here.
 *
 * The reader is resolved once, here. `getActiveChild` is the non-redirecting,
 * React-cached accessor, so the pages that also need the child (/passport,
 * /treasury, via requireChildContext) pay no second query. Grown-up rooms
 * answer `null` by construction: requireFamily bounces anyone still in child
 * mode to /gate, so the rail there shows the monogram and the app's
 * destinations, with no identity block and no "My World" shelf — exactly what
 * those pages asked for when they passed no child of their own.
 */

async function ChromeWithIdentity({ children }: { children: React.ReactNode }) {
  const child = await getActiveChild();
  // Both accessors are React-cached, so the pages below pay for neither a
  // second time *within this request*. Between requests they would — React's
  // memoisation is request-scoped — which is why the pages no longer call them
  // at all and read the result out of ReaderProvider instead. A client
  // navigation between rail destinations does not re-render this layout, so
  // these three reads happen once per hard load rather than once per page turn.
  const session = await getSession();
  // The child's saved keys, in one query, for every destination at once: the
  // paper's hearts, the Treasury's unsave corners, the Passport. It rides the
  // same React-cached `getActiveChild` above, so this costs one indexed select
  // and no second session read. `null` outside child mode, which is how the
  // sections tell "saved nothing" from "no one to save for".
  const savedKeys = await getSavedKeys();
  // After the session read, never before: reading the clock ahead of any
  // request data is its own prerender error (next-prerender-current-time).
  // Here it is honest request-time work, because the reads above already are.
  const today = new Date().toISOString().slice(0, 10);

  return (
    // `child` is the safe subset the picker exposes: id, display name, avatar
    // key — never the row, which carries pinHash. `viewer` is the same idea for
    // the account: name and role only, so the chrome can say whose session this
    // is without ever holding the session itself.
    <DGAppChrome
      child={child ? { id: child.id, name: child.displayName, avatar: child.avatar } : null}
      viewer={session ? { name: session.user.name, role: session.user.role === 'admin' ? 'admin' as const : 'guardian' as const } : null}
      initialTheme={child?.themePreference ?? null}
      today={today}
      savedKeys={savedKeys}
      // No session at all — a stranger reading the public paper. Worth saying
      // plainly rather than leaving them tapping hearts that were never
      // rendered (onboarding plan WP-D).
      signedOut={!session}
    >
      {children}
    </DGAppChrome>
  );
}

export default function DGLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DGChromeFallback />}>
      <ChromeWithIdentity>{children}</ChromeWithIdentity>
    </Suspense>
  );
}
