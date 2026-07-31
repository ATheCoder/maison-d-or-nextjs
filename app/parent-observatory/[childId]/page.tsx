import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getObservatory } from '../actions';
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
 * caller's family inside the action, and `edition` is only honoured if it
 * appears in the list of days the action itself produced.
 *
 * A null answer means the id is foreign, deleted, or nonsense — or the database
 * could not answer. All four collapse to the index, which tells an attacker
 * nothing they did not already know and puts a guardian who mistyped a URL back
 * on their own first child. The index never bounces back here for a family with
 * no children, so there is no loop.
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

  const data = await getObservatory(childId, edition);
  if (!data) redirect('/parent-observatory');

  return <ObservatoryLedger data={data} />;
}
