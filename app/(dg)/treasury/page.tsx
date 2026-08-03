import TreasuryView from '@/components/treasury/TreasuryView';
import { requireChildContext } from '@/lib/dal';
import { getSavedItems } from './actions';

export const metadata = { title: 'My Treasury' };

export default async function TreasuryPage() {
  // Redirects to /profiles outside child mode; getSavedItems and the (dg)
  // layout re-resolve the same child through the React-cached getActiveChild,
  // so this costs no extra query.
  const { child } = await requireChildContext();
  const items = await getSavedItems();

  return <TreasuryView items={items} childName={child.displayName} />;
}
