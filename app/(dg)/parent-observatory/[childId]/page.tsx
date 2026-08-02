import type { Metadata } from 'next';
import { requireFamily } from '@/lib/dal';
import { ObservatoryLedger } from '@/components/observatory/ObservatoryLedger';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Parent Observatory',
  robots: { index: false, follow: false },
};

/**
 * One child's observatory.
 *
 * `params` and `searchParams` are promises in Next 16, so both are awaited
 * before use. Neither value is trusted: `childId` is verified against the
 * caller's family inside getObservatory, and `edition` is only honoured if it
 * appears in the list of days the action itself produced.
 *
 * The page hands both straight to ObservatoryLedger, which streams the
 * masthead and the ledger body as their reads land. A null answer for the id
 * — foreign, deleted, nonsense, or a database that could not answer — still
 * collapses to the index (see LedgerBody), which tells an attacker nothing
 * they did not already know and puts a guardian who mistyped a URL back on
 * their own first child. The index renders inline rather than bouncing back
 * here, so there is no loop.
 *
 * The (dg) layout resolves no `child` here: this page is only reachable once
 * child mode has been cleared, so the rail hides its identity block and
 * "My World" shelf and shows just the app's destinations. The observatory
 * paints its own fixed Ledger canvas inside the shell's <main>, so the rail
 * themes normally while the grown-up room stays light.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { childId } = await params;
  const { edition } = await searchParams;
  // The guardian gate, before any UI streams (React-cached; the ledger's
  // stages re-use this same read).
  await requireFamily(`/parent-observatory/${encodeURIComponent(childId)}`);
  return <ObservatoryLedger childId={childId} edition={edition} />;
}
