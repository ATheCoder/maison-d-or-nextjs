import type { Metadata } from 'next';
import { requireFamily } from '@/lib/dal';
import { ObservatoryLedger } from '@/components/observatory/ObservatoryLedger';

export const metadata: Metadata = {
  title: 'The Parent Observatory',
  // A parent surface over a child's activity has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * The observatory's front door — the target of "Open Parent View" on the
 * child's own page (components/dailygold/DGForParents.jsx:81).
 *
 * The observatory is always *one child's*, and here that child is the first
 * profile — rendered inline, not redirected into. The old redirect hop cost a
 * second navigation and remounted the loading skeleton, which read as the page
 * refreshing twice; now a rail press is one navigation that fills in as its
 * two reads land (see ObservatoryLedger). The pills still navigate to the
 * canonical /parent-observatory/[childId] routes, so switching children is
 * unchanged.
 *
 * The guardian gate runs before any UI: the ledger's stages each re-check it
 * (requireFamily is React-cached, so this costs one read), but awaiting it
 * here keeps a child-mode session from ever being shown even the frame.
 */
export default async function Page() {
  await requireFamily('/parent-observatory');
  return <ObservatoryLedger />;
}
