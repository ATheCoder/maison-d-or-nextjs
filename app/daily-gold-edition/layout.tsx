import { Suspense } from 'react';
import { getActiveChildProfile } from '@/app/profiles/actions';
import { getActiveChild, getSession } from '@/lib/dal';
import DailyGoldEditionChrome from '@/components/dailygold/DailyGoldEditionChrome';
import DGChromeSkeleton from '@/components/dailygold/DGChromeSkeleton';

/**
 * The reader's persistent chrome.
 *
 * /daily-gold-edition stays outside the (dg) route group — its chrome has to
 * live under DGInstrumentationProvider, which the group's shell does not mount
 * — so it gets a layout of its own. What matters is that this is a *layout*:
 * Next.js does not re-render it during a client-side transition, so turning to
 * another day (`?date=`) swaps only the reading column instead of tearing the
 * rail down and building a new one.
 *
 * The session reads are runtime data, and a layout that awaits runtime data
 * blocks entry navigations until it has rendered — loading.tsx cannot cover a
 * layout above it. So the reads live in ChromeWithIdentity, inside the
 * layout's own Suspense boundary: an entry navigation commits immediately to
 * DGChromeSkeleton (the rail, header and tab bar drawn empty) and the real
 * chrome streams in over its own outline. The moment this earns its keep is
 * the landing after a profile switch, which purges the client router cache
 * (see setActiveProfile) so no prefetched chrome from the previous identity
 * can be committed — the price of that purge is a fresh render on arrival,
 * and this boundary is what plays a skeleton over it instead of a frozen
 * screen.
 *
 * The reader is resolved here as well as in the page. `getActiveChildProfile`
 * is React-cached for the request, so the second read costs nothing, and the
 * two can't disagree about who is reading.
 *
 * The chrome also needs the reader's stored theme, which is not part of the
 * picker-shaped profile the rest of the page consumes, so the row itself is
 * read through the DAL — the same cached query `getActiveChildProfile` is built
 * on, so this is a second look at one result rather than a second query. Paint-
 * ing from the server is what keeps the child's palette from flashing the
 * default on every load.
 */

// The chrome names the active child, which comes from the session.
export const dynamic = 'force-dynamic';

async function ChromeWithIdentity({ children }: { children: React.ReactNode }) {
  const child = await getActiveChildProfile();
  // The row behind that profile, for the one field the picker shape omits.
  const childRow = await getActiveChild();
  // React-cached alongside the child read — one session query serves both.
  // Name and role only: the chrome names the account, it never holds it.
  const session = await getSession();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DailyGoldEditionChrome
      child={child}
      initialTheme={childRow?.themePreference ?? null}
      viewer={session ? { name: session.user.name, role: session.user.role === 'admin' ? 'admin' as const : 'guardian' as const } : null}
      today={today}
    >
      {children}
    </DailyGoldEditionChrome>
  );
}

export default function DailyGoldEditionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DGChromeSkeleton />}>
      <ChromeWithIdentity>{children}</ChromeWithIdentity>
    </Suspense>
  );
}
