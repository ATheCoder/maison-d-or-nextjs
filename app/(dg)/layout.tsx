import { getActiveChild, getSession } from '@/lib/dal';
import DGAppChrome from '@/components/dailygold/DGAppChrome';

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
 * The reads are runtime data and this layout awaits them, so an entry
 * navigation into the group blocks until they land — the documented behaviour
 * without Cache Components (see the layout.js reference, "Interaction with
 * loading.js"). That is the status quo the other four destinations have always
 * had, it is two React-cached queries, and a profile switch — the one entry
 * that used to arrive on a purged router cache — is covered by the switch
 * curtain (ProfileSwitchCurtain) rather than by a skeleton underneath it.
 *
 * The reader's stored theme travels with them: `theme_preference` is read here
 * so every destination paints in the child's own palette from the first frame,
 * with no flash of the default and no client fetch.
 *
 * The reader is resolved once, here. `getActiveChild` is the non-redirecting,
 * React-cached accessor, so the pages that also need the child (/passport,
 * /treasury, via requireChildContext) pay no second query. Grown-up rooms
 * answer `null` by construction: requireFamily bounces anyone still in child
 * mode to /gate, so the rail there shows the monogram and the app's
 * destinations, with no identity block and no "My World" shelf — exactly what
 * those pages asked for when they passed no child of their own.
 */

// The chrome names an identity, which comes from the session.
export const dynamic = 'force-dynamic';

export default async function DGLayout({ children }: { children: React.ReactNode }) {
  const child = await getActiveChild();
  // Both accessors are React-cached, so this is the same session read the
  // pages themselves perform — no second query.
  const session = await getSession();
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
    >
      {children}
    </DGAppChrome>
  );
}
