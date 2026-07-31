import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getObservatoryIndex } from './actions';
import { ObservatoryInvite } from '@/components/observatory/ObservatoryInvite';
import DGPageShell from '@/components/dailygold/DGPageShell';
import { ThemeProvider } from '@/components/theme/ThemeContext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Parent Observatory',
  // A parent surface over a child's activity has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * The observatory's front door — the target of "Open Parent View" on the
 * child's own page (components/dailygold/DGForParents.jsx:81).
 *
 * It holds no UI of its own for a family that has children: the observatory is
 * always *one child's*, so this hands straight off to the first profile and
 * lets the switcher take over from there.
 */
export default async function Page() {
  const { children } = await getObservatoryIndex();
  if (children.length > 0) redirect(`/parent-observatory/${children[0].id}`);
  return (
    <ThemeProvider>
      <DGPageShell>
        <ObservatoryInvite />
      </DGPageShell>
    </ThemeProvider>
  );
}
