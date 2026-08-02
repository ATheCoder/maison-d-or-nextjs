import DGEditionSkeleton from '@/components/dailygold/DGEditionSkeleton';

/**
 * The Suspense fallback for the edition reader.
 *
 * Next.js nests loading.tsx inside layout.tsx and around page.tsx, so this
 * replaces only what lives in the shell's <main class="dg-shell">. The
 * navigation rail, the mobile tab bar and the identity header are layout —
 * they stay mounted, stay interactive, and keep the pressed item highlighted
 * while the day streams in.
 *
 * It is not what a reader sees when they turn a page. DGWaxSealNavigator
 * pushes the new date inside `startTransition`, and React answers a transition
 * by holding the *old* paper on screen rather than falling back to a
 * skeleton — the navigator's `pending` flag lights its own "Loading edition…"
 * line under the date, which is the honest signal there: the reader still has
 * yesterday's page in hand while today's is fetched, and nothing flashes. What
 * this file covers is ENTRY navigations, where there is no old paper to hold:
 * a press on the rail or the tab bar, a profile switch, a bookmark or a shared
 * `?date=` link opened cold.
 *
 * One accepted consequence: with a loading.tsx present, the redirect()s the
 * page performs — the hop off a blank day to the last authored one, and the
 * bounce on a malformed `?date=` — resolve as streamed soft redirects rather
 * than a bare HTTP 3xx, so the skeleton paints for a moment before the address
 * settles. That is a fair trade here: the route is private and noindex, so no
 * crawler is being told anything by the status code, and a reader arriving on
 * a blank day now watches paper being set instead of a white screen.
 */
export default function Loading() {
  return <DGEditionSkeleton />;
}
